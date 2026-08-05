import React, { useEffect } from 'react';
import { useApp } from '../context/AdminContext';
import { KeywaveLogo } from './KeywaveLogo';
import { KeywaveStamp } from './KeywaveStamp';
import { X, Printer } from 'lucide-react';

/**
 * The invoice number.
 */
export const invoiceNumberFor = (buyer) =>
  buyer?.invoiceNo || `ZM4-${String(buyer?.id ?? 8).padStart(2, '0')}`;

/** `sale_date` is stored as plain text, so a malformed one must not throw. */
const readableDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * Keywave Enterprise Limited Invoice Component
 */
export const Invoice = ({ buyer, onClose }) => {
  const { siteContent, formatKES } = useApp();
  const contact = siteContent?.contact ?? {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const number = invoiceNumberFor(buyer);
  const issued = readableDate(buyer.saleDate) ?? readableDate(buyer.at) ?? 'August 4, 2026';

  // Format vehicle description line matching the Keywave structure:
  // e.g., Mazda CX-5/2020/Red/Chassis:KF2P-406537/Engine:SH-31020950
  const vehicleDescParts = [
    buyer.vehicleName || 'Vehicle',
    buyer.vehicleYear || null,
    buyer.vehicleColor || null,
    buyer.vehicleChassis ? `Chassis:${buyer.vehicleChassis}` : null,
    buyer.vehicleEngine ? `Engine:${buyer.vehicleEngine}` : null,
  ].filter(Boolean);

  const fullVehicleDescription = vehicleDescParts.join('/');

  const formattedAmount = buyer.salePrice != null ? formatKES(buyer.salePrice) : '3,800,000';
  const numericAmount = buyer.salePrice != null
    ? buyer.salePrice.toLocaleString('en-US')
    : '3,800,000';

  return (
    <div className="modal-overlay invoice-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${number}`}
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
            justify: 'space-between',
            gap: '12px',
            padding: '14px 24px',
            borderBottom: '1px solid var(--border-medium)',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-dark)' }}>
            Invoice {number}
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
              {/* Keywave Emblem Logo */}
              <KeywaveLogo height={58} />

              {/* Company Info */}
              <div style={{ marginTop: '16px', color: '#33373d' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#24292e' }}>
                  KEYWAVE ENTERPRISE LIMITED
                </div>
                <div style={{ fontSize: '0.88rem', color: '#57606a', lineHeight: 1.6, marginTop: '4px' }}>
                  <div>{contact.poBox || 'P.O Box 4127-00100 Nairobi'}</div>
                  <div>{contact.phone || '0725728780'}</div>
                  <div>{contact.email || 'info@keywavelimited.com'}</div>
                </div>
              </div>
            </div>

            {/* Top-Right Info: Invoice #, Date, Balance Due */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.92rem', color: '#444c56', fontWeight: 500 }}>
                {number}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#444c56', marginTop: '18px' }}>
                {issued}
              </div>
              <div style={{ marginTop: '36px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                  BALANCE DUE
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f2328', marginTop: '2px' }}>
                  Ksh. {numericAmount}
                </div>
              </div>
            </div>
          </header>

          {/* Full Width Divider */}
          <div style={{ borderBottom: '1px solid #d8dee4', margin: '28px 0 24px' }} />

          {/* BILL TO */}
          <section style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
              BILL TO
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1f2328', marginTop: '6px' }}>
              {buyer.name}
            </div>
            {(buyer.phone || buyer.email || buyer.address) && (
              <div style={{ fontSize: '0.88rem', color: '#57606a', marginTop: '4px', lineHeight: 1.5 }}>
                {buyer.phone && <div>{buyer.phone}</div>}
                {buyer.email && <div>{buyer.email}</div>}
                {buyer.address && <div>{buyer.address}</div>}
              </div>
            )}
          </section>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>DESCRIPTION</th>
                <th style={{ ...TH, textAlign: 'center', width: '90px' }}>RATE</th>
                <th style={{ ...TH, textAlign: 'center', width: '70px' }}>QTY</th>
                <th style={{ ...TH, textAlign: 'right', width: '130px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={TD}>
                  <div style={{ fontWeight: 500, color: '#1f2328', lineHeight: 1.5 }}>
                    {fullVehicleDescription}
                  </div>
                </td>
                <td style={{ ...TD, textAlign: 'center', color: '#6e7781' }}>—</td>
                <td style={{ ...TD, textAlign: 'center', color: '#6e7781' }}>—</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: '#1f2328', whiteSpace: 'nowrap' }}>
                  {numericAmount}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Table Bottom Border Line */}
          <div style={{ borderBottom: '1px dashed #d8dee4', marginBottom: '24px' }} />

          {/* TOTAL Section */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: '40px' }}>
            <div style={{ width: '300px' }}>
              <div style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid #d8dee4',
                borderBottom: '1px solid #d8dee4',
                fontWeight: 700
              }}>
                <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#57606a' }}>
                  TOTAL
                </span>
                <span style={{ fontSize: '1.05rem', color: '#1f2328' }}>
                  {numericAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Payment Details & Stamp Section */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '36px', alignItems: 'flex-end' }}>
            {/* Bank Details */}
            <div style={{ fontSize: '0.88rem', color: '#24292e', lineHeight: 1.75 }}>
              <div><strong style={{ fontWeight: 600 }}>Bank Name:</strong> KCB</div>
              <div><strong style={{ fontWeight: 600 }}>Branch :</strong> Two Rivers Mall</div>
              <div><strong style={{ fontWeight: 600 }}>AccountNo.:</strong> 1316802892</div>
              <div><strong style={{ fontWeight: 600 }}>Account Name:</strong> Keywave Enterprise Limited</div>
            </div>

            {/* Signature & Official Circular Stamp */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <KeywaveStamp />
            </div>
          </section>

          {/* Notes if any */}
          {buyer.notes && (
            <section style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #f0f2f5' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                NOTES
              </div>
              <p style={{ fontSize: '0.88rem', color: '#444c56', lineHeight: 1.6, marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {buyer.notes}
              </p>
            </section>
          )}

        </div>

        {/* CSS for print mode */}
        <style>{`
          @media print {
            @page { margin: 12mm; size: portrait; }
            body * { visibility: hidden !important; }
            .invoice-sheet, .invoice-sheet * { visibility: visible !important; }
            .invoice-sheet {
              position: absolute !important;
              left: 0; top: 0; width: 100%;
              padding: 0 !important;
              box-shadow: none !important;
            }
            .invoice-controls { display: none !important; }
            .invoice-overlay {
              position: static !important;
              background: #fff !important;
              padding: 0 !important;
              overflow: visible !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

const TH = {
  textAlign: 'left',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#57606a',
  padding: '10px 0',
  borderTop: '1.5px solid #24292e',
  borderBottom: '1.5px solid #24292e',
};

const TD = {
  padding: '16px 0',
  fontSize: '0.9rem',
  verticalAlign: 'top',
};
