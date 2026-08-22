import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AdminContext';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { initialsOf } from '../lib/dashboardData';
import { CarMark } from '../components/CarMark';

/**
 * The real Zoom Imports badge, cropped to a circle.
 *
 * `cover`, not `contain`: the artwork is a square tile whose red honeycomb
 * ground runs to the edges, so a circle takes the ground away and leaves the
 * badge. With `contain` you get a red square in a round hole.
 *
 * Falls back to the CarMark line drawing rather than a broken-image glyph —
 * the rail is the first thing anyone sees, and a missing file should look like
 * a plain mark, not a fault.
 */
const BrandMark = ({ size }) => (
  <>
    <img
      src="/media/logo.jpg"
      alt="Zoom Imports"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
    />
    <span style={{ display: 'none' }}><CarMark height={size} color="var(--on-sidebar)" /></span>
  </>
);
import { AdminIcon } from '../components/AdminIcon';
import {
  Gauge,
  CarFront,
  Boxes,
  GitCompareArrows,
  ClipboardList,
  MessagesSquare,
  FileStack,
  Settings2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  History,
  Layers, Star, ReceiptText, Ship, UserRound, Smartphone, ClipboardCheck, DoorOpen, HelpCircle } from 'lucide-react';

const RAIL_COLLAPSED_KEY = 'admin-rail-collapsed';
const FOOT_OPEN_KEY = 'admin-rail-foot-open';

export const AdminLayout = ({ children }) => {
  const { currentView, navigateTo, currentUser, canView, signOut, idleWarning, staySignedIn, theme, toggleTheme } = useApp();

  /* Theme and Help fold away under the user block. They are settings, looked
     at rarely, and on a fifteen-item rail they were costing the nav two rows
     it needed. Remembered per terminal, since whoever works this counter will
     want the same answer tomorrow. */
  const [footOpen, setFootOpen] = useState(() => {
    try { return localStorage.getItem(FOOT_OPEN_KEY) !== 'false'; } catch { return true; }
  });
  const toggleFoot = () => setFootOpen((v) => {
    const next = !v;
    try { localStorage.setItem(FOOT_OPEN_KEY, String(next)); } catch { /* private mode */ }
    return next;
  });

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

  /* Grouped by what someone came here to do, not by table name.
     Dashboard sits above the groups rather than inside one: it is the landing
     view and belongs to no single area.

     Each group is filtered by role and then dropped entirely when it has no
     surviving items — a heading over an empty space reads as a broken menu,
     and ROLE_VIEWS genuinely empties some of these (Sales Staff sees no
     Compatibility, Shipments, Reviews or Site Content). */
  const navGroups = [
    { title: null, items: [
      { id: 'admin-dashboard', label: 'Dashboard', icon: Gauge },
    ] },
    { title: 'Inventory', items: [
      { id: 'admin-vehicles', label: 'Vehicles', icon: CarFront },
      { id: 'admin-consignments', label: 'Consignments', icon: ClipboardCheck },
      { id: 'admin-history', label: 'History & Archive', icon: History },
      { id: 'admin-parts', label: 'Spare Parts', icon: Boxes },
      { id: 'admin-compatibility', label: 'Compatibility', icon: GitCompareArrows },
    ] },
    { title: 'Sales & fulfilment', items: [
      { id: 'admin-orders', label: 'Orders', icon: ClipboardList },
      { id: 'admin-groups', label: 'Shipments', icon: Ship },
      { id: 'admin-gate-passes', label: 'Gate Passes', icon: DoorOpen },
    ] },
    { title: 'Customers', items: [
      { id: 'admin-buyers', label: 'Buyers', icon: UserRound },
      { id: 'admin-enquiries', label: 'Enquiries', icon: MessagesSquare },
      { id: 'admin-reviews', label: 'Reviews', icon: Star },
    ] },
    { title: 'Administration', items: [
      { id: 'admin-mobile', label: 'Mobile App', icon: Smartphone },
      { id: 'admin-content', label: 'Site Content', icon: FileStack },
      { id: 'admin-settings', label: 'Settings', icon: Settings2 },
    ] },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => canView(item.id)) }))
    .filter((group) => group.items.length > 0);
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
          <BrandMark size={26} />
          <span>Zoom Imports</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--on-sidebar)'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="admin-mobile-avatar" aria-label={currentUser ? `Signed in as ${currentUser.name}` : 'Admin'}>
            {currentUser ? initialsOf(currentUser.name) : 'ZI'}
          </span>
        </div>
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
            border: '1px solid var(--border-medium)', background: 'var(--bg-card)',
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

        {/* Brand block + nav, as a flex column that can shrink.
            This was a bare <div>. The rail is height:100vh with
            justify-content:space-between, so this wrapper got a fixed slice of
            the viewport while its content kept its natural height — the nav ran
            straight past the bottom edge and painted Site Content and Settings
            *underneath* the user block. They were in the DOM, inside the
            viewport, and unclickable.

            minHeight:0 is the load-bearing part: a flex child will not shrink
            below its content without it, so the nav's own overflow never
            engages and nothing scrolls. */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
          {/* Mark and wordmark on one line. Stacked, the badge pushed the
              name down and the whole block ate vertical space the nav needs at
              laptop heights — and a round mark beside its name is how a
              letterhead sets it, which is what the printed documents already
              do. Collapsed, the rail is icon-width and the text has nowhere to
              go, so it stacks back to just the mark. */}
          <div
            style={{
              padding: railCollapsed ? '0 0 18px' : '0 20px 18px',
              borderBottom: '1px solid var(--sidebar-line)',
              display: 'flex',
              flexDirection: railCollapsed ? 'column' : 'row',
              alignItems: 'center',
              gap: railCollapsed ? 0 : '11px',
            }}
          >
            <BrandMark size={railCollapsed ? 30 : 40} />
            {!railCollapsed && (
              <div style={{ minWidth: 0, lineHeight: 1.15 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--on-sidebar)' }}>
                  Zoom Imports
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--on-sidebar) 72%, transparent)', marginTop: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Dealership portal
                </div>
              </div>
            )}
          </div>

          {/* flex:1 + minHeight:0 + overflow-y:auto, together.
              Without them this column kept its natural height, ran past its
              parent and painted Site Content and Settings *underneath* the user
              block at the foot of the rail — present in the DOM, inside the
              viewport, and impossible to click. Hidden beats scrolled only in
              the sense that nobody complains about what they cannot see.
              minHeight:0 is the one that is easy to omit: a flex child will not
              shrink below its content without it, so overflow never engages. */}
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '2px',
              padding: railCollapsed ? '12px 10px 0' : '12px 14px 0',
              flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
            }}
          >
            {navGroups.map((group) => (
              <div key={group.title ?? 'primary'} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Collapsed, the rail is icons only — a heading would have no
                    room and the group is already read as a gap. A hairline
                    keeps the grouping legible without text. */}
                {group.title && (railCollapsed ? (
                  <div aria-hidden="true" style={{ height: '1px', background: 'var(--band-line)', margin: '10px 6px 6px' }} />
                ) : (
                  <div
                    style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.09em',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                      padding: '7px 12px 3px',
                    }}
                  >
                    {group.title}
                  </div>
                ))}
                {group.items.map(item => {
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
            ))}
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
                borderTop: '1px solid var(--sidebar-line)',
              }}
            >
              <button
                type="button"
                onClick={railCollapsed ? undefined : toggleFoot}
                aria-expanded={railCollapsed ? undefined : footOpen}
                title={railCollapsed ? currentUser.name : (footOpen ? 'Hide options' : 'Show options')}
                style={{
                  width: '100%', background: 'transparent', border: 'none', padding: 0,
                  cursor: railCollapsed ? 'default' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center',
                  gap: railCollapsed ? 0 : '10px',
                  justifyContent: railCollapsed ? 'center' : 'flex-start',
                  textAlign: 'left',
                }}
              >
                {/* Initials rather than a photo: nobody uploads one to a counter
                    terminal, and an empty avatar frame reads as a failed image. */}
                <span
                  aria-hidden="true"
                  title={railCollapsed ? currentUser.name : undefined}
                  style={{
                    width: '34px', height: '34px', borderRadius: '999px', flexShrink: 0,
                    background: 'var(--bg-card)', color: 'var(--primary-ink)', fontSize: 'var(--text-sm)', fontWeight: 700,
                    letterSpacing: '0.02em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {initialsOf(currentUser.name)}
                </span>
                {!railCollapsed && (
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--on-sidebar)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.name}
                    </span>
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'color-mix(in srgb, var(--on-sidebar) 62%, transparent)', marginTop: '1px' }}>
                      {currentUser.role}
                    </span>
                  </span>
                )}
                {!railCollapsed && (
                  <span
                    aria-hidden="true"
                    style={{
                      marginLeft: 'auto', flexShrink: 0, width: '16px', textAlign: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 700,
                      lineHeight: 1, color: 'color-mix(in srgb, var(--on-sidebar) 62%, transparent)',
                    }}
                  >
                    {footOpen ? '\u2212' : '+'}
                  </span>
                )}
              </button>
            </div>
          )}
          {/* Theme and Help fold; Log out never does.
              Sign-out on a shared counter terminal must not be one click
              further away than it already is — someone who cannot see it walks
              off leaving the session open, which is exactly the failure the
              idle timeout exists to catch. Collapsed the rail is icon-width,
              where there is no room to fold anything, so the group always
              shows. */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: (footOpen || railCollapsed) ? '1fr' : '0fr',
              transition: 'grid-template-rows 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div style={{ overflow: 'hidden', visibility: (footOpen || railCollapsed) ? 'visible' : 'hidden' }}>
          <button
            type="button"
            onClick={toggleTheme}
            title={railCollapsed ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : undefined}
            style={{
              width: '100%',
              padding: railCollapsed ? '9px 0' : '9px 14px',
              margin: '6px 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--on-sidebar)',
              background: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: railCollapsed ? 'center' : 'flex-start',
              gap: railCollapsed ? 0 : '8px',
              transition: 'background 0.2s ease',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!railCollapsed && (theme === 'dark' ? 'Light Theme' : 'Dark Theme')}
          </button>
          {/* Help lives here rather than in the grouped nav. It is not a work
              area, the rail is already at fifteen items, and someone reaching
              for help is not looking under Inventory. */}
          <button
            type="button"
            onClick={() => { navigateTo('admin-help'); setMobileOpen(false); }}
            aria-current={currentView === 'admin-help' ? 'page' : undefined}
            title={railCollapsed ? 'How to use the portal' : undefined}
            style={{
              width: '100%',
              padding: railCollapsed ? '9px 0' : '9px 14px',
              margin: '6px 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--on-sidebar)',
              background: currentView === 'admin-help' ? 'rgba(255,255,255,0.45)' : 'transparent',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: railCollapsed ? 'center' : 'flex-start',
              gap: railCollapsed ? 0 : '8px',
            }}
          >
            <HelpCircle size={16} />
            {!railCollapsed && 'How to use this'}
          </button>

            </div>
          </div>

          {/* One way out, not two.
              The rail used to carry a Sign out button inside the user block and
              an "Exit to Customer Site" link beneath it — the link only opened
              the storefront, which is a bookmark, not a piece of chrome worth
              permanent rail space. Both are now this single button, which buys
              back the height a growing menu needs. */}
          <button
            type="button"
            onClick={signOut}
            title={railCollapsed ? 'Log out' : undefined}
            style={{
              width: '100%',
              marginBottom: '6px',
              padding: railCollapsed ? '9px 0' : '9px 14px',
              fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer',
              color: 'var(--on-sidebar)', background: 'var(--sidebar-hover)',
              border: '1px solid var(--sidebar-line)', borderRadius: 'var(--radius-pill)',
              display: 'flex', alignItems: 'center',
              justifyContent: railCollapsed ? 'center' : 'flex-start',
              gap: railCollapsed ? 0 : '8px',
            }}
          >
            <LogOut size={16} /> {!railCollapsed && 'Log out'}
          </button>
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
