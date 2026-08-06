import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { GROUP_TYPES } from '@shared/lib/inventory';
import { Plus, Edit2, Trash2, X, Layers } from 'lucide-react';

const label = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' };
const field = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' };

const EMPTY = { id: '', name: '', type: 'Shipment', vessel: '', origin: '', arrived: '', note: '' };

/**
 * Shipments, batches and yard intakes — the groups a vehicle belongs to.
 *
 * The vehicle form has always had a Group dropdown and the roll-up figures on
 * the inventory table have always been per-group, but nothing could create a
 * group: `saveGroup` existed in the context with no screen behind it. Every car
 * therefore landed as Ungrouped and the whole grouping feature was inert.
 */
export const AdminGroups = () => {
  const { vehicleGroups, vehicleGroupsLoading, saveGroup, removeGroup, vehicles, can } = useApp();
  const mayWrite = can('catalogue:write');

  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);

  const close = useCallback(() => { setDraft(null); setError(''); }, []);
  const trapRef = useFocusTrap(!!draft);

  useEffect(() => {
    if (!draft) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draft, close]);

  const countFor = (groupId) => vehicles.filter((v) => v.groupId === groupId).length;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await saveGroup(draft);
    setBusy(false);
    if (!result.ok) { setError(result.reason); return; }
    close();
  };

  /* Removing a group leaves its cars Ungrouped rather than deleting them, so
     the count is shown before the click, not discovered after it. */
  const confirmRemove = async (group) => {
    setError('');
    const result = await removeGroup(group.id);
    setConfirming(null);
    if (!result.ok) setError(result.reason);
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Shipments &amp; Groups</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
              Group vehicles by the shipment, auction batch or yard intake they arrived on.
            </p>
          </div>
          {mayWrite && (
            <button onClick={() => setDraft({ ...EMPTY })} className="btn-accent">
              <Plus size={16} /> Add group
            </button>
          )}
        </div>

        {error && !draft && (
          <div role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', padding: '14px 0' }}>{error}</div>
        )}

        <div className="admin-table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', marginTop: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Group</th><th>Type</th><th>Vessel</th><th>Origin</th><th>Arrived</th><th>Vehicles</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicleGroupsLoading ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading groups…</td></tr>
              ) : vehicleGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No groups yet. Add one to file vehicles under the shipment or batch they arrived on — until then every car shows as Ungrouped.
                  </td>
                </tr>
              ) : vehicleGroups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{g.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{g.id}</div>
                    {g.note && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '3px' }}>{g.note}</div>}
                  </td>
                  <td><span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-ink)' }}>{g.type || '—'}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{g.vessel || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{g.origin || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{g.arrived || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{countFor(g.id)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {mayWrite && (
                        <button onClick={() => setDraft({ ...g })} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', cursor: 'pointer', fontWeight: 600 }}>
                          <Edit2 size={15} /> Edit
                        </button>
                      )}
                      {mayWrite && (
                        <button onClick={() => setConfirming(g)} style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', fontWeight: 600 }}>
                          <Trash2 size={15} /> Remove
                        </button>
                      )}
                      {!mayWrite && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>View only</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)} role="dialog" aria-modal="true" aria-label="Remove group">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '440px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)', marginBottom: '10px' }}>
              Remove {confirming.name}?
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
              {countFor(confirming.id) > 0
                ? `${countFor(confirming.id)} vehicle${countFor(confirming.id) === 1 ? '' : 's'} will move to Ungrouped. The vehicles themselves are not deleted.`
                : 'No vehicles are filed under this group.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => confirmRemove(confirming)} className="btn-primary" style={{ background: '#a13f3f', color: 'var(--bg-card)' }}>Remove group</button>
              <button onClick={() => setConfirming(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="modal-overlay" onClick={close} ref={trapRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit group' : 'Add group'}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>
                {draft.id ? 'Edit group' : 'Add group'}
              </h3>
              <button onClick={close} aria-label="Close" style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={label} htmlFor="g-name">Group name *</label>
                <input id="g-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={field} placeholder="July 2026 Japan Shipment" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={label} htmlFor="g-type">Type</label>
                  <select id="g-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} style={field}>
                    {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="g-arrived">Arrived</label>
                  <input id="g-arrived" type="date" value={draft.arrived || ''} onChange={(e) => setDraft({ ...draft, arrived: e.target.value })} style={field} />
                </div>
                <div>
                  <label style={label} htmlFor="g-vessel">Vessel</label>
                  <input id="g-vessel" value={draft.vessel || ''} onChange={(e) => setDraft({ ...draft, vessel: e.target.value })} style={field} placeholder="MV Hoegh Trapper" />
                </div>
                <div>
                  <label style={label} htmlFor="g-origin">Origin</label>
                  <input id="g-origin" value={draft.origin || ''} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} style={field} placeholder="Yokohama" />
                </div>
              </div>

              <div>
                <label style={label} htmlFor="g-note">Note</label>
                <textarea id="g-note" rows={2} value={draft.note || ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} style={{ ...field, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {draft.id && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {draft.id} · issued when the group was created and never changes
                </div>
              )}

              {error && <div role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{error}</div>}

              <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: '6px', padding: '10px', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Create group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
