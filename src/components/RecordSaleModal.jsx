import React, { useState, useEffect, useCallback } from 'react';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { useApp } from '../context/AdminContext';
import { totalCost, hasLedger } from '@shared/lib/costing';
import { X, AlertTriangle } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Marking a car sold.
 *
 * It asks for the price achieved rather than taking the listing price, because
 * those are rarely the same number and the difference is the whole point: a
 * profit figure built on the asking price is a profit the yard never made.
 *
 * It also shows the cost position at the moment of sale, and says plainly when
 * there is none — a car sold without a ledger will be counted in revenue and
 * excluded from profit, and the person clicking the button is the only one who
 * can still fix that.
 */
export const RecordSaleModal = ({ vehicle, onClose }) => {
  const { recordVehicleSale, costsFor, formatKES } = useApp();
  const costs = costsFor(vehicle.id);
  const costed = hasLedger(costs);
  const cost = totalCost(costs);

  const [price, setPrice] = useState(vehicle.price ?? 0);
  const [date, setDate] = useState(todayISO());
  const [buyer, setBuyer] = useState('');
  const [error, setError] = useState('');

  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const value = Number(price);
  const profit = costed ? value - cost : null;

  const submit = useCallback((e) => {
    e.preventDefault();
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter the price the car actually sold for.');
      return;
    }
    if (!date) {
      setError('Enter the date of sale — the profit reports are grouped by it.');
      return;
    }
    recordVehicleSale(vehicle.id, { price: value, date, buyer });
    onClose();
  }, [value, date, buyer, vehicle.id, recordVehicleSale, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-title"
        ref={trapRef}
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} style={{ padding: '24px 26px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
            <div>
              <h2 id="sale-title" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-dark)' }}>
                Record sale
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                {vehicle.name} ({vehicle.year}) &middot; {vehicle.stockId || 'no stock ID'}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <label className="field-label" htmlFor="sale-price">Price achieved (KES)</label>
          <input
            id="sale-price"
            type="number"
            className="field"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setError(''); }}
            autoFocus
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', margin: '5px 0 14px' }}>
            Listed at {formatKES(vehicle.price)}. Enter what the buyer actually paid.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="field-label" htmlFor="sale-date">Date of sale</label>
              <input id="sale-date" type="date" className="field" value={date} onChange={(e) => { setDate(e.target.value); setError(''); }} />
            </div>
            <div>
              <label className="field-label" htmlFor="sale-buyer">Buyer (optional)</label>
              <input id="sale-buyer" type="text" className="field" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Name or phone" />
            </div>
          </div>

          {/* The cost position, stated before the button is pressed. */}
          <div style={{ background: costed ? 'var(--primary-light)' : 'var(--accent-soft)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '18px' }}>
            {costed ? (
              <>
                <Row label="Total cost" value={formatKES(cost)} />
                <Row label="Profit on this sale" value={formatKES(profit)} strong tone={profit < 0 ? '#b3261e' : 'var(--primary-ink)'} />
              </>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--accent-text)' }} aria-hidden="true" />
                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.55, color: 'var(--text-body)' }}>
                  <strong style={{ color: 'var(--accent-text)' }}>No cost ledger on this car.</strong>{' '}
                  The sale will count towards revenue but be left out of profit,
                  because there is nothing to subtract. Add the costs first if you
                  want this sale in the profit figures.
                </div>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginBottom: '12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Record sale</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Row = ({ label, value, strong = false, tone }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0' }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: strong ? 700 : 500, color: tone || 'var(--text-dark)' }}>
      {value}
    </span>
  </div>
);
