import React, { useId } from 'react';

/**
 * A trend line for a stat card.
 *
 * Only rendered where a real series exists. Vehicles and parts carry no date
 * anywhere in the catalogue, so there is nothing to plot for stock counts and
 * this component is simply not mounted on those cards — a drawn-in squiggle
 * would read as movement the yard never had, which is worse than a blank.
 */
export const Sparkline = ({ series = [], tone = 'var(--primary)', width = 74, height = 26, label }) => {
  if (!Array.isArray(series) || series.length < 2) return null;

  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min;
  const stepX = width / (series.length - 1);
  // Inset by the stroke's half-width so the end caps are not clipped.
  const pad = 2;
  const usable = height - pad * 2;

  const points = series.map((v, i) => {
    const x = i * stepX;
    // A flat series sits on the midline rather than the floor: pinned to the
    // bottom it reads as "fell to zero" when it actually never moved.
    const y = span === 0 ? pad + usable / 2 : pad + usable - ((v - min) / span) * usable;
    return [x, y];
  });

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} ${width},${height} 0,${height}`;
  const gradId = useId();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label || `Trend across the last ${series.length} days`}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={tone}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
