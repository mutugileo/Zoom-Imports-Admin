import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AdminContext';
import { CHECKLIST_GROUPS, OWNER_FIELDS, VEHICLE_FIELDS } from '@shared/data/consignmentChecklist';
import { X, Printer } from 'lucide-react';
import { CarMark } from './CarMark';

/** Intake reference. Derived from the row id, so it is the same on every
 *  reprint and two people printing at once cannot mint the same one. */
export const intakeNumberFor = (c) => `ZI-IN-${String(c?.id ?? 0).padStart(4, '0')}`;

/** The form dates as 2026-02-16, so the sheet does too. */
export const isoDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
};

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
export const ZoomStamp = ({ poBox }) => (
  /* An oval company stamp, set like the one the reference form carries: the
     name arced over the top, the postal address along the bottom, a star at
     each side, and the middle left open so it can be signed or over-stamped by
     hand.

     Stamp-ink blue rather than brand red — it reads as an applied stamp, and it
     is the same ink as the mark already on the invoice, so two documents from
     the same yard do not disagree about what a stamp looks like. */
  <svg width="150" height="98" viewBox="0 0 200 130" aria-label="Zoom Imports" role="img">
    <defs>
      {/* Sweep 1 arcs over the top; sweep 0 runs under the bottom, which keeps
          the lower text upright and reading left to right. */}
      <path id="zi-top" d="M 22,68 A 78,44 0 0,1 178,68" fill="none" />
      <path id="zi-bottom" d="M 30,70 A 70,38 0 0,0 170,70" fill="none" />
    </defs>

    <ellipse cx="100" cy="65" rx="96" ry="60" fill="none" stroke="#1f3a93" strokeWidth="2.4" />
    <ellipse cx="100" cy="65" rx="88" ry="52" fill="none" stroke="#1f3a93" strokeWidth="1" />

    <text fill="#1f3a93" fontSize="14" fontWeight="700" letterSpacing="1.6"
          fontFamily="Georgia, 'Times New Roman', serif">
      <textPath href="#zi-top" startOffset="50%" textAnchor="middle">ZOOM IMPORTS</textPath>
    </text>

    <text fill="#1f3a93" fontSize="10.5" fontWeight="600" letterSpacing="0.8"
          fontFamily="Georgia, 'Times New Roman', serif">
      <textPath href="#zi-bottom" startOffset="50%" textAnchor="middle">
        {/* The stored box line usually already ends in the city, so appending
            it produced "…00100 Nairobi, NAIROBI". Only add the city when it is
            genuinely absent. */}
        {poBox
          ? (/nairobi/i.test(poBox) ? poBox.toUpperCase() : `${poBox.toUpperCase()}, NAIROBI`)
          : 'NAIROBI'}
      </textPath>
    </text>

    {/* Stars sit on the horizontal axis, where the two arcs stop. */}
    <text x="14" y="72" fill="#1f3a93" fontSize="17">&#9733;</text>
    <text x="172" y="72" fill="#1f3a93" fontSize="17">&#9733;</text>
  </svg>
);

/** One formatter for all three surfaces, so a mileage reads the same on the
 *  form, the detail and the sheet. */
export const fmt = (v, type, formatKES) => {
  if (v == null || v === '') return '';
  if (type === 'money') return formatKES ? formatKES(v) : String(v);
  if (type === 'number') return Number(v).toLocaleString();
  return String(v);
};

/**
 * The binding sentences.
 *
 * Set apart because they are the clauses the owner is agreeing to, not
 * description — the received-in-condition statement, the authority to sell,
 * and who pays running costs. A warm tint with a red rule reads as "read this"
 * on screen and prints as a light grey band with a dark edge on a mono laser,
 * so the emphasis survives a black-and-white copy.
 */
export const notice = {
  background: '#fdf4f1',
  borderLeft: '3px solid #c8102e',
  padding: '9px 12px',
  borderRadius: '2px',
};

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
          {/* Three columns, ruled — logo, the company block, then the
              contact block hard right, exactly as the paper form is set. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 28px',
                        alignItems: 'center', paddingBottom: '14px', borderBottom: '1.5px solid #9aa4ae' }}>
            <div style={{ paddingRight: '28px', borderRight: '1px solid #d8dee4', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', minWidth: '140px' }}>
              {/* The real mark if it has been added, the line drawing if not.
                  onError rather than a build-time import: the file is dropped
                  into public/media by whoever has it, and a missing logo must
                  degrade to something printable instead of a broken-image
                  glyph on a document handed to a customer. */}
              <img
                src="/media/logo.jpg"
                alt="Zoom Imports"
                /* Rounded, and cover rather than contain: the artwork is a square
                   tile whose red honeycomb runs to the edges, so a circle crops
                   the ground away from the badge instead of leaving a red
                   square sitting on a white sheet. */
                style={{ width: '104px', height: '104px', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
              />
              <span style={{ display: 'none' }}><CarMark height={30} color="#1f2328" /></span>
            </div>

            <div style={{ lineHeight: 1.55 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2328', letterSpacing: '0.01em' }}>
                {RECEIVING_ENTITY}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#33373d' }}>
                {company.poBox && <div>{company.poBox}</div>}
                {contact.location && <div>{contact.location}</div>}
                {contact.email && <div>Email: {contact.email}</div>}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#33373d', lineHeight: 1.55 }}>
              {contact.phone && <div>Mobile: {contact.phone}</div>}
              {contact.whatsapp && contact.whatsapp !== contact.phone && <div>{contact.whatsapp}</div>}
              {company.pinNo && <div>PIN NO. {company.pinNo}</div>}
              <div>Date: {isoDate(intake.signedAt) ?? isoDate(intake.at)}</div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.76rem', color: '#57606a', marginTop: '2px' }}>
                {number}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                        color: '#57606a', margin: '16px 0 12px' }}>
            Vehicle Inventory
          </div>

          <p style={{ ...notice, fontSize: '0.85rem', color: '#33373d', lineHeight: 1.6, marginBottom: '18px' }}>
            The vehicle described below has been received in our showroom in the condition recorded.
          </p>

          {/* Both columns render from the shared field lists, so the sheet
              cannot show a field the form never captured. */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 34px', marginBottom: '22px' }}>
            <div>
              {OWNER_FIELDS.map((f) => (
                <Row key={f.key} label={f.label} value={fmt(intake[f.key], f.type, formatKES)} />
              ))}
            </div>
            <div>
              {VEHICLE_FIELDS.map((f) => (
                <Row key={f.key} label={f.label} value={fmt(intake[f.key], f.type, formatKES)} />
              ))}
            </div>
          </section>

          {/* A ruled table with Item / Status headers, as the paper form has.
              Loose rows read as a list of notes; the grid is what makes it
              legible as a record someone signed off line by line.

              Split into two balanced columns rather than CSS columnCount, so a
              group cannot be broken across the fold mid-table. */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 26px', alignItems: 'start' }}>
            {[0, 1].map((col) => (
              <div key={col}>
                {CHECKLIST_GROUPS.filter((_, i) => i % 2 === col).map((group) => (
                  <table key={group.title} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', breakInside: 'avoid' }}>
                    <thead>
                      <tr>
                        <th colSpan={2} style={{ textAlign: 'left', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.09em',
                                                 textTransform: 'uppercase', color: '#57606a', padding: '5px 7px',
                                                 background: '#f2f4f7', border: '1px solid #d8dee4' }}>
                          {group.title}
                        </th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'left', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em',
                                     textTransform: 'uppercase', color: '#8a929c', padding: '4px 7px', border: '1px solid #d8dee4' }}>Item</th>
                        <th style={{ textAlign: 'right', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em',
                                     textTransform: 'uppercase', color: '#8a929c', padding: '4px 7px', border: '1px solid #d8dee4', width: '38%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const v = val(item.label);
                        const bad = v === 'Not Ok' || v === 'Not Present';
                        return (
                          <tr key={item.label}>
                            <td style={{ fontSize: '0.74rem', color: '#444c56', padding: '3px 7px', border: '1px solid #e4e8ed' }}>
                              {item.label}
                            </td>
                            <td style={{ fontSize: '0.74rem', textAlign: 'right', padding: '3px 7px', border: '1px solid #e4e8ed',
                                         fontWeight: bad ? 700 : 500, color: bad ? '#a13f3f' : '#1f2328' }}>
                              {v === '' ? '—' : v}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ))}
              </div>
            ))}
          </section>

          {/* The same Item / Status table as the checklist, with Comments as
              the item — that is how the reference sets it, and it keeps the
              remark inside the record rather than floating below it as a
              separate note. Full width because the text is a sentence, not a
              status word. */}
          <section style={{ marginTop: '2px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em',
                               textTransform: 'uppercase', color: '#8a929c', padding: '4px 7px',
                               border: '1px solid #d8dee4', width: '19%' }}>Item</th>
                  <th style={{ textAlign: 'left', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em',
                               textTransform: 'uppercase', color: '#8a929c', padding: '4px 7px',
                               border: '1px solid #d8dee4' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: '0.74rem', color: '#444c56', padding: '6px 7px',
                               border: '1px solid #e4e8ed', verticalAlign: 'top' }}>
                    Comments
                  </td>
                  {/* Given height even when empty: a blank box is a box someone
                      chose not to write in, which is not the same as a section
                      that was never on the form. */}
                  <td style={{ fontSize: '0.78rem', color: '#1f2328', padding: '6px 7px',
                               border: '1px solid #e4e8ed', lineHeight: 1.55,
                               whiteSpace: 'pre-wrap', minHeight: '2.6em' }}>
                    <div style={{ minHeight: '2.6em' }}>{intake.comments || ''}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* The form's own wording, not a paraphrase. "m Behalf" in the
              source is a typo for "my"; everything else is verbatim, because
              this is the sentence the owner is signing under. */}
          <div style={{ ...notice, marginTop: '14px' }}>
            <p style={{ fontSize: '0.8rem', color: '#33373d', lineHeight: 1.6 }}>
              I do authorize the above mentioned Co. to sell the mentioned Car on my Behalf
            </p>
            <p style={{ fontSize: '0.76rem', color: '#57606a', lineHeight: 1.6, marginTop: '6px' }}>
              NB: Miscellaneous expenses will be catered for by the owner of the vehicle e.g. Fuel for road test
            </p>
          </div>

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
            {/* A draft says so where the stamp would go, rather than leaving
                a blank. An empty corner reads as a stamp that failed to render;
                a labelled gap reads as a document that is not finished yet —
                and stamping an unsigned intake would assert a handover that has
                not happened. */}
            <div style={{ minWidth: '150px', display: 'flex', justifyContent: 'center' }}>
              {intake.signedAt ? (
                <ZoomStamp poBox={company.poBox} />
              ) : (
                <div style={{ border: '1.5px dashed #b9c0c8', borderRadius: '6px', padding: '18px 14px',
                              textAlign: 'center', color: '#8a929c', fontSize: '0.68rem', fontWeight: 700,
                              letterSpacing: '0.09em', textTransform: 'uppercase', lineHeight: 1.5 }}>
                  Draft<br />not yet signed
                </div>
              )}
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
