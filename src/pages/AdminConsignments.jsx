import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { IntakeSheet, intakeNumberFor, fmt } from '../components/IntakeSheet';
import {
  CHECKLIST_GROUPS, OPTIONS_FOR, TYPES, emptyChecklist, unanswered,
  OWNER_FIELDS, VEHICLE_FIELDS,
} from '@shared/data/consignmentChecklist';
import { Search, Plus, ArrowLeft, Printer, Lock, Trash2, CheckCircle2 } from 'lucide-react';

const label = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' };
const field = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' };
const card = { background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' };
const sectionTitle = { fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' };

const EMPTY = {
  id: null, ownerName: '', ownerPhone: '', regNo: '', makeModel: '', chassis: '', colour: '',
  engineNo: '', cc: '', year: '', mileage: '', keyNo: '', minPrice: '',
  items: emptyChecklist(), comments: '', ownerSigned: '', receivedBy: '',
};

/**
 * Cars taken in on consignment, and the condition they arrived in.
 *
 * A separate path from Vehicles on purpose: these units never reach the
 * storefront, and they live in their own table with no anon grant rather than
 * in `vehicles` behind a flag. The website reads `vehicles` with select *, so
 * a never-public car sitting there would be one policy edit from publication.
 *
 * The form and the printed sheet both render from CHECKLIST_GROUPS, so they
 * cannot drift apart — the admin has been bitten three times by two renders of
 * the same thing being fixed only once.
 */
export const AdminConsignments = () => {
  const {
    consignments, consignmentsLoading, saveConsignment, signConsignment, deleteConsignment,
    can, formatKES,
  } = useApp();
  const mayWrite = can('catalogue:write');

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(null);        // form open
  const [selectedId, setSelectedId] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmSign, setConfirmSign] = useState(null);

  const selected = consignments.find((c) => c.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return consignments;
    return consignments.filter((c) =>
      `${c.ownerName} ${c.regNo} ${c.makeModel} ${c.chassis} ${intakeNumberFor(c)}`.toLowerCase().includes(q));
  }, [consignments, search]);

  const page = usePagedList(filtered, PAGE_SIZE, search.trim().toLowerCase());

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setItem = (k, v) => setDraft((d) => ({ ...d, items: { ...d.items, [k]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await saveConsignment(draft);
    setBusy(false);
    if (!result.ok) { setError(result.reason); return; }
    setDraft(null);
    setSelectedId(result.id);
  };

  const doSign = async (intake) => {
    setError('');
    const result = await signConsignment(intake.id);
    setConfirmSign(null);
    if (!result.ok) setError(result.reason);
  };

  const remove = async (intake) => {
    if (!window.confirm(`Delete intake ${intakeNumberFor(intake)} for ${intake.ownerName}?`)) return;
    const result = await deleteConsignment(intake.id);
    if (!result.ok) { setError(result.reason); return; }
    setSelectedId(null);
  };

  /* ── Form ─────────────────────────────────────────────────────────── */
  if (draft) {
    const outstanding = unanswered(draft.items);
    return (
      <AdminLayout>
        <div className="admin-page" style={{ padding: '0 32px 32px' }}>
          <button type="button" onClick={() => setDraft(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: '22px 0 0', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={15} /> All intakes
          </button>

          <div className="admin-page-header" style={{ padding: '14px 0 24px', borderBottom: '1px solid var(--band-line)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
              {draft.id ? 'Edit intake' : 'Receive a vehicle'}
            </h1>
          </div>

          {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>}

          <form onSubmit={submit} style={{ marginTop: '22px' }}>
            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Owner</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {OWNER_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label style={label} htmlFor={`c-${f.key}`}>
                      {f.label}{f.type === 'money' ? ' (KES)' : f.type === 'number' ? ' (km)' : ''}
                    </label>
                    <input
                      id={`c-${f.key}`} style={field} required={!!f.required}
                      type={f.type === 'money' || f.type === 'number' ? 'number' : 'text'}
                      min={f.type === 'money' || f.type === 'number' ? '0' : undefined}
                      value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                    />
                    {f.key === 'minPrice' && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                        The floor the owner authorises. Internal only.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Vehicle</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {VEHICLE_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label style={label} htmlFor={`c-${f.key}`}>{f.label}</label>
                    <input id={`c-${f.key}`} style={field} value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <div style={sectionTitle}>Condition on arrival</div>
                {/* Counts down rather than blocking submit: a receiver may
                    legitimately not reach every item, and a form that refuses
                    to save loses the forty answers they did give. */}
                <span style={{ fontSize: 'var(--text-xs)', color: outstanding.length ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                  {outstanding.length ? `${outstanding.length} not yet recorded` : 'All items recorded'}
                </span>
              </div>

              {CHECKLIST_GROUPS.map((group) => (
                <div key={group.title} style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px 20px' }}>
                    {group.items.map((item) => {
                      const v = draft.items[item.label] ?? '';
                      return (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '4px 0' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{item.label}</span>
                          {item.type === TYPES.TEXT ? (
                            <input style={{ ...field, width: '132px' }} value={v} placeholder={item.placeholder || ''}
                                   onChange={(e) => setItem(item.label, e.target.value)} />
                          ) : (
                            <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              {OPTIONS_FOR(item.type).map((opt) => {
                                const on = v === opt;
                                const bad = opt === 'Not Ok' || opt === 'Not Present';
                                return (
                                  <button key={opt} type="button"
                                    onClick={() => setItem(item.label, on ? '' : opt)}
                                    aria-pressed={on}
                                    style={{
                                      padding: '5px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                                      fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap',
                                      border: on ? 'none' : '1px solid var(--border-medium)',
                                      background: on ? (bad ? '#a13f3f' : 'var(--primary)') : 'var(--bg-card)',
                                      color: on ? '#fff' : 'var(--text-muted)',
                                    }}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Comments &amp; handover</div>
              <label style={label} htmlFor="c-com">Comments</label>
              <textarea id="c-com" rows={3} style={{ ...field, resize: 'vertical' }} value={draft.comments}
                        onChange={(e) => set('comments', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div><label style={label} htmlFor="c-osign">M/V owner (name as signed)</label>
                  <input id="c-osign" style={field} value={draft.ownerSigned} onChange={(e) => set('ownerSigned', e.target.value)} /></div>
                <div><label style={label} htmlFor="c-recv">Received by</label>
                  <input id="c-recv" style={field} value={draft.receivedBy} onChange={(e) => set('receivedBy', e.target.value)} /></div>
              </div>
            </section>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save intake'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
  }

  /* ── Detail ───────────────────────────────────────────────────────── */
  if (selected) {
    const locked = !!selected.signedAt;
    return (
      <AdminLayout>
        <div className="admin-page" style={{ padding: '0 32px 32px' }}>
          <button type="button" onClick={() => setSelectedId(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: '22px 0 0', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={15} /> All intakes
          </button>

          <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '14px 0 24px', borderBottom: '1px solid var(--band-line)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
                {selected.makeModel || 'Vehicle'} — {selected.ownerName}
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                {intakeNumberFor(selected)}
                {locked
                  ? ` · signed ${new Date(selected.signedAt).toLocaleDateString('en-KE')}`
                  : ' · draft'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => setPrinting(selected)}>
                <Printer size={15} /> Print intake sheet
              </button>
              {mayWrite && !locked && (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setDraft({ ...selected })}>Edit</button>
                  <button type="button" className="btn-secondary" onClick={() => setConfirmSign(selected)}>
                    <CheckCircle2 size={15} /> Sign off
                  </button>
                </>
              )}
            </div>
          </div>

          {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>}

          {locked && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '16px' }}>
              <Lock size={14} /> Signed off and locked. Corrections go on a new intake.
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Owner</div>
              {OWNER_FIELDS.map((f) => (
                <Line key={f.key} l={f.label} v={fmt(selected[f.key], f.type, formatKES)} />
              ))}
            </div>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Vehicle</div>
              {VEHICLE_FIELDS.map((f) => (
                <Line key={f.key} l={f.label} v={fmt(selected[f.key], f.type, formatKES)} />
              ))}
            </div>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Handover</div>
              <Line l="M/V owner" v={selected.ownerSigned} />
              <Line l="Received by" v={selected.receivedBy} />
              <Line l="Comments" v={selected.comments} />
            </div>
          </div>

          {/* Same array as the form, so the detail cannot show an item the
              form never asked about. */}
          <div style={{ ...card, padding: '16px 18px', marginTop: '16px' }}>
            <div style={sectionTitle}>Condition on arrival</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 24px' }}>
              {CHECKLIST_GROUPS.map((group) => (
                <div key={group.title} style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>{group.title}</div>
                  {group.items.map((item) => {
                    const v = selected.items?.[item.label] ?? '';
                    const bad = v === 'Not Ok' || v === 'Not Present';
                    return (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '2px 0' }}>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: bad ? 700 : 600, color: bad ? '#a13f3f' : 'var(--text-dark)' }}>
                          {v === '' ? '—' : v}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {mayWrite && !locked && (
            <button type="button" onClick={() => remove(selected)}
                    style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: '#a13f3f', cursor: 'pointer' }}>
              <Trash2 size={15} /> Delete this intake
            </button>
          )}
        </div>

        {printing && <IntakeSheet intake={printing} onClose={() => setPrinting(null)} />}

        {confirmSign && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Sign off intake" onClick={() => setConfirmSign(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '440px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)', marginBottom: '10px' }}>
                Sign off {intakeNumberFor(confirmSign)}?
              </h3>
              {/* Says plainly that this cannot be undone, because it genuinely
                  cannot — the database refuses updates once signed_at is set. */}
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
                This locks the condition report permanently. It cannot be edited afterwards,
                by anyone — corrections have to go on a new intake. Check the sheet first.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-primary" onClick={() => doSign(confirmSign)}>Sign off and lock</button>
                <button type="button" className="btn-secondary" onClick={() => setConfirmSign(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    );
  }

  /* ── List ─────────────────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Consignments</h1>
          {mayWrite && (
            <button type="button" className="btn-accent" onClick={() => setDraft({ ...EMPTY, items: emptyChecklist() })}>
              <Plus size={16} /> Receive a vehicle
            </button>
          )}
        </div>

        {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', padding: '14px 0' }}>{error}</p>}

        <div style={{ position: 'relative', margin: '18px 0' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search owner, reg, chassis or intake no."
                 style={{ ...field, paddingLeft: '36px', maxWidth: '420px' }} />
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead><tr><th>Intake</th><th>Owner</th><th>Vehicle</th><th>Reg</th><th>Received</th><th>Status</th></tr></thead>
            <tbody>
              {consignmentsLoading && consignments.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading intakes…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  {consignments.length === 0
                    ? 'No vehicles received yet. Use “Receive a vehicle” when a car arrives at the yard.'
                    : 'No intake matches that search.'}
                </td></tr>
              ) : page.visible.map((c) => (
                <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{intakeNumberFor(c)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.ownerName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.makeModel || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{c.regNo || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    {new Date(c.at).toLocaleDateString('en-KE')}
                  </td>
                  <td>
                    <span className="badge" style={c.signedAt
                      ? { background: '#e2f2ea', color: '#1f7a52' }
                      : { background: 'var(--primary-light)', color: 'var(--primary-ink)' }}>
                      {c.signedAt ? 'Signed' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="intakes" />
        </div>
      </div>
    </AdminLayout>
  );
};

const Line = ({ l, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0', borderBottom: '1px solid var(--band-line)' }}>
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{l}</span>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dark)', fontWeight: 600, textAlign: 'right' }}>{v || '—'}</span>
  </div>
);
