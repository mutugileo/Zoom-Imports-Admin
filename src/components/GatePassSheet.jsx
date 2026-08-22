import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AdminContext';
import { CarMark } from './CarMark';
import { ZoomStamp, isoDate, notice, fmt } from './IntakeSheet';
import { GATE_ITEMS, TAKER_FIELDS, GATE_VEHICLE_FIELDS } from '@shared/data/gatePassChecklist';
import { X, Printer } from 'lucide-react';

export const gatePassNumberFor = (g) => `ZI-GP-${String(g?.id ?? 0).padStart(4, '0')}`;

const th = {
  textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#57606a', padding: '4px 8px',
  background: '#f2f4f7', border: '1px solid #d8dee4',
};
const td = { fontSize: '0.78rem', color: '#1f2328', padding: '4px 8px', border: '1px solid #e4e8ed' };
const tdLabel = { ...td, color: '#444c56', width: '42%' };
const centred = { textAlign: 'center', margin: 0 };

/** Description / Details pair, as the pass sets its header blocks. */
const DetailTable = ({ fields, record, formatKES }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead><tr><th style={th}>Description</th><th style={th}>Details</th></tr></thead>
    <tbody>
      {fields.map((f) => (
        <tr key={f.key}>
          <td style={tdLabel}>{f.label}</td>
          {/* Mileage In prints blank until the car is back — the empty cell is
              the record that it is still out, not a missing value. */}
          <td style={td}>{fmt(record[f.key], f.type, formatKES) || (f.onReturn ? '' : '—')}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * The gate pass.
 *
 * Shares the header, stamp and print rules with the intake sheet rather than
 * restating them — two documents from one yard should not disagree about what
 * a stamp or a letterhead looks like.
 */
export const GatePassSheet = ({ pass, onClose }) => {
  const { billing, siteContent, formatKES } = useApp();
  const company = billing ?? {};
  const contact = siteContent?.contact ?? {};
  const number = gatePassNumberFor(pass);
  const RECEIVING_ENTITY = 'ZOOM IMPORTS';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.title;
    document.title = `Gate Pass ${number}`;
    return () => { document.title = previous; };
  }, [number]);

  const half = Math.ceil(GATE_ITEMS.length / 2);
  const columns = [GATE_ITEMS.slice(0, half), GATE_ITEMS.slice(half)];

  return createPortal(
    <div className="modal-overlay intake-overlay" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={`Gate pass ${number}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '100%', maxHeight: '92vh', overflowY: 'auto',
                 borderRadius: 'var(--radius-md)', background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
      >
        <div className="intake-controls"
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '14px 24px', borderBottom: '1px solid #d8dee4', position: 'sticky', top: 0,
                      background: '#fff', zIndex: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2328' }}>Gate Pass {number}</span>
          <span style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => window.print()} className="btn-primary" style={{ padding: '8px 16px' }}>
              <Printer size={15} /> Print / Save as PDF
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px' }}>
              <X size={15} /> Close
            </button>
          </span>
        </div>

        <div className="intake-sheet" style={{ padding: '40px 46px 46px', color: '#272b30', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 28px',
                        alignItems: 'center', paddingBottom: '14px', borderBottom: '1.5px solid #9aa4ae' }}>
            <div style={{ paddingRight: '28px', borderRight: '1px solid #d8dee4', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', minWidth: '140px' }}>
              <img src="/media/logo.jpg" alt="Zoom Imports"
                   style={{ width: '104px', height: '104px', objectFit: 'cover', borderRadius: '50%' }}
                   onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
              <span style={{ display: 'none' }}><CarMark height={30} color="#1f2328" /></span>
            </div>
            <div style={{ lineHeight: 1.55 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2328' }}>{RECEIVING_ENTITY}</div>
              <div style={{ fontSize: '0.82rem', color: '#33373d' }}>
                {company.poBox && <div>{company.poBox}</div>}
                {contact.location && <div>{contact.location}</div>}
                {contact.email && <div>Email: {contact.email}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#33373d', lineHeight: 1.55 }}>
              {contact.phone && <div>Mobile: {contact.phone}</div>}
              {company.pinNo && <div>PIN NO. {company.pinNo}</div>}
              <div>Date: {isoDate(pass.issuedAt) ?? isoDate(pass.at)}</div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.76rem', color: '#57606a', marginTop: '2px' }}>
                {number}
              </div>
            </div>
          </div>

          <h2 style={{ ...centred, fontSize: '1.05rem', fontWeight: 800, color: '#1f2328', margin: '18px 0 16px' }}>
            Gate Pass
          </h2>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 26px', marginBottom: '20px' }}>
            <DetailTable fields={TAKER_FIELDS} record={pass} formatKES={formatKES} />
            <DetailTable fields={GATE_VEHICLE_FIELDS} record={pass} formatKES={formatKES} />
          </section>

          <h3 style={{ ...centred, fontSize: '0.92rem', fontWeight: 700, color: '#1f2328', margin: '0 0 12px' }}>
            Checked Out with the following
          </h3>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 26px' }}>
            {columns.map((col, i) => (
              <table key={i} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Item</th><th style={{ ...th, textAlign: 'right' }}>Status</th></tr></thead>
                <tbody>
                  {col.map((item) => {
                    const v = pass.items?.[item.label] ?? '';
                    const bad = v === 'Not Ok' || v === 'Not Present';
                    return (
                      <tr key={item.label}>
                        <td style={td}>{item.label}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: bad ? 700 : 500, color: bad ? '#a13f3f' : '#1f2328' }}>
                          {v === '' ? '—' : v}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </section>

          {/* Centred, as the paper pass sets them. */}
          <div style={{ ...notice, marginTop: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f2328' }}>Purpose</div>
            <p style={{ ...centred, fontSize: '0.82rem', color: '#33373d', marginTop: '2px' }}>{pass.purpose || '—'}</p>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f2328', marginTop: '10px' }}>Comments</div>
            <p style={{ ...centred, fontSize: '0.82rem', color: '#33373d', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
              {pass.comments || '—'}
            </p>
          </div>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '26px', alignItems: 'flex-end',
                            marginTop: '26px', paddingTop: '16px', borderTop: '1px solid #d8dee4' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#57606a' }}>Confirmed</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2328', marginTop: '2px' }}>
                By: {pass.confirmedBy || ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#57606a', paddingBottom: '6px' }}>Stamp</span>
              {/* Only once issued. An unissued pass showing a stamp would say a
                  car left the premises when it has not. */}
              {pass.issuedAt ? (
                <ZoomStamp poBox={company.poBox} />
              ) : (
                <div style={{ border: '1.5px dashed #b9c0c8', borderRadius: '6px', padding: '18px 14px',
                              textAlign: 'center', color: '#8a929c', fontSize: '0.68rem', fontWeight: 700,
                              letterSpacing: '0.09em', textTransform: 'uppercase', lineHeight: 1.5, minWidth: '150px' }}>
                  Draft<br />not yet issued
                </div>
              )}
            </div>
          </section>
        </div>

        <style>{`
          @media print {
            @page { margin: 12mm; size: portrait; }
            #root { display: none !important; }
            .intake-overlay { position: static !important; display: block !important; padding: 0 !important;
                              background: none !important; backdrop-filter: none !important; inset: auto !important; }
            .intake-overlay > [role="dialog"] { max-width: none !important; max-height: none !important; width: 100% !important;
                                                overflow: visible !important; box-shadow: none !important; border-radius: 0 !important; }
            .intake-sheet { padding: 0 !important; overflow: visible !important; }
            .intake-controls { display: none !important; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};
