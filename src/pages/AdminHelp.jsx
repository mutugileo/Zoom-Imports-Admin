import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { HELP_GUIDES } from '@shared/data/helpGuides';
import { Printer } from 'lucide-react';

const card = { background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' };

/**
 * How to use the portal.
 *
 * Filtered by role, using the same canView() the sidebar uses. Someone reading
 * a guide to a screen they cannot open learns that the app is broken, not how
 * to use it — so Sales Staff never sees the consignment guide, and an
 * Inventory Manager never sees the one about orders.
 *
 * Deliberately static text rather than a guided tour. Element-anchored tours
 * break every time a layout shifts, and this portal is still moving; "Vehicles
 * → Add Vehicle" survives a redesign, a tooltip pinned to a button does not.
 */
export const AdminHelp = () => {
  const { canView, currentUser } = useApp();

  const guides = useMemo(
    () => HELP_GUIDES.filter((g) => !g.needs || canView(g.needs)),
    [canView]
  );

  /* The irreversible card is open on arrival and the rest are closed. It is
     the one someone will wish they had read, and a page of collapsed headings
     with nothing open reads as empty. */
  const [open, setOpen] = useState(() => new Set(['undo']));
  const toggle = (id) => setOpen((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <AdminLayout>
      <div className="admin-page help-page" style={{ padding: '0 32px 48px', maxWidth: '820px' }}>
        <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>How to use the portal</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
              {currentUser?.role
                ? `Showing what a ${currentUser.role} can do.`
                : 'Showing what your account can do.'}
            </p>
          </div>
          <button type="button" className="btn-secondary help-print" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
          {guides.map((g) => {
            const isOpen = open.has(g.id);
            const caution = g.tone === 'caution';
            return (
              <section
                key={g.id}
                className={`help-card${isOpen ? ' is-open' : ''}${caution ? ' is-caution' : ''}`}
                style={{
                  ...card,
                  /* The open card lifts and takes an accent edge. Without it a
                     stack of identical panels gives no sense of where you are —
                     the reader loses their place the moment they scroll. */
                  borderLeft: caution ? '3px solid #c8102e' : isOpen ? '3px solid var(--primary)' : card.border,
                  boxShadow: isOpen ? '0 6px 18px -10px rgba(20,23,28,0.35)' : 'var(--shadow-sm)',
                  transform: isOpen ? 'translateY(-1px)' : 'none',
                  transition: 'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '15px 18px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {g.title}
                    </span>
                    {g.lede && (
                      <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.5 }}>
                        {g.lede}
                      </span>
                    )}
                  </span>
                  {/* A plus/minus set in the interface's own type rather than
                      a chevron glyph. It reads as a control without importing
                      another picture, and it cannot be mistaken for decoration. */}
                  <span
                    aria-hidden="true"
                    className="help-chevron"
                    style={{
                      flexShrink: 0, width: '18px', textAlign: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)',
                      fontWeight: 700, lineHeight: 1, color: 'var(--text-muted)',
                    }}
                  >
                    {isOpen ? '\u2212' : '+'}
                  </span>
                </button>

                {/* Rendered only when open, and always when printing — a printed
                    quick reference with every section collapsed is a blank page. */}
                {/* grid-template-rows 0fr → 1fr animates to a height nobody has
                    to measure. It only works with a single child, so the inner
                    wrapper is load-bearing, not decoration. display:none would
                    snap; visibility keeps it out of the tab order while closed. */}
                <div
                  className={isOpen ? 'help-body' : 'help-body help-body-closed'}
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <div style={{ overflow: 'hidden', visibility: isOpen ? 'visible' : 'hidden' }}>
                  <ol style={{ margin: 0, padding: '0 18px 16px 40px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {g.steps.map((step, i) => (
                      <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65 }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {g.closing && (
                    <p style={{ margin: 0, padding: '0 18px 16px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {g.closing}
                    </p>
                  )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '26px', lineHeight: 1.65 }}>
          Stuck on something that is not here? Whoever set up the portal can add it to this page.
        </p>
      </div>

      <style>{`
        .help-card button:hover {
          background: var(--primary-light) !important;
        }
        .help-card .help-chevron { transition: color 160ms ease; }
        .help-card button:hover .help-chevron { color: var(--text-dark); }

        @media (prefers-reduced-motion: reduce) {
          .help-card, .help-body { transition: none !important; }
        }

        @media print {
          @page { margin: 14mm; size: portrait; }
          .admin-rail, .admin-topbar, .help-print, .help-chevron { display: none !important; }
          .help-page { max-width: none !important; padding: 0 !important; }
          /* Everything opens for print, including sections the reader had
             collapsed on screen. */
          .help-body-closed { grid-template-rows: 1fr !important; }
          .help-body-closed > div { visibility: visible !important; overflow: visible !important; }
          .help-page section { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>
    </AdminLayout>
  );
};
