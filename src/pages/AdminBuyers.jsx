import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { RecordBuyerModal } from '../components/RecordBuyerModal';
import { Invoice, invoiceNumberFor } from '../components/Invoice';
import { Search, UserPlus, ArrowLeft, ReceiptText, Pencil, Trash2 } from 'lucide-react';

/**
 * Who bought what, and the paperwork that goes with it.
 *
 * The detail view is a state of this screen rather than a separate route,
 * because the portal has no URL routing — `currentView` is the whole router.
 * Adding an id to it would have made every other screen carry a payload it has
 * no use for, so the master/detail pair lives here where the id is meaningful.
 */
export const AdminBuyers = () => {
  const { buyers, buyersLoading, deleteBuyer, formatKES, can } = useApp();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [recording, setRecording] = useState(null);   // { vehicle?, buyer? } | null
  const [invoiceFor, setInvoiceFor] = useState(null);
  const [error, setError] = useState('');

  /* Read from the list rather than held in state, so an edit made in the modal
     shows on the detail page as soon as the refresh lands. */
  const selected = buyers.find((b) => b.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter((b) =>
      `${b.name} ${b.phone} ${b.email} ${b.vehicleName} ${b.vehicleReg} ${invoiceNumberFor(b)}`
        .toLowerCase()
        .includes(q)
    );
  }, [buyers, search]);

  const page = usePagedList(filtered, PAGE_SIZE, search.trim().toLowerCase());

  const remove = async (buyer) => {
    if (!window.confirm(`Delete the buyer record for ${buyer.name}? The invoice number ${invoiceNumberFor(buyer)} is retired with it and will not be reissued.`)) return;
    const result = await deleteBuyer(buyer.id);
    if (!result.ok) { setError(result.reason); return; }
    setError('');
    if (selectedId === buyer.id) setSelectedId(null);
  };

  /* ── Detail ──────────────────────────────────────────────────────── */
  if (selected) {
    return (
      <AdminLayout>
        <div className="admin-page" style={{ padding: '0 32px 32px' }}>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: '22px 0 0', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <ArrowLeft size={15} /> All buyers
          </button>

          <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '14px 0 24px', borderBottom: '1px solid var(--band-line)' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>{selected.name}</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '5px' }}>
                {invoiceNumberFor(selected)} · bought {selected.vehicleName || 'a vehicle'}
                {selected.saleDate ? ` on ${selected.saleDate}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => setInvoiceFor(selected)}>
                <ReceiptText size={15} aria-hidden="true" /> Generate invoice
              </button>
              {can('orders:write') && (
                <button type="button" className="btn-secondary" onClick={() => setRecording({ buyer: selected })}>
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '22px' }}>
            <Card title="Contact">
              <Line label="Phone" value={selected.phone} />
              <Line label="Email" value={selected.email} />
              <Line label="ID / passport" value={selected.idNumber} />
              <Line label="Address" value={selected.address} />
            </Card>

            {/* Headed as a copy so nobody goes looking for why it disagrees
                with the Vehicles screen. It is allowed to disagree — that is
                the point of copying it. */}
            <Card
              title="Vehicle as sold"
              note="Copied when this buyer was recorded. Later edits to the car do not change it."
            >
              <Line label="Model" value={selected.vehicleName} />
              <Line label="Year" value={selected.vehicleYear} />
              <Line label="Colour" value={selected.vehicleColor} />
              <Line label="Registration" value={selected.vehicleReg} />
              <Line label="Chassis" value={selected.vehicleChassis} />
              <Line label="Engine" value={selected.vehicleEngine} />
            </Card>

            <Card title="Sale">
              <Line label="Price" value={selected.salePrice == null ? null : formatKES(selected.salePrice)} />
              <Line label="Date" value={selected.saleDate} />
              <Line label="Invoice" value={invoiceNumberFor(selected)} />
            </Card>
          </div>

          {selected.notes && (
            <div style={{ marginTop: '18px' }}>
              <Card title="Notes">
                <p style={{ fontSize: 'var(--text-sm)', color: '#33414f', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selected.notes}
                </p>
              </Card>
            </div>
          )}

          {can('orders:write') && (
            <button
              type="button"
              onClick={() => remove(selected)}
              style={{ marginTop: '26px', display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: '#a13f3f', cursor: 'pointer' }}
            >
              <Trash2 size={15} /> Delete this buyer record
            </button>
          )}
        </div>

        {recording && <RecordBuyerModal {...recording} onClose={() => setRecording(null)} />}
        {invoiceFor && <Invoice buyer={invoiceFor} onClose={() => setInvoiceFor(null)} />}
      </AdminLayout>
    );
  }

  /* ── List ────────────────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>

        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Buyers</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '260px' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search name, phone, car, invoice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%' }}
              />
            </div>
            {can('orders:write') && (
              <button type="button" className="btn-primary" onClick={() => setRecording({})}>
                <UserPlus size={15} aria-hidden="true" /> Record buyer
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#b3261e', marginTop: '14px' }}>{error}</p>
        )}

        <div className="admin-table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginTop: '18px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Sale price</th>
                <th>Date</th>
                <th>Invoice</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {/* "Loading" only when there is genuinely nothing to show yet.
                  The list revalidates whenever the session refreshes, and
                  keying the message on the flag alone replaced rows that were
                  already on screen with a spinner — the table flashed empty
                  while the footer underneath still counted the rows it had. */}
              {buyersLoading && buyers.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading buyers…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                    {buyers.length === 0
                      ? 'No buyers recorded yet. Mark a car as sold on the Vehicles screen, then record who bought it — that is what an invoice is made from.'
                      : 'No buyers match this search.'}
                  </td>
                </tr>
              ) : page.visible.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{b.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.phone}</td>
                  <td style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>
                    {b.vehicleName || '—'}
                    {b.vehicleReg && (
                      <span style={{ display: 'block', fontWeight: 400, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {b.vehicleReg}
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                    {b.salePrice == null ? '—' : formatKES(b.salePrice)}
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{b.saleDate || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {invoiceNumberFor(b)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setInvoiceFor(b); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <ReceiptText size={13} aria-hidden="true" /> Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="buyers" />
        </div>
      </div>

      {recording && <RecordBuyerModal {...recording} onClose={() => setRecording(null)} />}
      {invoiceFor && <Invoice buyer={invoiceFor} onClose={() => setInvoiceFor(null)} />}
    </AdminLayout>
  );
};

const Card = ({ title, note, children }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      {title}
    </div>
    {note && (
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, margin: '6px 0 0' }}>{note}</p>
    )}
    <div style={{ marginTop: '12px' }}>{children}</div>
  </div>
);

/* An empty field prints as "not on file", never as a blank cell — a blank
   reads as a rendering fault, and on a record that feeds an invoice the
   difference between "nothing here" and "nobody entered it" matters. */
const Line = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '4px 0' }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: 'var(--text-sm)', color: value ? 'var(--text-dark)' : '#98a3ad', fontWeight: value ? 600 : 400, textAlign: 'right' }}>
      {value || 'not on file'}
    </span>
  </div>
);
