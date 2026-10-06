import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { formatMoney, shippingFor } from "@/lib/money";
import type { ShippingAddress } from "@/lib/types";
import { placeOrder } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  autoCapitalize?: "none" | "words" | "sentences";
}

function Field({ label, value, onChangeText, placeholder, required, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize={autoCapitalize ?? "sentences"}
        style={styles.input}
      />
    </View>
  );
}

export default function CheckoutScreen() {
  const { items, subtotalCents, clear, ready } = useCart();
  const { user, accessToken, loading } = useAuth();

  // Once the shopper edits the field we stop deriving it from the profile —
  // no effect needed to keep the two in step.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const meta = user?.user_metadata ?? {};
  const fullName = nameInput ?? ((meta.full_name as string) ?? (meta.name as string) ?? "");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Guests go to sign-in; an empty cart has nothing to check out.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/signin");
    else if (ready && items.length === 0) router.replace("/");
  }, [loading, user, ready, items.length]);

  const shipping = shippingFor(subtotalCents);
  const total = subtotalCents + shipping;

  const onSubmit = async () => {
    if (!accessToken) return;
    const address: ShippingAddress = { line1, line2, city, state, postalCode, country };
    setSubmitting(true);
    try {
      const order = await placeOrder(accessToken, { items, fullName, address });
      clear();
      router.replace(`/orders?placed=${order.id}`);
    } catch (cause) {
      Alert.alert(
        "Could not place order",
        cause instanceof Error ? cause.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Shipping details</Text>

      <Field label="Full name" value={fullName} onChangeText={setNameInput} required autoCapitalize="words" />
      <Field label="Address line 1" value={line1} onChangeText={setLine1} required autoCapitalize="words" />
      <Field label="Address line 2" value={line2} onChangeText={setLine2} placeholder="Apartment, suite…" autoCapitalize="words" />
      <Field label="City" value={city} onChangeText={setCity} required autoCapitalize="words" />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="State / region" value={state} onChangeText={setState} autoCapitalize="words" />
        </View>
        <View style={styles.half}>
          <Field label="Postal code" value={postalCode} onChangeText={setPostalCode} required autoCapitalize="none" />
        </View>
      </View>
      <Field label="Country" value={country} onChangeText={setCountry} required autoCapitalize="words" />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Items ({items.length})</Text>
          <Text style={styles.summaryValue}>{formatMoney(subtotalCents)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Shipping</Text>
          <Text style={styles.summaryValue}>{shipping === 0 ? "Free" : formatMoney(shipping)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalKey}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={submitting || items.length === 0}
        style={[styles.placeButton, (submitting || items.length === 0) && styles.placeButtonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.placeText}>Place order · {formatMoney(total)}</Text>
        )}
      </Pressable>

      <Text style={styles.note}>
        Payment is simulated in this demo — the order is created and a confirmation email is sent.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  heading: { fontSize: 18, fontWeight: "800", color: "#162445", marginBottom: 4 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
  required: { color: "#dc2626" },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  summary: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryKey: { fontSize: 14, color: "#64748b" },
  summaryValue: { fontSize: 14, color: "#0f172a", fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  totalKey: { fontSize: 16, fontWeight: "800", color: "#162445" },
  totalValue: { fontSize: 16, fontWeight: "900", color: "#162445" },
  placeButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  placeButtonDisabled: { backgroundColor: "#94a3b8" },
  placeText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  note: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 4, lineHeight: 17 },
});

