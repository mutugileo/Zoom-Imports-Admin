import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AdminContext';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { initialsOf } from '../lib/dashboardData';
import { CarMark } from '../components/CarMark';
import { AdminIcon } from '../components/AdminIcon';
import {
  Gauge,
  CarFront,
  Boxes,
  GitCompareArrows,
  ClipboardList,
  MessagesSquare,
  ArrowLeft,
  FileStack,
  Settings2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
, Layers, Star } from 'lucide-react';

const RAIL_COLLAPSED_KEY = 'admin-rail-collapsed';

export const AdminLayout = ({ children }) => {
  const { currentView, navigateTo, currentUser, canView, signOut, idleWarning, staySignedIn } = useApp();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(RAIL_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTrapRef = useFocusTrap(mobileOpen);

  useEffect(() => {
    try { localStorage.setItem(RAIL_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMobileOpen(false); };
    const closeOnDesktop = (event) => { if (event.matches) setMobileOpen(false); };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [mobileOpen]);

  const navItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'admin-vehicles', label: 'Vehicles', icon: CarFront },
    { id: 'admin-groups', label: 'Shipments', icon: Layers },
    { id: 'admin-parts', label: 'Spare Parts', icon: Boxes },
    { id: 'admin-compatibility', label: 'Compatibility', icon: GitCompareArrows },
    { id: 'admin-orders', label: 'Orders', icon: ClipboardList },
    { id: 'admin-enquiries', label: 'Enquiries', icon: MessagesSquare },
    { id: 'admin-reviews', label: 'Reviews', icon: Star },
    { id: 'admin-content', label: 'Site Content', icon: FileStack },
    { id: 'admin-settings', label: 'Settings', icon: Settings2 }
  ].filter((item) => canView(item.id));
  // Filtered, not disabled: a greyed-out row invites people to ask why they
  // cannot click it. The router checks again, since the sidebar is only a menu.
  const railCollapsed = collapsed && !mobileOpen;

  return (
    <div className="admin-shell">

      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-mobile-menu"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="admin-navigation"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <span className="admin-mobile-brand">
          <CarMark height={19} color="#000000" />
          <span>Zoom Imports</span>
        </span>
        <span className="admin-mobile-avatar" aria-label={currentUser ? `Signed in as ${currentUser.name}` : 'Admin'}>
          {currentUser ? initialsOf(currentUser.name) : 'ZI'}
        </span>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="admin-rail-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Brand rail — the blue chrome */}
      <div
        id="admin-navigation"
        className="admin-rail"
        ref={mobileTrapRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label={mobileOpen ? 'Admin navigation' : undefined}
        tabIndex={mobileOpen ? -1 : undefined}
        data-collapsed={railCollapsed ? 'true' : undefined}
        data-mobile-open={mobileOpen ? 'true' : undefined}
      >
        <button
          type="button"
          className="admin-mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Collapse handle — sits on the rail's own edge, the VS Code / Notion
            pattern, so it reads as part of the boundary rather than a stray
            button floating in the content. */}
        <button
          type="button"
          className="admin-rail-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute', top: '28px', right: '-13px',
            width: '26px', height: '26px', borderRadius: '999px',
            border: '1px solid var(--border-medium)', background: '#ffffff',
            color: 'var(--primary-ink)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
            zIndex: 5, padding: 0,
          }}
        >
          {/* A thin 2px stroke on a 14px glyph loses too many pixels to
              anti-aliasing at this size — bumped up and thickened so the
              handle reads as an icon, not an empty circle. */}
          {railCollapsed
            ? <ChevronRight size={16} strokeWidth={2.75} />
            : <ChevronLeft size={16} strokeWidth={2.75} />}
        </button>

        <div>
          <div
            style={{
              padding: railCollapsed ? '0 0 22px' : '0 24px 22px',
              borderBottom: '1px solid rgba(0,0,0,0.14)',
              display: 'flex', flexDirection: 'column',
              alignItems: railCollapsed ? 'center' : 'flex-start',
            }}
          >
            {/* Black, not white: a graphical mark needs 3:1 against its ground
                and white on this blue is 2.43. Black is 8.64. */}
            <div style={{ marginBottom: railCollapsed ? 0 : '10px' }}>
              <CarMark height={24} color="#000000" />
            </div>
            {!railCollapsed && (
              <>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'var(--text-xl)', color: '#000' }}>
                  Zoom Imports
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700,
                    letterSpacing: '0.09em', textTransform: 'uppercase',
                    color: 'rgba(0,0,0,.72)', marginTop: '4px',
                  }}
                >
                  Dealership portal
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: railCollapsed ? '16px 10px 0' : '16px 14px 0' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { navigateTo(item.id); setMobileOpen(false); }}
                  aria-current={isActive ? 'page' : undefined}
                  className="nav-item"
                  data-active={isActive ? 'true' : undefined}
                  data-collapsed={railCollapsed ? 'true' : undefined}
                  title={railCollapsed ? item.label : undefined}
                >
                  <AdminIcon icon={Icon} variant="nav" size={18} />
                  {!railCollapsed && item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Who is signed in, and the way out. Both live at the foot of the rail
            because on a shared counter terminal the first question is always
            "whose session is this?" */}
        <div style={{ padding: railCollapsed ? '0 10px' : '0 14px' }}>
          {currentUser && (
            <div
              style={{
                padding: railCollapsed ? '16px 0 12px' : '16px 14px 12px',
                margin: '0 0 6px',
                borderTop: '1px solid rgba(0,0,0,0.14)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: railCollapsed ? 0 : '10px', justifyContent: railCollapsed ? 'center' : 'flex-start' }}>
                {/* Initials rather than a photo: nobody uploads one to a counter
                    terminal, and an empty avatar frame reads as a failed image. */}
                <span
                  aria-hidden="true"
                  title={railCollapsed ? currentUser.name : undefined}
                  style={{
                    width: '34px', height: '34px', borderRadius: '999px', flexShrink: 0,
                    background: '#ffffff', color: 'var(--primary-ink)', fontSize: 'var(--text-sm)', fontWeight: 700,
                    letterSpacing: '0.02em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {initialsOf(currentUser.name)}
                </span>
                {!railCollapsed && (
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.name}
                    </span>
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'rgba(0,0,0,.62)', marginTop: '1px' }}>
                      {currentUser.role}
                    </span>
                  </span>
                )}
              </div>
              <button
                onClick={signOut}
                title={railCollapsed ? 'Sign out' : undefined}
                style={{
                  marginTop: '10px', width: '100%', padding: '8px 10px',
                  fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer',
                  color: '#000', background: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(0,0,0,0.14)', borderRadius: 'var(--radius-pill)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: railCollapsed ? 0 : '7px',
                }}
              >
                <LogOut size={14} /> {!railCollapsed && 'Sign out'}
              </button>
            </div>
          )}
          <a
            href={import.meta.env?.VITE_WEBSITE_URL || 'http://localhost:3000'}
            title={railCollapsed ? 'Exit to Customer Site' : undefined}
            style={{
              padding: railCollapsed ? '11px 0' : '11px 14px',
              fontSize: 'var(--text-sm)',
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: railCollapsed ? 'center' : 'flex-start',
              gap: railCollapsed ? 0 : '8px',
            }}
          >
            <ArrowLeft size={16} /> {!railCollapsed && 'Exit to Customer Site'}
          </a>
        </div>

      </div>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* A minute's notice before the idle sign-out. Someone mid-way through
            a long vehicle form gets the chance to keep it rather than finding
            the login screen and an empty form when they come back. */}
        {idleWarning && (
          <div role="status" className="idle-warning">
            <span>You will be signed out in a minute. Any unsaved work on this screen would be lost.</span>
            <button type="button" onClick={staySignedIn}>Keep me signed in</button>
          </div>
        )}

        {children}
      </main>

    </div>
  );
};
