/**
 * Stock identity and grouping.
 *
 * Two ideas that are easy to conflate and must not be:
 *
 *   Stock ID  identifies one car, forever.        Z-2026-0041
 *   Group ID  identifies a batch of cars.         GRP-2026-07-01
 *
 * A car belongs to exactly one primary group and can carry any number of tags.
 * The group is where shared facts live — which vessel, which yard, which
 * supplier — and the tags are for the searches nobody anticipated.
 */

export const STOCK_PREFIX = 'Z';
export const STOCK_SEQUENCE_PAD = 4;

/**
 * Vehicle lifecycle position. Deliberately NOT the same field as `status`.
 *
 * `status` is Available / Reserved / Sold — it is public, it drives the badge on
 * the storefront and the "units on the lot" counter. `stage` is where the car
 * physically is, which is internal. A car can be In Transit and Available at the
 * same time; that is a pre-order, not a contradiction, and one field cannot say
 * both.
 */
export const STAGES = [
  'Purchased',
  'In Transit',
  'At Port',
  'Clearing',
  'Inspection',
  'In Yard',
  'Ready',
];

export const GROUP_TYPES = [
  'Shipment',
  'Container',
  'Purchase batch',
  'Yard',
  'Supplier',
  'Import month',
];

/**
 * Next Stock ID for a given year.
 *
 * Scans the ids already issued rather than counting rows: vehicles get deleted,
 * and a count would reissue a number that is printed on paperwork for a car that
 * has left. Sequence resets per year, which is why the year is in the id.
 */
export const nextStockId = (vehicles = [], year = new Date().getFullYear()) => {
  const prefix = `${STOCK_PREFIX}-${year}-`;
  const highest = vehicles.reduce((max, v) => {
    if (typeof v.stockId !== 'string' || !v.stockId.startsWith(prefix)) return max;
    const n = parseInt(v.stockId.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(STOCK_SEQUENCE_PAD, '0')}`;
};

/**
 * Assigns a Stock ID only if the car does not already have one.
 *
 * The id is immutable by design — it ends up on the windscreen card, the
 * logbook file and the sale agreement, so regenerating it silently would leave
 * the paperwork pointing at nothing.
 */
export const ensureStockId = (vehicle, allVehicles, year) =>
  vehicle.stockId ? vehicle : { ...vehicle, stockId: nextStockId(allVehicles, year) };

/** GRP-2026-07-01 — year, month, then a sequence within that month. */
export const nextGroupId = (groups = [], date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `GRP-${year}-${month}-`;
  const highest = groups.reduce((max, g) => {
    if (typeof g.id !== 'string' || !g.id.startsWith(prefix)) return max;
    const n = parseInt(g.id.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(2, '0')}`;
};

/** Seed groups, so the grouped view has something to show on a first run. */
export const DEFAULT_GROUPS = [
  {
    id: 'GRP-2026-07-01',
    name: 'July 2026 Japan Shipment',
    type: 'Shipment',
    vessel: 'MV Hoegh Trapper',
    origin: 'Yokohama',
    arrived: '2026-07-14',
    note: 'Mixed lot, cleared together at Mombasa.',
  },
  {
    id: 'GRP-2026-06-01',
    name: 'June 2026 Nagoya Batch',
    type: 'Purchase batch',
    vessel: '',
    origin: 'Nagoya',
    arrived: '2026-06-09',
    note: 'Bought at auction across two sale days.',
  },
  {
    id: 'GRP-2026-05-01',
    name: 'May 2026 Mombasa Yard Intake',
    type: 'Yard',
    vessel: '',
    origin: 'Mombasa',
    arrived: '2026-05-21',
    note: 'Local intake, no import leg.',
  },
];

export const UNGROUPED = { id: '', name: 'Ungrouped', type: '' };

export const groupOf = (vehicle, groups) =>
  groups.find((g) => g.id === vehicle?.groupId) ?? UNGROUPED;

/**
 * Buckets vehicles by their primary group, newest group first, with ungrouped
 * cars last. Groups with no vehicles are still returned — an empty shipment is
 * a real state and hiding it makes it look like the group was deleted.
 */
export const groupVehicles = (vehicles, groups) => {
  const buckets = groups.map((g) => ({
    group: g,
    vehicles: vehicles.filter((v) => v.groupId === g.id),
  }));
  const loose = vehicles.filter((v) => !groups.some((g) => g.id === v.groupId));
  return loose.length ? [...buckets, { group: UNGROUPED, vehicles: loose }] : buckets;
};
