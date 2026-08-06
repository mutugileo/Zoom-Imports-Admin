/**
 * Turns a Supabase/Postgres error into something a person at the counter can
 * act on.
 *
 * Raw driver errors are written for whoever wrote the schema, not whoever is
 * standing at the desk. Strings like
 *
 *   'duplicate key value violates unique constraint "vehicles_slug_key"'
 *   'new row violates row-level security policy for table "vehicles"'
 *
 * tell a salesperson nothing they can do anything about, and the second one
 * also names internal tables and policies to someone who may not be allowed
 * to know they exist. Everything below maps to what went wrong *for the user*
 * and, where there is one, the way out.
 *
 * The original is never dropped — it goes to the console (see `friendlyError`)
 * so a developer debugging a real failure still has it.
 */

/** Postgres SQLSTATEs we can say something specific about. */
const BY_CODE = {
  // Unique violation — resolved further by constraint name below.
  23505: () => 'Something with these details already exists.',
  /* Raised by the public-submission throttle. Says what to do next rather
     than what the database objected to — the person is not doing anything
     wrong, they have simply hit the hourly cap. */
  53400: () => 'You have submitted several listings already. Try again in an hour, or send them to us on WhatsApp.',
  // Foreign key violation.
  23503: () => 'That is still linked to another record, so it cannot be removed yet.',
  // Not-null violation.
  23502: () => 'A required field was left blank.',
  // Check constraint.
  23514: () => 'One of the values entered is not allowed.',
  // RLS denial. Deliberately says nothing about tables or policies.
  42501: () => 'You do not have permission to do that.',
  // PostgREST: row missing or invisible under RLS.
  PGRST116: () => 'That record no longer exists, or you do not have access to it.',
};

/**
 * Unique-constraint names, mapped to the field a person actually typed.
 * Matched on substring so a schema rename to `..._key1` still lands.
 */
const BY_CONSTRAINT = [
  ['vehicles_slug_key', 'Another vehicle already uses that web address (slug). Change the slug and save again.'],
  ['vehicles_stock_id_key', 'That stock ID is already issued to another vehicle.'],
  ['parts_sku_key', 'That stock code (SKU) is already used by another part.'],
  ['admin_profiles_pkey', 'That person already has an account.'],
  ['vehicle_groups_pkey', 'A group with that ID already exists.'],
  ['orders_pkey', 'An order with that reference already exists.'],
];

/** Auth and network failures arrive as messages, not codes. */
const BY_MESSAGE = [
  [/invalid login credentials/i, 'That PIN is not correct.'],
  [/email not confirmed/i, 'This account still needs to be confirmed from the link sent by email.'],
  [/password should be at least/i, 'That PIN is too short.'],
  [/user already registered/i, 'An account already exists for that email address.'],
  [/email rate limit exceeded/i, 'Too many invitations have been sent recently. Try again in a few minutes.'],
  [/over_email_send_rate_limit/i, 'Too many invitations have been sent recently. Try again in a few minutes.'],
  [/jwt expired|invalid token|refresh_token/i, 'Your session has expired. Sign in again to continue.'],
  [/failed to fetch|network|networkerror/i, 'Could not reach the server. Check the internet connection and try again.'],
  [/timeout|timed out/i, 'The server took too long to respond. Try again.'],
  [/payload too large|exceeded the maximum allowed size/i, 'That file is too large to upload.'],
  [/mime type|not supported/i, 'That file type is not supported.'],
  [/duplicate/i, 'Something with these details already exists.'],
];

/**
 * @param {object|null} error  A Supabase error ({ message, code, details }).
 * @param {string} fallback    What to say when nothing else matches — always
 *                             phrased as the action that failed, never as
 *                             "unknown error".
 */
export const friendlyError = (error, fallback = 'That did not save. Try again.') => {
  if (!error) return fallback;

  // Keep the real thing reachable for whoever has to fix it.
  if (typeof console !== 'undefined') console.error('[supabase]', error);

  const code = String(error.code ?? '');
  const raw = `${error.message ?? ''} ${error.details ?? ''}`;

  // A unique violation is far more useful once we know which constraint blew.
  if (code === '23505') {
    const hit = BY_CONSTRAINT.find(([name]) => raw.includes(name));
    if (hit) return hit[1];
  }

  if (BY_CODE[code]) return BY_CODE[code]();

  const byMessage = BY_MESSAGE.find(([pattern]) => pattern.test(raw));
  if (byMessage) return byMessage[1];

  return fallback;
};
