import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useMobileApp } from '../lib/useMobileApp';
import {
  APPLICATION_STATUSES,
  BOOKING_STATUSES,
  itemIsDue,
  shortId,
} from '../lib/mobileApp';
import { ArrowRight, Plus, RefreshCw, Send, X } from 'lucide-react';
import { MobileAppOverview } from '../components/MobileAppOverview';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';

/**
 * The mobile app's data, from the yard's side.
 *
 * Every row on this screen belongs to a customer, not to the dealership. The
 * screen is therefore mostly a window: staff can run the partner directory,
 * decide applications, move a booking along and answer a message, and that is
 * the whole of what they can change. Cars, service history and fuel logs are
 * read-only here and read-only in the policies underneath.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'garages', label: 'Partner garages' },
  { id: 'applications', label: 'Applications' },
  { id: 'customers', label: 'Customer vehicles' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'chat', label: 'Chat' },
];

const label = {
  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px',
};

const input = {
  width: '100%', padding: '9px 11px', borderRadius: '6px',
  border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)',
  outline: 'none', background: 'var(--bg-card)',
};

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-KE');

/* A blank directory entry. Two buttons open it — the header action and the
   empty state's CTA — so the shape lives in one place. */
const newGarage = {
  code: '', name: '', area: '', address: '', rating: 0, reviewsCount: 0,
  distanceKm: 0, isOfficialHq: false, isSkyactivCertified: false,
  operatingHours: '', availableSlots: [], specialties: [], active: true,
  isNew: true,
};

/* Sized to what it stands in for, so nothing reflows when the data lands. */
const OverviewSkeleton = () => (
  <div aria-hidden="true">
    <div style={{ display: 'flex', gap: '28px', alignItems: 'center', paddingBottom: '26px' }}>
      <span className="ma-skeleton" style={{ display: 'block', height: '64px', width: '92px' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span className="ma-skeleton" style={{ display: 'block', height: '16px', width: '210px' }} />
        <span className="ma-skeleton" style={{ display: 'block', height: '38px', width: '170px', borderRadius: '999px' }} />
      </span>
    </div>
    <div style={{ display: 'flex', gap: '8px', padding: '18px 0' }}>
      {[110, 128, 132].map((w, i) => (
        <span key={i} className="ma-skeleton" style={{ display: 'block', height: '32px', width: `${w}px`, borderRadius: '999px' }} />
      ))}
    </div>
  </div>
);

/**
 * A tab's heading: a label, a rule running out to the edge, and at most one
 * action.
 *
 * Replaces the card header each list used to sit under. A table is already a
 * bounded shape — putting it inside a bordered box drew a second boundary
 * around the first and cost 20px of padding on every side for it.
 */
const Section = ({ label, action }) => (
  <div className="ma-section">
    <span className="ma-section-label">{label}</span>
    <span className="ma-section-rule" />
    {action}
  </div>
);

/**
 * An empty list, and the one thing to do about it.
 *
 * A sentence saying "nothing here yet" leaves the reader to work out where the
 * button is; every empty state on this screen names its own way out.
 */
const Empty = ({ children, cta, onCta }) => (
  <div className="ma-empty">
    <p>{children}</p>
    {cta && (
      <button type="button" className="ma-cta" onClick={onCta}>
        {cta}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    )}
  </div>
);

export const AdminMobileApp = () => {
  const { formatKES } = useApp();

  const app = useMobileApp();
  const [tab, setTab] = useState('overview');
  const [garageDraft, setGarageDraft] = useState(null);
  const [openThread, setOpenThread] = useState(null);
  const [actionError, setActionError] = useState('');

  const run = async (promise) => {
    setActionError('');
    const result = await promise;
    if (!result.ok) setActionError(result.reason);
    return result;
  };

  const vehicleById = new Map(app.vehicles.map((v) => [v.id, v]));
  const garageByCode = new Map(app.garages.map((g) => [g.code, g]));

  /* One pager per list. Declared here rather than inside each tab because the
     tabs are conditional and hooks are not — a pager built inside
     `{tab === 'bookings' && …}` would mount and unmount with the tab, losing
     the page every time someone looked at something else and came back.
     A refresh that changes the row count resets to page one, so nobody is left
     standing past the end of a list that just shrank. */
  const garagePage = usePagedList(app.garages, PAGE_SIZE, String(app.garages.length));
  const applicationPage = usePagedList(app.applications, PAGE_SIZE, String(app.applications.length));
  const customerPage = usePagedList(app.vehicles, PAGE_SIZE, String(app.vehicles.length));
  const bookingPage = usePagedList(app.bookings, PAGE_SIZE, String(app.bookings.length));

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div
          className="admin-page-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}
        >
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Mobile App</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
              What customers keep in the app — their garages, bookings and messages.
            </p>
          </div>
          <button type="button" className="panel-link" onClick={app.refresh} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* A read that failed is said out loud. These tables are reachable only
            through the staff policies, and a silent empty list would read as
            "no customers yet" when it actually means "not allowed". */}
        {app.error && (
          <p role="alert" style={{ margin: '16px 0 0', fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{app.error}</p>
        )}
        {actionError && (
          <p role="alert" style={{ margin: '16px 0 0', fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{actionError}</p>
        )}

        <div
          role="tablist"
          aria-label="Mobile app sections"
          style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--band-line)', overflowX: 'auto', marginTop: '18px' }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`ma-tab-${t.id}`}
                aria-selected={active}
                aria-controls={active ? `ma-panel-${t.id}` : undefined}
                onClick={() => setTab(t.id)}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  padding: '13px 14px', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary-ink)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${active ? 'var(--primary-ink)' : 'transparent'}`,
                  marginBottom: '-1px',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {app.loading ? (
          /* A skeleton of the tiles rather than the word "Loading", so the
             layout is already the right shape when the figures arrive. */
          <div className="ma-overview" style={{ marginTop: '26px' }} role="status" aria-label="Loading the app’s records">
            <OverviewSkeleton />
          </div>
        ) : (
          <div className="ma-scope" role="tabpanel" id={`ma-panel-${tab}`} aria-labelledby={`ma-tab-${tab}`} style={{ marginTop: '22px' }}>

            {tab === 'overview' && (
              <MobileAppOverview app={app} onGo={setTab} />
            )}

            {tab === 'garages' && (
              <section>
                <Section
                  label="Partner garages"
                  action={app.garages.length > 0 && (
                    <button type="button" className="ma-cta ma-cta--sm" onClick={() => setGarageDraft(newGarage)}>
                      <Plus size={15} aria-hidden="true" /> Add garage
                    </button>
                  )}
                />

                {app.garages.length === 0 ? (
                  <Empty cta="Add the first garage" onCta={() => setGarageDraft(newGarage)}>
                    The app offers this list when a customer books a service. Until one exists,
                    it has no garage to show them.
                  </Empty>
                ) : (
                  <div className="ma-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Garage</th><th>Area</th><th>Specialties</th><th>Rating</th><th>Status</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {garagePage.visible.map((g) => (
                        <tr key={g.code}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{g.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{g.code}</div>
                          </td>
                          <td>{g.area || '—'}</td>
                          <td style={{ maxWidth: '260px' }}>
                            {g.specialties.length === 0 ? '—' : g.specialties.join(', ')}
                            {g.isSkyactivCertified && <span className="badge badge-new" style={{ marginLeft: '6px' }}>SkyActiv</span>}
                            {g.isOfficialHq && <span className="badge badge-new" style={{ marginLeft: '6px' }}>HQ</span>}
                          </td>
                          <td>{g.reviewsCount > 0 ? `${g.rating.toFixed(1)} (${g.reviewsCount})` : '—'}</td>
                          <td>
                            <span className={`badge ${g.active ? 'badge-available' : 'badge-sold'}`}>
                              {g.active ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button type="button" className="panel-link" onClick={() => setGarageDraft({ ...g, isNew: false })}>Edit</button>
                            <button type="button" className="panel-link" onClick={() => run(app.setGarageActive(g.code, !g.active))}>
                              {g.active ? 'Hide' : 'Show'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
                <Pagination {...garagePage} onChange={garagePage.setPage} noun="garages" />
              </section>
            )}

            {tab === 'applications' && (
              <section>
                <Section label="Garage partner applications" />
                {app.applications.length === 0 ? (
                  <Empty>No garages have applied to join yet.</Empty>
                ) : (
                  <div className="ma-list">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Business</th><th>Contact</th><th>Area</th><th>Applied</th><th>Status</th><th /></tr>
                    </thead>
                    <tbody>
                      {applicationPage.visible.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{a.businessName}</div>
                            {a.specialties.length > 0 && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{a.specialties.join(', ')}</div>
                            )}
                          </td>
                          <td>
                            <div>{a.contactName}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{a.phone}{a.email ? ` · ${a.email}` : ''}</div>
                          </td>
                          <td>{a.area || '—'}</td>
                          <td>{fmtDate(a.createdAt)}</td>
                          <td>
                            <span className={`badge ${a.status === 'Approved' ? 'badge-available' : a.status === 'Rejected' ? 'badge-out-stock' : 'badge-reserved'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {/* Approving records the decision. It does not create
                                the directory entry — that is a separate row with
                                a code, hours and slots the yard has to set. */}
                            {APPLICATION_STATUSES.filter((s) => s !== a.status && s !== 'Pending').map((s) => (
                              <button key={s} type="button" className="panel-link" onClick={() => run(app.decideApplication(a.id, s))}>
                                {s === 'Approved' ? 'Approve' : 'Reject'}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
                <Pagination {...applicationPage} onChange={applicationPage.setPage} noun="applications" />
              </section>
            )}

            {tab === 'customers' && (
              <section>
                {/* "Read-only" earned its place — everything else that used to
                    sit here explained the schema rather than the screen. */}
                <Section
                  label="Customer vehicles"
                  action={<span className="ma-section-note">Read-only · shown by account id</span>}
                />

                {app.vehicles.length === 0 ? (
                  <Empty>No customer has added a car to their garage yet.</Empty>
                ) : (
                  <div className="ma-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Car</th><th>Customer</th><th>Odometer</th><th>Schedule</th>
                        <th>Logs</th><th>Insurance</th><th>NTSA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPage.visible.map((v) => {
                        const items = app.serviceItems.filter((i) => i.garageVehicleId === v.id);
                        const due = items.filter((i) => itemIsDue(i, v));
                        const services = app.history.filter((h) => h.garageVehicleId === v.id).length;
                        const fills = app.fuel.filter((f) => f.garageVehicleId === v.id).length;
                        return (
                          <tr key={v.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                                {v.name} {v.isPrimary && <span className="badge badge-new" style={{ marginLeft: '4px' }}>Primary</span>}
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                                {v.plate}{v.year ? ` · ${v.year}` : ''}
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{shortId(v.userId)}</td>
                            <td>{fmtNum(v.currentKm)} km</td>
                            <td>
                              {items.length === 0 ? '—' : (
                                <>
                                  {items.length} item{items.length === 1 ? '' : 's'}
                                  {due.length > 0 && <span className="badge badge-low-stock" style={{ marginLeft: '6px' }}>{due.length} due</span>}
                                </>
                              )}
                            </td>
                            <td>{services} service{services === 1 ? '' : 's'} · {fills} fill{fills === 1 ? '' : 's'}</td>
                            <td>{fmtDate(v.insuranceExpiry)}</td>
                            <td>{fmtDate(v.ntsaExpiry)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
                <Pagination {...customerPage} onChange={customerPage.setPage} noun="cars" />
              </section>
            )}

            {tab === 'bookings' && (
              <section>
                <Section label="Service bookings" />
                {app.bookings.length === 0 ? (
                  <Empty>No service bookings have been requested through the app yet.</Empty>
                ) : (
                  <div className="ma-list">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Service</th><th>Car</th><th>Garage</th><th>When</th><th>Code</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {bookingPage.visible.map((b) => {
                        const car = b.garageVehicleId ? vehicleById.get(b.garageVehicleId) : null;
                        const garage = b.partnerGarageCode ? garageByCode.get(b.partnerGarageCode) : null;
                        return (
                          <tr key={b.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{b.serviceTitle}</div>
                              {b.preDispatchParts && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>Parts to be sent ahead</div>
                              )}
                              {b.notes && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', maxWidth: '34ch' }}>{b.notes}</div>
                              )}
                            </td>
                            <td>
                              {car ? `${car.name} · ${car.plate}` : <span style={{ color: 'var(--text-dim)' }}>Not tied to a car</span>}
                            </td>
                            <td>
                              {/* The code is kept even when the garage row is
                                  gone, so say which rather than showing a blank. */}
                              {garage ? garage.name : b.partnerGarageCode
                                ? <span style={{ color: 'var(--text-dim)' }}>{b.partnerGarageCode} (not in directory)</span>
                                : '—'}
                            </td>
                            <td>{b.bookingDate}<div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>{b.timeSlot}</div></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{b.confirmationCode}</td>
                            <td>
                              <select
                                value={b.status}
                                onChange={(e) => run(app.setBookingStatus(b.id, e.target.value))}
                                style={{ ...input, padding: '6px 8px', width: 'auto' }}
                                aria-label={`Status for booking ${b.confirmationCode}`}
                              >
                                {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                {/* A status written by the app that this list does
                                    not know about still has to be selectable, or
                                    opening the menu would silently change it. */}
                                {!BOOKING_STATUSES.includes(b.status) && <option value={b.status}>{b.status}</option>}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
                <Pagination {...bookingPage} onChange={bookingPage.setPage} noun="bookings" />
              </section>
            )}

            {tab === 'chat' && (
              <ChatPanel app={app} openThread={openThread} setOpenThread={setOpenThread} onError={setActionError} />
            )}
          </div>
        )}
      </div>

      {garageDraft && (
        <GarageModal
          garage={garageDraft}
          onClose={() => setGarageDraft(null)}
          onSave={async (g) => {
            const result = await run(app.saveGarage(g, { isNew: garageDraft.isNew }));
            if (result.ok) setGarageDraft(null);
            return result;
          }}
        />
      )}
    </AdminLayout>
  );
};

/**
 * The yard's side of a customer conversation.
 *
 * Messages are fetched per thread rather than all at once: a busy yard's
 * message table grows without limit and nothing on the list needs the bodies.
 */
const ChatPanel = ({ app, openThread, setOpenThread, onError }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!openThread) { setMessages([]); return undefined; }
    (async () => {
      const result = await app.loadMessages(openThread.id);
      if (cancelled) return;
      if (!result.ok) { onError(result.reason); return; }
      setMessages(result.messages);
    })();
    return () => { cancelled = true; };
  }, [openThread, app, onError]);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await app.sendStaffReply(openThread.id, draft);
    setBusy(false);
    if (!result.ok) { onError(result.reason); return; }
    setDraft('');
    const reloaded = await app.loadMessages(openThread.id);
    if (reloaded.ok) setMessages(reloaded.messages);
  };

  /* Above the early return on purpose: a hook after a conditional `return` is
     called on some renders and not others, which is the one thing React will
     not tolerate. A smaller page than the tables use — this is a sidebar, not
     a full-width list. */
  const threadPage = usePagedList(app.threads, 8, String(app.threads.length));

  if (app.threads.length === 0) {
    return (
      <section>
        <Section label="Customer conversations" />
        <Empty>No customer has started a conversation in the app yet.</Empty>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: '28px', alignItems: 'start' }}>
      <section>
        <Section label="Conversations" />
        <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
          {threadPage.visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenThread(t)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '12px 18px', border: 'none',
                borderBottom: '1px solid rgba(27,36,48,.07)',
                background: openThread?.id === t.id ? 'var(--primary-light)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)' }}>{t.subject}</span>
                {t.staffUnread > 0 && <span className="badge badge-new">{t.staffUnread}</span>}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '2px' }}>
                {shortId(t.userId)} · {fmtDate(t.lastMessageAt)} · {t.status}
              </div>
            </button>
          ))}
        </div>
        <Pagination {...threadPage} onChange={threadPage.setPage} noun="conversations" />
      </section>

      <section>
        {!openThread ? (
          <Empty>Pick a conversation to read it.</Empty>
        ) : (
          <>
            <Section
              label={openThread.subject}
              action={(
                <button
                  type="button"
                  className="panel-link"
                  onClick={() => app.setThreadStatus(openThread.id, openThread.status === 'Open' ? 'Closed' : 'Open')}
                >
                  {openThread.status === 'Open' ? 'Close conversation' : 'Reopen'}
                </button>
              )}
            />

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No messages in this conversation.</span>
              ) : messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.senderRole === 'staff' ? 'flex-end' : 'flex-start',
                    maxWidth: '68%', padding: '9px 13px', borderRadius: '14px',
                    background: m.senderRole === 'staff' ? 'var(--primary-light)' : 'var(--bg-app)',
                    color: 'var(--text-body)', fontSize: 'var(--text-sm)', lineHeight: 1.5,
                  }}
                >
                  {m.body}
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', marginTop: '3px' }}>
                    {m.senderRole === 'staff' ? 'Yard' : 'Customer'} · {fmtDate(m.createdAt)}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={send} style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--ma-rule)' }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply to this customer"
                aria-label="Reply to this customer"
                style={input}
              />
              <button type="submit" className="btn-primary" disabled={busy || !draft.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: busy || !draft.trim() ? 0.5 : 1 }}>
                <Send size={14} /> {busy ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

/**
 * Add or edit a partner garage.
 *
 * `code` is the primary key and is referenced by bookings, so it is set once at
 * creation and read-only afterwards — editing it would orphan every booking
 * that named it.
 */
const GarageModal = ({ garage, onClose, onSave }) => {
  const [form, setForm] = useState({
    ...garage,
    specialtiesText: garage.specialties.join(', '),
    slotsText: garage.availableSlots.join(', '),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { setError('Give this garage a short code — bookings refer to it.'); return; }
    if (!form.name.trim()) { setError('Enter the garage’s name.'); return; }
    setBusy(true);
    const result = await onSave({
      code: form.code.trim(),
      name: form.name.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      rating: Number(form.rating) || 0,
      reviewsCount: Number(form.reviewsCount) || 0,
      distanceKm: Number(form.distanceKm) || 0,
      isOfficialHq: !!form.isOfficialHq,
      isSkyactivCertified: !!form.isSkyactivCertified,
      operatingHours: form.operatingHours.trim(),
      availableSlots: form.slotsText.split(',').map((s) => s.trim()).filter(Boolean),
      specialties: form.specialtiesText.split(',').map((s) => s.trim()).filter(Boolean),
      active: !!form.active,
    });
    setBusy(false);
    if (!result.ok) setError(result.reason);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Partner garage">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>
            {garage.isNew ? 'Add partner garage' : garage.name}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '13px' }}>
          <div>
            <label style={label} htmlFor="g-code">Code *</label>
            <input
              id="g-code"
              value={form.code}
              onChange={set('code')}
              disabled={!garage.isNew}
              style={{ ...input, opacity: garage.isNew ? 1 : 0.6 }}
              placeholder="thindigua-hq"
            />
            {!garage.isNew && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Fixed — bookings refer to this code.
              </div>
            )}
          </div>
          <div>
            <label style={label} htmlFor="g-name">Name *</label>
            <input id="g-name" value={form.name} onChange={set('name')} style={input} />
          </div>
          <div>
            <label style={label} htmlFor="g-area">Area</label>
            <input id="g-area" value={form.area} onChange={set('area')} style={input} />
          </div>
          <div>
            <label style={label} htmlFor="g-hours">Operating hours</label>
            <input id="g-hours" value={form.operatingHours} onChange={set('operatingHours')} style={input} placeholder="Mon–Sat, 8am–6pm" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label} htmlFor="g-address">Address</label>
            <input id="g-address" value={form.address} onChange={set('address')} style={input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label} htmlFor="g-spec">Specialties</label>
            <input id="g-spec" value={form.specialtiesText} onChange={set('specialtiesText')} style={input} placeholder="Engine, Diagnostics, Bodywork" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Separate with commas.</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label} htmlFor="g-slots">Bookable time slots</label>
            <input id="g-slots" value={form.slotsText} onChange={set('slotsText')} style={input} placeholder="8:00 AM, 10:00 AM, 2:00 PM" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              These are the only times the app offers a customer. Leave empty and it can show none.
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
            <input type="checkbox" checked={form.isSkyactivCertified} onChange={(e) => setForm((f) => ({ ...f, isSkyactivCertified: e.target.checked }))} />
            SkyActiv certified
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
            <input type="checkbox" checked={form.isOfficialHq} onChange={(e) => setForm((f) => ({ ...f, isOfficialHq: e.target.checked }))} />
            Official Zoom Imports workshop
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-body)', gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Show in the app
          </label>

          {error && (
            <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{error}</p>
          )}

          <button type="submit" className="btn-primary" disabled={busy} style={{ gridColumn: '1 / -1', padding: '10px', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : garage.isNew ? 'Add garage' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
