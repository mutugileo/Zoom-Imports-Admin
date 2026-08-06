import React from 'react';
import { useApp } from '../context/AdminContext';
import { amountPaid, outstandingBalance, totalCost, expensesTotal } from '@shared/lib/costing';
import { CLEARING_FIELDS, PURCHASE_FIELDS } from '@shared/lib/costing';

/**
 * What has been paid, and what is still owed.
 *
 * Reads the same ledger as the Costs tab rather than holding figures of its own
 * — two records of the same money is how a supplier balance ends up disputed.
 * Costs answers "what did this car cost"; Payments answers "what do we still
 * owe on it", which is a cash-flow question with a different reader.
 */
export const VehiclePayments = ({ vehicle }) => {
  const { costsFor, formatKES } = useApp();
  const costs = costsFor(vehicle.id);

  const cnf = Number(costs.cnf) || 0;
  const paid = amountPaid(costs);
  const owed = outstandingBalance(costs);
  const pct = cnf > 0 ? Math.min(100, Math.max(0, (paid / cnf) * 100)) : 0;

  /* Landed costs are settled at the point of clearing, so they are shown as
     already-spent rather than as a balance. Only the CNF carries a supplier
     balance in this model. */
  const landed = CLEARING_FIELDS.reduce((sum, f) => sum + (Number(costs[f.key]) || 0), 0);

  if (cnf === 0 && landed === 0) {
    return (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        No ledger yet for this vehicle. Enter the CNF and the percentage paid on the
        Costs tab and the supplier balance appears here.
      </p>
    );
  }

  const row = (name, value, tone) => (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        gap: '16px', padding: '11px 0', borderBottom: '1px solid var(--band-line)',
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{name}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: tone ?? 'var(--text-dark)', fontFamily: 'IBM Plex Mono, monospace' }}>
        {value}
      </span>
    </div>
  );

  return (
    <div>
      <section
        style={{
          border: '1px solid var(--band-line)', borderRadius: '10px',
          padding: '18px', marginBottom: '16px', background: 'var(--bg-app)',
        }}
      >
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Supplier balance (CNF)
        </div>

        <div
          role="img"
          aria-label={`${pct.toFixed(0)} percent of the CNF paid`}
          style={{ height: '10px', borderRadius: '999px', background: '#e3e8ed', overflow: 'hidden', marginBottom: '12px' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: owed > 0 ? 'var(--accent-text)' : 'var(--primary-ink)', transition: 'width 220ms ease' }} />
        </div>

        {row('CNF invoiced', formatKES(cnf))}
        {row(`Paid so far (${(Number(costs.percentagePaid) || 0)}%)`, formatKES(paid), 'var(--primary-ink)')}
        {row('Outstanding to supplier', formatKES(owed), owed > 0 ? 'var(--accent-text)' : 'var(--primary-ink)')}
      </section>

      <section style={{ border: '1px solid var(--band-line)', borderRadius: '10px', padding: '18px', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Already settled
        </div>
        {row('Clearing and landing', formatKES(landed))}
        {row('Repairs and other costs', formatKES(expensesTotal(costs)))}
        {row('Total spent on this vehicle', formatKES(totalCost(costs)))}

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.6 }}>
          Clearing and post-arrival costs are treated as paid at the point they are
          entered. Only the CNF carries a running balance, because it is the only
          one invoiced ahead of the work.
        </p>
      </section>
    </div>
  );
};
