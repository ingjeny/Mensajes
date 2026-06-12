import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const COLORS = [
  { value: '#0d9488', label: 'Teal'    },
  { value: '#3b82f6', label: 'Azul'    },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#f59e0b', label: 'Ámbar'   },
  { value: '#ef4444', label: 'Rojo'    },
  { value: '#10b981', label: 'Verde'   },
  { value: '#ec4899', label: 'Rosa'    },
  { value: '#6366f1', label: 'Índigo'  },
];

const STATUS_META = {
  not_started:  { label: 'Sin conectar',  dot: '#94a3b8', bg: '#f1f5f9' },
  initializing: { label: 'Iniciando…',    dot: '#f59e0b', bg: '#fffbeb' },
  qr:           { label: 'Escanear QR',   dot: '#f59e0b', bg: '#fffbeb' },
  ready:        { label: 'Conectado',     dot: '#10b981', bg: '#f0fdf4' },
  authenticated:{ label: 'Autenticando…', dot: '#10b981', bg: '#f0fdf4' },
  disconnected: { label: 'Desconectado',  dot: '#ef4444', bg: '#fff1f2' },
  auth_failure: { label: 'Error de auth', dot: '#ef4444', bg: '#fff1f2' },
  error:        { label: 'Error',         dot: '#ef4444', bg: '#fff1f2' },
};

function Modal({ title, onClose, children }) {
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.box} onClick={e => e.stopPropagation()}>
        <div style={m.header}>
          <span style={m.title}>{title}</span>
          <button style={m.close} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ name: initial?.name || '', description: initial?.description || '', color: initial?.color || '#0d9488' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="label">Nombre del negocio *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ej. Sucursal Norte" required />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="label">Descripción</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="ej. Ropa y accesorios" />
      </div>
      <div>
        <label className="label">Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {COLORS.map(c => (
            <button key={c.value} type="button" title={c.label}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: form.color === c.value ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => set('color', c.value)} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

function QrModal({ qr, onClose }) {
  return (
    <Modal title="Escanea el QR" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img src={qr} alt="QR" style={{ width: 220, height: 220, borderRadius: 10, border: '4px solid var(--bg)' }} />
      </div>
    </Modal>
  );
}

function ProfileCard({ profile, onEdit, onDelete, onGoSend }) {
  const [status, setStatus] = useState('not_started');
  const [qr, setQr]         = useState(null);
  const [loading, setLoad]  = useState(false);
  const [showQr, setShowQr] = useState(false);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get(`/whatsapp/status?profileId=${profile.id}`);
      setStatus(data.status);
      if (data.status === 'qr') {
        const q = await api.get(`/whatsapp/qr?profileId=${profile.id}`);
        setQr(q.data.qr);
        setShowQr(true);
      } else { setQr(null); }
    } catch {}
  }, [profile.id]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [poll]);

  const connect = async () => {
    setLoad(true);
    try { await api.post('/whatsapp/init', { profileId: profile.id }); } catch {}
    setLoad(false);
    setTimeout(poll, 1500);
  };

  const disconnect = async () => {
    if (!confirm(`¿Cerrar sesión de WhatsApp en "${profile.name}"?`)) return;
    try { await api.post('/whatsapp/logout', { profileId: profile.id }); setStatus('not_started'); setQr(null); } catch {}
  };

  const meta = STATUS_META[status] || STATUS_META.not_started;
  const canConnect = ['not_started','disconnected','auth_failure','error'].includes(status);

  return (
    <>
      {showQr && qr && <QrModal qr={qr} onClose={() => setShowQr(false)} />}
      <div style={{ ...c.card, borderTop: `3px solid ${profile.color}` }}>
        {/* Header */}
        <div style={c.cardTop}>
          <div style={{ ...c.colorDot, background: profile.color }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={c.name}>{profile.name}</p>
            {profile.description && <p style={c.desc}>{profile.description}</p>}
          </div>
          <div style={c.actions}>
            <button style={c.iconBtn} title="Editar" onClick={() => onEdit(profile)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button style={{ ...c.iconBtn, color: 'var(--danger)' }} title="Eliminar" onClick={() => onDelete(profile)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Status */}
        <div style={{ ...c.statusPill, background: meta.bg }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, flexShrink: 0,
            boxShadow: status === 'ready' ? `0 0 0 3px ${meta.dot}33` : 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{meta.label}</span>
          {qr && <button style={c.qrBtn} onClick={() => setShowQr(true)}>Ver QR</button>}
        </div>

        {/* Footer actions */}
        <div style={c.footer}>
          {canConnect && (
            <button className="btn btn-primary btn-sm btn-full" onClick={connect} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Conectando…' : 'Conectar WhatsApp'}
            </button>
          )}
          {status === 'ready' && (
            <>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onGoSend(profile)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Enviar
              </button>
              <button className="btn btn-outline btn-sm" onClick={disconnect}>Desconectar</button>
            </>
          )}
          {status === 'initializing' && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', width: '100%', padding: '4px 0' }}>Iniciando sesión…</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function Negocios({ onGoSend }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState(null); // null | 'create' | profile_object
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/profiles'); setProfiles(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        const { data } = await api.post('/profiles', form);
        setProfiles(p => [...p, data]);
      } else {
        const { data } = await api.put(`/profiles/${modal.id}`, form);
        setProfiles(p => p.map(x => x.id === data.id ? data : x));
      }
      setModal(null);
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
    setSaving(false);
  };

  const handleDelete = async (profile) => {
    if (!confirm(`¿Eliminar "${profile.name}"? Esto no borrará el historial.`)) return;
    try {
      await api.delete(`/profiles/${profile.id}`);
      setProfiles(p => p.filter(x => x.id !== profile.id));
    } catch {}
  };

  return (
    <div>
      {/* Page header */}
      <div style={p.header}>
        <div>
          <p style={p.subtitle}>Administra tus líneas de WhatsApp y sus conexiones</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModal('create'); setError(''); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo negocio
        </button>
      </div>

      {loading
        ? <div style={p.empty}>Cargando negocios…</div>
        : profiles.length === 0
          ? (
            <div style={p.emptyBox}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)', marginBottom: 12 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Sin negocios registrados</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Crea tu primer negocio y conéctalo a WhatsApp</p>
              <button className="btn btn-primary" onClick={() => setModal('create')}>Crear negocio</button>
            </div>
          )
          : (
            <div style={p.grid}>
              {profiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onEdit={p => { setModal(p); setError(''); }}
                  onDelete={handleDelete}
                  onGoSend={onGoSend}
                />
              ))}
            </div>
          )
      }

      {/* Create / Edit modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Nuevo negocio' : 'Editar negocio'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
          <ProfileForm
            initial={modal !== 'create' ? modal : null}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}

// Styles
const c = {
  card: {
    background: 'var(--surface)', borderRadius: 12,
    border: '1px solid var(--border)',
    padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
    transition: 'box-shadow .15s',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  colorDot: { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  name:     { fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.3 },
  desc:     { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 },
  actions:  { display: 'flex', gap: 4, flexShrink: 0 },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '4px 5px', borderRadius: 5,
    display: 'flex', alignItems: 'center', transition: 'background .12s',
  },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 10px', borderRadius: 8,
    border: '1px solid rgba(0,0,0,.05)',
  },
  qrBtn: {
    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--primary)', fontSize: 12, fontWeight: 600,
  },
  footer: { display: 'flex', gap: 8, alignItems: 'center' },
};

const p = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  empty: { color: 'var(--text-muted)', fontSize: 13, padding: '32px 0', textAlign: 'center' },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' },
};

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(2px)' },
  box:     { background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:   { fontWeight: 700, fontSize: 16 },
  close:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 2px' },
};
