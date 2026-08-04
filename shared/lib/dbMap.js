/**
 * camelCase (JS, used throughout the admin UI) <-> snake_case (Postgres
 * column names) mapping, one place per table so every caller in
 * AdminContext.jsx agrees on the shape.
 */

export const vehicleFromRow = (r) => ({
  id: r.id,
  name: r.name,
  stockId: r.stock_id,
  stage: r.stage,
  groupId: r.group_id || '',
  regNumber: r.reg_number || '',
  location: r.location || '',
  listing: r.listing,
  make: r.make,
  year: r.year,
  price: r.price,
  mileage: r.mileage,
  fuel: r.fuel,
  trans: r.trans,
  engine: r.engine,
  body: r.body,
  color: r.color,
  condition: r.condition,
  status: r.status,
  featured: !!r.featured,
  approvalStatus: r.approval_status,
  img: r.img,
  images: r.images || [],
  description: r.description,
  slug: r.slug,
  chassis: r.chassis,
  grade: r.grade,
  inspection: r.inspection,
  odometerVerified: !!r.odometer_verified,
  dutyPaid: !!r.duty_paid,
  port: r.port,
});

export const vehicleToRow = (v) => ({
  name: v.name,
  stock_id: v.stockId,
  stage: v.stage,
  group_id: v.groupId || null,
  reg_number: v.regNumber || '',
  location: v.location || '',
  listing: v.listing,
  make: v.make,
  year: v.year,
  price: v.price,
  mileage: v.mileage,
  fuel: v.fuel,
  trans: v.trans,
  engine: v.engine,
  body: v.body,
  color: v.color,
  condition: v.condition,
  status: v.status,
  featured: !!v.featured,
  /* Approval is set by the queue, never carried back in from an edit — saving
     a listing must not quietly re-approve it. */
  /* Cover and gallery are written together from one source so they cannot
     drift: whatever sits first in `images` IS the cover. */
  img: (v.images && v.images[0]) || v.img || null,
  images: v.images || [],
  description: v.description,
  slug: v.slug,
  chassis: v.chassis,
  grade: v.grade,
  inspection: v.inspection,
  odometer_verified: !!v.odometerVerified,
  duty_paid: !!v.dutyPaid,
  port: v.port,
});

export const partFromRow = (r) => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  category: r.category,
  price: r.price,
  promo: r.promo,
  compat: r.compat,
  stock: r.stock,
  img: r.img,
  description: r.description,
  sku: r.sku,
  partNumber: r.part_number || '',
});

export const partToRow = (p) => ({
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  promo: p.promo === '' || p.promo === undefined ? null : p.promo,
  compat: p.compat,
  stock: p.stock,
  img: p.img,
  description: p.description,
  sku: p.sku,
  part_number: p.partNumber || '',
});

/**
 * `partId` and `modelIds` are the real links; the `_legacy` text columns are
 * the readable copy beside them.
 *
 * compatibility.js resolves a rule through `rule.partId` first and only falls
 * back to matching `rule.part` by name — that fallback exists for rules written
 * before the id column, not as the normal path. Leaving the id unmapped meant
 * every new rule was born on the legacy path, so renaming a part in the
 * catalogue silently orphaned its fitment rules again.
 */
export const compatFromRow = (r) => ({
  id: r.id,
  partId: r.part_id,
  part: r.part_name_legacy,
  brand: r.brand,
  make: r.make,
  modelIds: r.model_ids || [],
  model: r.model_legacy,
  years: r.years,
});

export const compatToRow = (c) => ({
  part_id: c.partId ?? null,
  part_name_legacy: c.part,
  brand: c.brand,
  make: c.make,
  model_ids: c.modelIds || [],
  model_legacy: c.model,
  years: c.years,
});

export const orderFromRow = (r) => ({
  ref: r.ref,
  customer: r.customer,
  phone: r.phone,
  email: r.email,
  location: r.location,
  itemsFmt: r.items_fmt,
  items: r.items || [],
  total: r.total,
  status: r.status,
  delivery: r.delivery,
  date: r.order_date,
});

export const enquiryFromRow = (r) => ({
  id: r.id,
  customer: r.customer,
  vehicle: r.vehicle,
  type: r.type,
  phone: r.phone,
  status: r.status,
  date: r.enquiry_date,
});

export const groupFromRow = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  vessel: r.vessel || '',
  origin: r.origin || '',
  arrived: r.arrived || '',
  note: r.note || '',
});

export const groupToRow = (g) => ({
  id: g.id,
  name: g.name,
  type: g.type,
  vessel: g.vessel || '',
  origin: g.origin || '',
  arrived: g.arrived || '',
  note: g.note || '',
});

export const activityFromRow = (r) => ({
  id: r.id,
  message: r.message,
  at: new Date(r.at).getTime(),
});

export const costsFromRow = (r) => ({
  cnf: r.cnf,
  duty: r.duty,
  portCharges: r.port_charges,
  deliveryOrder: r.delivery_order,
  agencyFees: r.agency_fees,
  driverCharges: r.driver_charges,
  fuel: r.fuel,
  ntsaCustoms: r.ntsa_customs,
  percentagePaid: r.percentage_paid,
  expenses: r.expenses || [],
});

export const costsToRow = (vehicleId, c) => ({
  vehicle_id: vehicleId,
  cnf: c.cnf || 0,
  duty: c.duty || 0,
  port_charges: c.portCharges || 0,
  delivery_order: c.deliveryOrder || 0,
  agency_fees: c.agencyFees || 0,
  driver_charges: c.driverCharges || 0,
  fuel: c.fuel || 0,
  ntsa_customs: c.ntsaCustoms || 0,
  percentage_paid: c.percentagePaid || 0,
  expenses: c.expenses || [],
});

export const saleFromRow = (r) => ({
  price: r.price,
  date: r.sale_date,
  buyer: r.buyer,
  cost: r.cost,
  costed: r.costed,
  recordedAt: r.recorded_at,
});

export const saleToRow = (vehicleId, s) => ({
  vehicle_id: vehicleId,
  price: s.price,
  sale_date: s.date,
  buyer: s.buyer,
  cost: s.cost,
  costed: s.costed,
  recorded_at: s.recordedAt,
});

/** Kept as `{ costPrice }` (not a bare number) to match the shape every
 *  existing caller of `partCosts[id]` already expects. */
export const partCostFromRow = (r) => ({ costPrice: r.cost_price });

export const orderCostFromRow = (r) => ({
  lines: r.lines || [],
  complete: r.complete,
  costedAt: r.created_at,
});

export const orderCostToRow = (ref, e) => ({
  order_ref: ref,
  lines: e.lines,
  complete: e.complete,
});

export const reviewFromRow = (r) => ({
  id: r.id,
  name: r.name,
  role: r.role,
  quote: r.quote,
  rating: r.rating,
  status: r.status,
  at: r.created_at,
});
