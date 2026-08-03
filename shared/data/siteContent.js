// Seed content for the admin's Site Content and Settings screens.

export const DEFAULT_CONTACT = {
  phone: '+254 700 000 000',
  whatsapp: '+254 700 000 000',
  email: 'hello@zoomimports.co.ke',
  location: 'Mombasa Road, Nairobi',
};

export const DEFAULT_BANNERS = [];

export const DEFAULT_FAQS = [
  {
    id: 1,
    question: 'How long does delivery take?',
    answer:
      'Parts ordered before 2pm reach anywhere in Nairobi the same day. Upcountry deliveries go by courier and arrive in one to two working days.',
    type: 'FAQ',
  },
  {
    id: 2,
    question: 'Do you offer part installation?',
    answer:
      'Yes. Our Mombasa Road depot fits most parts while you wait, and we can recommend a trusted garage if the job is bigger.',
    type: 'FAQ',
  },
  {
    id: 3,
    question: 'Privacy Policy / Terms & Conditions',
    answer:
      'We keep customer contact details only to fulfil orders and arrange viewings, and we never sell them on. Full terms are available at the depot on request.',
    type: 'Legal',
  },
];

/**
 * Staff records for the Settings screen.
 *
 * These are directory entries only. The portal has no authentication, so a
 * role here does not restrict anything — see the note rendered on that screen.
 */
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE HOSTING THIS PORTAL ANYWHERE.
 *
 * The sign-in below is a UI gate, NOT a security control. The check runs in the
 * browser against records in localStorage, so anyone who can open the page can
 * bypass it — devtools, editing storage directly, or just reading the bundle.
 * The passcodes here are demo credentials in plain sight for exactly that
 * reason: pretending otherwise would be worse than saying it.
 *
 * What it does buy, today: the right person sees the right screens, actions are
 * attributed to a named user in the activity log, and every permission decision
 * is already expressed in one place. When a backend lands, `can()` becomes a
 * question the server answers and this file keeps its shape.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ROLES = {
  Superadmin: {
    blurb: 'Full control, including staff accounts.',
    permissions: ['catalogue:write', 'catalogue:delete', 'orders:write', 'enquiries:write', 'content:write', 'users:manage', 'costs:view', 'costs:write'],
  },
  Administrator: {
    blurb: 'Everything except adding or removing staff.',
    permissions: ['catalogue:write', 'catalogue:delete', 'orders:write', 'enquiries:write', 'content:write', 'costs:view', 'costs:write'],
  },
  'Inventory Manager': {
    blurb: 'Vehicles, parts, fitment and the cost ledger. No orders or staff.',
    permissions: ['catalogue:write', 'catalogue:delete', 'costs:view', 'costs:write'],
  },
  /* No costs:view. Sales quote the selling price; a rep who can see the floor
     will eventually discount to it. */
  'Sales Staff': {
    blurb: 'Orders and enquiries. Reads the catalogue, cannot change it. No cost figures.',
    permissions: ['orders:write', 'enquiries:write'],
  },
};

export const ADMIN_ROLES = Object.keys(ROLES);

/** Which nav entries a role may reach. Read by the layout and the router. */
export const ROLE_VIEWS = {
  Superadmin: ['admin-dashboard', 'admin-vehicles', 'admin-parts', 'admin-compatibility', 'admin-orders', 'admin-enquiries', 'admin-content', 'admin-settings'],
  Administrator: ['admin-dashboard', 'admin-vehicles', 'admin-parts', 'admin-compatibility', 'admin-orders', 'admin-enquiries', 'admin-content', 'admin-settings'],
  'Inventory Manager': ['admin-dashboard', 'admin-vehicles', 'admin-parts', 'admin-compatibility'],
  'Sales Staff': ['admin-dashboard', 'admin-vehicles', 'admin-parts', 'admin-orders', 'admin-enquiries'],
};

export const hasPermission = (role, permission) =>
  Boolean(ROLES[role]?.permissions.includes(permission));

export const canSeeView = (role, view) =>
  Boolean(ROLE_VIEWS[role]?.includes(view));

/**
 * Seed accounts. The PIN is demo-only — see the notice at the top of this block.
 * Never put a real credential here.
 */
export const PIN_LENGTH = 4;

export const DEFAULT_ADMIN_USERS = [
  { id: 1, name: 'Wanjiru Kamau', email: 'wanjiru@zoomimports.co.ke', role: 'Superadmin', pin: '2014', lastLogin: '' },
  { id: 2, name: 'Brian Otieno', email: 'brian@zoomimports.co.ke', role: 'Sales Staff', pin: '4820', lastLogin: '' },
  { id: 3, name: 'Faith Njeri', email: 'faith@zoomimports.co.ke', role: 'Inventory Manager', pin: '7391', lastLogin: '' },
];

/**
 * A PIN identifies the person, so two staff cannot share one — otherwise the
 * activity log would attribute one person's deletions to another.
 */
export const findByPin = (users, pin) =>
  users.find((u) => String(u.pin) === String(pin)) ?? null;

export const isPinTaken = (users, pin, exceptId = null) =>
  users.some((u) => String(u.pin) === String(pin) && u.id !== exceptId);

/**
 * Partner yards along the import chain.
 *
 * Deliberately described by city and role rather than by company name. Naming a
 * real auction house or clearing agent on a public page asserts a commercial
 * relationship, and that is a claim the dealership has to actually hold — not
 * something to invent for a layout. Swap in real partners when there are
 * agreements to point at; the shape stays the same.
 */
export const PARTNER_YARDS = [
  {
    id: 'yokohama',
    city: 'Yokohama',
    country: 'Japan',
    role: 'Sourcing & buying floor',
    detail:
      'Where the car is bought. Every unit is bought against its translated inspection report, so the grade you see on the listing is the grade it was bought at.',
    since: '2014',
  },
  {
    id: 'nagoya',
    city: 'Nagoya',
    country: 'Japan',
    role: 'Pre-ship inspection & storage',
    detail:
      'Where JEVIC checks the odometer and structure before the car is loaded. Anything that fails does not get on the ship.',
    since: '2016',
  },
  {
    id: 'mombasa',
    city: 'Mombasa',
    country: 'Kenya',
    role: 'Clearing & port handling',
    detail:
      'Where duty is settled and the logbook process starts. The car leaves the port already paid for, which is why our prices do not move afterwards.',
    since: '2014',
  },
];

/**
 * Brings a stored staff roster up to the current shape.
 *
 * Rosters saved before PIN sign-in existed have no `pin` field, and `read()`
 * returns the stored copy rather than the seed — so without this, no PIN can
 * ever match and the portal locks everyone out permanently, with no way back in
 * from the UI. That is the worst possible failure for an auth change, so the
 * migration is defensive to the point of bluntness:
 *
 * 1. Backfill a missing PIN from the seed account with the same email, then id.
 * 2. Give anyone still without one a free 4-digit PIN, so no account is unusable.
 * 3. Guarantee a Superadmin exists — an older roster's top role was
 *    'Administrator', which cannot manage users, so user management would have
 *    silently disappeared.
 * 4. Guarantee at least one account can actually sign in.
 *
 * Idempotent: running it on an already-migrated roster changes nothing.
 */
export const migrateAdminUsers = (stored, seed = DEFAULT_ADMIN_USERS) => {
  if (!Array.isArray(stored) || stored.length === 0) return seed;

  const byEmail = new Map(seed.map((u) => [String(u.email).toLowerCase(), u]));
  const byId = new Map(seed.map((u) => [u.id, u]));
  const taken = new Set(
    stored.map((u) => (u.pin ? String(u.pin) : null)).filter(Boolean)
  );

  const freePin = () => {
    for (let n = 1000; n <= 9999; n += 1) {
      const candidate = String(n);
      if (!taken.has(candidate)) { taken.add(candidate); return candidate; }
    }
    return '0000';
  };

  let users = stored.map((user) => {
    if (user.pin && String(user.pin).length === PIN_LENGTH) return user;
    const match = byEmail.get(String(user.email).toLowerCase()) ?? byId.get(user.id);
    const inherited = match?.pin && !taken.has(String(match.pin)) ? String(match.pin) : null;
    if (inherited) taken.add(inherited);
    return { ...user, pin: inherited ?? freePin() };
  });

  // Roles that no longer exist would leave someone with no permissions at all.
  users = users.map((u) => (ROLES[u.role] ? u : { ...u, role: 'Sales Staff' }));

  if (!users.some((u) => u.role === 'Superadmin')) {
    const promote =
      users.find((u) => byEmail.get(String(u.email).toLowerCase())?.role === 'Superadmin') ??
      users.find((u) => u.role === 'Administrator') ??
      users[0];
    users = users.map((u) => (u === promote ? { ...u, role: 'Superadmin' } : u));
  }

  return users;
};
