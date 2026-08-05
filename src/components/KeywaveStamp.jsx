import React from 'react';

/**
 * Official circular rubber seal stamp and signature for Keywave Enterprise Limited.
 */
export const KeywaveStamp = ({ width = 300, className = '', style = {} }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', ...style }} className={className}>
    {/* Signature text */}
    <div style={{ position: 'relative' }}>
      <svg width="120" height="45" viewBox="0 0 140 50" fill="none">
        <path
          d="M10 35 C 25 15, 30 5, 40 25 C 45 35, 50 20, 60 25 C 70 30, 75 15, 85 28 C 95 38, 105 10, 125 30 M25 28 L 75 28"
          stroke="#1d4ed8"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <text
          x="15"
          y="42"
          fontFamily="'Brush Script MT', 'Caveat', 'Dancing Script', cursive, sans-serif"
          fontSize="24"
          fill="#1e40af"
          fontStyle="italic"
        >
          SammySebi
        </text>
      </svg>
    </div>

    {/* Official Circular Stamp Seal */}
    <svg
      width="130"
      height="130"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.88, transform: 'rotate(-4deg)' }}
      aria-label="Keywave Enterprise Ltd. Official Stamp"
      role="img"
    >
      {/* Outer Circle */}
      <circle cx="100" cy="100" r="94" stroke="#1e40af" strokeWidth="4" />
      {/* Inner Circle */}
      <circle cx="100" cy="100" r="76" stroke="#1e40af" strokeWidth="2" />
      {/* Center Inner Oval */}
      <ellipse cx="100" cy="100" rx="55" ry="34" stroke="#1e40af" strokeWidth="1.5" />

      {/* Wavy lines in center */}
      <path d="M 55 94 Q 78 86 100 94 T 145 94" stroke="#1e40af" strokeWidth="2" fill="none" />
      <path d="M 55 100 Q 78 92 100 100 T 145 100" stroke="#1e40af" strokeWidth="2" fill="none" />
      <path d="M 55 106 Q 78 98 100 106 T 145 106" stroke="#1e40af" strokeWidth="2" fill="none" />

      {/* Curved Text Arc Top & Bottom using textPath */}
      <defs>
        <path id="stampUpperArc" d="M 22 100 A 78 78 0 1 1 178 100" />
        <path id="stampLowerArc" d="M 178 100 A 78 78 0 1 1 22 100" />
      </defs>

      {/* Top Arc: KEYWAVE ENTERPRISE LTD. */}
      <text fill="#1e40af" fontSize="13.5" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="2px">
        <textPath href="#stampUpperArc" startOffset="50%" textAnchor="middle">
          KEYWAVE ENTERPRISE LTD.
        </textPath>
      </text>

      {/* Left & Right Stars */}
      <text x="18" y="105" fill="#1e40af" fontSize="14" textAnchor="middle">★</text>
      <text x="182" y="105" fill="#1e40af" fontSize="14" textAnchor="middle">★</text>

      {/* Bottom Arc: P.O BOX 4127-00100 NAIROBI, KENYA */}
      <text fill="#1e40af" fontSize="10.5" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="1px">
        <textPath href="#stampLowerArc" startOffset="50%" textAnchor="middle">
          P.O BOX 4127-00100 NAIROBI, KENYA
        </textPath>
      </text>
    </svg>
  </div>
);
