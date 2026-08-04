import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Star } from 'lucide-react';
import { supabase } from '@shared/lib/supabaseClient';
import { friendlyError } from '@shared/lib/friendlyError';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Picks images off the machine and puts them in Supabase Storage.
 *
 * Uploads happen here, as each file is chosen, rather than being deferred to
 * the parent's submit. A vehicle form is long, and batching six photos into
 * the Save click means a slow connection looks like a frozen button — this way
 * each thumbnail resolves on its own and the form can only be saved once the
 * URLs actually exist.
 *
 * Order is meaningful: the first image is the cover, which is the one the
 * storefront card shows. It is reorderable rather than fixed, because the shot
 * that sells a car is rarely the first one taken.
 */
export const ImagePicker = ({ bucket, value = [], onChange, max = 10 }) => {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /* Set true on every mount, not just at declaration. StrictMode runs effects
     mount → cleanup → mount in development, so a ref that is only ever set
     false by the cleanup stays false for the rest of the component's life —
     uploads then complete but their state update is skipped and the button
     sits on "Uploading…" forever. */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const pathOf = (url) => {
    const marker = `/${bucket}/`;
    return url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
  };

  const pick = async (e) => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = '';               // so re-picking the same file still fires
    if (chosen.length === 0) return;

    setError('');
    const room = max - value.length;
    if (room <= 0) { setError(`You can add up to ${max} photos.`); return; }

    const batch = chosen.slice(0, room);
    const rejected = chosen.find((f) => !f.type.startsWith('image/') || f.size > MAX_BYTES);
    if (rejected) {
      setError(
        rejected.type.startsWith('image/')
          ? `${rejected.name} is larger than 5MB.`
          : `${rejected.name} is not an image.`
      );
      return;
    }

    setBusy(true);
    const uploaded = [];
    for (const file of batch) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (upErr) {
        // Anything already up in this batch has nothing pointing at it yet.
        if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded.map(pathOf).filter(Boolean));
        if (mounted.current) { setBusy(false); setError(friendlyError(upErr, 'Could not upload that photo. Try again.')); }
        return;
      }
      uploaded.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    }

    if (!mounted.current) return;
    setBusy(false);
    onChange([...value, ...uploaded]);
    if (chosen.length > room) setError(`Only the first ${room} were added — the limit is ${max} photos.`);
  };

  /* Removing takes the file with it. A photo nobody can reach from a listing
     is just storage nobody is paying attention to. */
  const removeAt = async (i) => {
    const url = value[i];
    onChange(value.filter((_, idx) => idx !== i));
    const path = pathOf(url);
    if (path) await supabase.storage.from(bucket).remove([path]);
  };

  const makeCover = (i) => {
    if (i === 0) return;
    const next = [...value];
    const [picked] = next.splice(i, 1);
    onChange([picked, ...next]);
  };

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {value.map((url, i) => (
            <div key={url} style={{ width: '104px' }}>
              <div style={{ position: 'relative', height: '74px', borderRadius: '8px', overflow: 'hidden', border: i === 0 ? '2px solid var(--primary-ink)' : '1px solid #d8dde2', background: '#edf1f6' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(11,21,18,.75)', border: 'none', borderRadius: '999px', width: '21px', height: '21px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={11} color="#fff" />
                </button>
              </div>
              {i === 0 ? (
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-ink)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={10} fill="currentColor" aria-hidden="true" /> Cover
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  style={{ marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', color: '#5f6b7a', cursor: 'pointer', fontWeight: 600 }}
                >
                  Make cover
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        /* A button, not a <label htmlFor> — a global rule in index.css forces
           labels inside modals to display:block + uppercase, which flattens a
           flex dropzone onto one line. */
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '6px', height: value.length ? '68px' : '104px', width: '100%', background: '#fff',
            border: '1.5px dashed #d8dde2', borderRadius: '8px',
            cursor: busy ? 'progress' : 'pointer', color: '#5c6a78',
          }}
        >
          <Upload size={18} aria-hidden="true" />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {busy ? 'Uploading…' : value.length ? 'Add more photos' : 'Choose photos'}
          </span>
          {!value.length && (
            <span style={{ fontSize: 'var(--text-xs)' }}>PNG or JPG, up to 5MB each</span>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        onChange={pick}
        style={{ display: 'none' }}
      />

      {error && (
        <div role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', marginTop: '7px' }}>{error}</div>
      )}
    </div>
  );
};
