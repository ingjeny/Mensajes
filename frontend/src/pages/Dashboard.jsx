import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WhatsAppStatus from '../components/WhatsAppStatus';
import ImageForward from '../modules/ImageForward/ImageForward';

const MENU = [
  { id: 'images', label: 'Reenvío de Imágenes', icon: '🖼️' },
];

export default function Dashboard() {
  const nav = useNavigate();
  const [active, setActive] = useState('images');
  const [waReady, setWaReady] = useState(false);
  const companyName = localStorage.getItem('companyName') || '';
  const username = localStorage.getItem('username') || '';

  const logout = () => {
    localStorage.clear();
    nav('/login');
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <div>
            <p style={styles.companyName}>{companyName}</p>
            <p style={styles.userName}>{username}</p>
          </div>
        </div>

        <nav style={styles.nav}>
          {MENU.map(item => (
            <button key={item.id}
              style={{ ...styles.navItem, ...(active === item.id ? styles.navItemActive : {}) }}
              onClick={() => setActive(item.id)}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="btn btn-danger" onClick={logout} style={styles.logoutBtn}>
          Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <WhatsAppStatus onReady={() => setWaReady(true)} />
        {active === 'images' && <ImageForward waReady={waReady} />}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 240,
    background: 'var(--green-dark)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    gap: 4,
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 8px 20px',
    borderBottom: '1px solid rgba(255,255,255,.2)',
    marginBottom: 8
  },
  companyName: { color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 },
  userName: { color: 'rgba(255,255,255,.7)', fontSize: 12 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,.8)', fontSize: 14, fontWeight: 500,
    textAlign: 'left', cursor: 'pointer', transition: 'background .15s'
  },
  navItemActive: {
    background: 'rgba(255,255,255,.2)',
    color: '#fff', fontWeight: 700
  },
  logoutBtn: { marginTop: 'auto', width: '100%', fontSize: 13 },
  main: { flex: 1, padding: '24px', overflowY: 'auto' }
};
