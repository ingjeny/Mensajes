import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Negocios from './Negocios';
import ImageForward from '../modules/ImageForward/ImageForward';

const MENU = [
  {
    id: 'negocios',
    label: 'Negocios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'images',
    label: 'Reenvío de imágenes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
];

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [active, setActive]             = useState('negocios');
  const [activeProfile, setActiveProfile] = useState(null); // { id, name, color }
  const companyName = localStorage.getItem('companyName') || '—';
  const username    = localStorage.getItem('username')    || '—';

  const logout = () => { localStorage.clear(); nav('/login'); };
  const initials = companyName.slice(0, 2).toUpperCase();

  // Called from Negocios "Enviar" button
  const goSend = (profile) => {
    setActiveProfile(profile);
    setActive('images');
  };

  const pageTitle = active === 'images' && activeProfile
    ? `Reenvío · ${activeProfile.name}`
    : MENU.find(m => m.id === active)?.label;

  return (
    <div style={l.layout}>

      {/* ── Sidebar ──────────────────────────── */}
      <aside style={l.sidebar}>

        {/* Brand */}
        <div style={l.brand}>
          <div style={l.brandIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <span style={l.brandName}>Catálogo WA</span>
        </div>

        <div style={l.divider} />

        {/* User */}
        <div style={l.user}>
          <div style={l.avatar}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <p style={l.userName}>{companyName}</p>
            <p style={l.userSub}>@{username}</p>
          </div>
        </div>

        <div style={l.divider} />

        {/* Nav */}
        <p style={l.sectionLabel}>Módulos</p>
        <nav style={l.nav}>
          {MENU.map(item => (
            <button key={item.id}
              style={{ ...l.navItem, ...(active === item.id ? l.navItemActive : {}) }}
              onClick={() => setActive(item.id)}>
              <span style={l.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {active === item.id && <span style={l.navDot} />}
            </button>
          ))}
        </nav>

        {/* Active profile indicator */}
        {activeProfile && (
          <>
            <div style={l.divider} />
            <div style={l.profileChip}>
              <span style={{ ...l.profileDot, background: activeProfile.color }} />
              <span style={l.profileName}>{activeProfile.name}</span>
              <button style={l.profileClear} title="Quitar" onClick={() => setActiveProfile(null)}>✕</button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto' }}>
          <div style={l.divider} />
          <button style={l.logoutBtn} onClick={logout}>
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────── */}
      <div style={l.main}>
        {/* Top bar */}
        <header style={l.topbar}>
          <div>
            <h1 style={l.pageTitle}>{pageTitle}</h1>
          </div>
          {/* Profile badge in topbar when in send mode */}
          {active === 'images' && activeProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...l.topProfileBadge, borderLeft: `3px solid ${activeProfile.color}` }}>
                <span style={{ ...l.profileDot, background: activeProfile.color }} />
                {activeProfile.name}
              </span>
              <button className="btn btn-outline btn-sm" onClick={() => setActive('negocios')}>← Negocios</button>
            </div>
          )}
          {active !== 'images' && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          )}
        </header>

        {/* Content */}
        <div style={l.content}>
          {active === 'negocios' && <Negocios onGoSend={goSend} />}
          {active === 'images'   && <ImageForward profileId={activeProfile?.id || null} profileName={activeProfile?.name} />}
        </div>
      </div>
    </div>
  );
}

const l = {
  layout: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },

  sidebar: {
    width: 230, flexShrink: 0,
    background: 'var(--sidebar-bg)',
    display: 'flex', flexDirection: 'column',
    padding: '20px 12px', gap: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', marginBottom: 16 },
  brandIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: 'linear-gradient(135deg,#0d9488,#064e3b)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  brandName: { color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' },
  divider:   { height: 1, background: 'var(--sidebar-border)', margin: '10px 0' },
  user:      { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', marginBottom: 4 },
  avatar: {
    width: 34, height: 34, borderRadius: 9,
    background: 'rgba(255,255,255,.12)',
    color: '#fff', fontWeight: 700, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userName: { color: 'var(--sidebar-text)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userSub:  { color: 'var(--sidebar-muted)', fontSize: 11.5, marginTop: 1 },
  sectionLabel: {
    color: 'var(--sidebar-muted)', fontSize: 10.5, fontWeight: 700,
    letterSpacing: '.8px', textTransform: 'uppercase',
    padding: '4px 8px 6px', marginTop: 4,
  },
  nav:        { display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 10px', borderRadius: 8,
    background: 'transparent', border: 'none',
    color: 'var(--sidebar-text)', fontSize: 13, fontWeight: 500,
    textAlign: 'left', cursor: 'pointer',
    transition: 'background .12s, color .12s', position: 'relative',
  },
  navItemActive: { background: 'var(--sidebar-active)', color: '#fff', fontWeight: 600 },
  navIcon:  { display: 'flex', flexShrink: 0, opacity: .75 },
  navDot:   { marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#0d9488' },

  profileChip: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,.07)',
    border: '1px solid rgba(255,255,255,.08)',
  },
  profileDot:   { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  profileName:  { color: 'var(--sidebar-text)', fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  profileClear: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sidebar-muted)', fontSize: 12, padding: '1px 3px', borderRadius: 3 },

  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 10px', borderRadius: 8, border: 'none',
    background: 'transparent', color: 'var(--sidebar-muted)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%',
  },

  main:    { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 28px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', gap: 20,
  },
  pageTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)' },
  topProfileBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px 5px 8px', borderRadius: 7,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
  },
  content:  { flex: 1, padding: '24px 28px', overflowY: 'auto' },
};
