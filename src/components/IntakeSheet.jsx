import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AdminContext';
import { CHECKLIST_GROUPS } from '@shared/data/consignmentChecklist';
import { X, Printer } from 'lucide-react';

/** Intake reference. Derived from the row id, so it is the same on every
 *  reprint and two people printing at once cannot mint the same one. */
export const intakeNumberFor = (c) => `ZI-IN-${String(c?.id ?? 0).padStart(4, '0')}`;

const readableDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * The Zoom Imports mark.
 *
 * Provenance, not proof. It shows the sheet came off this system; what
 * actually holds up in a dispute is the locked record and the two typed
 * names, which is why signing is irreversible in Postgres rather than
 * decorated here.
 */
const ZoomStamp = () => (
  <svg width="104" height="104" viewBox="0 0 120 120" aria-label="Zoom Imports" role="img">
    <circle cx="60" cy="60" r="55" fill="none" stroke="#c8102e" strokeWidth="2" />
    <circle cx="60" cy="60" r="47" fill="none" stroke="#c8102e" strokeWidth="0.8" />
    <path id="zi-arc" d="M60,18 a42,42 0 1,1 -0.1,0" fill="none" />
    <text fill="#c8102e" fontSize="9.5" fontFamily="ui-monospace, Menlo, monospace" letterSpacing="2.4">
      <textPath href="#zi-arc" startOffset="4%">ZOOM IMPORTS · NAIROBI · RECEIVED</textPath>
    </text>
    <text x="60" y="56" textAnchor="middle" fill="#c8102e" fontSize="15" fontWeight="700"
          fontFamily="ui-monospace, Menlo, monospace">ZOOM</text>
    <text x="60" y="72" textAnchor="middle" fill="#c8102e" fontSize="10" letterSpacing="1.6"
          fontFamily="ui-monospace, Menlo, monospace">IMPORTS</text>
  </svg>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '5px 0', borderBottom: '1px solid #eceff3' }}>
    <span style={{ fontSize: '0.78rem', color: '#57606a' }}>{label}</span>
    <span style={{ fontSize: '0.8rem', color: '#1f2328', fontWeight: 600, textAlign: 'right' }}>
      {value == null || value === '' ? '—' : value}
    </span>
  </div>
);

/**
 * The printed condition report.
 *
 * Renders from CHECKLIST_GROUPS — the same array the form renders — so the
 * sheet cannot list an item the form never asked about, or omit one it did.
 *
 * Fixed colours throughout, never theme variables: this is a white sheet, and
 * `var(--text-dark)` flips to a pale colour under the dark theme, which is how
 * the invoice header once printed invisible.
 */
export const IntakeSheet = ({ intake, onClose }) => {
  const { billing, siteContent, formatKES } = useApp();
  const company = billing ?? {};

  /* The receiving entity on this form is Zoom Imports, not whatever
     `company_billing` holds. That record carries Keywave Enterprise Limited,
     which is the name that belongs on an invoice — and an authority to sell
     naming the wrong company is a defect in a document whose whole job is to
     be produced in a dispute. The PIN, address and phone still come from the
     live record, because those are the same premises either way. */
  const RECEIVING_ENTITY = 'ZOOM IMPORTS';
  const contact = siteContent?.contact ?? {};
  const number = intakeNumberFor(intake);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Browsers name a Save-as-PDF after document.title, so without this every
     intake saved as "Zoom Imports — Admin Portal.pdf", each overwriting the
     last. */
  useEffect(() => {
    const previous = document.title;
    document.title = `Intake ${number}`;
    return () => { document.title = previous; };
  }, [number]);

  const val = (label) => intake.items?.[label] ?? '';

  return createPortal(
    <div className="modal-overlay intake-overlay" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={`Intake ${number}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '100%', maxHeight: '92vh', overflowY: 'auto',
                 borderRadius: 'var(--radius-md)', background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
      >
        <div className="intake-controls"
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '14px 24px', borderBottom: '1px solid #d8dee4', position: 'sticky', top: 0,
                      background: '#fff', zIndex: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2328' }}>Intake {number}</span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1f2328', letterSpacing: '-0.01em' }}>
                {RECEIVING_ENTITY}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#57606a', lineHeight: 1.6, marginTop: '4px' }}>
                {company.addressLine && <div>{company.addressLine}</div>}
                {contact.location && <div>{contact.location}</div>}
                {contact.phone && <div>{contact.phone}</div>}
                {company.pinNo && <div>PIN NO. {company.pinNo}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#57606a' }}>
                Vehicle Inventory
              </div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.95rem', fontWeight: 700, color: '#1f2328', marginTop: '3px' }}>
                {number}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#57606a', marginTop: '3px' }}>
                {readableDate(intake.signedAt) ?? readableDate(intake.at)}
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #d8dee4', margin: '18px 0 20px' }} />

          <p style={{ fontSize: '0.85rem', color: '#33373d', lineHeight: 1.6, marginBottom: '18px' }}>
            The vehicle described below has been received in our showroom in the condition recorded.
          </p>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 34px', marginBottom: '22px' }}>
            <div>
              <Row label="Customer Name" value={intake.ownerName} />
              <Row label="Phone" value={intake.ownerPhone} />
              <Row label="Veh Reg No." value={intake.regNo} />
              <Row label="Mileage" value={intake.mileage == null ? '' : Number(intake.mileage).toLocaleString()} />
              <Row label="Year" value={intake.year} />
              <Row label="Min Price" value={intake.minPrice == null ? '' : formatKES(intake.minPrice)} />
            </div>
            <div>
              <Row label="Make & Model" value={intake.makeModel} />
              <Row label="Chassis" value={intake.chassis} />
              <Row label="Colour" value={intake.colour} />
              <Row label="Key No" value={intake.keyNo} />
              <Row label="Engine No" value={intake.engineNo} />
              <Row label="CC" value={intake.cc} />
            </div>
          </section>

          <section style={{ columnCount: 2, columnGap: '34px' }}>
            {CHECKLIST_GROUPS.map((group) => (
              <div key={group.title} style={{ breakInside: 'avoid', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                              color: '#8a929c', padding: '6px 0 3px', borderBottom: '1px solid #d8dee4' }}>
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const v = val(item.label);
                  /* A fault is the reason this page exists, so it is the one
                     thing set apart from the run of "Ok". */
                  const bad = v === 'Not Ok' || v === 'Not Present';
                  return (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '3px 0' }}>
                      <span style={{ fontSize: '0.76rem', color: '#444c56' }}>{item.label}</span>
                      <span style={{ fontSize: '0.76rem', fontWeight: bad ? 700 : 500, color: bad ? '#a13f3f' : '#1f2328' }}>
                        {v === '' ? '—' : v}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          <section style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #d8dee4' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#8a929c' }}>
              Comments
            </div>
            <p style={{ fontSize: '0.85rem', color: '#33373d', lineHeight: 1.6, marginTop: '5px', whiteSpace: 'pre-wrap', minHeight: '2.4em' }}>
              {intake.comments || '—'}
            </p>
          </section>

          <p style={{ fontSize: '0.78rem', color: '#57606a', lineHeight: 1.6, marginTop: '16px' }}>
            I authorise Zoom Imports to sell the vehicle described above on my behalf.
            Miscellaneous expenses are met by the owner of the vehicle — fuel for road tests, for example.
          </p>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '26px', alignItems: 'flex-end', marginTop: '26px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #b9c0c8', paddingBottom: '3px', fontSize: '0.9rem', fontWeight: 700, color: '#1f2328', minHeight: '1.5em' }}>
                {intake.ownerSigned || intake.ownerName || ''}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57606a', marginTop: '4px' }}>M/V Owner</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #b9c0c8', paddingBottom: '3px', fontSize: '0.9rem', fontWeight: 700, color: '#1f2328', minHeight: '1.5em' }}>
                {intake.receivedBy || ''}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#57606a', marginTop: '4px' }}>Received By</div>
            </div>
            {/* Only on a signed sheet. Stamping a draft would assert a
                completed handover that has not happened. */}
            <div style={{ opacity: intake.signedAt ? 1 : 0 }} aria-hidden={!intake.signedAt}>
              <ZoomStamp />
            </div>
          </section>
        </div>

        <style>{`
          @media print {
            @page { margin: 12mm; size: portrait; }
            /* display:none, not visibility:hidden — hidden elements keep their
               boxes and the admin behind this is a long page, which printed as
               blank leading pages on the invoice before it was fixed. The sheet
               is portalled to body so it survives its own root being hidden. */
            #root { display: none !important; }
            .intake-overlay {
              position: static !important; display: block !important;
              padding: 0 !important; background: none !important;
              backdrop-filter: none !important; inset: auto !important;
            }
            .intake-overlay > [role="dialog"] {
              max-width: none !important; max-height: none !important; width: 100% !important;
              overflow: visible !important; box-shadow: none !important; border-radius: 0 !important;
            }
            .intake-sheet { padding: 0 !important; overflow: visible !important; }
            .intake-controls { display: none !important; }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};
