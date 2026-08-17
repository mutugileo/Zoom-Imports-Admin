/**
 * Buckets for the dashboard trend chart.
 *
 * Sibling of dashboardData.js, kept separate because that module answers "what
 * happened in the last N days" for the summary tiles, while this one answers
 * "how did N buckets compare with the N before them" — a different window, a
 * different comparison, and the same date-parsing trap underneath both.
 *
 * Three rules carried over from the rest of the portal:
 *
 * 1. NOTHING IS INVENTED. A bucket with no records is a zero, not a gap to be
 *    smoothed over, and a record whose date will not parse is counted in
 *    `undated` rather than dropped into today.
 *
 * 2. REVENUE MEANS THE SAME THING HERE AS IT DOES IN THE MONEY BAND. Parts
 *    revenue reads `isRealisedOrder` and vehicle revenue counts every recorded
 *    sale, which is exactly what shared/lib/sales.js does for each — the chart
 *    and the "Realised" figures above it cannot quietly disagree.
 *
 * 3. THE WINDOW IS FIXED, NOT TRIMMED TO THE DATA. Twelve months means twelve
 *    months even when the yard has two of them; `firstRecord` comes back so the
 *    card can say where the records actually begin instead of letting the
 *    leading zeros read as a collapse in trade.
 */

import { parseRecordDate } from './dashboardData';
import { isRealisedOrder } from '@shared/lib/sales';

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/* Each granularity carries its own window length. One control then decides both
   the bucket size and how far back the chart looks, so there is never a second
   date control to contradict it. */
export const GRANULARITIES = [
  { id: 'daily', label: 'Daily', step: 'day', buckets: 7, window: 'last 7 days', compare: 'previous 7 days' },
  { id: 'weekly', label: 'Weekly', step: 'week', buckets: 12, window: 'last 12 weeks', compare: 'previous 12 weeks' },
  { id: 'monthly', label: 'Monthly', step: 'month', buckets: 12, window: 'last 12 months', compare: 'previous 12 months' },
  { id: 'yearly', label: 'Yearly', step: 'year', buckets: 5, window: 'last 5 years', compare: 'previous 5 years' },
];

export const granularityById = (id) => GRANULARITIES.find((g) => g.id === id) ?? GRANULARITIES[0];

/**
 * The two things the yard sells.
 *
 * They are not one series with a filter on it: a car is sold once and recorded
 * against the vehicle, a spare part is sold through an order that moves through
 * statuses, and the two are counted by different rules. Adding them together
 * would also plot three cars against two parts orders on one axis, where the
 * KES figures differ by three orders of magnitude and the smaller line
 * disappears into the baseline.
 */
export const STREAMS = {
  vehicles: {
    id: 'vehicles',
    label: 'Vehicles',
    countLabel: 'Sales',
    countAxis: 'Vehicles sold',
    revenueAxis: 'Vehicle revenue (KES)',
    countEmpty: 'No vehicles were sold in this window.',
    revenueEmpty: 'No vehicle sales were recorded in this window.',
    noun: 'vehicle sales',
  },
  parts: {
    id: 'parts',
    label: 'Spare parts',
    countLabel: 'Orders',
    countAxis: 'Orders placed',
    revenueAxis: 'Parts revenue (KES)',
    countEmpty: 'No parts orders were placed in this window.',
    revenueEmpty: 'No parts orders were completed in this window. Revenue counts orders marked Completed, the same as the Realised figures above.',
    noun: 'parts orders',
  },
};

export const streamById = (id) => STREAMS[id] ?? STREAMS.vehicles;

/**
 * What the line measures, once a stream has been normalised into records.
 *
 * `count` counts every record, cancellations included: a cancelled order was
 * still an order the yard received, and filtering them out would rewrite last
 * month's line the day someone cancels an old one.
 *
 * `revenue` counts only records marked realised — Completed for a parts order,
 * every recorded sale for a vehicle — because goods that can still be refused
 * are not yet money.
 */
export const METRICS = {
  count: { id: 'count', counts: () => true, valueOf: () => 1 },
  revenue: { id: 'revenue', counts: (r) => r.realised, valueOf: (r) => r.amount },
};

export const metricById = (id) => METRICS[id] ?? METRICS.count;

/** Axis title, toggle wording and empty state for a stream/metric pair. */
export const describe = (streamId, metricId) => {
  const s = streamById(streamId);
  const revenue = metricById(metricId).id === 'revenue';
  return {
    stream: s,
    axis: revenue ? s.revenueAxis : s.countAxis,
    empty: revenue ? s.revenueEmpty : s.countEmpty,
    countLabel: s.countLabel,
  };
};

/**
 * Vehicle sales as plottable records — one per car that has a sale on file.
 *
 * `vehicleSales` is keyed by vehicle id, so the vehicles themselves are what is
 * walked; a sale whose car has since been deleted has nothing to plot against
 * and is not resurrected here.
 *
 * Every recorded sale is realised. A car is marked Sold when it has been sold,
 * with no intermediate state that can reverse — which is why vehicleSalesSummary
 * counts them all towards revenue and this does the same.
 */
export const vehicleSaleRecords = (vehicles = [], sales = {}) => {
  const rows = [];
  for (const v of vehicles) {
    const sale = sales[v.id];
    if (!sale) continue;
    rows.push({ date: sale.date, amount: num(sale.price), realised: true });
  }
  return rows;
};

/** Spare-parts orders as plottable records. Realised means Completed. */
export const orderRecords = (orders = []) =>
  orders.map((o) => ({ date: o.date, amount: num(o.total), realised: isRealisedOrder(o) }));

/** Local midnight at the head of the bucket `date` falls in. Weeks start Monday. */
const bucketStart = (date, step) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (step === 'week') {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }
  if (step === 'month') {
    d.setDate(1);
    return d;
  }
  if (step === 'year') {
    d.setMonth(0, 1);
    return d;
  }
  return d;
};

/* Stepped through the Date API rather than by adding milliseconds: a month is
   not 30 days and a year is not 365, and "12 months back" from 31 March has to
   land on 31 March, not on a drifting approximation of it. */
const addSteps = (date, step, n) => {
  const d = new Date(date);
  if (step === 'week') d.setDate(d.getDate() + n * 7);
  else if (step === 'month') d.setMonth(d.getMonth() + n);
  else if (step === 'year') d.setFullYear(d.getFullYear() + n);
  else d.setDate(d.getDate() + n);
  return d;
};

/** Axis tick — short enough to sit under a 7- or 12-column chart. */
const shortLabel = (start, step) => {
  if (step === 'week') return start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (step === 'month') return start.toLocaleDateString('en-GB', { month: 'short' });
  if (step === 'year') return String(start.getFullYear());
  return start.toLocaleDateString('en-GB', { weekday: 'short' });
};

/** Tooltip and screen-reader wording — unabbreviated, and never ambiguous
 *  about which year a bare "Aug" belongs to. */
const fullLabel = (start, step) => {
  if (step === 'week') {
    return `Week of ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (step === 'month') return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (step === 'year') return String(start.getFullYear());
  return start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const makeBuckets = (starts, step) =>
  starts.map((start) => ({
    start,
    label: shortLabel(start, step),
    full: fullLabel(start, step),
    value: 0,
  }));

/**
 * Two aligned series: the current window, and the one of equal length before it.
 *
 * @param records  normalised by vehicleSaleRecords or orderRecords — each one
 *                 `{ date, amount, realised }`. The two stores write dates in
 *                 different formats ("13 Aug 2026" for orders, "2026-07-25" for
 *                 vehicle sales); both go through parseRecordDate, which takes
 *                 either.
 * @returns current/previous buckets, the totals, and everything the card needs
 *          to describe what is missing.
 */
export const bucketSeries = (records = [], { granularity = 'daily', metric = 'count', now = new Date() } = {}) => {
  const g = granularityById(granularity);
  const m = metricById(metric);

  const latest = bucketStart(now, g.step);
  const currentStarts = [];
  for (let i = g.buckets - 1; i >= 0; i -= 1) currentStarts.push(addSteps(latest, g.step, -i));
  const previousStarts = currentStarts.map((s) => addSteps(s, g.step, -g.buckets));

  const current = makeBuckets(currentStarts, g.step);
  const previous = makeBuckets(previousStarts, g.step);

  /* Bucket starts are compared as exact timestamps rather than by arithmetic on
     the difference: the record's own date is normalised to a bucket start by
     the same function that built the axis, so the two either match or the
     record sits outside the window. Month lengths never enter into it. */
  const indexIn = (buckets, time) => buckets.findIndex((b) => b.start.getTime() === time);

  let undated = 0;
  let unusable = 0;
  let firstRecord = null;

  for (const record of records) {
    const date = parseRecordDate(record.date);
    // `firstRecord` is about the books as a whole, so it looks at every dated
    // record — including the ones this metric does not count.
    if (date && (!firstRecord || date < firstRecord)) firstRecord = date;

    /* Counted before the date is judged, so the footnote reports only what this
       metric would otherwise have drawn: a New order with a broken date is not
       "missing from the revenue line", because a New order was never going to
       be on it. */
    if (!m.counts(record)) continue;
    if (!date) {
      undated += 1;
      continue;
    }

    const value = m.valueOf(record);
    // A sale whose amount nobody can read is reported, not treated as a sale
    // worth nothing — the rule from shared/lib/sales.js.
    if (value === null) {
      unusable += 1;
      continue;
    }

    const time = bucketStart(date, g.step).getTime();
    const inCurrent = indexIn(current, time);
    if (inCurrent >= 0) {
      current[inCurrent].value += value;
      continue;
    }
    const inPrevious = indexIn(previous, time);
    if (inPrevious >= 0) previous[inPrevious].value += value;
  }

  const sum = (buckets) => buckets.reduce((total, b) => total + b.value, 0);
  const totalCurrent = sum(current);
  const totalPrevious = sum(previous);

  return {
    granularity: g,
    metric: m,
    current,
    previous,
    totalCurrent,
    totalPrevious,
    /* Null rather than 0% or ∞ when there is nothing to compare against. A
       "+100%" against an empty previous window is a made-up number. */
    delta: totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : null,
    windowFrom: currentStarts[0],
    previousFrom: previousStarts[0],
    /* True when the records on file begin inside the window being drawn, so the
       card can explain its own leading zeros. */
    startsMidWindow: Boolean(firstRecord && firstRecord >= previousStarts[0]),
    firstRecord,
    undated,
    unusable,
    hasData: totalCurrent > 0 || totalPrevious > 0,
  };
};
