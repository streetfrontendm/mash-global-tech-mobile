import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";

/**
 * Sign-in mirrors the web `SignInButton`: one Google button, same Supabase
 * project, same OAuth — the only difference is the redirect finishes in the
 * browser and returns through this app's deep link (PKCE, see lib/auth.tsx).
 */
export default function SignInScreen() {
  const { signInWithGoogle, loading, user } = useAuth();
  const { count } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    setBusy(false);
    if (result.ok) {
      router.back();
    } else {
      setError(result.error ?? "Sign-in failed.");
    }
  };

  if (!loading && user) {
    return (
      <View style={styles.signedIn}>
        <Text style={styles.title}>You’re signed in</Text>
        <Pressable onPress={() => router.replace("/orders")} style={styles.primaryButton}>
          <Text style={styles.primaryText}>View your orders</Text>
        </Pressable>
        <Pressable onPress={() => router.replace(count > 0 ? "/cart" : "/")} style={styles.linkButton}>
          <Text style={styles.linkText}>{count > 0 ? "Back to cart" : "Back to shopping"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>MASH GLOBAL TECH</Text>
      <Text style={styles.title}>Sign in to sync your cart</Text>
      <Text style={styles.body}>
        The same account works on the web and in this app — add something here and it shows up in
        your browser cart too, along with your order history.
      </Text>

      <Pressable
        onPress={onSignIn}
        disabled={busy}
        style={[styles.googleButton, busy && styles.buttonDisabled]}
      >
        <Text style={styles.googleText}>{busy ? "Opening browser…" : "Continue with Google"}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={() => router.back()} style={styles.linkButton}>
        <Text style={styles.linkText}>Not now — keep browsing</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 24,
    paddingTop: 48,
    gap: 12,
  },
  brand: { color: "#2563eb", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "900", color: "#162445", lineHeight: 30 },
  body: { fontSize: 15, color: "#475569", lineHeight: 22 },
  googleButton: {
    backgroundColor: "#162445",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  googleText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  error: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  linkButton: { alignItems: "center", paddingVertical: 12 },
  linkText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  signedIn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
