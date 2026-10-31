import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AdminContext';
import { KeywaveLogo } from './KeywaveLogo';
import { KeywaveStamp } from './KeywaveStamp';
import { X, Printer } from 'lucide-react';

const TH = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#57606a',
  padding: '10px 14px',
  borderBottom: '1.5px solid #d8dee4',
  textAlign: 'left',
};

const TD = {
  padding: '12px 14px',
  borderBottom: '1px solid #eaeef2',
  fontSize: '0.88rem',
};

/**
 * Spare Part Invoice / Quotation Component
 * Compatible with Keywave Enterprise Limited stationery.
 */
export const PartInvoice = ({ order, isQuotation = false, onClose }) => {
  const { siteContent, bankAccounts, formatKES } = useApp();
  const company = siteContent?.company || {};
  const contact = siteContent?.contact || {};

  const invoiceNo = isQuotation
    ? `ZM4-PQ-${order.ref || 'DRAFT'}`
    : `ZM4-P-${order.ref || 'NEW'}`;

  const [customerName, setCustomerName] = useState(order.customer || '');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.title;
    document.title = `${isQuotation ? 'Quotation' : 'Invoice'} ${invoiceNo}`;
    return () => { document.title = prev; };
  }, [invoiceNo, isQuotation]);

  const defaultBank = (bankAccounts || []).find((a) => a.isDefault) || (bankAccounts || [])[0] || {};
  const lines = Array.isArray(order.items) ? order.items : [];
  const linesTotal = lines.reduce(
    (sum, l) => sum + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0),
    0
  );
  const totalAmount = order.total != null ? Number(order.total) : linesTotal;
  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
  const balanceDue = isPaid ? 0 : totalAmount;

  return createPortal(
    <div className="modal-overlay invoice-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${isQuotation ? 'Quotation' : 'Invoice'} ${invoiceNo}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-md)',
          background: '#fff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Controls — hidden during print */}
        <div
          className="invoice-controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 24px',
            borderBottom: '1px solid #d8dee4',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2328' }}>
            {isQuotation ? 'Proforma / Quotation' : 'Spare Parts Invoice'} {invoiceNo}
          </span>
          <span style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              <Printer size={15} aria-hidden="true" /> Print / Save as PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close invoice">
              <X size={16} aria-hidden="true" /> Close
            </button>
          </span>
        </div>

        {/* Printable Sheet */}
        <div className="invoice-sheet" style={{ padding: '42px 48px 48px', color: '#272b30', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
            <div>
              <KeywaveLogo height={58} />
              <div style={{ marginTop: '16px', color: '#33373d' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#24292e' }}>
                  {company.companyName || 'Keywave Enterprise Limited'}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#57606a', lineHeight: 1.6, marginTop: '4px' }}>
                  <div style={{ fontWeight: 600, color: '#1f2328' }}>Zoom Imports — Genuine Mazda Spare Parts</div>
                  {company.poBox && <div>{company.poBox}</div>}
                  {contact.location && <div>{contact.location}</div>}
                  {contact.phone && <div>{contact.phone}</div>}
                  {contact.email && <div>{contact.email}</div>}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isQuotation ? 'var(--accent-text)' : '#1f2328' }}>
                {isQuotation ? 'PROFORMA / QUOTATION' : 'TAX / SALE INVOICE'}
              </div>
              <div style={{ fontSize: '0.96rem', color: '#1f2328', fontWeight: 700, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {invoiceNo}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#57606a', marginTop: '10px' }}>
                Date: {order.date || new Date().toISOString().slice(0, 10)}
              </div>
              {order.delivery && (
                <div style={{ fontSize: '0.82rem', color: '#57606a', marginTop: '4px' }}>
                  Fulfillment: {order.delivery}
                </div>
              )}
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                  BALANCE DUE
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2328', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {formatKES(balanceDue)}
                </div>
              </div>
            </div>
          </header>

          <div style={{ borderBottom: '1px solid #d8dee4', margin: '24px 0 20px' }} />

          {/* BILL TO */}
          <section style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
              BILL TO
            </div>
            {order.customer ? (
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2328', marginTop: '4px' }}>
                {order.customer}
              </div>
            ) : (
              <input
                className="invoice-billto-input"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name here"
                style={{
                  fontSize: '1.25rem', fontWeight: 700, color: '#1f2328',
                  marginTop: '4px', width: '100%', maxWidth: '420px',
                  padding: '2px 0', background: 'transparent',
                  border: 'none', borderBottom: '1px solid #b9c0c8', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            )}
            {(order.phone || order.email || order.location) && (
              <div style={{ fontSize: '0.88rem', color: '#57606a', marginTop: '4px', lineHeight: 1.5 }}>
                {order.phone && <div>Phone: {order.phone}</div>}
                {order.email && <div>Email: {order.email}</div>}
                {order.location && <div>Destination / Workshop: {order.location}</div>}
              </div>
            )}
          </section>

          {/* Lines Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <thead>
              <tr>
                <th style={TH}>ITEM & DESCRIPTION</th>
                <th style={{ ...TH, textAlign: 'center', width: '70px' }}>QTY</th>
                <th style={{ ...TH, textAlign: 'right', width: '130px' }}>RATE (KES)</th>
                <th style={{ ...TH, textAlign: 'right', width: '140px' }}>AMOUNT (KES)</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...TD, color: '#57606a', fontStyle: 'italic' }}>
                    {order.itemsFmt || 'No item lines recorded.'}
                  </td>
                </tr>
              ) : (
                lines.map((l, idx) => (
                  <tr key={`${l.partId || 'line'}-${idx}`}>
                    <td style={TD}>
                      <div style={{ fontWeight: 600, color: '#1f2328' }}>{l.name}</div>
                      {l.partNumber && (
                        <div style={{ fontSize: '0.78rem', color: '#57606a', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          Part No: {l.partNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ ...TD, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {l.qty}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {formatKES(Number(l.unitPrice) || 0)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1f2328' }}>
                      {formatKES((Number(l.unitPrice) || 0) * (Number(l.qty) || 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #d8dee4', marginBottom: '20px' }} />

          {/* Total & Summary Block */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', marginBottom: '32px' }}>
            <div style={{ width: '320px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid #d8dee4',
                borderBottom: '1px solid #d8dee4',
                fontWeight: 700
              }}>
                <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#57606a' }}>
                  SUBTOTAL / TOTAL
                </span>
                <span style={{ fontSize: '1.1rem', color: '#1f2328', fontFamily: 'var(--font-mono)' }}>
                  {formatKES(totalAmount)}
                </span>
              </div>

              {order.paymentStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', fontSize: '0.84rem', color: '#57606a' }}>
                  <span>
                    Payment Status ({order.paymentStatus})
                    {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                    {order.paymentRef ? ` · ${order.paymentRef}` : ''}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: isPaid ? '#1c7a4f' : '#b25e09' }}>
                    {isPaid ? 'PAID' : order.paymentStatus.toUpperCase()}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '8px 0', borderTop: '1px solid #d8dee4', fontWeight: 700,
              }}>
                <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#57606a' }}>
                  Balance Due
                </span>
                <span style={{ fontSize: '1.15rem', color: '#1f2328', fontFamily: 'var(--font-mono)' }}>
                  {formatKES(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Official Stamp */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '28px', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.86rem', color: '#24292e', lineHeight: 1.75 }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#57606a', marginBottom: '4px' }}>
                Bank & Payment Instructions
              </div>
              {defaultBank.bankName && <div><strong>Bank:</strong> {defaultBank.bankName}</div>}
              {defaultBank.branch && <div><strong>Branch:</strong> {defaultBank.branch}</div>}
              {defaultBank.accountNo && <div><strong>Account No.:</strong> {defaultBank.accountNo}</div>}
              {defaultBank.accountName && <div><strong>Account Name:</strong> {defaultBank.accountName}</div>}
              <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#57606a' }}>
                Please use invoice reference <strong>{invoiceNo}</strong> when making payment.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <KeywaveStamp />
            </div>
          </section>

          <footer style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #eaeef2', fontSize: '0.78rem', color: '#8c959f', textAlign: 'center' }}>
            Official genuine Mazda parts supplied by Zoom Imports / Keywave Enterprise Limited. Inquiries: {contact.phone || '+254 712 345 678'} · {contact.email || 'parts@zoomimports.co.ke'}
          </footer>

        </div>

        <style>{`
          .invoice-billto-input::placeholder { color: #9aa4ae; font-weight: 400; font-size: 1rem; }
          .invoice-billto-input:focus { border-bottom-color: #1f2328; }
          @media print {
            @page { margin: 12mm; size: portrait; }
            #root { display: none !important; }
            .modal-overlay.invoice-overlay {
              position: static !important;
              background: none !important;
              padding: 0 !important;
              overflow: visible !important;
              display: block !important;
            }
            .modal-overlay.invoice-overlay > div {
              box-shadow: none !important;
              max-width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              border-radius: 0 !important;
            }
            .invoice-controls { display: none !important; }
            .invoice-sheet { padding: 0 !important; }
            .invoice-billto-input { border-bottom: none !important; }
            .invoice-billto-input::placeholder { display: none; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};
