/**
 * The numbers behind the dashboard.
 *
 * Kept out of the view because two of these — the trend series and the activity
 * feed — are the only places in the portal that read a *date*, and getting the
 * parsing wrong there is silent: you get a plausible chart of nothing.
 */

/** Records store dates as "25 Jul 2026". Anything unparseable is dropped, not
 *  coerced to the epoch — a 1970 row would sort to the bottom and look real. */
export const parseRecordDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

/**
 * Rolling windows rather than calendar ones ("this week", "this month").
 *
 * The catalogue is seeded with July records; anchored to a calendar month, the
 * default view of this dashboard would be an empty page in August and read as a
 * broken build. A rolling window degrades to "fewer rows", never to zero rows
 * for a reason nobody can see.
 */
export const RANGES = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: 'all', label: 'All time', days: null },
];

export const rangeById = (id) => RANGES.find((r) => r.id === id) ?? RANGES[1];

/** Inclusive lower bound for a range, or null for "all time". */
export const rangeStart = (rangeId, now = new Date()) => {
  const { days } = rangeById(rangeId);
  if (days == null) return null;
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

export const withinRange = (record, rangeId, now = new Date()) => {
  const start = rangeStart(rangeId, now);
  if (!start) return true;
  const d = parseRecordDate(record.date);
  return d ? d >= start : false;
};

/**
 * Daily counts across the window, oldest first — what a sparkline draws.
 *
 * Only ever called with date-stamped records. Stock levels (vehicles in the
 * yard, SKUs on the shelf) are *not* date-stamped anywhere in the catalogue, so
 * there is no honest series to draw for them and none is invented.
 */
export const dailySeries = (records, rangeId, now = new Date()) => {
  const { days } = rangeById(rangeId);
  const parsed = records.map((r) => parseRecordDate(r.date)).filter(Boolean);
  if (parsed.length === 0) return [];

  const end = startOfDay(now);
  let start;
  if (days == null) {
    start = startOfDay(new Date(Math.min(...parsed.map((d) => d.getTime()))));
  } else {
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
  }

  const span = Math.round((end - start) / 86400000) + 1;
  // A single-column chart is a dot, not a trend; and an unbounded span from one
  // stray old record would draw thousands of buckets.
  if (span < 2 || span > 400) return [];

  const buckets = new Array(span).fill(0);
  for (const d of parsed) {
    const i = Math.round((startOfDay(d) - start) / 86400000);
    if (i >= 0 && i < span) buckets[i] += 1;
  }
  return buckets;
};

const relativeTime = (date, now = new Date()) => {
  const mins = Math.round((now - date) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

/**
 * The activity feed, built from records that actually exist.
 *
 * This replaces five hardcoded lines that named specific orders and a specific
 * CX-5 regardless of what was in the yard — so the feed stayed word-for-word
 * identical after staff had processed a real order, which is the one moment it
 * was supposed to react.
 */
export const buildActivity = (orders = [], enquiries = [], rangeId = 'all', now = new Date()) => {
  const rows = [];

  for (const o of orders) {
    const date = parseRecordDate(o.date);
    if (!date || !withinRange(o, rangeId, now)) continue;
    rows.push({
      key: `order-${o.ref}`,
      kind: 'order',
      text: `Order ${o.ref} — ${o.status}`,
      meta: o.customer,
      date,
    });
  }

  for (const e of enquiries) {
    const date = parseRecordDate(e.date);
    if (!date || !withinRange(e, rangeId, now)) continue;
    rows.push({
      key: `enquiry-${e.id}`,
      kind: 'enquiry',
      text: `${e.type} — ${e.vehicle}`,
      meta: e.customer,
      date,
    });
  }

  // Returned whole, newest first. How many reach the screen is the panel's
  // decision, not this function's — it is the one that owns the "load more".
  return rows
    .sort((a, b) => b.date - a.date)
    .map((r) => ({ ...r, when: relativeTime(r.date, now) }));
};

/** "Leonard Mutugi" → "LM". Falls back to one letter, never to empty. */
export const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** "Leonard Mutugi" → "Leonard", for the greeting. */
export const firstNameOf = (name = '') => String(name).trim().split(/\s+/)[0] || '';
