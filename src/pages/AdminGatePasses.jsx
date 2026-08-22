import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { GatePassSheet, gatePassNumberFor } from '../components/GatePassSheet';
import { fmt } from '../components/IntakeSheet';
import {
  GATE_ITEMS, GATE_OPTIONS_FOR, emptyGateItems, TAKER_FIELDS, GATE_VEHICLE_FIELDS,
} from '@shared/data/gatePassChecklist';
import { Search, Plus, ArrowLeft, Printer, Lock, Trash2, LogOut, CornerDownLeft } from 'lucide-react';

const label = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' };
const field = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' };
const card = { background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' };
const sectionTitle = { fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' };

const EMPTY = {
  id: null, vehicleId: null, consignmentId: null,
  takerName: '', takerPhone: '', takerIdNo: '', destination: '', purpose: '',
  makeModel: '', regNo: '', chassis: '', colour: '', engineNo: '',
  mileageOut: '', mileageIn: '', items: emptyGateItems(), comments: '', confirmedBy: '',
};

/**
 * Vehicles leaving the premises — yard stock and consignments alike.
 *
 * The register's real job is the open list: a pass with no return recorded is
 * a car that is off the premises right now, which is the question anyone asks
 * at a barrier. Hence the default filter.
 */
export const AdminGatePasses = () => {
  const {
    gatePasses, gatePassesLoading, saveGatePass, issueGatePass, recordGateReturn, deleteGatePass,
    vehicles, consignments, engineNoFor, can, formatKES,
  } = useApp();
  const mayWrite = can('catalogue:write') || can('orders:write');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Out');
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(null);
  const [mileageIn, setMileageIn] = useState('');

  const selected = gatePasses.find((g) => g.id === selectedId) ?? null;

  const stateOf = (g) => (g.returnedAt ? 'Returned' : g.issuedAt ? 'Out' : 'Draft');

  /* Distance covered is the figure anyone actually wants — "out at 93,000,
     back at 93,412" is two numbers to subtract in your head. Null unless both
     ends are recorded, because a half-known trip has no distance. */
  const distanceOf = (g) =>
    g.mileageOut == null || g.mileageIn == null ? null : Number(g.mileageIn) - Number(g.mileageOut);

  /* How long the vehicle was off the premises, or has been so far. */
  const durationOf = (g) => {
    if (!g.issuedAt) return null;
    const end = g.returnedAt ? new Date(g.returnedAt) : new Date();
    const mins = Math.max(0, Math.round((end - new Date(g.issuedAt)) / 60000));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ${mins % 60} min`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ${hrs % 24} hr`;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return gatePasses.filter((g) => {
      if (filter !== 'All' && stateOf(g) !== filter) return false;
      if (!q) return true;
      return `${g.takerName} ${g.regNo} ${g.makeModel} ${g.chassis} ${g.destination} ${gatePassNumberFor(g)}`
        .toLowerCase().includes(q);
    });
  }, [gatePasses, search, filter]);

  const page = usePagedList(filtered, PAGE_SIZE, `${filter}|${search.trim().toLowerCase()}`);
  const countOf = (s) => (s === 'All' ? gatePasses.length : gatePasses.filter((g) => stateOf(g) === s).length);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setItem = (k, v) => setDraft((d) => ({ ...d, items: { ...d.items, [k]: v } }));

  /* Picking a source copies its details in. Copied, not linked: the pass is
     evidence of what left the yard, and must not change when the listing does. */
  const pickSource = (value) => {
    if (!value) { setDraft((d) => ({ ...d, vehicleId: null, consignmentId: null })); return; }
    const [kind, rawId] = value.split(':');
    const id = Number(rawId);
    if (kind === 'v') {
      const v = vehicles.find((x) => x.id === id);
      if (!v) return;
      setDraft((d) => ({ ...d, vehicleId: v.id, consignmentId: null,
        makeModel: v.name || '', regNo: v.regNumber || '', chassis: v.chassis || '',
        colour: v.color || '',
        /* The real engine number from vehicle_private, not vehicles.engine —
           that column is displacement ("1.5L") and was printing as the engine
           number on every pass raised from yard stock. */
        engineNo: engineNoFor(v.id),
        mileageOut: v.mileage ?? '' }));
    } else {
      const c = consignments.find((x) => x.id === id);
      if (!c) return;
      setDraft((d) => ({ ...d, consignmentId: c.id, vehicleId: null,
        makeModel: c.makeModel || '', regNo: c.regNo || '', chassis: c.chassis || '',
        colour: c.colour || '', engineNo: c.engineNo || '', mileageOut: c.mileage ?? '' }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const result = await saveGatePass(draft);
    setBusy(false);
    if (!result.ok) { setError(result.reason); return; }
    setDraft(null); setSelectedId(result.id);
  };

  const doIssue = async (g) => {
    const result = await issueGatePass(g.id);
    if (!result.ok) setError(result.reason);
  };

  const doReturn = async () => {
    const result = await recordGateReturn(returning.id, mileageIn);
    setReturning(null); setMileageIn('');
    if (!result.ok) setError(result.reason);
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete gate pass ${gatePassNumberFor(g)}?`)) return;
    const result = await deleteGatePass(g.id);
    if (!result.ok) { setError(result.reason); return; }
    setSelectedId(null);
  };

  /* ── Form ─────────────────────────────────────────────────────────── */
  if (draft) {
    const outFields = GATE_VEHICLE_FIELDS.filter((f) => !f.onReturn);
    return (
      <AdminLayout>
        <div className="admin-page" style={{ padding: '0 32px 32px' }}>
          <button type="button" onClick={() => setDraft(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: '22px 0 0', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={15} /> All gate passes
          </button>
          <div className="admin-page-header" style={{ padding: '14px 0 24px', borderBottom: '1px solid var(--band-line)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
              {draft.id ? 'Edit gate pass' : 'Release a vehicle'}
            </h1>
          </div>

          {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>}

          <form onSubmit={submit} style={{ marginTop: '22px' }}>
            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Vehicle</div>
              <label style={label} htmlFor="g-src">Pick from stock or consignments</label>
              <select id="g-src" style={{ ...field, maxWidth: '460px' }}
                      value={draft.vehicleId ? `v:${draft.vehicleId}` : draft.consignmentId ? `c:${draft.consignmentId}` : ''}
                      onChange={(e) => pickSource(e.target.value)}>
                <option value="">Not from either list — type the details below</option>
                <optgroup label="Yard stock">
                  {vehicles.map((v) => (
                    <option key={`v${v.id}`} value={`v:${v.id}`}>{v.name} {v.year} · {v.regNumber || v.stockId || v.chassis || '—'}</option>
                  ))}
                </optgroup>
                <optgroup label="Consignments">
                  {consignments.map((c) => (
                    <option key={`c${c.id}`} value={`c:${c.id}`}>{c.makeModel} · {c.regNo || c.chassis || c.ownerName}</option>
                  ))}
                </optgroup>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
                {outFields.map((f) => (
                  <div key={f.key}>
                    <label style={label} htmlFor={`g-${f.key}`}>{f.label}</label>
                    <input id={`g-${f.key}`} style={field} value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label style={label} htmlFor="g-regNo">Reg No.</label>
                  <input id="g-regNo" style={field} value={draft.regNo} onChange={(e) => set('regNo', e.target.value)} />
                </div>
              </div>
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Taken by</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                {TAKER_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label style={label} htmlFor={`g-${f.key}`}>{f.label}</label>
                    <input id={`g-${f.key}`} style={field} required={!!f.required}
                           type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? '0' : undefined}
                           value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Checked out with</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px 20px' }}>
                {GATE_ITEMS.map((item) => {
                  const v = draft.items[item.label] ?? '';
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '4px 0' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{item.label}</span>
                      <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {GATE_OPTIONS_FOR(item.type).map((opt) => {
                          const on = v === opt;
                          const bad = opt === 'Not Ok' || opt === 'Not Present';
                          return (
                            <button key={opt} type="button" aria-pressed={on}
                              onClick={() => setItem(item.label, on ? '' : opt)}
                              style={{ padding: '5px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                                       fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap',
                                       border: on ? 'none' : '1px solid var(--border-medium)',
                                       background: on ? (bad ? '#a13f3f' : 'var(--primary)') : 'var(--bg-card)',
                                       color: on ? '#fff' : 'var(--text-muted)' }}>
                              {opt}
                            </button>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ ...card, padding: '18px 20px', marginBottom: '16px' }}>
              <div style={sectionTitle}>Purpose &amp; confirmation</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div><label style={label} htmlFor="g-purpose">Purpose</label>
                  <input id="g-purpose" style={field} value={draft.purpose} onChange={(e) => set('purpose', e.target.value)} /></div>
                <div><label style={label} htmlFor="g-conf">Confirmed by</label>
                  <input id="g-conf" style={field} value={draft.confirmedBy} onChange={(e) => set('confirmedBy', e.target.value)} /></div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={label} htmlFor="g-com">Comments</label>
                <textarea id="g-com" rows={2} style={{ ...field, resize: 'vertical' }} value={draft.comments} onChange={(e) => set('comments', e.target.value)} />
              </div>
            </section>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save gate pass'}
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
    const state = stateOf(selected);
    return (
      <AdminLayout>
        <div className="admin-page" style={{ padding: '0 32px 32px' }}>
          <button type="button" onClick={() => setSelectedId(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: '22px 0 0', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft size={15} /> All gate passes
          </button>

          <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '14px 0 24px', borderBottom: '1px solid var(--band-line)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
                {selected.makeModel || 'Vehicle'} — {selected.takerName}
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                {gatePassNumberFor(selected)} · {state.toLowerCase()}
                {selected.destination ? ` · to ${selected.destination}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => setPrinting(selected)}>
                <Printer size={15} /> Print gate pass
              </button>
              {mayWrite && state === 'Draft' && (
                <>
                  <button type="button" className="btn-secondary" onClick={() => setDraft({ ...selected })}>Edit</button>
                  <button type="button" className="btn-secondary" onClick={() => doIssue(selected)}>
                    <LogOut size={15} /> Issue &amp; release
                  </button>
                </>
              )}
              {mayWrite && state === 'Out' && (
                <button type="button" className="btn-secondary" onClick={() => { setReturning(selected); setMileageIn(''); }}>
                  <CornerDownLeft size={15} /> Record return
                </button>
              )}
            </div>
          </div>

          {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>}

          {state !== 'Draft' && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '16px' }}>
              <Lock size={14} />
              {state === 'Out'
                ? 'Issued and locked. Only the return mileage can still be recorded.'
                : 'Returned and closed. Nothing further can be changed.'}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Taken by</div>
              {TAKER_FIELDS.map((f) => <Line key={f.key} l={f.label} v={fmt(selected[f.key], f.type, formatKES)} />)}
            </div>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Vehicle</div>
              {GATE_VEHICLE_FIELDS.map((f) => <Line key={f.key} l={f.label} v={fmt(selected[f.key], f.type, formatKES)} />)}
            </div>
            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Movement</div>
              <Line l="Released" v={selected.issuedAt ? new Date(selected.issuedAt).toLocaleString('en-KE') : null} />
              <Line l="Returned" v={selected.returnedAt ? new Date(selected.returnedAt).toLocaleString('en-KE') : null} />
              <Line l={selected.returnedAt ? 'Time out' : 'Out for'} v={durationOf(selected)} />
              <Line l="Mileage out" v={selected.mileageOut == null ? null : `${Number(selected.mileageOut).toLocaleString()} km`} />
              <Line l="Mileage in" v={selected.mileageIn == null ? null : `${Number(selected.mileageIn).toLocaleString()} km`} />
              <Line l="Distance covered" v={distanceOf(selected) == null ? null : `${distanceOf(selected).toLocaleString()} km`} />
            </div>

            <div style={{ ...card, padding: '16px 18px' }}>
              <div style={sectionTitle}>Checked out with</div>
              {GATE_ITEMS.map((i) => {
                const v = selected.items?.[i.label] ?? '';
                const bad = v === 'Not Ok' || v === 'Not Present';
                return (
                  <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '3px 0' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{i.label}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: bad ? 700 : 600, color: bad ? '#a13f3f' : 'var(--text-dark)' }}>
                      {v === '' ? '—' : v}
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: '10px' }}>
                <Line l="Purpose" v={selected.purpose} />
                <Line l="Comments" v={selected.comments} />
                <Line l="Confirmed by" v={selected.confirmedBy} />
              </div>
            </div>
          </div>

          {mayWrite && state === 'Draft' && (
            <button type="button" onClick={() => remove(selected)}
                    style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: '#a13f3f', cursor: 'pointer' }}>
              <Trash2 size={15} /> Delete this gate pass
            </button>
          )}
        </div>

        {printing && <GatePassSheet pass={printing} onClose={() => setPrinting(null)} />}

        {returning && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Record return" onClick={() => setReturning(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '420px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)', marginBottom: '10px' }}>
                Record return
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Out at {selected.mileageOut == null ? '—' : Number(selected.mileageOut).toLocaleString()} km.
                This closes the pass permanently.
              </p>
              <label style={label} htmlFor="g-in">Mileage in (km)</label>
              <input id="g-in" type="number" min="0" style={field} value={mileageIn} onChange={(e) => setMileageIn(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-primary" onClick={doReturn}>Record return and close</button>
                <button type="button" className="btn-secondary" onClick={() => setReturning(null)}>Cancel</button>
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Gate Passes</h1>
          {mayWrite && (
            <button type="button" className="btn-accent" onClick={() => setDraft({ ...EMPTY, items: emptyGateItems() })}>
              <Plus size={16} /> Release a vehicle
            </button>
          )}
        </div>

        {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', padding: '14px 0' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '16px 0' }}>
          {['Out', 'Draft', 'Returned', 'All'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                       border: filter === s ? 'none' : '1px solid var(--border-medium)',
                       background: filter === s ? 'var(--primary)' : 'var(--bg-card)',
                       color: filter === s ? 'var(--on-primary)' : 'var(--text-body)' }}>
              {s} ({countOf(s)})
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: '18px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search taker, reg, destination or pass no."
                 style={{ ...field, paddingLeft: '36px', maxWidth: '420px' }} />
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead><tr><th>Pass</th><th>Vehicle</th><th>Taken by</th><th>Destination</th><th>Out</th><th>Back</th><th>Status</th></tr></thead>
            <tbody>
              {gatePassesLoading && gatePasses.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading gate passes…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  {gatePasses.length === 0
                    ? 'No gate passes yet. Use “Release a vehicle” when a car leaves the premises.'
                    : filter === 'Out' ? 'No vehicles are currently out.' : 'Nothing matches that.'}
                </td></tr>
              ) : page.visible.map((g) => {
                const st = stateOf(g);
                const tone = st === 'Out' ? { background: 'var(--primary-light)', color: 'var(--primary-ink)' }
                  : st === 'Returned' ? { background: '#e2f2ea', color: '#1f7a52' }
                  : { background: 'var(--bg-cream)', color: 'var(--text-muted)' };
                return (
                  <tr key={g.id} onClick={() => setSelectedId(g.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{gatePassNumberFor(g)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{g.makeModel || '—'}<div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{g.regNo || ''}</div></td>
                    <td style={{ color: 'var(--text-muted)' }}>{g.takerName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{g.destination || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      {g.issuedAt ? new Date(g.issuedAt).toLocaleDateString('en-KE') : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      {g.returnedAt
                        ? <>{new Date(g.returnedAt).toLocaleDateString('en-KE')}
                            {distanceOf(g) != null && (
                              <div style={{ fontSize: 'var(--text-xs)' }}>{distanceOf(g).toLocaleString()} km</div>
                            )}</>
                        /* An open pass says how long it has been out rather than
                           an em dash — that is the number someone chasing a car
                           is looking for. */
                        : st === 'Out'
                          ? <span style={{ color: 'var(--accent-text)' }}>out {durationOf(g)}</span>
                          : '—'}
                    </td>
                    <td><span className="badge" style={tone}>{st}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="gate passes" />
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
