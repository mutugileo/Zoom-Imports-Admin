import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { useApp } from '../context/AdminContext';
import { X } from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Records who a car went to.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE VEHICLE'S DETAILS ARE COPIED HERE, NOT LINKED.
 *
 * When a car is picked below, its model, year, registration and chassis are
 * read once and written onto the buyer's row. From that moment the two records
 * are independent: correcting the car's name next March does not alter what
 * this buyer's invoice says, and neither does deleting the car outright.
 *
 * That is the whole reason the columns are duplicated. An invoice is a document
 * handed to a customer and kept in a file — reprinting one has to produce the
 * same piece of paper, not today's version of it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The price and date default to the sale record where there is one, because
 * that is the figure actually achieved rather than the one on the windscreen.
 * They stay editable: a deposit-and-balance deal is not always the sale row.
 */
export const RecordBuyerModal = ({ vehicle = null, buyer = null, onClose }) => {
  const { vehicles, saveBuyer, saleFor, buyerForVehicle, formatKES } = useApp();
  const editing = Boolean(buyer);

  /* Only cars that have actually sold, and only those not already handed to
     someone — a second buyer for the same car is a data-entry mistake, not a
     case to support. The car already on this record stays in the list so an
     edit does not lose its own selection. */
  const sellable = useMemo(
    () => vehicles.filter(
      (v) => v.status === 'Sold'
        && (!buyerForVehicle(v.id) || v.id === (buyer?.vehicleId ?? vehicle?.id))
    ),
    [vehicles, buyerForVehicle, buyer, vehicle]
  );

  const [vehicleId, setVehicleId] = useState(
    () => buyer?.vehicleId ?? vehicle?.id ?? ''
  );

  const [form, setForm] = useState(() => ({
    name: buyer?.name ?? '',
    phone: buyer?.phone ?? '',
    email: buyer?.email ?? '',
    idNumber: buyer?.idNumber ?? '',
    address: buyer?.address ?? '',
    notes: buyer?.notes ?? '',
    salePrice: buyer?.salePrice ?? '',
    saleDate: buyer?.saleDate ?? '',
  }));
  const [error, setError] = useState('');

  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const picked = vehicles.find((v) => v.id === Number(vehicleId)) ?? null;
  const sale = picked ? saleFor(picked.id) : null;

  /* Choosing a different car refills the money fields from that car's sale.
     Only on a change of car, and only when they have not been typed into —
     silently overwriting a figure someone entered by hand would be worse than
     making them retype it. */
  const chooseVehicle = (nextId) => {
    setVehicleId(nextId);
    setError('');
    const next = vehicles.find((v) => v.id === Number(nextId));
    const nextSale = next ? saleFor(next.id) : null;
    setForm((f) => ({
      ...f,
      salePrice: nextSale?.price ?? next?.price ?? f.salePrice,
      saleDate: nextSale?.date ?? f.saleDate ?? todayISO(),
    }));
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const submit = useCallback(async (e) => {
    e.preventDefault();

    if (!form.name.trim()) { setError('Enter the buyer’s name — it is what the invoice is made out to.'); return; }
    if (!form.phone.trim()) { setError('Enter a phone number. It is the only way to reach the buyer after they drive off.'); return; }
    if (!picked) { setError('Choose which car this buyer bought.'); return; }

    const price = form.salePrice === '' ? null : Number(form.salePrice);
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      setError('Enter the price the car sold for, or leave it blank.');
      return;
    }

    const result = await saveBuyer({
      id: buyer?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      idNumber: form.idNumber.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      // The copy. Taken from the vehicle as it reads right now, and never
      // re-read afterwards — see the note at the top of this file.
      vehicleId: picked.id,
      vehicleName: picked.name,
      vehicleYear: picked.year ?? null,
      vehicleReg: picked.regNumber || '',
      vehicleChassis: picked.chassis || '',
      salePrice: price,
      saleDate: form.saleDate || '',
    });

    if (!result.ok) { setError(result.reason || 'Could not save this buyer.'); return; }
    onClose();
  }, [form, picked, buyer, saveBuyer, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-title"
        ref={trapRef}
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} style={{ padding: '24px 26px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
            <div>
              <h2 id="buyer-title" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-dark)' }}>
                {editing ? 'Edit buyer' : 'Record buyer'}
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                {editing
                  ? 'The vehicle details on this record are a copy taken when it was created.'
                  : 'The car’s details are copied onto this record, so a later edit cannot change an invoice already issued.'}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <label className="field-label" htmlFor="buyer-vehicle">Vehicle sold</label>
          <select
            id="buyer-vehicle"
            className="field"
            value={vehicleId}
            onChange={(e) => chooseVehicle(e.target.value)}
            style={{ marginBottom: '6px' }}
          >
            <option value="">Select the car…</option>
            {sellable.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.year}){v.regNumber ? ` · ${v.regNumber}` : ''}
              </option>
            ))}
          </select>
          {sellable.length === 0 ? (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.55 }}>
              No cars are waiting for a buyer. Mark a car as sold on the Vehicles
              screen and it will appear here.
            </p>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.55 }}>
              Only cars marked Sold that have not been assigned a buyer yet.
            </p>
          )}

          {/* What will actually be written down. Shown before the button is
              pressed, because after it these values stop tracking the car. */}
          {picked && (
            <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', padding: '13px 15px', marginBottom: '16px' }}>
              <Row label="Model" value={`${picked.name} (${picked.year ?? '—'})`} />
              <Row label="Registration" value={picked.regNumber || 'not on file'} />
              <Row label="Chassis" value={picked.chassis || 'not on file'} />
              {sale ? (
                <Row label="Recorded sale" value={`${formatKES(sale.price)} on ${sale.date || 'no date'}`} />
              ) : (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', margin: '6px 0 0', lineHeight: 1.55 }}>
                  No sale has been recorded against this car, so the price below
                  starts from the listing price. Check it before saving.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="field-label" htmlFor="buyer-name">Buyer’s name</label>
              <input id="buyer-name" type="text" className="field" value={form.name} onChange={set('name')} autoFocus />
            </div>
            <div>
              <label className="field-label" htmlFor="buyer-phone">Phone</label>
              <input id="buyer-phone" type="tel" className="field" value={form.phone} onChange={set('phone')} placeholder="07xx xxx xxx" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="field-label" htmlFor="buyer-email">Email (optional)</label>
              <input id="buyer-email" type="email" className="field" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="field-label" htmlFor="buyer-id">ID / passport number (optional)</label>
              <input id="buyer-id" type="text" className="field" value={form.idNumber} onChange={set('idNumber')} />
            </div>
          </div>

          <label className="field-label" htmlFor="buyer-address">Address (optional)</label>
          <input id="buyer-address" type="text" className="field" value={form.address} onChange={set('address')} style={{ marginBottom: '12px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label className="field-label" htmlFor="buyer-price">Sale price (KES)</label>
              <input id="buyer-price" type="number" className="field" value={form.salePrice} onChange={set('salePrice')} />
            </div>
            <div>
              <label className="field-label" htmlFor="buyer-date">Date of sale</label>
              <input id="buyer-date" type="date" className="field" value={form.saleDate} onChange={set('saleDate')} />
            </div>
          </div>

          <label className="field-label" htmlFor="buyer-notes">Notes (optional)</label>
          <textarea
            id="buyer-notes"
            className="field"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Payment terms, outstanding balance, logbook transfer status."
            style={{ resize: 'vertical', marginBottom: '16px' }}
          />

          {error && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginBottom: '12px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              {editing ? 'Save changes' : 'Record buyer'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0' }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-dark)', textAlign: 'right' }}>
      {value}
    </span>
  </div>
);
