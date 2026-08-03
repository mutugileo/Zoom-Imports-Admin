import React from 'react';

/**
 * The marque: a car drawn as one continuous gold line.
 *
 * Not a lucide icon. The stock `Car` glyph is a boxy hatchback at UI weight and
 * reads as a wayfinding icon — the same visual rank as the "Orders" bin beside
 * it. A logo has to sit above the nav it labels, so this is drawn: a long low
 * profile, open at both ends, in the one warm colour the brand owns.
 */
export const CarMark = ({ height = 26, color = '#f2b53a', title }) => (
  <svg
    width={height * 2.15}
    height={height}
    viewBox="0 0 86 40"
    fill="none"
    role={title ? 'img' : 'presentation'}
    aria-hidden={title ? undefined : 'true'}
    aria-label={title}
    style={{ display: 'block', overflow: 'visible' }}
  >
    {title && <title>{title}</title>}
    {/* Roofline: rear haunch → cabin → bonnet → nose, one unbroken sweep. */}
    <path
      d="M3 29c3.4 0 5.6-1.4 7.6-4.2 3-4.2 6.6-8.6 11.4-11.2 5-2.8 11.4-4 18.6-4 8.4 0 15.6 1.6 21.6 4.6 4.6 2.3 8.4 5.4 12 9.1 2.4 2.5 4.6 4.3 7.8 5.7"
      stroke={color}
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sill, broken by the two arches so the wheels read without drawing them. */}
    <path
      d="M14 29h4M33 29h20M68 29h4"
      stroke={color}
      strokeWidth="3.4"
      strokeLinecap="round"
      opacity="0.85"
    />
    {/* Wheel arches */}
    <path
      d="M18 29a7.5 7.5 0 0 1 15 0M53 29a7.5 7.5 0 0 1 15 0"
      stroke={color}
      strokeWidth="3.4"
      strokeLinecap="round"
    />
  </svg>
);
