import React from 'react';

/**
 * Keywave Enterprise Limited emblem & wordmark SVG logo.
 */
export const KeywaveLogo = ({ height = 54, className = '', style = {} }) => (
  <svg
    width={height * 3.4}
    height={height}
    viewBox="0 0 340 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block', ...style }}
    aria-label="Keywave Enterprise Limited"
    role="img"
  >
    {/* --- Emblem Mark (Geometric KW Shapes) --- */}
    <g transform="translate(45, 2) scale(0.9)">
      {/* 'K' Left vertical stem (Cyan / Blue) */}
      <polygon points="0,0 36,0 36,65 0,65" fill="#0086BF" />

      {/* 'K' Top-Right Arm (Orange / Golden Yellow) */}
      <polygon points="44,0 78,0 44,32" fill="#ED951D" />

      {/* 'K' Bottom-Right Arm / Transition (Teal) */}
      <polygon points="44,35 78,65 44,65" fill="#00A79D" />

      {/* 'W' Left V-leg (Crimson Red) */}
      <polygon points="86,0 120,65 154,0" fill="#A61C1E" />

      {/* 'W' Right V-leg (Cyan/Teal) */}
      <polygon points="120,65 154,0 188,65" fill="#00A79D" opacity="0.9" />
    </g>

    {/* --- Wordmark Text --- */}
    <text
      x="170"
      y="78"
      textAnchor="middle"
      fill="#005C8A"
      fontSize="24"
      fontWeight="300"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="0.45em"
    >
      Keywave
    </text>
    <text
      x="170"
      y="94"
      textAnchor="middle"
      fill="#00A79D"
      fontSize="12"
      fontWeight="400"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="0.32em"
    >
      Enterprise Limited
    </text>
  </svg>
);
