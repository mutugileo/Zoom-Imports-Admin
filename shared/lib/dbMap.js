/**
 * camelCase (JS, used throughout the admin UI) <-> snake_case (Postgres
 * column names) mapping, one place per table so every caller in
 * AdminContext.jsx agrees on the shape.
 */

export const vehicleFromRow = (r) => ({
  id: r.id,
  name: r.name,
  /* When the car entered the system. Read-only — it is never written back by
     vehicleToRow, so an edit cannot reset a unit's age. */
  createdAt: r.created_at,
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
  images: r.images || [],
  description: r.description,
  sku: r.sku,
  partNumber: r.part_number || '',
  approvalStatus: r.approval_status,
  source: r.source,
});

export const partToRow = (p) => ({
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  promo: p.promo === '' || p.promo === undefined ? null : p.promo,
  compat: p.compat,
  stock: p.stock,
  /* Cover and gallery written from one source so they cannot drift: whatever
     sits first in `images` IS the cover — the same rule vehicles follow. */
  img: (p.images && p.images[0]) || p.img || null,
  images: p.images || [],
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
  /* Set once the enquiry becomes a sale. Null is the normal state — most
     enquiries never convert, and that is information too. */
  buyerId: r.buyer_id ?? null,
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

/**
 * The person a car was sold to, and what it said on the day it was sold.
 *
 * The `vehicle*` and `sale*` fields are a COPY, not a join. `vehicleId` is kept
 * so the record can be traced back to the car, but nothing that appears on an
 * invoice is ever read through it — the copy is the point of the table. An
 * invoice is a document handed to a customer; if it re-read the live vehicle,
 * correcting a typo in the model name next March would silently reissue a
 * document already signed, and reprinting last year's invoice would produce a
 * different piece of paper than the one in the file.
 *
 * So a later edit to the car, or deleting it outright, leaves the buyer's
 * record and their invoice exactly as they were.
 */
export const buyerFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email || '',
  idNumber: r.id_number || '',
  address: r.address || '',
  vehicleId: r.vehicle_id,
  vehicleName: r.vehicle_name || '',
  vehicleYear: r.vehicle_year,
  vehicleReg: r.vehicle_reg || '',
  vehicleChassis: r.vehicle_chassis || '',
  vehicleColor: r.vehicle_color || '',
  vehicleEngine: r.vehicle_engine || '',
  /* Null unless a number was issued by hand on paper. The app derives one from
     the row id otherwise — see invoiceNumberFor. */
  invoiceNo: r.invoice_no || '',
  /* The account this invoice tells the customer to pay into, copied at record
     time. `bankAccountId` traces the source row and is never printed: retiring
     an account or fixing a branch must not redirect a payment on paperwork the
     customer already holds. */
  bankAccountId: r.bank_account_id ?? null,
  bankName: r.bank_name || '',
  bankBranch: r.bank_branch || '',
  bankAccountNo: r.bank_account_no || '',
  bankAccountName: r.bank_account_name || '',
  // Numeric arrives from PostgREST as a string so precision survives the wire.
  salePrice: r.sale_price == null ? null : Number(r.sale_price),
  saleDate: r.sale_date || '',
  notes: r.notes || '',
  at: r.created_at,
});

export const buyerToRow = (b) => ({
  name: b.name,
  phone: b.phone,
  email: b.email || null,
  id_number: b.idNumber || null,
  address: b.address || null,
  vehicle_id: b.vehicleId ?? null,
  vehicle_name: b.vehicleName || null,
  vehicle_year: b.vehicleYear ?? null,
  vehicle_reg: b.vehicleReg || null,
  vehicle_chassis: b.vehicleChassis || null,
  vehicle_color: b.vehicleColor || null,
  vehicle_engine: b.vehicleEngine || null,
  invoice_no: b.invoiceNo || null,
  bank_account_id: b.bankAccountId ?? null,
  bank_name: b.bankName || null,
  bank_branch: b.bankBranch || null,
  bank_account_no: b.bankAccountNo || null,
  bank_account_name: b.bankAccountName || null,
  sale_price: b.salePrice ?? null,
  sale_date: b.saleDate || null,
  notes: b.notes || null,
});

/**
 * The company's own billing identity, printed on an invoice.
 *
 * A separate table from `site_contact` rather than more columns on it, because
 * `site_contact` grants SELECT to `anon` so the storefront can paint its header
 * — putting a bank account number there would hand it to anyone holding the
 * publishable key. Nothing on this record is read by the customer site.
 */
export const billingFromRow = (r) => ({
  companyName: r.company_name || '',
  poBox: r.po_box || '',
  bankName: r.bank_name || '',
  bankBranch: r.bank_branch || '',
  bankAccountNo: r.bank_account_no || '',
  bankAccountName: r.bank_account_name || '',
});

export const billingToRow = (b) => ({
  company_name: b.companyName || null,
  po_box: b.poBox || null,
  bank_name: b.bankName || null,
  bank_branch: b.bankBranch || null,
  bank_account_no: b.bankAccountNo || null,
  bank_account_name: b.bankAccountName || null,
});

/**
 * An account the yard can ask to be paid into.
 *
 * A list rather than one set of fields on `company_billing`, because which
 * account an invoice names is a per-sale decision — different banks suit
 * different buyers, and the yard picks one when the sale is recorded. The
 * chosen row is then COPIED onto the buyer (see `buyerFromRow`), so this table
 * is the menu, never the record of what was already printed.
 */
export const bankAccountFromRow = (r) => ({
  id: r.id,
  bankName: r.bank_name,
  branch: r.branch || '',
  accountNo: r.account_no,
  accountName: r.account_name,
  isDefault: !!r.is_default,
  sortOrder: r.sort_order,
  active: !!r.active,
});

export const bankAccountToRow = (a) => ({
  bank_name: a.bankName,
  branch: a.branch || null,
  account_no: a.accountNo,
  account_name: a.accountName,
  /* Written as a real false rather than left out: a unique partial index
     enforces at most one default, so this column is never ambiguous. */
  is_default: !!a.isDefault,
  sort_order: a.sortOrder ?? 0,
  active: a.active !== false,
});

/**
 * One payment received from a buyer.
 *
 * Kept as rows rather than a running total on the buyer, because "when did it
 * come in and under what M-Pesa code" is the question actually asked later,
 * and a single `amount_paid` column cannot answer it.
 */
export const buyerPaymentFromRow = (r) => ({
  id: r.id,
  buyerId: r.buyer_id,
  // Numeric arrives from PostgREST as a string so precision survives the wire.
  amount: r.amount == null ? 0 : Number(r.amount),
  paidOn: r.paid_on || '',
  method: r.method || 'M-Pesa',
  reference: r.reference || '',
  note: r.note || '',
  at: r.created_at,
});

export const buyerPaymentToRow = (p) => ({
  buyer_id: p.buyerId,
  amount: p.amount,
  paid_on: p.paidOn || null,
  method: p.method || 'M-Pesa',
  reference: p.reference || null,
  note: p.note || null,
});
