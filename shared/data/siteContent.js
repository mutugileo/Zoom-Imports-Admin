// Seed content for the admin's Site Content and Settings screens.

export const DEFAULT_CONTACT = {
  phone: '+254 700 000 000',
  whatsapp: '+254 700 000 000',
  email: 'hello@zoomimports.co.ke',
  location: 'Office SF07, K-Mall, Thindigua, Kiambu Road',
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
      'Yes. Our counter at K-Mall, Thindigua fits most parts while you wait, and we can recommend a trusted garage if the job is bigger.',
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
  /* No costs:view either. This role exists to get stock onto the site — post a
     vehicle, post a part, set fitment. What the yard paid for a unit is a
     buying position, and someone whose job is listing cars has no decision that
     depends on it. Matched by RLS: the cost and sales tables name only
     Superadmin and Administrator, so the figures are not merely hidden from
     this role's screens, they are unreachable from its session. */
  'Inventory Manager': {
    blurb: 'Vehicles, parts and fitment. No cost figures, orders or staff.',
    permissions: ['catalogue:write', 'catalogue:delete'],
  },
  /* No costs:view. Sales quote the selling price; a rep who can see the floor
     will eventually discount to it. */
  'Sales Staff': {
    blurb: 'Orders and enquiries. Reads the catalogue, cannot change it. No cost figures.',
    permissions: ['orders:write', 'enquiries:write'],
  },
};

export const ADMIN_ROLES = Object.keys(ROLES);

/**
 * Which nav entries a role may reach. Read by the layout and the router.
 *
 * `admin-buyers` is granted to exactly the three roles the `buyers` RLS policy
 * names — Superadmin, Administrator, Sales Staff. Inventory Manager is left off
 * deliberately: Postgres would return them an empty list, and a screen that
 * says "no buyers yet" to someone who is not allowed to see any is a worse
 * answer than not offering the screen at all.
 */
/* `admin-mobile` is Superadmin and Administrator only, on the same reasoning as
   `admin-buyers`: the app's garage tables carry customers' plates, chassis
   numbers, insurance and NTSA expiry dates and fuel spend. The RLS policies
   behind them admit any staff role, so this list is the narrower of the two —
   worth remembering if a role ever needs adding here. */
export const ROLE_VIEWS = {
  Superadmin: ['admin-dashboard', 'admin-vehicles', 'admin-consignments', 'admin-history', 'admin-groups', 'admin-parts', 'admin-compatibility', 'admin-orders', 'admin-buyers', 'admin-enquiries', 'admin-reviews', 'admin-mobile', 'admin-content', 'admin-settings'],
  Administrator: ['admin-dashboard', 'admin-vehicles', 'admin-consignments', 'admin-history', 'admin-groups', 'admin-parts', 'admin-compatibility', 'admin-orders', 'admin-buyers', 'admin-enquiries', 'admin-reviews', 'admin-mobile', 'admin-content', 'admin-settings'],
  'Inventory Manager': ['admin-dashboard', 'admin-vehicles', 'admin-consignments', 'admin-history', 'admin-groups', 'admin-parts', 'admin-compatibility', 'admin-settings'],
  'Sales Staff': ['admin-dashboard', 'admin-vehicles', 'admin-history', 'admin-parts', 'admin-orders', 'admin-buyers', 'admin-enquiries', 'admin-settings'],
};

export const hasPermission = (role, permission) =>
  Boolean(ROLES[role]?.permissions.includes(permission));

export const canSeeView = (role, view) =>
  Boolean(ROLE_VIEWS[role]?.includes(view));

/**
 * How many digits the PIN pad asks for.
 *
 * The seed accounts and PIN-matching helpers that used to sit beside this are
 * gone: the PIN is a real Supabase Auth credential now, checked server-side,
 * so there is nothing left to match locally and no demo credential worth
 * keeping in the repository.
 */
export const PIN_LENGTH = 4;

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

