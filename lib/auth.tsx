import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "~/lib/supabase";
import { isSupabaseConfigured } from "~/lib/env";

// The OAuth flow opens in a browser tab; this hands control back to the app.
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** Bearer token for the storefront API; null while signed out. */
  accessToken: string | null;
  /** True until the persisted session has been read (avoid UI flicker). */
  loading: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // With Supabase unconfigured there is never a session to wait for, so
  // `loading` can start out false without touching state inside the effect.
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        // Corrupt/purged storage — treat as signed out.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) {
      return { ok: false, error: "Sign-in isn't configured yet. Check EXPO_PUBLIC_SUPABASE_* in .env." };
    }
    try {
      // exp://<host>:8081/--/auth-callback in Expo Go, mgtmobile://auth-callback
      // once built. Supabase → Auth → URL Configuration must allow-list the
      // redirect you're using.
      const redirectTo = Linking.createURL("auth-callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: { prompt: "select_account" } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data?.url) return { ok: false, error: "Sign-in could not be started." };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !("url" in result)) {
        return { ok: false, error: "Sign-in was cancelled." };
      }

      // PKCE: the browser redirected back with a one-time code.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) return { ok: false, error: exchangeError.message };
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Sign-in failed." };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut().catch(() => {
      // Best-effort: the local session is cleared either way.
    });
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      loading,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
