import React, { useEffect } from 'react';
import { useApp } from '../context/AdminContext';
import { KeywaveLogo } from './KeywaveLogo';
import { KeywaveStamp } from './KeywaveStamp';
import { X, Printer } from 'lucide-react';

/**
 * The invoice number.
 *
 * A number typed in by hand wins, so a record can be matched to an invoice
 * already written on paper. Otherwise it is derived from the row's primary key:
 * the same number every time the record is opened, on any machine, and two
 * people printing at once cannot mint the same one. Deleting a buyer retires
 * its number rather than handing it to the next sale.
 *
 * Padded to four digits so the sequence keeps one width past the hundredth
 * sale instead of running ZM4-08 → ZM4-100.
 */
export const invoiceNumberFor = (buyer) =>
  buyer?.invoiceNo || `ZM4-${String(buyer?.id ?? 0).padStart(4, '0')}`;

/** `sale_date` is stored as plain text, so a malformed one must not throw. */
const readableDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * Keywave Enterprise Limited Invoice Component
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY FIGURE HERE COMES OFF THE BUYER ROW. Nothing is looked up from
 * `vehicles`, deliberately — the vehicle columns on `buyers` are a copy taken
 * when the sale was recorded, and reading the live car instead would mean
 * editing a listing silently reissues a document the customer already holds.
 *
 * NOTHING IS INVENTED WHEN A FIELD IS MISSING. A blank price prints as blank
 * and says so; it must never fall back to a plausible-looking figure, because
 * this is a document handed to a customer and a placeholder they act on is
 * worse than an obvious gap.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The company's own name, box number and bank account are the one live read,
 * from `company_billing` — a moved office or a changed account has to appear on
 * the next print. They sit on their own staff-only table rather than on
 * `site_contact`, which grants SELECT to `anon`.
 *
 * There is no tax line. The yard's VAT position is not recorded anywhere in
 * this system, and printing a 16% line on a document a customer may hand to
 * KRA would assert something no data here supports.
 */
export const Invoice = ({ buyer, onClose }) => {
  const { siteContent, billing, formatKES, paymentsForBuyer, balanceForBuyer } = useApp();

  /* Balance Due is what is STILL owed, not the agreed price.
   *
   * This previously printed sale_price unconditionally, so a customer who had
   * already paid a deposit was handed a document demanding the whole amount
   * again. Payments are listed beneath the total so the arithmetic is on the
   * page rather than asserted. */
  const received = paymentsForBuyer ? paymentsForBuyer(buyer.id) : [];
  const money = balanceForBuyer ? balanceForBuyer(buyer) : { paid: 0, balance: null };
  const paidTotal = money.paid || 0;
  const outstanding = money.balance;
  const contact = siteContent?.contact ?? {};
  const company = billing ?? {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * The payment block.
   *
   * Taken from the buyer's own copied columns, so a reprint always names the
   * account that was on the original. Records written before accounts became
   * selectable have no copy, and fall back to the single account that used to
   * live on `company_billing` — which is exactly what those invoices showed at
   * the time, so the fallback reproduces them rather than rewriting them.
   */
  const bank = buyer.bankAccountNo || buyer.bankName
    ? {
        name: buyer.bankName,
        branch: buyer.bankBranch,
        accountNo: buyer.bankAccountNo,
        accountName: buyer.bankAccountName,
      }
    : {
        name: company.bankName,
        branch: company.bankBranch,
        accountNo: company.bankAccountNo,
        accountName: company.bankAccountName,
      };

  const number = invoiceNumberFor(buyer);
  /* Dated by the sale, not by the clock — an invoice reprinted in six months
     has to be the same document. Falls back to when the record was created,
     and then to nothing at all rather than to a date nobody agreed to. */
  const issued = readableDate(buyer.saleDate) ?? readableDate(buyer.at);

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

  /* An em dash, never a number. A missing price used to print as 3,800,000 —
     a figure a customer could reasonably have paid, on paper they were handed.
     `priced` drives the warning below so the gap is stated, not just left
     blank. */
  const priced = buyer.salePrice != null;
  const numericAmount = priced ? buyer.salePrice.toLocaleString('en-US') : '—';

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
            justifyContent: 'space-between',
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
                {/* From `company_billing`, editable on Site Content. The
                    literals that used to sit here meant a changed account or a
                    new office needed a deploy. */}
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', textTransform: 'uppercase', color: '#24292e' }}>
                  {company.companyName || 'Keywave Enterprise Limited'}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#57606a', lineHeight: 1.6, marginTop: '4px' }}>
                  {company.poBox && <div>{company.poBox}</div>}
                  {contact.phone && <div>{contact.phone}</div>}
                  {contact.email && <div>{contact.email}</div>}
                </div>
              </div>
            </div>

            {/* Top-Right Info: Invoice #, Date, Balance Due */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.92rem', color: '#444c56', fontWeight: 500 }}>
                {number}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#444c56', marginTop: '18px' }}>
                {issued ?? <span style={{ color: '#8a3232' }}>No date of sale recorded</span>}
              </div>
              <div style={{ marginTop: '36px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                  BALANCE DUE
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f2328', marginTop: '2px' }}>
                  {priced
                    ? `Ksh. ${(outstanding ?? Number(buyer.salePrice)).toLocaleString('en-US')}`
                    : '—'}
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

          {/* Said plainly rather than printed as a plausible number. A gap on
              an invoice is something to go and fill in, not a free car. */}
          {!priced && (
            <p style={{ fontSize: '0.82rem', color: '#8a3232', marginTop: '10px', lineHeight: 1.6 }}>
              No sale price is recorded against this buyer. Add it before giving
              this invoice to the customer.
            </p>
          )}

          {/* Table Bottom Border Line */}
          <div style={{ borderBottom: '1px dashed #d8dee4', marginBottom: '24px' }} />

          {/* TOTAL Section */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: '40px' }}>
            <div style={{ width: '300px' }}>
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
                  TOTAL
                </span>
                <span style={{ fontSize: '1.05rem', color: '#1f2328' }}>
                  {numericAmount}
                </span>
              </div>

              {/* The arithmetic, on the page. A customer who has paid a deposit
                  should be able to see it accounted for rather than take the
                  Balance Due on trust — and if a receipt is queried, the date
                  and reference are printed here beside the amount. */}
              {received.length > 0 && (
                <>
                  {received.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', fontSize: '0.82rem', color: '#57606a' }}>
                      <span>
                        Paid {p.paidOn}
                        {p.method ? ` · ${p.method}` : ''}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                      <span style={{ whiteSpace: 'nowrap' }}>
                        &minus; {Number(p.amount).toLocaleString('en-US')}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '8px 0', borderTop: '1px solid #d8dee4', fontWeight: 700,
                  }}>
                    <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#57606a' }}>
                      Balance due
                    </span>
                    <span style={{ fontSize: '1.05rem', color: '#1f2328' }}>
                      {priced ? (outstanding ?? 0).toLocaleString('en-US') : '—'}
                    </span>
                  </div>
                  {/* Overpayment is not a negative balance to a customer; it is
                      money owed back to them, and saying so is the honest read. */}
                  {priced && outstanding < 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#57606a', paddingTop: '4px' }}>
                      Overpaid by {Math.abs(outstanding).toLocaleString('en-US')} — refundable.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bank Payment Details & Stamp Section */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '36px', alignItems: 'flex-end' }}>
            {/* Bank Details */}
            {/* The account CHOSEN for this sale, read off the buyer's own copy
                so a reprint names what the customer was originally told to pay
                into. `company` is only the fallback for records written before
                accounts became selectable.

                Each line only prints once it has a value. A half-written
                account is worse than none — it is what a customer types into
                their banking app. */}
            <div style={{ fontSize: '0.88rem', color: '#24292e', lineHeight: 1.75 }}>
              {bank.name && <div><strong style={{ fontWeight: 600 }}>Bank Name:</strong> {bank.name}</div>}
              {bank.branch && <div><strong style={{ fontWeight: 600 }}>Branch:</strong> {bank.branch}</div>}
              {bank.accountNo && <div><strong style={{ fontWeight: 600 }}>Account No.:</strong> {bank.accountNo}</div>}
              {bank.accountName && <div><strong style={{ fontWeight: 600 }}>Account Name:</strong> {bank.accountName}</div>}
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
