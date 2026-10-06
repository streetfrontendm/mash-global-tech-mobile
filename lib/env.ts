// Public configuration for the mobile app.
//
// Expo inlines every EXPO_PUBLIC_* variable into the JS bundle at build time.
// They are readable by anyone who downloads the app — exactly like
// NEXT_PUBLIC_* on the web — so the anon key is safe here: every query it
// makes is protected by Row-Level Security in the database.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Base URL of the deployed Next.js storefront, whose API this app reuses. */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://mash-global-tech.vercel.app"
).replace(/\/+$/, "");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Absolute URL for a site-relative asset (product photos live in `public/`). */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
