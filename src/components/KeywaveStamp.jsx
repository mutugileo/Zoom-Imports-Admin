import React from 'react';

/**
 * Official circular rubber seal stamp and signature for Keywave Enterprise Limited.
 */
export const KeywaveStamp = ({ width = 240, className = '', style = {} }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
    <img
      src="/media/keywave_stamp_signature.png"
      alt="Keywave Enterprise Ltd. Stamp & Signature"
      style={{ width: `${width}px`, height: 'auto', display: 'block', objectFit: 'contain' }}
    />
  </div>
);
