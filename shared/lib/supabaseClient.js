import { createClient } from '@supabase/supabase-js';

/**
 * Vite only exposes env vars prefixed VITE_ to client code — NEXT_PUBLIC_*
 * (the Next.js convention) is invisible here and would silently resolve to
 * undefined, so the names below are deliberately different from what the
 * Supabase dashboard's Next.js quickstart shows.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — check .env.local.'
  );
}

export const supabase = createClient(url, publishableKey);
