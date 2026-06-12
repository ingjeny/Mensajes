import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import SentHistory from './SentHistory';

const COOLDOWN = 6;

const TYPE_EMOJI  = { group: '👥', broadcast: '📢', contact: '👤', announce: '📣', community_group: '👥' };
const BADGE_CLASS = { group: 'badge-warn', broadcast: 'badge-success', contact: 'badge-neutral', announce: 'badge-danger', community_group: 'badge-warn' };
const TYPE_LABEL  = { group: 'Grupo', broadcast: 'Difusión', contact: 'Contacto', announce: 'Avisos', community_group: 'Subgrupo' };

export default function ImageForward({ profileId, profileName }) {
  const [waStatus, setWaStatus]   = useState('not_started');
  const [images, setImages]       = useState([]);
  const [previews, setPrev]       = useState([]);
  const [message, setMessage]     = useState('');

  const [recipient, setRecipient]     = useState('');
  const [resolved, setResolved]       = useState(null);
  const [resolving, setResolving]     = useState(false);
  const [chats, setChats]             = useState({ communities: [], groups: [], broadcasts: [] });
  const [loadingChats, setLoadingChats] = useState(false);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(null);
  const [tab, setTab]                 = useState('communities');
  const [expanded, setExpanded]       = useState({});

  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const [history, setHistory]             = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const waReady = waStatus === 'ready';

  // Poll WA status for this profile
  useEffect(() => {
    if (!profileId) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/whatsapp/status?profileId=${profileId}`);
        setWaStatus(data.status);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [profileId]);

  useEffect(() => {
    if (waReady && profileId) { fetchChats(); fetchHistory(); }
  }, [waReady, profileId]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Reset on profile change
  useEffect(() => {
    setSelected(null); setResolved(null); setChats({ communities: [], groups: [], broadcasts: [] });
    setHistory([]); setImages([]); setPrev([]); setMessage(''); setResult(null); setError('');
  }, [profileId]);

  const startCooldown = () => {
    setCooldown(COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const fetchChats = async () => {
    if (!profileId) return;
    setLoadingChats(true);
    try {
      const { data } = await api.get(`/whatsapp/chats?profileId=${profileId}`);
      setChats(data);
      const exp = {};
      data.communities?.forEach(c => { exp[c.announceJid] = true; });
      setExpanded(exp);
    } catch {}
    setLoadingChats(false);
  };

  const fetchHistory = async () => {
    if (!profileId) return;
    setLoadingHistory(true);
    try { const { data } = await api.get(`/whatsapp/history?profileId=${profileId}`); setHistory(data); } catch {}
    setLoadingHistory(false);
  };

  const handleImages = e => {
    const files = Array.from(e.target.files);
    setImages(files); setPrev(files.map(f => URL.createObjectURL(f)));
    setResult(null); setError('');
  };
  const removeImage = i => {
    setImages(p => p.filter((_, j) => j !== i));
    setPrev(p => { URL.revokeObjectURL(p[i]); return p.filter((_, j) => j !== i); });
  };

  const activeRecipient = selected || resolved;

  const resolveManual = async () => {
    if (!recipient.trim() || !profileId) return;
    setResolving(true); setResolved(null); setSelected(null); setError('');
    try {
      const { data } = await api.get(`/whatsapp/resolve/${encodeURIComponent(recipient.trim())}?profileId=${profileId}`);
      setResolved(data);
    } catch (err) { setError(err.response?.data?.error || 'No se encontró'); }
    finally { setResolving(false); }
  };

  const selectChat = item => { setSelected(item); setResolved(null); setRecipient(''); setError(''); };
  const toggleCom  = jid  => setExpanded(p => ({ ...p, [jid]: !p[jid] }));

  const send = async () => {
    if (!profileId)        return setError('Selecciona un negocio primero');
    if (!activeRecipient)  return setError('Selecciona un destinatario');
    if (!images.length)    return setError('Agrega al menos una imagen');
    if (cooldown > 0)      return;
    setSending(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      images.forEach(img => fd.append('images', img));
      fd.append('jid', activeRecipient.jid);
      fd.append('message', message);
      fd.append('recipientName', activeRecipient.name);
      fd.append('recipientType', activeRecipient.type || 'group');
      fd.append('profileId', profileId);
      const { data } = await api.post('/whatsapp/send-images', fd);
      setResult(data);
      setImages([]); setPrev([]); setMessage('');
      setSelected(null); setResolved(null);
      startCooldown(); fetchHistory();
    } catch (err) { setError(err.response?.data?.error || 'Error al enviar'); }
    finally { setSending(false); }
  };

  const handleResend = async (entry) => {
    setError('');
    try {
      const files = await Promise.all(
        entry.images.map(async (fn) => {
          const resp = await fetch(`/uploads/${fn}`);
          const blob = await resp.blob();
          return new File([blob], fn, { type: blob.type || 'image/jpeg' });
        })
      );
      setImages(files); setPrev(files.map(f => URL.createObjectURL(f)));
      setMessage(entry.message || '');
      setSelected({ jid: entry.recipient_jid, name: entry.recipient_name, type: entry.recipient_type });
      setResolved(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setError('No se pudieron cargar las imágenes del historial'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/whatsapp/history/${id}`); setHistory(h => h.filter(e => e.id !== id)); } catch {}
  };

  const q                  = search.toLowerCase();
  const filteredComms      = chats.communities?.filter(c => !q || c.name.toLowerCase().includes(q) || c.groups.some(gr => gr.name.toLowerCase().includes(q))) || [];
  const filteredGroups     = (chats.groups || []).filter(gr => !q || gr.name.toLowerCase().includes(q));
  const filteredBroadcasts = (chats.broadcasts || []).filter(b => !q || b.name.toLowerCase().includes(q));

  const canSend = waReady && !sending && images.length > 0 && !!activeRecipient && cooldown === 0 && !!profileId;

  const ChatRow = ({ item, indent = false }) => (
    <div style={{ ...cs.item, ...(selected?.jid === item.jid ? cs.itemActive : {}), paddingLeft: indent ? 28 : 10 }}
      onClick={() => selectChat(item)}>
      <span style={{ fontSize: indent ? 14 : 16, lineHeight: 1 }}>{TYPE_EMOJI[item.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={cs.itemName}>{item.name}</p>
        {item.participants > 0 && <p style={cs.itemSub}>{item.participants} miembros</p>}
      </div>
      {selected?.jid === item.jid
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <span className={`badge ${BADGE_CLASS[item.type]}`} style={{ fontSize: 10 }}>{TYPE_LABEL[item.type]}</span>}
    </div>
  );

  // No profile selected
  if (!profileId) {
    return (
      <div style={g.noProfile}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)', marginBottom: 12 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Sin negocio seleccionado</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ve a <strong>Negocios</strong>, conecta un negocio y pulsa "Enviar"</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* WA status banner */}
      {!waReady && waStatus !== 'not_started' && (
        <div className="alert alert-info">
          {waStatus === 'initializing' ? 'Iniciando WhatsApp…' : waStatus === 'qr' ? 'Escanea el QR en la sección Negocios para continuar' : `Estado WhatsApp: ${waStatus}`}
        </div>
      )}
      {!waReady && waStatus === 'not_started' && (
        <div className="alert alert-info">Ve a <strong>Negocios</strong> y conecta el WhatsApp de este negocio.</div>
      )}
      {error  && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="alert alert-success">
          ✓ {result.results?.filter(r => r.sent).length} imagen(es) enviada(s)
          {cooldown > 0 && <span style={{ marginLeft: 'auto', fontSize: 11.5, opacity: .75 }}>Próximo en {cooldown}s</span>}
        </div>
      )}

      {/* ── Compose grid ─────────────────────── */}
      <div style={g.grid}>

        {/* LEFT — Destinatario */}
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={g.sectionHead}>
            <span style={g.sectionTitle}>Destinatario</span>
            {waReady && (
              <button className="btn btn-outline btn-sm" onClick={fetchChats} disabled={loadingChats}>
                {loadingChats ? '…' : '↻ Actualizar'}
              </button>
            )}
          </div>

          <div style={{ padding: '0 14px 14px' }}>
            <div style={g.tabs}>
              {[['communities','Comunidades'],['groups','Grupos'],['broadcasts','Difusión'],['manual','Manual']].map(([id, lbl]) => (
                <button key={id} style={{ ...g.tab, ...(tab === id ? g.tabOn : {}) }}
                  onClick={() => { setTab(id); setSelected(null); setResolved(null); }}>
                  {lbl}
                </button>
              ))}
            </div>

            {tab !== 'manual' && (
              <input className="input" placeholder="Buscar…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
            )}

            {loadingChats && tab !== 'manual'
              ? <p style={g.empty}>Cargando…</p>
              : (
                <div style={g.chatList}>
                  {tab === 'communities' && (
                    filteredComms.length === 0 ? <p style={g.empty}>Sin comunidades</p>
                    : filteredComms.map(c => (
                      <div key={c.announceJid}>
                        <div style={cs.comHead} onClick={() => toggleCom(c.announceJid)}>
                          <span style={{ fontSize: 14 }}>🏘️</span>
                          <span style={{ fontWeight: 700, fontSize: 12, flex: 1, color: 'var(--text)' }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded[c.announceJid] ? '▲' : '▼'}</span>
                        </div>
                        {expanded[c.announceJid] && (
                          <div>
                            <ChatRow item={c.announce} indent />
                            {c.groups.filter(g2 => !q || g2.name.toLowerCase().includes(q)).map(g2 => <ChatRow key={g2.jid} item={g2} indent />)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {tab === 'groups'     && (filteredGroups.length     === 0 ? <p style={g.empty}>Sin grupos</p>  : filteredGroups.map(i     => <ChatRow key={i.jid} item={i} />))}
                  {tab === 'broadcasts' && (filteredBroadcasts.length === 0 ? <p style={g.empty}>Sin listas</p> : filteredBroadcasts.map(i => <ChatRow key={i.jid} item={i} />))}
                  {tab === 'manual' && (
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Número (ej: 5215512345678) o ID de grupo</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input className="input" placeholder="Número o ID" value={recipient}
                          onChange={e => setRecipient(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && resolveManual()} />
                        <button className="btn btn-outline btn-sm" onClick={resolveManual}
                          disabled={resolving || !recipient.trim()} style={{ padding: '8px 14px' }}>
                          {resolving ? '…' : 'Buscar'}
                        </button>
                      </div>
                      {resolved && (
                        <div style={cs.resolved}>
                          <span style={{ fontSize: 18 }}>{TYPE_EMOJI[resolved.type]}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 13 }}>{resolved.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{resolved.jid}</p>
                          </div>
                          <span className={`badge ${BADGE_CLASS[resolved.type]}`}>{TYPE_LABEL[resolved.type]}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            {activeRecipient && (
              <div style={cs.selected}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 18 }}>{TYPE_EMOJI[activeRecipient.type]}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Enviando a</p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeRecipient.name}</p>
                  </div>
                </div>
                <button style={cs.clearBtn} onClick={() => { setSelected(null); setResolved(null); }}>✕</button>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT — Compose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Imágenes */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={g.sectionHead}>
              <span style={g.sectionTitle}>
                Imágenes
                {images.length > 0 && <span className="badge badge-primary" style={{ marginLeft: 8 }}>{images.length}</span>}
              </span>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <div style={g.upload} onClick={() => document.getElementById('img-input').click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)' }}>
                  <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Clic para seleccionar · máx. 20</span>
                <input id="img-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
              </div>
              {previews.length > 0 && (
                <div style={g.prevGrid}>
                  {previews.map((src, i) => (
                    <div key={i} style={g.prevItem}>
                      <img src={src} alt="" style={g.prevImg} />
                      <button onClick={() => removeImage(i)} style={g.removeBtn}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Mensaje */}
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={g.sectionHead}>
              <span style={g.sectionTitle}>Mensaje</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opcional</span>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <textarea className="input" rows={3}
                placeholder="Texto que acompañará las imágenes…"
                value={message} onChange={e => setMessage(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </section>

          {/* Anti-ban note */}
          <div style={g.note}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            Delay aleatorio 1.5–3.5s entre imágenes · {COOLDOWN}s de pausa entre envíos
          </div>

          {/* Send */}
          <button className="btn btn-primary btn-full" onClick={send} disabled={!canSend}
            style={{ fontSize: 14, padding: '12px', borderRadius: 9 }}>
            {sending
              ? `Enviando ${images.length} imagen(es)…`
              : cooldown > 0
                ? `Esperando ${cooldown}s…`
                : activeRecipient
                  ? `Enviar ${images.length > 0 ? images.length + ' img · ' : ''}${activeRecipient.name}`
                  : 'Selecciona destinatario e imágenes'}
          </button>
        </div>
      </div>

      {/* ── Historial ─────────────────────────── */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={g.sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={g.sectionTitle}>Historial · {profileName}</span>
            {history.length > 0 && <span className="badge badge-neutral">{history.length}</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory}>↻ Actualizar</button>
        </div>
        <div style={{ padding: '0 14px 14px' }}>
          <SentHistory history={history} loading={loadingHistory} onResend={handleResend} onDelete={handleDelete} />
        </div>
      </section>

    </div>
  );
}

const g = {
  noProfile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '80px 20px', textAlign: 'center',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' },
  sectionHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 14px 12px', borderBottom: '1px solid var(--border)', marginBottom: 12,
  },
  sectionTitle: { fontWeight: 700, fontSize: 13.5 },
  tabs: { display: 'flex', gap: 3, marginBottom: 10 },
  tab: {
    flex: 1, padding: '5px 4px', border: '1.5px solid var(--border)',
    borderRadius: 6, background: 'transparent', fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)', cursor: 'pointer', transition: 'all .12s',
  },
  tabOn: { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
  chatList: { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 },
  empty: { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 0' },
  upload: {
    border: '1.5px dashed var(--border)', borderRadius: 9,
    padding: '20px', textAlign: 'center', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  prevGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 7, marginTop: 10 },
  prevItem: { position: 'relative', borderRadius: 7, overflow: 'hidden' },
  prevImg:  { width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' },
  removeBtn: {
    position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.55)',
    color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18,
    fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  note: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, color: '#92400e',
    background: 'var(--warn-light)', border: '1px solid var(--warn-border)',
    borderRadius: 7, padding: '7px 10px',
  },
};

const cs = {
  item: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
    borderRadius: 7, cursor: 'pointer', border: '1.5px solid transparent',
    transition: 'all .12s',
  },
  itemActive: { border: '1.5px solid var(--primary)', background: 'var(--primary-light)' },
  itemName:   { fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemSub:    { fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 },
  comHead: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7,
    cursor: 'pointer', background: 'var(--surface2)', marginBottom: 2,
    borderLeft: '3px solid var(--primary)',
  },
  resolved: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
    border: '1px solid var(--border)', marginTop: 10,
  },
  selected: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: 'var(--primary-light)',
    border: '1px solid var(--primary-border)', borderRadius: 8, marginTop: 12,
  },
  clearBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px', borderRadius: 4,
  },
};
