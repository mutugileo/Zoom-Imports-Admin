import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AdminContext';
import {
  PURCHASE_FIELDS, CLEARING_FIELDS, EXPENSE_PRESETS, emptyCosts,
  totalCost, expensesTotal, amountPaid, outstandingBalance,
  profit, profitMargin, formatMargin,
} from '@shared/lib/costing';
import { Plus, Trash2, Lock } from 'lucide-react';

const label = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' };
const field = {
  width: '100%', padding: '8px 10px', borderRadius: '6px',
  border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', fontFamily: 'IBM Plex Mono, monospace',
};
const sectionTitle = {
  fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px',
};
const panel = {
  border: '1px solid var(--band-line)', borderRadius: '10px',
  padding: '16px', marginBottom: '16px', background: 'var(--bg-app)',
};

/** Read-only derived figure. */
const Derived = ({ name, value, tone }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '8px', padding: '11px 13px' }}>
    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '3px' }}>{name}</div>
    <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: tone ?? 'var(--text-dark)', fontFamily: 'IBM Plex Mono, monospace' }}>
      {value}
    </div>
  </div>
);

/**
 * The cost ledger for one vehicle.
 *
 * Laid out in the order money is actually spent — bought, landed, then fixed up
 * — because that is the order the paperwork arrives in, and someone entering
 * figures is working through a pile of invoices in roughly that sequence.
 *
 * Everything recalculates as you type. The summary is never editable except for
 * the selling price, which lives on the vehicle rather than here.
 */
export const VehicleCosts = ({ vehicle }) => {
  const { costsFor, saveCosts, can, formatKES } = useApp();
  const mayEdit = can('costs:write');

  const [draft, setDraft] = useState(() => ({ ...emptyCosts(), ...costsFor(vehicle.id) }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Switching vehicles inside an open modal must reload the ledger, or the
  // previous car's figures would sit in the form ready to be saved onto this one.
  useEffect(() => {
    setDraft({ ...emptyCosts(), ...costsFor(vehicle.id) });
    setSaved(false);
  }, [vehicle.id, costsFor]);

  const set = (key, value) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value === '' ? 0 : Number(value) }));
  };

  const setExpense = (i, patch) => {
    setSaved(false);
    setDraft((d) => ({
      ...d,
      expenses: d.expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  };

  const addExpense = () => {
    setSaved(false);
    setDraft((d) => ({ ...d, expenses: [...d.expenses, { label: '', amount: 0 }] }));
  };

  const removeExpense = (i) => {
    setSaved(false);
    setDraft((d) => ({ ...d, expenses: d.expenses.filter((_, idx) => idx !== i) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await saveCosts(vehicle.id, draft);
    if (!result.ok) { setError(result.reason || 'Could not save this ledger.'); return; }
    setSaved(true);
  };

  const cost = totalCost(draft);
  const earned = profit(draft, vehicle.price);
  const margin = profitMargin(draft, vehicle.price);

  const money = (n) => (
    <input
      type="number" min="0" step="1" style={field} disabled={!mayEdit}
      value={draft[n] || ''} onChange={(e) => set(n, e.target.value)} placeholder="0"
    />
  );

  return (
    <form onSubmit={submit}>
      {!mayEdit && (
        <p style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '14px' }}>
          <Lock size={14} /> You can view this ledger but not change it.
        </p>
      )}

      {/* A — purchase and import */}
      <section style={panel}>
        <div style={sectionTitle}>Purchase and import</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {PURCHASE_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={label} htmlFor={`c-${f.key}`}>{f.label} (KES)</label>
              {money(f.key)}
              {f.hint && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>{f.hint}</p>}
            </div>
          ))}
          <div>
            <label style={label} htmlFor="c-pct">Percentage paid</label>
            <input
              id="c-pct" type="number" min="0" max="100" step="1" style={field} disabled={!mayEdit}
              value={draft.percentagePaid || ''} onChange={(e) => set('percentagePaid', e.target.value)} placeholder="0"
            />
            {/* Deliberately not part of Total cost — see costing.js. */}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              How much of the CNF has been paid. Does not change the cost of the car.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
          <Derived name="Amount paid" value={formatKES(amountPaid(draft))} />
          <Derived
            name="Outstanding balance"
            value={formatKES(outstandingBalance(draft))}
            tone={outstandingBalance(draft) > 0 ? 'var(--accent-text)' : 'var(--primary-ink)'}
          />
        </div>
      </section>

      {/* B — clearing and landing */}
      <section style={panel}>
        <div style={sectionTitle}>Clearing and landing</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {CLEARING_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={label} htmlFor={`c-${f.key}`}>{f.label}</label>
              {money(f.key)}
            </div>
          ))}
        </div>
      </section>

      {/* C — post-arrival, as named entries rather than one opaque box */}
      <section style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ ...sectionTitle, marginBottom: 0 }}>Repairs and other costs</div>
          <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-dark)' }}>
            {formatKES(expensesTotal(draft))}
          </span>
        </div>

        {draft.expenses.length === 0 && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Nothing recorded. Add each expense separately — a single lump sum is the
            figure nobody can explain later.
          </p>
        )}

        {draft.expenses.map((e, i) => (
          /* Wraps, and the description keeps a floor. At `flex: 1` its basis
             is 0, so in this column the fixed 140px amount box squeezed it to
             a stub you could not read what you had typed in — the one field
             that explains the money. */
          <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
            <input
              list="expense-presets"
              style={{ ...field, flex: '1 1 180px', minWidth: '150px', fontFamily: 'inherit' }}
              placeholder="Description"
              value={e.label}
              disabled={!mayEdit}
              onChange={(ev) => setExpense(i, { label: ev.target.value })}
            />
            <input
              type="number" min="0" step="1" style={{ ...field, width: '140px' }}
              placeholder="0" value={e.amount || ''} disabled={!mayEdit}
              onChange={(ev) => setExpense(i, { amount: Number(ev.target.value || 0) })}
            />
            {mayEdit && (
              <button
                type="button" onClick={() => removeExpense(i)} aria-label={`Remove ${e.label || 'expense'}`}
                style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', padding: '8px 4px' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        <datalist id="expense-presets">
          {EXPENSE_PRESETS.map((p) => <option key={p} value={p} />)}
        </datalist>

        {mayEdit && (
          <button type="button" onClick={addExpense} className="btn-secondary" style={{ marginTop: '4px' }}>
            <Plus size={14} /> Add expense
          </button>
        )}
      </section>

      {/* Summary */}
      <section style={{ ...panel, background: 'var(--bg-card)' }}>
        <div style={sectionTitle}>Financial summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <Derived name="Total cost" value={formatKES(cost)} />
          <Derived name="Selling price" value={formatKES(vehicle.price)} />
          <Derived
            name="Expected profit"
            value={formatKES(earned)}
            tone={earned < 0 ? '#a13f3f' : 'var(--primary-ink)'}
          />
          <Derived
            name="Profit margin"
            value={formatMargin(margin)}
            tone={margin !== null && margin < 0 ? '#a13f3f' : 'var(--text-dark)'}
          />
        </div>

        {earned < 0 && cost > 0 && (
          <p role="alert" style={{ marginTop: '10px', fontSize: 'var(--text-sm)', color: '#a13f3f' }}>
            This car is priced below what it cost to land.
          </p>
        )}
        <p style={{ marginTop: '10px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Selling price is edited on the listing itself, not here — it is the number
          the customer sees, so it lives with the car.
        </p>
      </section>

      {mayEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="submit" className="btn-primary">Save ledger</button>
          {saved && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-ink)' }}>Saved.</span>}
          {error && <span style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{error}</span>}
        </div>
      )}
    </form>
  );
};
