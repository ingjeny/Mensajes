import React from 'react';

const TYPE_EMOJI = { group: '👥', broadcast: '📢', contact: '👤', announce: '📣', community_group: '👥' };

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)   return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `Hace ${Math.floor(diff / 3600)} h`;
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' · ' +
         d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export default function SentHistory({ history, loading, onResend, onDelete }) {
  if (loading) return <p style={s.empty}>Cargando historial…</p>;

  if (!history.length) return (
    <div style={s.emptyBox}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)', marginBottom: 8 }}>
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
      </svg>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin mensajes enviados aún</p>
    </div>
  );

  return (
    <div style={s.list}>
      {history.map(entry => (
        <div key={entry.id} style={s.row}>

          {/* Thumbnails */}
          <div style={s.thumbs}>
            {entry.images.slice(0, 3).map((img, i) => (
              <img key={i} src={`/uploads/${img}`} alt="" style={s.thumb}
                onError={e => { e.target.style.display = 'none'; }} />
            ))}
            {entry.images.length > 3 && (
              <div style={s.thumbMore}>+{entry.images.length - 3}</div>
            )}
          </div>

          {/* Info */}
          <div style={s.info}>
            <div style={s.infoTop}>
              <span style={s.recipient}>
                {TYPE_EMOJI[entry.recipient_type] || '💬'} {entry.recipient_name}
              </span>
              <span style={s.time}>{timeAgo(entry.sent_at)}</span>
            </div>
            {entry.message
              ? <p style={s.msg}>{entry.message.length > 90 ? entry.message.slice(0, 90) + '…' : entry.message}</p>
              : <p style={s.msgMuted}>Sin mensaje</p>}
            <p style={s.meta}>{entry.images.length} imagen{entry.images.length !== 1 ? 'es' : ''}</p>
          </div>

          {/* Actions */}
          <div style={s.actions}>
            <button className="btn btn-outline btn-sm" onClick={() => onResend(entry)} style={{ gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              Reenviar
            </button>
            <button style={s.delBtn} onClick={() => onDelete(entry.id)} title="Eliminar del historial">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  empty:    { color: 'var(--text-muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0' },
  list:     { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--surface)',
    transition: 'border-color .12s',
  },
  thumbs: { display: 'flex', gap: 3, flexShrink: 0 },
  thumb:  { width: 44, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block', background: 'var(--surface2)' },
  thumbMore: {
    width: 44, height: 44, borderRadius: 6, background: 'var(--surface2)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  },
  info:     { flex: 1, minWidth: 0 },
  infoTop:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  recipient:{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time:     { fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 },
  msg:      { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4, marginBottom: 2 },
  msgMuted: { fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 2 },
  meta:     { fontSize: 11, color: 'var(--text-muted)' },
  actions:  { display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 },
  delBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: '1.5px solid var(--border)', borderRadius: 6,
    color: 'var(--text-muted)', padding: '5px 7px', cursor: 'pointer',
    transition: 'all .12s',
  },
};
