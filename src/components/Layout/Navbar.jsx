import { useState } from 'react';
import { Bell, ChevronDown, Zap, LogOut, User, Settings } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const NAV_LINKS = ['Dashboard', 'Leads', 'Sequences', 'Batch'];

export default function Navbar({ activePage, setActivePage, user, onLogout, onSettings }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'K';

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <nav style={{
      background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #27272a',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 24px', height: 56,
      gap: isMobile ? 8 : 0,
    }}>
      {/* Logo */}
      <div onClick={() => setActivePage('Dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #b45309)',
          borderRadius: 8, width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(245,158,11,0.35)',
        }}>
          <Zap size={14} color="#09090b" fill="#09090b" />
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px', color: '#fafafa' }}>Kestrel</span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: '#f59e0b',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 4, padding: '1px 6px', letterSpacing: '0.5px',
        }}>BETA</span>
        {!isMobile && (
          <span style={{ fontSize: 11, color: '#52525b', marginLeft: 4, fontStyle: 'italic' }}>
            Sharp intelligence. Precise outreach.
          </span>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
        {NAV_LINKS.map(link => (
          <button key={link} onClick={() => setActivePage(link)} style={{
            fontSize: isMobile ? 12 : 13, fontWeight: activePage === link ? 500 : 400,
            color: activePage === link ? '#f4f4f5' : '#71717a',
            background: activePage === link ? '#27272a' : 'transparent',
            border: 'none', borderRadius: 6,
            padding: isMobile ? '6px 10px' : '6px 14px',
            cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
          }}>{link}</button>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, position: 'relative', flexShrink: 0 }}>
        {!isMobile && (
          <button style={{
            background: 'none', border: 'none', color: '#52525b', cursor: 'pointer',
            padding: 6, borderRadius: 6, position: 'relative', display: 'flex',
          }}>
            <Bell size={16} />
          </button>
        )}

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#18181b', border: '1px solid #27272a',
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#09090b', flexShrink: 0,
            }}>{initials}</div>
            {!isMobile && (
              <span style={{ fontSize: 13, color: '#d4d4d8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
            )}
            <ChevronDown size={12} color="#52525b" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div onClick={() => setDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                background: '#18181b', border: '1px solid #27272a', borderRadius: 10,
                padding: '6px', minWidth: 200,
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                animation: 'fadeInUp 0.15s ease',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #27272a', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5', margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: 11, color: '#52525b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
                <DropItem icon={<Settings size={13} />} label="Settings" onClick={() => { setDropdownOpen(false); onSettings?.(); }} />
                <DropItem icon={<LogOut size={13} />} label="Sign out" onClick={() => { setDropdownOpen(false); onLogout?.(); }} danger />
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function DropItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', borderRadius: 6,
      padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
      color: danger ? '#f87171' : '#d4d4d8', fontSize: 13,
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon} {label}
    </button>
  );
}
