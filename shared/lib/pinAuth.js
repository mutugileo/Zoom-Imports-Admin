/**
 * The PIN *is* the real credential — checked server-side by Supabase Auth on
 * every sign-in, not a local convenience layer on top of a separate
 * password. Supabase enforces a 6-character minimum on passwords, and a PIN
 * is 4 digits by design (the counter-terminal UX this app is built around),
 * so this is a fixed, non-secret transform that pads the PIN into a valid
 * Supabase password. The prefix carries no security weight — it's constant
 * and effectively public, exactly like this file. The PIN's 4 digits remain
 * the only thing that's secret or varies per person, same as before.
 */
const PIN_PASSWORD_PREFIX = 'zm-pin-';

export const pinToPassword = (pin) => `${PIN_PASSWORD_PREFIX}${pin}`;
