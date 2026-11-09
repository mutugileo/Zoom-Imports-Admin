import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AdminContext';
import { KeywaveLogo } from './KeywaveLogo';
import { KeywaveStamp } from './KeywaveStamp';
import { X, Printer } from 'lucide-react';

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

export const PartInvoice = ({ order, isQuotation = false, onClose }) => {
  const { siteContent, bankAccounts, parts, issueInvoice } = useApp();
  const company = siteContent?.company || {};
  const contact = siteContent?.contact || {};

  /* A real invoice gets its number from the database the first time it is
     opened, and never before. A quotation is not a sale, so it draws no number
     from the invoice series and is not locked. */
  const [issuedNo, setIssuedNo] = useState(order.invoiceNo || null);
  const [issueError, setIssueError] = useState('');
  const invoiceNo = isQuotation ? `ZM4-Q-${order.ref || '0000'}` : (issuedNo || '');

  const [billToName, setBillToName] = useState(order.customer || '');

  useEffect(() => {
    if (isQuotation || issuedNo || !order.ref) return undefined;
    let cancelled = false;
    issueInvoice(order.ref).then((res) => {
      if (cancelled) return;
      if (res.ok) setIssuedNo(res.invoiceNo);
      else setIssueError(res.reason);
    });
    return () => { cancelled = true; };
  }, [isQuotation, issuedNo, order.ref, issueInvoice]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.title;
    document.title = `Invoice ${invoiceNo}`;
    return () => { document.title = prev; };
  }, [invoiceNo]);

  const defaultBank =
    (bankAccounts || []).find((a) => (a.accountName || '').toLowerCase().includes('zoomflow')) ||
    (bankAccounts || []).find((a) => (a.bankName || '').toLowerCase().includes('kcb')) || {
      bankName: 'KCB',
      branch: 'Two Rivers',
      accountNo: '13510435552',
      accountName: 'Zoomflow Corporation Limited',
    };
  const lines = Array.isArray(order.items) ? order.items : [];
  const linesTotal = lines.reduce(
    (sum, l) => sum + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0),
    0
  );
  const totalAmount = order.total != null ? Number(order.total) : linesTotal;
  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
  const balanceDue = isPaid ? 0 : totalAmount;

  const readableDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const issued = readableDate(order.date || new Date().toISOString().slice(0, 10));

  return createPortal(
    <div className="modal-overlay invoice-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${invoiceNo}`}
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
            {issueError
              ? <span role="alert" style={{ color: '#b42318', fontWeight: 600 }}>{issueError}</span>
              : `Invoice ${invoiceNo || 'issuing…'}`}
          </span>
          <span style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-primary" disabled={!invoiceNo} onClick={() => window.print()}>
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
              {/* Zoom Official Logo */}
              <img
                src="/media/zoom_logo_red_transparent.png"
                alt="Zoom Imports"
                style={{ height: '48px', objectFit: 'contain', display: 'block' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />

              {/* Company Info */}
              <div style={{ marginTop: '16px', color: '#33373d' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#24292e' }}>
                  ZOOM MAZDA PARTS
                </div>
                <div style={{ fontSize: '0.88rem', color: '#57606a', lineHeight: 1.6, marginTop: '4px' }}>
                  <div>Zoomflow Corporation Limited</div>
                  {company.poBox ? <div>{company.poBox}</div> : <div>P.O Box 4127-00100 Nairobi</div>}
                  <div>Tel: +254 182 833966</div>
                </div>
              </div>
            </div>

            {/* Top-Right Info: Invoice #, Date, Balance Due */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.92rem', color: '#444c56', fontWeight: 500 }}>
                {invoiceNo}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#444c56', marginTop: '18px' }}>
                {issued}
              </div>
              <div style={{ marginTop: '36px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                  BALANCE DUE
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f2328', marginTop: '2px' }}>
                  Ksh. {Number(balanceDue).toLocaleString('en-US')}
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
            {order.customer ? (
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1f2328', marginTop: '6px' }}>
                {order.customer}
              </div>
            ) : (
              <input
                className="invoice-billto-input"
                type="text"
                value={billToName}
                onChange={(e) => setBillToName(e.target.value)}
                placeholder="Enter customer name here"
                aria-label="Customer name for this quotation"
                style={{
                  fontSize: '1.35rem', fontWeight: 700, color: '#1f2328',
                  marginTop: '6px', width: '100%', maxWidth: '420px',
                  padding: '2px 0', background: 'transparent',
                  border: 'none', borderBottom: '1px solid #b9c0c8', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            )}
            {(order.phone || order.email || order.location) && (
              <div style={{ fontSize: '0.88rem', color: '#57606a', marginTop: '4px', lineHeight: 1.5 }}>
                {order.phone && <div>{order.phone}</div>}
                {order.email && <div>{order.email}</div>}
                {order.location && <div>{order.location}</div>}
              </div>
            )}
          </section>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>DESCRIPTION</th>
                <th style={{ ...TH, textAlign: 'center', width: '100px' }}>RATE</th>
                <th style={{ ...TH, textAlign: 'center', width: '70px' }}>QTY</th>
                <th style={{ ...TH, textAlign: 'right', width: '130px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td style={TD}>
                    <div style={{ fontWeight: 500, color: '#1f2328', lineHeight: 1.5 }}>
                      {order.itemsFmt || 'Spare Parts Order'}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: 'center', color: '#6e7781' }}>—</td>
                  <td style={{ ...TD, textAlign: 'center', color: '#6e7781' }}>1</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: '#1f2328', whiteSpace: 'nowrap' }}>
                    {totalAmount.toLocaleString('en-US')}
                  </td>
                </tr>
              ) : (
                lines.map((l, i) => {
                  const linePartId = l.partId ? String(l.partId).trim() : '';
                  const linePartNo = l.partNumber ? String(l.partNumber).trim().toLowerCase() : '';
                  const lineName = l.name ? String(l.name).trim().toLowerCase() : '';

                  const matchedPart = (parts || []).find((p) => {
                    const pId = p.id ? String(p.id).trim() : '';
                    const pNo = p.partNumber ? String(p.partNumber).trim().toLowerCase() : '';
                    const pName = p.name ? String(p.name).trim().toLowerCase() : '';
                    return (linePartId && pId === linePartId) ||
                      (linePartNo && pNo === linePartNo) ||
                      (lineName && pName === lineName);
                  });

                  let partPhoto = l.img || l.image || (matchedPart?.images && matchedPart.images[0]) || matchedPart?.img || null;
                  if (partPhoto && (partPhoto.startsWith('/media/') || partPhoto.startsWith('media/'))) {
                    partPhoto = partPhoto.startsWith('/') ? partPhoto : `/${partPhoto}`;
                  }

                  return (
                    <tr key={`${l.partId || 'part'}-${i}`}>
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {partPhoto && (
                            <img
                              src={partPhoto}
                              alt={l.name || 'Spare Part'}
                              style={{
                                width: '56px',
                                height: '42px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #d8dee4',
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 500, color: '#1f2328', lineHeight: 1.5 }}>
                              {l.name}
                            </div>
                            {l.partNumber && (
                              <div style={{ fontSize: '0.8rem', color: '#6e7781', marginTop: '2px' }}>
                                Part No: {l.partNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...TD, textAlign: 'center', color: '#1f2328' }}>
                        {Number(l.unitPrice).toLocaleString('en-US')}
                      </td>
                      <td style={{ ...TD, textAlign: 'center', color: '#1f2328' }}>
                        {l.qty}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: '#1f2328', whiteSpace: 'nowrap' }}>
                        {((Number(l.unitPrice) || 0) * (Number(l.qty) || 0)).toLocaleString('en-US')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

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
                  {totalAmount.toLocaleString('en-US')}
                </span>
              </div>

              {isPaid && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', fontSize: '0.82rem', color: '#57606a' }}>
                    <span>
                      Paid {issued}
                      {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                      {order.paymentRef ? ` · ${order.paymentRef}` : ''}
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      &minus; {totalAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '8px 0', borderTop: '1px solid #d8dee4', fontWeight: 700,
                  }}>
                    <span style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#57606a' }}>
                      Balance due
                    </span>
                    <span style={{ fontSize: '1.05rem', color: '#1f2328' }}>
                      0
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank Payment Details & Stamp Section */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '36px', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.88rem', color: '#24292e', lineHeight: 1.75 }}>
              <div><strong style={{ fontWeight: 600 }}>Bank Name:</strong> {defaultBank.bankName || 'KCB'}</div>
              <div><strong style={{ fontWeight: 600 }}>Branch:</strong> {defaultBank.branch || 'Two Rivers'}</div>
              <div><strong style={{ fontWeight: 600 }}>Account No.:</strong> {defaultBank.accountNo || '13510435552'}</div>
              <div><strong style={{ fontWeight: 600 }}>Account Name:</strong> {defaultBank.accountName || 'Zoomflow Corporation Limited'}</div>
              <div><strong style={{ fontWeight: 600 }}>Contact Mobile:</strong> +254 182 833966</div>
            </div>

            {/* Signature & Official Circular Stamp */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <KeywaveStamp />
            </div>
          </section>

        </div>

        <style>{`
          .invoice-billto-input::placeholder {
            color: #9aa4ae;
            font-weight: 400;
            font-size: 1rem;
          }
          .invoice-billto-input:focus { border-bottom-color: #1f2328; }

          @media print {
            @page { margin: 12mm; size: portrait; }
            #root { display: none !important; }

            .invoice-overlay {
              position: static !important;
              display: block !important;
              padding: 0 !important;
              background: none !important;
              backdrop-filter: none !important;
              inset: auto !important;
            }
            .invoice-overlay > [role="dialog"] {
              max-width: none !important;
              max-height: none !important;
              width: 100% !important;
              overflow: visible !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .invoice-sheet {
              padding: 0 !important;
              overflow: visible !important;
            }

            .invoice-controls { display: none !important; }

            .invoice-billto-input {
              border: none !important;
              padding: 0 !important;
            }
            .invoice-billto-input::placeholder { color: transparent !important; }

            .invoice-sheet, .invoice-sheet section, .invoice-sheet table {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};
