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

/* Groups come from the `vehicle_groups` table — there is no bundled seed list.
   An admin with no groups yet sees every car under Ungrouped, which is a real
   state rather than a placeholder shipment nobody created. */

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

/* ───────────────────────── Holding time ───────────────────────── */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How long a car has been on the books.
 *
 * For an importer this is the quiet cost: a unit at 120 days has eaten margin
 * in floor space, insurance and tied-up capital that no cost line records. The
 * ledger tracks what was spent to land the car; nothing tracked how long it
 * then sat.
 *
 * A sold car is measured to the date it sold, not to today — otherwise every
 * car the yard has ever sold keeps ageing forever and the number stops meaning
 * anything. Returns null when there is no start date rather than 0, because
 * "arrived today" and "we do not know when this arrived" are different facts.
 */
export const daysOnLot = (vehicle, sale = null, now = new Date()) => {
  if (!vehicle?.createdAt) return null;
  const start = new Date(vehicle.createdAt);
  if (Number.isNaN(start.getTime())) return null;

  const endRaw = sale?.date ? new Date(sale.date) : now;
  const end = Number.isNaN(endRaw.getTime()) ? now : endRaw;

  /* A sale dated before the record was created is contradictory, not a
     same-day sale. It happens whenever stock is entered retroactively —
     `created_at` is when the ROW was made, not when the car landed — and
     clamping it to 0 would report "sold the day it arrived" for every
     backfilled unit. Unknown is the truthful answer. */
  if (end < start) return null;

  return Math.floor((end - start) / MS_PER_DAY);
};

/**
 * Bands for reading the number at a glance.
 *
 * The thresholds are a starting point, not a finding — nobody has measured
 * this yard's own turn yet. They exist so the column can be scanned; move them
 * once there is enough history to say what "slow" actually is here.
 */
export const AGEING_BANDS = [
  { id: 'fresh', upTo: 30, label: 'Fresh' },
  { id: 'settling', upTo: 60, label: 'Settling' },
  { id: 'ageing', upTo: 90, label: 'Ageing' },
  { id: 'stale', upTo: Infinity, label: 'Slow mover' },
];

export const ageingBand = (days) =>
  days == null ? null : AGEING_BANDS.find((b) => days <= b.upTo) ?? AGEING_BANDS[AGEING_BANDS.length - 1];
