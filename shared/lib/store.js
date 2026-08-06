/**
 * Persistence seam.
 *
 * Today both apps read and write browser localStorage. Because the customer
 * site and the admin portal now run on different origins, they DO NOT share
 * this storage — an admin edit does not reach the shop. That is inherent to
 * running them as two separate sites without a backend.
 *
 * When a real API lands, replace the body of read/write with fetch calls;
 * every call site already goes through here.
 */

const NS = 'zm_';

export const KEYS = {
  vehicles: NS + 'vehicles',
  parts: NS + 'parts',
  compatibility: NS + 'compatibility',
  orders: NS + 'orders',
  enquiries: NS + 'enquiries',
  cart: NS + 'cart',
  siteContact: NS + 'site_contact',
  banners: NS + 'banners',
  reviews: NS + 'reviews',
  siteContent: NS + 'site_content',
  adminUsers: NS + 'admin_users',
  activity: NS + 'activity',
  session: NS + 'session',
  /* Admin-only. Deliberately separate keys so the customer app has no path to
     the buying position — see the notice at the top of shared/lib/costing.js.

     The three sales keys follow the same rule for the same reason. A part's buy
     price and a car's achieved sale price are both negotiating position: publish
     the first and competitors know the margin, publish the second and the next
     buyer knows the floor. `parts` and `orders` are records the storefront
     reads, so neither may carry a cost or an achieved price as a field. */
  vehicleCosts: NS + 'vehicle_costs',
  vehicleGroups: NS + 'vehicle_groups',
  vehicleSales: NS + 'vehicle_sales',
  partCosts: NS + 'part_costs',
  orderCosts: NS + 'order_costs',
};

/**
 * Reads a key, and says whether it worked.
 *
 * `read` below swallows every failure and hands back the fallback, which keeps
 * the app alive but is indistinguishable from "there is genuinely nothing here".
 * For a catalogue that difference matters: a storage error rendering as an empty
 * grid tells a customer the dealership has no cars.
 *
 * `ok: false` means the read actually failed — storage blocked in private mode,
 * unreadable JSON, or a stored value whose shape no longer matches. A missing
 * key is not a failure; that is a first visit.
 */
export const readSafe = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { value: fallback, ok: true, reason: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      return { value: fallback, ok: false, reason: 'shape' };
    }
    return { value: parsed, ok: true, reason: null };
  } catch (error) {
    return {
      value: fallback,
      ok: false,
      reason: error instanceof SyntaxError ? 'corrupt' : 'unavailable',
    };
  }
};

/** Convenience wrapper for call sites that genuinely do not care why. */
export const read = (key, fallback) => readSafe(key, fallback).value;

export const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private-mode denial — state stays in memory for the session.
  }
};

/** Order refs must be unique: updateOrderStatus keys on ref. */
export const makeOrderRef = (existingRefs = []) => {
  const taken = new Set(existingRefs);
  for (let i = 0; i < 50; i++) {
    const ref = 'ZM-' + Math.floor(10000 + Math.random() * 90000);
    if (!taken.has(ref)) return ref;
  }
  return 'ZM-' + Date.now().toString().slice(-8);
};
