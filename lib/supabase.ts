import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "~/lib/env";

/**
 * Supabase client for React Native.
 *
 * - Sessions are persisted in AsyncStorage (the default browser storage does
 *   not exist here).
 * - PKCE flow: the OAuth round trip finishes in a browser tab and hands a
 *   one-time code back to the app through its deep link
 *   (`mgtmobile://auth-callback`, or `exp://…` while running in Expo Go).
 * - `null` when the project isn't configured, so every call site is forced to
 *   handle the "sign-in isn't set up yet" case explicitly.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;
