import React from 'react';

/**
 * One visual frame for the admin's Lucide glyphs.
 *
 * The icon remains decorative because the adjacent text or parent button owns
 * the accessible name. Centralising stroke weight here keeps the navigation,
 * dashboard summaries and panel headings from drifting into separate styles.
 */
export const AdminIcon = ({ icon: Icon, variant = 'section', size = 18, tone, className = '' }) => (
  <span
    className={`admin-icon admin-icon-${variant}${className ? ` ${className}` : ''}`}
    style={tone ? { '--icon-tone': tone } : undefined}
    aria-hidden="true"
  >
    <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
  </span>
);
