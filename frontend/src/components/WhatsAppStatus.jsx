import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/axios';

const STATUS_META = {
  not_started:  { label: 'Sin conectar',  dot: '#94a3b8', bg: '#f1f5f9' },
  initializing: { label: 'Iniciando…',    dot: '#f59e0b', bg: '#fffbeb' },
  qr:           { label: 'Escanea el QR', dot: '#f59e0b', bg: '#fffbeb' },
  ready:        { label: 'Conectado',     dot: '#10b981', bg: '#f0fdf4' },
  authenticated:{ label: 'Autenticando…', dot: '#10b981', bg: '#f0fdf4' },
  disconnected: { label: 'Desconectado',  dot: '#ef4444', bg: '#fff1f2' },
  auth_failure: { label: 'Error de auth', dot: '#ef4444', bg: '#fff1f2' },
  error:        { label: 'Error',         dot: '#ef4444', bg: '#fff1f2' },
};

export default function WhatsAppStatus({ onReady }) {
  const [status, setStatus]   = useState('not_started');
  const [qr, setQr]           = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr]   = useState(false);
  const notified = useRef(false);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      if (data.status === 'qr') {
        const q = await api.get('/whatsapp/qr');
        setQr(q.data.qr);
        setShowQr(true);
      } else {
        setQr(null);
        if (data.status !== 'qr') setShowQr(false);
      }
      if (data.status === 'ready' && onReady && !notified.current) {
        notified.current = true;
        onReady();
      }
      if (data.status !== 'ready') notified.current = false;
    } catch {}
  }, [onReady]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  const init = async () => {
    setLoading(true);
    try { await api.post('/whatsapp/init'); } catch {}
    setLoading(false);
  };

  const logout = async () => {
    if (!confirm('¿Cerrar sesión de WhatsApp?')) return;
    try {
      await api.post('/whatsapp/logout');
      setStatus('not_started'); setQr(null); setShowQr(false);
    } catch {}
  };

  const meta = STATUS_META[status] || STATUS_META.not_started;
  const canConnect = ['not_started', 'disconnected', 'auth_failure', 'error'].includes(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

      {/* Status pill */}
      <div style={{ ...pill.wrap, background: meta.bg }}>
        <span style={{ ...pill.dot, background: meta.dot,
          boxShadow: status === 'ready' ? `0 0 0 3px ${meta.dot}33` : 'none' }} />
        <span style={pill.label}>{meta.label}</span>

        {qr && (
          <button style={pill.qrBtn} onClick={() => setShowQr(v => !v)}>
            {showQr ? 'Ocultar QR' : 'Ver QR'}
          </button>
        )}
      </div>

      {/* Actions */}
      {canConnect && (
        <button className="btn btn-primary btn-sm" onClick={init} disabled={loading}>
          {loading ? 'Conectando…' : 'Conectar'}
        </button>
      )}
      {status === 'ready' && (
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Desconectar
        </button>
      )}

      {/* QR Modal */}
      {showQr && qr && (
        <div style={qrModal.overlay} onClick={() => setShowQr(false)}>
          <div style={qrModal.box} onClick={e => e.stopPropagation()}>
            <div style={qrModal.header}>
              <p style={qrModal.title}>Escanea con WhatsApp</p>
              <button style={qrModal.close} onClick={() => setShowQr(false)}>✕</button>
            </div>
            <p style={qrModal.hint}>
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
            <img src={qr} alt="QR" style={qrModal.img} />
          </div>
        </div>
      )}
    </div>
  );
}

const pill = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '5px 12px', borderRadius: 20,
    border: '1px solid rgba(0,0,0,.06)',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, transition: 'background .3s' },
  label: { fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' },
  qrBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--primary)', fontSize: 12, fontWeight: 600,
    padding: '0 0 0 4px',
  },
};

const qrModal = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999, backdropFilter: 'blur(2px)',
  },
  box: {
    background: '#fff', borderRadius: 14, padding: 28,
    boxShadow: '0 20px 60px rgba(0,0,0,.2)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, width: 300,
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  title:  { fontWeight: 700, fontSize: 15 },
  close:  { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px' },
  hint:   { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 },
  img:    { width: 220, height: 220, borderRadius: 10, border: '4px solid #f1f5f9' },
};
