/**
 * Vehicle cost ledger — internal only.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING HERE MAY REACH THE CUSTOMER SITE.
 *
 * CNF, duty, agency fees and margin are the dealership's buying position. They
 * live under their own storage key (KEYS.vehicleCosts) rather than as fields on
 * the vehicle, because the vehicle record is what the storefront reads. Keep
 * them separate and the eventual `GET /vehicles` physically cannot serve them;
 * fold them into the vehicle and every visitor gets the margins.
 *
 * The website app must never import this module. A test asserts that.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * One module so the form, the table, the group roll-up and the dashboard all
 * derive profit the same way. Four surfaces each doing their own arithmetic is
 * four chances to disagree about what a car earned.
 */

/** Section A — what the car cost to buy and ship. */
export const PURCHASE_FIELDS = [
  { key: 'cnf', label: 'CNF', hint: 'Cost and freight, as invoiced by the supplier' },
];

/** Section B — everything between the vessel and the yard gate. */
export const CLEARING_FIELDS = [
  { key: 'duty', label: 'Duty' },
  { key: 'portCharges', label: 'Port charges' },
  { key: 'deliveryOrder', label: 'Delivery order' },
  { key: 'agencyFees', label: 'Agency fees' },
  { key: 'driverCharges', label: 'Driver charges' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'ntsaCustoms', label: 'NTSA / Customs' },
];

/**
 * Section C is not a fixed field list. "Repairs / AOB" as a single box hides
 * what the money went on, and the figure someone questions six months later is
 * always this one — so it is a list of named entries instead.
 */
export const EXPENSE_PRESETS = [
  'Repairs',
  'Inspection',
  'Cleaning / detailing',
  'Accessories',
  'Other',
];

export const COST_FIELDS = [...PURCHASE_FIELDS, ...CLEARING_FIELDS];

/** A ledger with nothing entered yet. */
export const emptyCosts = () => ({
  ...Object.fromEntries(COST_FIELDS.map((f) => [f.key, 0])),
  percentagePaid: 0,
  expenses: [],
});

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Named post-arrival entries, summed. */
export const expensesTotal = (costs) =>
  (costs?.expenses ?? []).reduce((sum, e) => sum + num(e.amount), 0);

/**
 * Everything actually spent on the car.
 *
 * `percentagePaid` is deliberately absent. It tracks how much of the CNF has
 * been handed over so far, which is a cash-flow question — the car still costs
 * the full CNF whether or not the supplier has been paid in full.
 */
export const totalCost = (costs) => {
  if (!costs) return 0;
  const fields = COST_FIELDS.reduce((sum, f) => sum + num(costs[f.key]), 0);
  return fields + expensesTotal(costs);
};

/** Deposit progress against CNF, not against total cost. */
export const amountPaid = (costs) =>
  Math.round(num(costs?.cnf) * (num(costs?.percentagePaid) / 100));

export const outstandingBalance = (costs) => num(costs?.cnf) - amountPaid(costs);

export const profit = (costs, sellingPrice) => num(sellingPrice) - totalCost(costs);

/**
 * Margin is profit over the SELLING price, not over cost — that is the
 * convention the spec uses and the one a dealer quotes. Returns null rather
 * than 0 when there is no selling price: an unpriced car has no margin, and
 * showing "0.0%" would read as a car that earns nothing.
 */
export const profitMargin = (costs, sellingPrice) => {
  const price = num(sellingPrice);
  if (price <= 0) return null;
  return (profit(costs, price) / price) * 100;
};

/** True once anything at all has been entered — drives "no ledger yet" states. */
export const hasLedger = (costs) =>
  Boolean(costs) && (totalCost(costs) > 0 || num(costs.percentagePaid) > 0);

/**
 * Consolidated figures for a group of vehicles.
 *
 * Only counts cars that have a ledger. A shipment where two of five cars have
 * been costed should report the two, not average in three zeros and imply the
 * whole batch is nearly free.
 */
export const rollUp = (vehicles, costsById) => {
  const costed = vehicles.filter((v) => hasLedger(costsById[v.id]));
  const cost = costed.reduce((sum, v) => sum + totalCost(costsById[v.id]), 0);
  const revenue = costed.reduce((sum, v) => sum + num(v.price), 0);
  return {
    units: vehicles.length,
    costedUnits: costed.length,
    totalCost: cost,
    projectedRevenue: revenue,
    projectedProfit: revenue - cost,
    margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : null,
  };
};

/** Formats a margin for display, including the "not priced yet" case. */
export const formatMargin = (value) =>
  value === null || value === undefined ? '—' : `${value.toFixed(2)}%`;
