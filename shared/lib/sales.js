/**
 * Realised money — internal only.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING HERE MAY REACH THE CUSTOMER SITE. Same rule as costing.js, and for a
 * sharper reason: this module handles achieved sale prices. A published asking
 * price is marketing; a published achieved price tells the next buyer exactly
 * how far you will come down.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Two principles run through everything below.
 *
 * 1. COST IS SNAPSHOT, NEVER LOOKED UP LIVE.
 *    A sale records what the item cost *on the day it sold*. If profit were
 *    recomputed from today's cost table, editing a part's buy price in March
 *    would silently rewrite January's profit and the books would stop
 *    reconciling. Every figure here reads a stored snapshot.
 *
 * 2. UNKNOWN IS REPORTED, NEVER ASSUMED TO BE ZERO.
 *    A car sold with no cost ledger is not a car with 100% margin. Sales
 *    without a cost snapshot are excluded from profit and counted separately,
 *    so the screen can say "4 of 7 sales costed" instead of quietly inflating
 *    the total. This is the whole reason the module exists.
 */

import { totalCost, hasLedger } from './costing.js';

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The only order status that counts as money earned.
 *
 * Not "Out for Delivery" and not "Ready for Collection": the goods have left
 * the shelf but the customer can still refuse them, and a revenue line that can
 * reverse is not revenue. Cancelled is obviously excluded. One constant so the
 * dashboard, any future report and the tests cannot disagree.
 */
export const REALISED_ORDER_STATUSES = ['Completed'];

export const isRealisedOrder = (order) =>
  REALISED_ORDER_STATUSES.includes(order?.status);

/* ───────────────────────── vehicles ───────────────────────── */

/**
 * The record written when a car is marked Sold.
 *
 * `cost` is the ledger total frozen at that moment, and `costed` says whether
 * there was a ledger at all — the difference between "this car cost nothing"
 * and "nobody entered what this car cost", which are opposite facts.
 */
export const makeVehicleSale = ({ price, date, buyer = '', costs }) => ({
  price: num(price),
  date: date || null,
  buyer: String(buyer || '').trim(),
  cost: hasLedger(costs) ? totalCost(costs) : null,
  costed: hasLedger(costs),
  recordedAt: new Date().toISOString(),
});

export const vehicleSaleProfit = (sale) =>
  sale && sale.costed ? num(sale.price) - num(sale.cost) : null;

/* ───────────────────────── parts ───────────────────────── */

/**
 * Per-line cost snapshot for an order, taken when it is marked Completed.
 *
 * A line whose part has no cost on file is kept with `unitCost: null` rather
 * than dropped — the order still sold, and the gap has to stay visible.
 */
export const makeOrderCost = (order, partCosts = {}) => {
  const lines = (order?.items ?? []).map((line) => {
    const entry = partCosts[line.partId];
    const unitCost = entry && Number.isFinite(num(entry.costPrice)) && num(entry.costPrice) > 0
      ? num(entry.costPrice)
      : null;
    return { partId: line.partId, qty: num(line.qty), unitCost };
  });
  return {
    lines,
    // Complete only if every line could be costed. A partially costed order
    // gives a profit that is too high by exactly the lines that are missing.
    complete: lines.length > 0 && lines.every((l) => l.unitCost !== null),
    costedAt: new Date().toISOString(),
  };
};

export const orderCostTotal = (entry) =>
  (entry?.lines ?? []).reduce((sum, l) => sum + num(l.unitCost) * num(l.qty), 0);

/* ───────────────────────── roll-ups ───────────────────────── */

const inWindow = (dateString, from, to) => {
  if (!from && !to) return true;
  if (!dateString) return false;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

/**
 * Vehicle sales over a window.
 *
 * `revenue` counts every sale — you know what you sold it for regardless of
 * whether anyone recorded the cost. `profit` counts only costed sales, and
 * `uncosted` says how many were left out, so the two numbers are never confused
 * for a matched pair.
 */
export const vehicleSalesSummary = (vehicles = [], sales = {}, { from = null, to = null } = {}) => {
  const rows = [];
  for (const v of vehicles) {
    const sale = sales[v.id];
    if (!sale) continue;
    if (!inWindow(sale.date, from, to)) continue;
    rows.push({ vehicle: v, sale, profit: vehicleSaleProfit(sale) });
  }

  const costed = rows.filter((r) => r.sale.costed);
  const revenue = rows.reduce((s, r) => s + num(r.sale.price), 0);
  const costedRevenue = costed.reduce((s, r) => s + num(r.sale.price), 0);
  const cost = costed.reduce((s, r) => s + num(r.sale.cost), 0);

  return {
    units: rows.length,
    costedUnits: costed.length,
    uncostedUnits: rows.length - costed.length,
    revenue,
    cost,
    profit: costedRevenue - cost,
    /* Margin is taken over the costed revenue only. Dividing a costed profit by
       the full revenue would understate the margin by whatever the uncosted
       cars sold for. */
    margin: costedRevenue > 0 ? ((costedRevenue - cost) / costedRevenue) * 100 : null,
    rows,
  };
};

/** Parts sales over a window, from completed orders and their cost snapshots. */
export const partSalesSummary = (orders = [], orderCosts = {}, { from = null, to = null } = {}) => {
  const rows = [];
  for (const o of orders) {
    if (!isRealisedOrder(o)) continue;
    if (!inWindow(o.date, from, to)) continue;
    const entry = orderCosts[o.ref];
    const complete = Boolean(entry?.complete);
    rows.push({
      order: o,
      cost: complete ? orderCostTotal(entry) : null,
      profit: complete ? num(o.total) - orderCostTotal(entry) : null,
    });
  }

  const costed = rows.filter((r) => r.cost !== null);
  const revenue = rows.reduce((s, r) => s + num(r.order.total), 0);
  const costedRevenue = costed.reduce((s, r) => s + num(r.order.total), 0);
  const cost = costed.reduce((s, r) => s + num(r.cost), 0);

  return {
    orders: rows.length,
    costedOrders: costed.length,
    uncostedOrders: rows.length - costed.length,
    revenue,
    cost,
    profit: costedRevenue - cost,
    margin: costedRevenue > 0 ? ((costedRevenue - cost) / costedRevenue) * 100 : null,
    rows,
  };
};

/** The two streams added up, keeping the exclusions visible. */
export const combinedSummary = (v, p) => ({
  revenue: v.revenue + p.revenue,
  profit: v.profit + p.profit,
  /* Anything the profit figure could not account for. Surfaced next to the
     total so nobody reads it as complete when it is not. */
  excluded: v.uncostedUnits + p.uncostedOrders,
  hasGaps: v.uncostedUnits > 0 || p.uncostedOrders > 0,
});
