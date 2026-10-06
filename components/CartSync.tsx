// Two-way cart sync for signed-in customers — the mobile twin of the web
// `components/CartSync.tsx`, so both apps stay in step through the same
// `/api/cart/sync` endpoint.
//
// Push: local changes are mirrored up (debounced 1.5s, skipped when unchanged).
// Pull: changes made elsewhere (web tab, another phone) come back via GET,
// triggered by Supabase Realtime on the `carts` table plus polling (8s) and an
// AppState listener for when the app returns to the foreground.
//
// Loop protection mirrors the web exactly: a pull only adopts the server copy
// when no local push is pending, and the adopted signature is recorded as
// "already saved" first so it is never echoed straight back to the server.

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { CartItem } from "@/lib/types";
import { fetchServerCart, pushServerCart } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";
import { supabase } from "~/lib/supabase";

const PUSH_DEBOUNCE_MS = 1500;
const POLL_MS = 8000;
const EMPTY_SIGNATURE = "[]";

function signatureOf(items: CartItem[]): string {
  return JSON.stringify(items.map((item) => [item.slug, item.quantity]));
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.price_cents === "number" &&
    typeof item.quantity === "number"
  );
}

export function CartSync({ enabled }: { enabled: boolean }) {
  const { items, ready, applyRemote } = useCart();
  const { accessToken } = useAuth();

  const itemsRef = useRef(items);
  const pushedSignature = useRef<string | null>(null);
  const pendingPush = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(accessToken);
  /**
   * True until the first GET has settled. Pushes are held back until then so a
   * fresh device with an empty cart ADOPTS the server cart instead of racing it
   * with an empty POST that would wipe it — same gate as the web CartSync.
   */
  const [syncReady, setSyncReady] = useState(false);

  // Refs are refreshed in an effect (never during render) so the pull loop can
  // always read the latest values without re-subscribing.
  useEffect(() => {
    itemsRef.current = items;
    tokenRef.current = accessToken;
  }, [items, accessToken]);

  // ---------------------------------------------------------------- push ----
  useEffect(() => {
    if (!enabled || !ready || !accessToken) return;

    const signature = signatureOf(items);

    // Before the first pull settles there is nothing sensible to push yet:
    // the local cart may be exactly what the server already holds (or vice
    // versa) — `adopt` decides who wins once it has seen the server copy.
    if (!syncReady) return;

    if (signature === pushedSignature.current) {
      pendingPush.current = null;
      return;
    }
    pushedSignature.current = signature;
    pendingPush.current = signature;

    const timer = setTimeout(() => {
      pushServerCart(accessToken, items)
        .catch(() => {
          // Best-effort: the shopper never sees sync failures.
        })
        .finally(() => {
          if (pendingPush.current === signature) pendingPush.current = null;
        });
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [items, ready, enabled, accessToken, syncReady]);

  // ---------------------------------------------------------------- pull ----
  useEffect(() => {
    if (!enabled || !ready || !accessToken) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let isFirstPull = true;

    const adopt = (payload: { items?: unknown }, initial: boolean) => {
      if (cancelled) return;
      const remote = Array.isArray(payload.items)
        ? payload.items.filter(isCartItem)
        : null;
      if (!remote) return;
      if (initial && signatureOf(itemsRef.current) !== EMPTY_SIGNATURE) {
        // Device already has a cart (e.g. a guest cart) — the local one wins
        // and is pushed up as soon as this first pull settles.
        return;
      }
      const remoteSignature = signatureOf(remote);
      if (remoteSignature === signatureOf(itemsRef.current)) return; // in sync
      if (pendingPush.current !== null) return; // local edit waiting — keep it
      pushedSignature.current = remoteSignature; // adopt without echoing back
      applyRemote(remote);
    };

    const pull = async () => {
      const token = tokenRef.current;
      if (!token || cancelled) return;
      const initial = isFirstPull;
      isFirstPull = false;
      try {
        const { items: remote } = await fetchServerCart(token);
        adopt({ items: remote }, initial);
      } catch {
        // Offline / transient — the local cart keeps working.
      } finally {
        if (initial && !cancelled) setSyncReady(true); // release the push gate
      }
    };

    void pull();
    const interval = setInterval(() => void pull(), POLL_MS);

    const appStateSub = AppState.addEventListener("change", (status) => {
      if (status === "active") void pull();
    });

    // Realtime nudge: "your row changed, come GET it". Accelerator only —
    // polling covers the case where the publication isn't set up yet.
    if (supabase) {
      supabase.auth
        .getUser()
        .then(({ data: { user } }) => {
          if (!user || cancelled || !supabase) return;
          channel = supabase
            .channel(`cart-sync-mobile:${user.id}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "carts", filter: `user_id=eq.${user.id}` },
              () => void pull(),
            )
            .subscribe();
        })
        .catch(() => {
          // Realtime is best-effort; polling already runs.
        });
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSub.remove();
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [enabled, ready, accessToken, applyRemote]);

  return null;
}
