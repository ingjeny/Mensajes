const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const UPLOADS_DIR  = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR))  fs.mkdirSync(UPLOADS_DIR,  { recursive: true });

// companyId -> { client, status, qr }
const clients = {};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 16 * 1024 * 1024 } });

function sessionExists(companyId) {
  const sessionPath = path.join(SESSIONS_DIR, `session-company_${companyId}`);
  return fs.existsSync(sessionPath);
}

function clearSession(companyId) {
  const sessionPath = path.join(SESSIONS_DIR, `session-company_${companyId}`);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
}

function createClient(companyId) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `company_${companyId}`,
      dataPath: SESSIONS_DIR
    }),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  });

  clients[companyId] = { client, status: 'initializing', qr: null };

  client.on('qr', async (qr) => {
    clients[companyId].status = 'qr';
    clients[companyId].qr = await qrcode.toDataURL(qr);
  });

  client.on('authenticated', () => {
    clients[companyId].status = 'authenticated';
    clients[companyId].qr = null;
  });

  client.on('ready', () => {
    clients[companyId].status = 'ready';
    clients[companyId].qr = null;
  });

  client.on('auth_failure', () => {
    clients[companyId].status = 'auth_failure';
    clients[companyId].qr = null;
    // Borrar sesión corrupta para que el próximo init genere QR limpio
    clearSession(companyId);
    delete clients[companyId];
  });

  client.on('disconnected', (reason) => {
    console.log(`[WA] Empresa ${companyId} desconectada:`, reason);
    clients[companyId].status = 'disconnected';
    clients[companyId].qr = null;
  });

  client.initialize().catch(err => {
    console.error(`[WA] Error inicializando empresa ${companyId}:`, err.message);
    if (clients[companyId]) clients[companyId].status = 'error';
  });

  return clients[companyId];
}

// Al arrancar el server, restaurar sesiones guardadas
function restorePersistedSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const entries = fs.readdirSync(SESSIONS_DIR);
  entries.forEach(name => {
    const match = name.match(/^session-company_(\d+)$/);
    if (match) {
      const companyId = parseInt(match[1]);
      if (!clients[companyId]) {
        console.log(`[WA] Restaurando sesión de empresa ${companyId}`);
        createClient(companyId);
      }
    }
  });
}

restorePersistedSessions();

// ─── RUTAS ───────────────────────────────────────────────

// Iniciar cliente (o reutilizar si ya existe)
router.post('/init', authMiddleware, (req, res) => {
  const { companyId } = req.user;

  if (clients[companyId]) {
    const { status } = clients[companyId];
    // Si está en estado final malo, limpiar y reiniciar
    if (status === 'disconnected' || status === 'error') {
      clients[companyId].client.destroy().catch(() => {});
      delete clients[companyId];
    } else {
      return res.json({ status });
    }
  }

  const instance = createClient(companyId);
  res.json({ status: instance.status });
});

// QR actual
router.get('/qr', authMiddleware, (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];
  if (!instance) return res.json({ qr: null, status: 'not_started' });
  res.json({ qr: instance.qr, status: instance.status });
});

// Estado actual
router.get('/status', authMiddleware, (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];
  res.json({ status: instance ? instance.status : 'not_started' });
});

// Cerrar sesión y borrar datos guardados
router.post('/logout', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];

  try {
    if (instance) {
      await instance.client.logout().catch(() => {});
      await instance.client.destroy().catch(() => {});
      delete clients[companyId];
    }
    clearSession(companyId);
    res.json({ message: 'Sesión cerrada y eliminada. Puedes escanear el QR nuevamente.' });
  } catch (err) {
    // Igual limpiamos aunque haya error
    delete clients[companyId];
    clearSession(companyId);
    res.json({ message: 'Sesión eliminada.' });
  }
});

// Buscar JID por número o ID de grupo
router.get('/resolve/:input', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];
  if (!instance || instance.status !== 'ready')
    return res.status(400).json({ error: 'WhatsApp no está conectado' });

  const input = req.params.input.trim();
  try {
    if (input.includes('@g.us') || input.includes('-')) {
      const jid = input.includes('@g.us') ? input : `${input}@g.us`;
      const chat = await instance.client.getChatById(jid);
      return res.json({ jid, name: chat.name, type: 'group' });
    }
    const clean = input.replace(/\D/g, '');
    const jid = `${clean}@c.us`;
    const contact = await instance.client.getContactById(jid);
    return res.json({ jid, name: contact.pushname || contact.name || clean, type: 'contact' });
  } catch (err) {
    res.status(404).json({ error: 'No se encontró el contacto/grupo', detail: err.message });
  }
});

// Obtener grupos, comunidades y listas de difusión
router.get('/chats', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];
  if (!instance || instance.status !== 'ready')
    return res.status(400).json({ error: 'WhatsApp no está conectado' });

  try {
    const chats = await instance.client.getChats();
    const communities = {};
    const regularGroups = [];
    const broadcasts = [];

    for (const c of chats) {
      const jid  = c.id._serialized;
      const meta = c.groupMetadata || {};

      if (jid.endsWith('@broadcast')) {
        broadcasts.push({ jid, name: c.name || 'Lista de difusión', type: 'broadcast', participants: c.recipients?.length || 0 });
        continue;
      }

      if (!c.isGroup) continue;

      const isCommunityAnnounce = meta.isCommunityAnnounce === true;
      const isCommunity         = meta.isCommunity === true;
      const parentId            = meta.linkedParentChatId?._serialized || null;

      if (isCommunityAnnounce) {
        if (!communities[jid]) communities[jid] = { name: c.name, announceJid: jid, groups: [] };
        else { communities[jid].announceJid = jid; communities[jid].name = c.name; }
        continue;
      }

      if (parentId) {
        if (!communities[parentId]) communities[parentId] = { name: '', announceJid: parentId, groups: [] };
        communities[parentId].groups.push({ jid, name: c.name, type: 'community_group', participants: meta.participants?.length || 0 });
        continue;
      }

      if (!isCommunity) {
        regularGroups.push({ jid, name: c.name, type: 'group', participants: meta.participants?.length || 0 });
      }
    }

    const communityList = Object.entries(communities).map(([, val]) => ({
      announceJid: val.announceJid,
      name: val.name || 'Comunidad',
      announce: { jid: val.announceJid, name: (val.name || 'Comunidad') + ' — Avisos', type: 'announce' },
      groups: val.groups
    }));

    res.json({ communities: communityList, groups: regularGroups, broadcasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar imágenes con mensaje
router.post('/send-images', authMiddleware, upload.array('images', 20), async (req, res) => {
  const { companyId } = req.user;
  const instance = clients[companyId];

  if (!instance || instance.status !== 'ready')
    return res.status(400).json({ error: 'WhatsApp no está conectado' });

  const { jid, message } = req.body;
  const files = req.files;

  if (!jid)                        return res.status(400).json({ error: 'El JID es requerido' });
  if (!files || files.length === 0) return res.status(400).json({ error: 'No se enviaron imágenes' });

  const results = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const media = MessageMedia.fromFilePath(files[i].path);
      const caption = i === 0 ? (message || '') : '';
      await instance.client.sendMessage(jid, media, { caption });
      results.push({ file: files[i].originalname, sent: true });
      if (i < files.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    files.forEach(f => fs.unlink(f.path, () => {}));
    res.json({ success: true, results });
  } catch (err) {
    files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: err.message, results });
  }
});

module.exports = router;
