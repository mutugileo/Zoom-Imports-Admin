import React, { useRef, useState } from 'react';
import { useApp } from '../context/AdminContext';
import { supabase } from '@shared/lib/supabaseClient';
import { friendlyError } from '@shared/lib/friendlyError';
import { VEHICLE_DOC_KINDS } from '@shared/lib/dbMap';
import { Upload, Trash2, FileText, ExternalLink } from 'lucide-react';

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * The paperwork a car actually travels with.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THESE FILES ARE PRIVATE. The bucket is not public — unlike vehicle-photos,
 * where the image IS the product. A logbook carries the registered owner's
 * name and ID number and an import entry carries declared values, so there is
 * no permanent URL to any of it. Viewing mints a link that expires in five
 * minutes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The storefront never reads this table. It may say a car HAS a logbook; it
 * may not show one.
 */
export const VehicleDocuments = ({ vehicle }) => {
  const { docsForVehicle, addVehicleDocument, deleteVehicleDocument, signedDocumentUrl, can } = useApp();
  const fileRef = useRef(null);
  const [kind, setKind] = useState(VEHICLE_DOC_KINDS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /* Two-step inline confirm rather than window.confirm.
   *
   * A native dialog raised from inside a focus-trapped modal is an unreliable
   * place to ask — the trap and the dialog both want the same focus, and when
   * it goes wrong the click simply does nothing, which is exactly what was
   * reported here. An inline confirm cannot be swallowed and shows what is
   * about to happen. */
  const [confirming, setConfirming] = useState(null);

  const mayWrite = can('catalogue:write');
  const docs = docsForVehicle(vehicle.id);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    if (file.size > MAX_BYTES) {
      setError(`${file.name} is larger than 15MB.`);
      return;
    }

    setBusy(true);
    /* Foldered by vehicle so the bucket stays navigable, and prefixed with the
       clock so re-uploading the same filename does not collide. */
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `${vehicle.id}/${Date.now()}-${safe}`;

    const { error: upErr } = await supabase.storage
      .from('vehicle-documents').upload(path, file, { upsert: false });
    if (upErr) {
      setBusy(false);
      setError(friendlyError(upErr, 'Could not upload that document. Try again.'));
      return;
    }

    const result = await addVehicleDocument({
      vehicleId: vehicle.id, kind, fileUrl: path, fileName: file.name,
    });
    setBusy(false);
    if (!result.ok) {
      // The row failed, so nothing points at the file — do not leave it behind.
      await supabase.storage.from('vehicle-documents').remove([path]);
      setError(result.reason);
    }
  };

  const open = async (doc) => {
    const url = await signedDocumentUrl(doc.fileUrl);
    if (!url) { setError('That link could not be created. Try again.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const remove = async (doc) => {
    setError('');
    setBusy(true);
    const result = await deleteVehicleDocument(doc);
    setBusy(false);
    setConfirming(null);
    if (!result.ok) setError(result.reason);
  };

  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
        Logbook, import entry, JEVIC and duty paperwork. Held for staff only —
        the website says whether a car has its papers, never what is on them.
      </p>

      {docs.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '10px 0' }}>
          Nothing filed against this car yet.
        </p>
      ) : (
        <table className="admin-table" style={{ width: '100%', marginBottom: '14px' }}>
          <thead>
            <tr><th>Document</th><th>File</th><th>Added</th><th /></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <FileText size={14} /> {d.kind}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.fileName || '—'}
                </td>
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-GB') : '—'}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button" onClick={(e) => { e.stopPropagation(); open(d); }}
                    style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={13} /> View
                  </button>
                  {mayWrite && (
                    confirming === d.id ? (
                      <span style={{ marginLeft: '10px', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button" disabled={busy}
                          onClick={(e) => { e.stopPropagation(); remove(d); }}
                          style={{ border: 'none', background: 'transparent', color: '#e5484d', fontWeight: 700, fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                        >
                          {busy ? 'Deleting…' : 'Delete file'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirming(null); }}
                          style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                        >
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setError(''); setConfirming(d.id); }}
                        aria-label={`Delete ${d.kind}`}
                        style={{ border: 'none', background: 'transparent', color: '#e5484d', cursor: 'pointer', marginLeft: '10px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mayWrite && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'block', flex: '1 1 200px', minWidth: '170px' }}>
            <span className="field-label">Document type</span>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
              {VEHICLE_DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <button
            type="button" className="btn-secondary" disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} /> {busy ? 'Uploading…' : 'Add document'}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*,application/pdf"
            onChange={pick} style={{ display: 'none' }}
          />
        </div>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#e5484d', marginTop: '10px' }}>{error}</p>
      )}
    </div>
  );
};
