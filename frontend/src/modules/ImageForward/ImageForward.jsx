import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ImageForward({ waReady }) {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [message, setMessage] = useState('');

  const [recipient, setRecipient] = useState('');
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);

  const [chats, setChats] = useState({ communities: [], groups: [], broadcasts: [] });
  const [loadingChats, setLoadingChats] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('communities');
  const [expandedCommunities, setExpandedCommunities] = useState({});

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (waReady) fetchChats(); }, [waReady]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get('/whatsapp/chats');
      setChats(data);
      // Expandir todas las comunidades por defecto
      const expanded = {};
      data.communities?.forEach(c => { expanded[c.announceJid] = true; });
      setExpandedCommunities(expanded);
    } catch {}
    setLoadingChats(false);
  };

  const activeRecipient = selected || resolved;

  const handleImages = e => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
    setResult(null); setError('');
  };

  const removeImage = idx => {
    setImages(p => p.filter((_, i) => i !== idx));
    setPreviews(p => { URL.revokeObjectURL(p[idx]); return p.filter((_, i) => i !== idx); });
  };

  const resolveManual = async () => {
    if (!recipient.trim()) return;
    setResolving(true); setResolved(null); setSelected(null); setError('');
    try {
      const { data } = await api.get(`/whatsapp/resolve/${encodeURIComponent(recipient.trim())}`);
      setResolved(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se encontró');
    } finally { setResolving(false); }
  };

  const selectChat = item => { setSelected(item); setResolved(null); setRecipient(''); setError(''); };

  const toggleCommunity = jid =>
    setExpandedCommunities(p => ({ ...p, [jid]: !p[jid] }));

  const send = async () => {
    if (!activeRecipient) return setError('Selecciona un destinatario');
    if (images.length === 0) return setError('Agrega al menos una imagen');
    setSending(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      images.forEach(img => fd.append('images', img));
      fd.append('jid', activeRecipient.jid);
      fd.append('message', message);
      const { data } = await api.post('/whatsapp/send-images', fd);
      setResult(data);
      setImages([]); setPreviews([]); setSelected(null); setResolved(null);
      setRecipient(''); setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar');
    } finally { setSending(false); }
  };

  const q = search.toLowerCase();

  // Filtrar comunidades: muestra comunidad si su nombre o algún grupo coincide
  const filteredCommunities = chats.communities?.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.groups.some(g => g.name.toLowerCase().includes(q))
  ) || [];

  const filteredGroups = (chats.groups || []).filter(g => !q || g.name.toLowerCase().includes(q));
  const filteredBroadcasts = (chats.broadcasts || []).filter(b => !q || b.name.toLowerCase().includes(q));

  const typeEmoji = { group: '👥', broadcast: '📢', contact: '👤', announce: '📣', community_group: '👥' };
  const badgeClass = { group: 'badge-yellow', broadcast: 'badge-green', contact: 'badge-gray', announce: 'badge-red', community_group: 'badge-yellow' };
  const typeLabel  = { group: 'Grupo', broadcast: 'Difusión', contact: 'Contacto', announce: 'Avisos', community_group: 'Grupo comunidad' };

  const ChatRow = ({ item, indent = false }) => (
    <div
      style={{ ...styles.chatItem, ...(selected?.jid === item.jid ? styles.chatItemActive : {}), marginLeft: indent ? 16 : 0 }}
      onClick={() => selectChat(item)}>
      <span style={{ fontSize: indent ? 16 : 18 }}>{typeEmoji[item.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.chatName}>{item.name}</p>
        {item.participants > 0 && <p style={styles.chatSub}>{item.participants} participantes</p>}
      </div>
      {selected?.jid === item.jid
        ? <span style={styles.checkmark}>✓</span>
        : <span className={`badge ${badgeClass[item.type]}`} style={{ fontSize: 10 }}>{typeLabel[item.type]}</span>}
    </div>
  );

  return (
    <div>
      <h3 style={styles.sectionTitle}>Reenvío de Imágenes</h3>

      {!waReady && <div className="alert alert-info">Conecta WhatsApp primero para poder enviar.</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="alert alert-success">
          ✓ {result.results?.filter(r => r.sent).length} imagen(es) enviada(s) a <b>{activeRecipient?.name || ''}</b>
        </div>
      )}

      <div style={styles.grid}>
        {/* COLUMNA IZQUIERDA */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Destinatario</span>
              {waReady && (
                <button className="btn btn-secondary" onClick={fetchChats} disabled={loadingChats}
                  style={{ padding: '4px 10px', fontSize: 12 }}>
                  {loadingChats ? '...' : '↻ Actualizar'}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
              {[
                ['communities', '🏘️ Comunidades'],
                ['groups',      '👥 Grupos'],
                ['broadcasts',  '📢 Difusión'],
                ['manual',      '🔍 Manual'],
              ].map(([id, label]) => (
                <button key={id}
                  style={{ ...styles.tabBtn, ...(tab === id ? styles.tabBtnActive : {}) }}
                  onClick={() => { setTab(id); setSelected(null); setResolved(null); }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            {tab !== 'manual' && (
              <input className="input" placeholder="Buscar..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }} />
            )}

            {loadingChats && tab !== 'manual' ? (
              <p style={styles.empty}>Cargando chats...</p>
            ) : (
              <>
                {/* COMUNIDADES */}
                {tab === 'communities' && (
                  filteredCommunities.length === 0
                    ? <p style={styles.empty}>No hay comunidades</p>
                    : <div style={styles.chatList}>
                        {filteredCommunities.map(community => (
                          <div key={community.announceJid}>
                            {/* Cabecera de comunidad */}
                            <div style={styles.communityHeader}
                              onClick={() => toggleCommunity(community.announceJid)}>
                              <span style={{ fontSize: 20 }}>🏘️</span>
                              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{community.name}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {expandedCommunities[community.announceJid] ? '▲' : '▼'}
                              </span>
                            </div>

                            {expandedCommunities[community.announceJid] && (
                              <div style={{ paddingLeft: 8, marginBottom: 4 }}>
                                {/* Canal de Avisos */}
                                <ChatRow item={community.announce} indent />

                                {/* Grupos de la comunidad */}
                                {community.groups
                                  .filter(g => !q || g.name.toLowerCase().includes(q))
                                  .map(g => <ChatRow key={g.jid} item={g} indent />)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                )}

                {/* GRUPOS NORMALES */}
                {tab === 'groups' && (
                  filteredGroups.length === 0
                    ? <p style={styles.empty}>No hay grupos</p>
                    : <div style={styles.chatList}>
                        {filteredGroups.map(g => <ChatRow key={g.jid} item={g} />)}
                      </div>
                )}

                {/* DIFUSIÓN */}
                {tab === 'broadcasts' && (
                  filteredBroadcasts.length === 0
                    ? <p style={styles.empty}>No hay listas de difusión</p>
                    : <div style={styles.chatList}>
                        {filteredBroadcasts.map(b => <ChatRow key={b.jid} item={b} />)}
                      </div>
                )}

                {/* MANUAL */}
                {tab === 'manual' && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Ingresa número (ej: 5215512345678) o ID de grupo
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="input" placeholder="Número o ID"
                        value={recipient} onChange={e => setRecipient(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && resolveManual()} />
                      <button className="btn btn-secondary" onClick={resolveManual}
                        disabled={resolving || !recipient.trim()} style={{ whiteSpace: 'nowrap' }}>
                        {resolving ? '...' : 'Buscar'}
                      </button>
                    </div>
                    {resolved && (
                      <div style={{ ...styles.resolvedBox, marginTop: 10 }}>
                        <span style={{ fontSize: 20 }}>{typeEmoji[resolved.type]}</span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{resolved.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{resolved.jid}</p>
                        </div>
                        <span className={`badge ${badgeClass[resolved.type]}`}>{typeLabel[resolved.type]}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Seleccionado activo */}
            {activeRecipient && (
              <div style={{ ...styles.resolvedBox, marginTop: 12 }}>
                <span style={{ fontSize: 20 }}>{typeEmoji[activeRecipient.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>ENVIANDO A:</p>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-dark)' }}>{activeRecipient.name}</p>
                </div>
                <button style={styles.clearBtn} onClick={() => { setSelected(null); setResolved(null); }}>✕</button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
              Imágenes {images.length > 0 && <span className="badge badge-green">{images.length}</span>}
            </p>
            <div style={styles.uploadZone} onClick={() => document.getElementById('img-input').click()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>Clic para seleccionar (máx. 20)</p>
              <input id="img-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
            </div>

            {previews.length > 0 && (
              <div style={styles.previewGrid}>
                {previews.map((src, i) => (
                  <div key={i} style={styles.previewItem}>
                    <img src={src} alt="" style={styles.previewImg} />
                    <button onClick={() => removeImage(i)} style={styles.removeBtn}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mensaje (opcional)</label>
              <textarea className="input" rows={3}
                placeholder="Escribe el mensaje que acompañará las imágenes..."
                value={message} onChange={e => setMessage(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>

          <button className="btn btn-primary btn-full" onClick={send}
            disabled={!waReady || sending || images.length === 0 || !activeRecipient}
            style={{ fontSize: 15, padding: '12px 20px' }}>
            {sending
              ? `Enviando ${images.length} imagen(es)...`
              : activeRecipient
                ? `📤 Enviar ${images.length} img a "${activeRecipient.name}"`
                : '📤 Selecciona destinatario'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' },
  tabs: { display: 'flex', gap: 3, marginBottom: 10, flexWrap: 'wrap' },
  tabBtn: {
    flex: '1 1 auto', padding: '6px 4px', border: '1.5px solid var(--border)',
    borderRadius: 8, background: 'var(--bg)', fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap'
  },
  tabBtnActive: { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' },
  chatList: { maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 },
  empty: { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' },
  communityHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
    background: 'var(--bg)', marginBottom: 4,
    borderLeft: '3px solid var(--green)'
  },
  chatItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
    border: '1.5px solid transparent', transition: 'all .15s', background: 'var(--bg)'
  },
  chatItemActive: { border: '1.5px solid var(--green)', background: 'var(--green-light)' },
  chatName: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  chatSub: { fontSize: 11, color: 'var(--text-muted)' },
  checkmark: { color: 'var(--green)', fontWeight: 700, fontSize: 16 },
  resolvedBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: 'var(--green-light)', borderRadius: 8
  },
  clearBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 16, padding: 4
  },
  uploadZone: {
    border: '2px dashed var(--border)', borderRadius: 10,
    padding: '18px', textAlign: 'center', cursor: 'pointer'
  },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginTop: 12 },
  previewItem: { position: 'relative', borderRadius: 8, overflow: 'hidden' },
  previewImg: { width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' },
  removeBtn: {
    position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.6)',
    color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20,
    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  }
};
