/**
 * The mobile app's tables, mapped for the portal.
 *
 * These are the `garage_*` family plus chat, written app-first: every row is
 * owned by a customer (`user_id`) rather than by the yard, and until the staff
 * policies landed the admin could not read any of them. Two consequences run
 * through this file.
 *
 * 1. THE YARD IS A GUEST IN THIS DATA. Staff oversee it; they do not own it.
 *    There is no delete of a customer's car, service history or fuel log
 *    anywhere here, and the policies do not grant one either. What staff can
 *    change is the yard's own reference data — the partner directory — and the
 *    status fields the yard is responsible for moving.
 *
 * 2. A CUSTOMER IS A `user_id` AND NOTHING ELSE. auth.users is not readable
 *    from the client, so there is no name or email to show against a garage.
 *    The screens say "customer" and show the short id rather than inventing a
 *    display name from a UUID.
 */

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** "8f14e45f-…" → "8f14e45f". Enough to tell two customers apart in a list. */
export const shortId = (id) => String(id ?? '').split('-')[0] || '—';

export const garageVehicleFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  sourceVehicleId: r.source_vehicle_id ?? null,
  name: r.name,
  plate: r.plate,
  chassis: r.chassis || '',
  currentKm: r.current_km ?? 0,
  dailyAvgKm: r.daily_avg_km ?? 0,
  lastOdometerUpdate: r.last_odometer_update_date ?? null,
  img: r.img || '',
  year: r.year || '',
  engine: r.engine || '',
  insuranceExpiry: r.insurance_expiry ?? null,
  ntsaExpiry: r.ntsa_inspection_expiry ?? null,
  remindersEnabled: !!r.reminders_enabled,
  isPrimary: !!r.is_primary,
  createdAt: r.created_at,
});

export const serviceItemFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  garageVehicleId: r.garage_vehicle_id,
  sourcePartId: r.source_part_id ?? null,
  name: r.name,
  category: r.category || '',
  intervalKm: r.interval_km ?? 0,
  lastServiceKm: r.last_service_km ?? 0,
  nextDueKm: r.next_due_km ?? 0,
  intervalMonths: r.interval_months ?? 0,
  lastServiceDate: r.last_service_date ?? null,
  dueDate: r.due_date ?? null,
  estimatedCost: num(r.estimated_cost),
  oemPartNumber: r.oem_part_number || '',
  description: r.description || '',
});

export const serviceHistoryFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  garageVehicleId: r.garage_vehicle_id,
  serviceItemId: r.garage_service_item_id ?? null,
  serviceDate: r.service_date,
  mileageKm: r.mileage_km ?? 0,
  serviceType: r.service_type,
  advisor: r.advisor || '',
  location: r.location || '',
  cost: num(r.cost),
  invoiceNo: r.invoice_no || '',
});

export const fuelEntryFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  garageVehicleId: r.garage_vehicle_id,
  filledAt: r.filled_at,
  odometerKm: r.odometer_km ?? 0,
  litres: num(r.litres),
  pricePerLitre: num(r.price_per_litre),
  totalCost: num(r.total_cost),
  stationName: r.station_name || '',
  isFullTank: !!r.is_full_tank,
  /* Null is a real state, not a zero: the app only computes km/litre once it
     has two full-tank fills to measure between. */
  efficiency: r.efficiency_km_per_litre === null ? null : num(r.efficiency_km_per_litre),
});

export const bookingFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  garageVehicleId: r.garage_vehicle_id ?? null,
  partnerGarageCode: r.partner_garage_code ?? null,
  serviceTitle: r.service_title,
  bookingDate: r.booking_date,
  timeSlot: r.time_slot,
  preDispatchParts: !!r.pre_dispatch_parts,
  notes: r.notes || '',
  confirmationCode: r.confirmation_code,
  status: r.status,
  createdAt: r.created_at,
});

export const partnerGarageFromRow = (r) => ({
  code: r.code,
  name: r.name,
  area: r.area || '',
  address: r.address || '',
  rating: num(r.rating),
  reviewsCount: r.reviews_count ?? 0,
  distanceKm: num(r.distance_km),
  isOfficialHq: !!r.is_official_hq,
  isSkyactivCertified: !!r.is_skyactiv_certified,
  operatingHours: r.operating_hours || '',
  availableSlots: r.available_slots || [],
  specialties: r.specialties || [],
  active: !!r.active,
});

export const partnerGarageToRow = (g) => ({
  code: g.code,
  name: g.name,
  area: g.area,
  address: g.address,
  rating: g.rating,
  reviews_count: g.reviewsCount,
  distance_km: g.distanceKm,
  is_official_hq: g.isOfficialHq,
  is_skyactiv_certified: g.isSkyactivCertified,
  operating_hours: g.operatingHours,
  available_slots: g.availableSlots,
  specialties: g.specialties,
  active: g.active,
});

export const applicationFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  businessName: r.business_name,
  contactName: r.contact_name,
  phone: r.phone,
  email: r.email || '',
  area: r.area || '',
  address: r.address || '',
  specialties: r.specialties || [],
  notes: r.notes || '',
  status: r.status,
  createdAt: r.created_at,
});

export const chatThreadFromRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  subject: r.subject || '',
  vehicleId: r.vehicle_id ?? null,
  partId: r.part_id ?? null,
  status: r.status,
  lastMessageAt: r.last_message_at,
  /* What the yard has not answered yet. The trigger maintains it, so it is the
     queue length rather than something this screen recounts. */
  staffUnread: r.staff_unread ?? 0,
  customerUnread: r.customer_unread ?? 0,
  createdAt: r.created_at,
});

export const chatMessageFromRow = (r) => ({
  id: r.id,
  threadId: r.thread_id,
  senderId: r.sender_id,
  senderRole: r.sender_role,
  body: r.body,
  createdAt: r.created_at,
});

/* The statuses the yard moves a booking through. `Requested` is what the app
   writes; everything after it is the yard's decision. */
export const BOOKING_STATUSES = ['Requested', 'Confirmed', 'In progress', 'Completed', 'Cancelled'];

export const APPLICATION_STATUSES = ['Pending', 'Approved', 'Rejected'];

/** Whether a scheduled item has come due, by distance or by date. */
export const itemIsDue = (item, vehicle, today = new Date()) => {
  const byKm = vehicle && item.nextDueKm > 0 && vehicle.currentKm >= item.nextDueKm;
  const byDate = item.dueDate ? new Date(item.dueDate) <= today : false;
  return Boolean(byKm || byDate);
};

/**
 * App usage, counted from the rows themselves.
 *
 * Deliberately not "active users" or "sessions" — nothing in this schema
 * records a visit, so any engagement figure would be invented. What can be
 * counted honestly is how many distinct customers have put something in the
 * database, and how much of it there is.
 */
export const computeAppMetrics = ({
  vehicles = [], serviceItems = [], history = [], fuel = [],
  bookings = [], garages = [], applications = [], threads = [],
}, today = new Date()) => {
  const users = new Set();
  for (const list of [vehicles, history, fuel, bookings, threads]) {
    for (const r of list) if (r.userId) users.add(r.userId);
  }

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const dueItems = serviceItems.filter((i) => itemIsDue(i, vehicleById.get(i.garageVehicleId), today));

  const byStatus = (rows) => rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const litres = fuel.reduce((s, f) => s + f.litres, 0);
  const measured = fuel.filter((f) => f.efficiency !== null);

  return {
    users: users.size,
    vehicles: vehicles.length,
    /* Averaged over customers, not over cars — "1.4 cars per customer" is the
       figure that says whether the garage feature is being used twice. */
    vehiclesPerUser: users.size > 0 ? vehicles.length / users.size : 0,
    remindersOn: vehicles.filter((v) => v.remindersEnabled).length,
    serviceItems: serviceItems.length,
    dueItems: dueItems.length,
    servicesLogged: history.length,
    serviceSpend: history.reduce((s, h) => s + h.cost, 0),
    fuelEntries: fuel.length,
    fuelLitres: litres,
    fuelSpend: fuel.reduce((s, f) => s + f.totalCost, 0),
    /* Only over the fills that carry a figure. Averaging in the nulls as zero
       would drag the number down by however many first-fills there are. */
    avgEfficiency: measured.length > 0
      ? measured.reduce((s, f) => s + f.efficiency, 0) / measured.length
      : null,
    bookings: bookings.length,
    bookingsByStatus: byStatus(bookings),
    openBookings: bookings.filter((b) => b.status === 'Requested' || b.status === 'Confirmed').length,
    garagesActive: garages.filter((g) => g.active).length,
    garagesTotal: garages.length,
    applicationsPending: applications.filter((a) => a.status === 'Pending').length,
    applicationsTotal: applications.length,
    threadsOpen: threads.filter((t) => t.status === 'Open').length,
    threadsTotal: threads.length,
  };
};
