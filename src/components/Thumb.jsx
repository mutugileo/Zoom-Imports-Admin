import React, { useState } from 'react';
import { Car, Wrench } from 'lucide-react';

/**
 * A catalogue thumbnail that fails quietly.
 *
 * The portal still hot-links the source images the shop localised long ago, so
 * on a slow morning at the yard — or with the connection down — every row would
 * otherwise show an empty grey rectangle, which reads as a deleted photo rather
 * than an unfetched one. On error it falls back to the marque silhouette, which
 * says "no photo" without looking broken.
 *
 * `alt` is empty on purpose: the row already names the vehicle or the part in
 * text beside it, and a screen reader repeating it is noise.
 */
export const Thumb = ({ src, kind = 'vehicle', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const Icon = kind === 'part' ? Wrench : Car;

  if (!src || failed) {
    return (
      <span
        className={`panel-thumb panel-thumb-fallback ${className}`}
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={1.8} />
      </span>
    );
  }

  return (
    <img
      className={`panel-thumb ${className}`}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};
