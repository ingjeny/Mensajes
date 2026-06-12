const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth');
const { dbRun, dbAll, dbGet } = require('../db/database');

const router = express.Router();

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const UPLOADS_DIR  = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR))  fs.mkdirSync(UPLOADS_DIR,  { recursive: true });

// profileId -> { client, status, qr }
const clients = {};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 16 * 1024 * 1024 } });

// Verify profile belongs to company
async function verifyProfile(profileId, companyId) {
  if (!profileId) return null;
  return await dbGet('SELECT * FROM business_profiles WHERE id = ? AND company_id = ?', [profileId, companyId]);
}

function clearSession(profileId) {
  const sessionPath = path.join(SESSIONS_DIR, `session-profile_${profileId}`);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
}

function createClient(profileId) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `profile_${profileId}`,
      dataPath: SESSIONS_DIR
    }),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  });

  clients[profileId] = { client, status: 'initializing', qr: null };

  client.on('qr', async (qr) => {
    clients[profileId].status = 'qr';
    clients[profileId].qr = await qrcode.toDataURL(qr);
  });

  client.on('authenticated', () => {
    clients[profileId].status = 'authenticated';
    clients[profileId].qr = null;
  });

  client.on('ready', () => {
    clients[profileId].status = 'ready';
    clients[profileId].qr = null;
  });

  client.on('auth_failure', () => {
    clients[profileId].status = 'auth_failure';
    clients[profileId].qr = null;
    clearSession(profileId);
    delete clients[profileId];
  });

  client.on('disconnected', (reason) => {
    console.log(`[WA] Perfil ${profileId} desconectado:`, reason);
    if (clients[profileId]) {
      clients[profileId].status = 'disconnected';
      clients[profileId].qr = null;
    }
  });

  client.initialize().catch(err => {
    console.error(`[WA] Error inicializando perfil ${profileId}:`, err.message);
    if (clients[profileId]) clients[profileId].status = 'error';
    try { clearSession(profileId); } catch {}
    delete clients[profileId];
  });

  return clients[profileId];
}

// Restaurar sesiones guardadas al arrancar
function restorePersistedSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  fs.readdirSync(SESSIONS_DIR).forEach(name => {
    const match = name.match(/^session-profile_(\d+)$/);
    if (match) {
      const profileId = parseInt(match[1]);
      if (!clients[profileId]) {
        console.log(`[WA] Restaurando perfil ${profileId}`);
        createClient(profileId);
      }
    }
  });
}

restorePersistedSessions();

// ─── RUTAS ────────────────────────────────────────────────

// Estado de todos los perfiles de la empresa
router.get('/status-all', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  try {
    const profiles = await dbAll('SELECT * FROM business_profiles WHERE company_id = ?', [companyId]);
    const result = profiles.map(p => ({
      profileId: p.id,
      name: p.name,
      status: clients[p.id]?.status || 'not_started',
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Iniciar cliente WA para un perfil
router.post('/init', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const { profileId } = req.body;

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  if (clients[profileId]) {
    const { status } = clients[profileId];
    if (status === 'disconnected' || status === 'error') {
      clients[profileId].client.destroy().catch(() => {});
      delete clients[profileId];
    } else {
      return res.json({ status });
    }
  }

  const instance = createClient(profileId);
  res.json({ status: instance.status });
});

// QR de un perfil
router.get('/qr', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const profileId = parseInt(req.query.profileId);

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  const instance = clients[profileId];
  res.json({ qr: instance?.qr || null, status: instance?.status || 'not_started' });
});

// Estado de un perfil
router.get('/status', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const profileId = parseInt(req.query.profileId);

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  res.json({ status: clients[profileId]?.status || 'not_started' });
});

// Cerrar sesión de un perfil
router.post('/logout', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const { profileId } = req.body;

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  const instance = clients[profileId];
  try {
    if (instance) {
      await instance.client.logout().catch(() => {});
      await instance.client.destroy().catch(() => {});
      delete clients[profileId];
    }
    clearSession(profileId);
    res.json({ message: 'Sesión cerrada.' });
  } catch {
    delete clients[profileId];
    clearSession(profileId);
    res.json({ message: 'Sesión eliminada.' });
  }
});

// Buscar JID
router.get('/resolve/:input', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const profileId = parseInt(req.query.profileId);

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  const instance = clients[profileId];
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
    res.status(404).json({ error: 'No se encontró', detail: err.message });
  }
});

// Obtener chats de un perfil
router.get('/chats', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const profileId = parseInt(req.query.profileId);

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  const instance = clients[profileId];
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
      const parentId = meta.linkedParentChatId?._serialized || null;

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
      if (!meta.isCommunity) {
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

// Historial
router.get('/history', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const profileId = req.query.profileId ? parseInt(req.query.profileId) : null;
  try {
    let rows;
    if (profileId) {
      rows = await dbAll('SELECT * FROM sent_messages WHERE company_id = ? AND profile_id = ? ORDER BY sent_at DESC LIMIT 100', [companyId, profileId]);
    } else {
      rows = await dbAll('SELECT * FROM sent_messages WHERE company_id = ? ORDER BY sent_at DESC LIMIT 100', [companyId]);
    }
    res.json(rows.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/history/:id', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  try {
    await dbRun('DELETE FROM sent_messages WHERE id = ? AND company_id = ?', [req.params.id, companyId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Enviar imágenes
router.post('/send-images', authMiddleware, upload.array('images', 20), async (req, res) => {
  const { companyId } = req.user;
  const { jid, message, recipientName, recipientType, profileId: pidStr } = req.body;
  const profileId = parseInt(pidStr);
  const files = req.files;

  const profile = await verifyProfile(profileId, companyId);
  if (!profile) {
    files?.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }

  const instance = clients[profileId];
  if (!instance || instance.status !== 'ready') {
    files?.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'WhatsApp no está conectado para este perfil' });
  }

  if (!jid)              { files?.forEach(f => fs.unlink(f.path, () => {})); return res.status(400).json({ error: 'JID requerido' }); }
  if (!files?.length)    { return res.status(400).json({ error: 'Sin imágenes' }); }

  const results = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const media = MessageMedia.fromFilePath(files[i].path);
      const caption = i === 0 ? (message || '') : '';
      await instance.client.sendMessage(jid, media, { caption });
      results.push({ file: files[i].originalname, sent: true });
      if (i < files.length - 1) {
        const delay = 1500 + Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    const filenames = files.map(f => f.filename);
    await dbRun(
      'INSERT INTO sent_messages (company_id, profile_id, recipient_jid, recipient_name, recipient_type, message, images) VALUES (?,?,?,?,?,?,?)',
      [companyId, profileId, jid, recipientName || jid, recipientType || 'group', message || '', JSON.stringify(filenames)]
    );

    res.json({ success: true, results });
  } catch (err) {
    files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: err.message, results });
  }
});

module.exports = router;
