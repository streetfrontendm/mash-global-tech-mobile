import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PRODUCTS } from "@/data/products";
import { FREE_SHIPPING_THRESHOLD_CENTS, formatMoney, shippingFor } from "@/lib/money";
import type { Product } from "@/lib/types";
import { useAuth } from "~/lib/auth";
import { useCart } from "~/lib/cart";
import { ProductImage } from "~/components/ProductImage";

/** Stand-in details when a server cart line has no photo/title extras. */
function fallbackProduct(slug: string) {
  return PRODUCTS.find((entry) => entry.slug === slug) ?? null;
}

function QuantityButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.qtyButton} hitSlop={4}>
      <Text style={styles.qtyButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function CartScreen() {
  const { items, subtotalCents, setQuantity, remove, ready } = useCart();
  const { user, loading } = useAuth();

  const shipping = shippingFor(subtotalCents);
  const total = subtotalCents + shipping;
  const toFree = FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents;

  if (ready && items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Browse the catalogue and add something you love.</Text>
        <Pressable onPress={() => router.replace("/")} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Shop gadgets</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => {
          const fallback = fallbackProduct(item.slug);
          // ProductImage only needs the handful of fields it renders.
          const imageProduct: Product = {
            id: item.slug,
            slug: item.slug,
            title: item.title,
            brand: fallback?.brand ?? "Apple",
            category: fallback?.category ?? "phone",
            condition: "new",
            price_cents: item.price_cents,
            currency: "USD",
            stock: 99,
            rating: 0,
            reviews_count: 0,
            accent: item.accent,
            image_url: item.image_url ?? fallback?.image_url ?? null,
            summary: "",
            description: "",
            specs: {},
          };

          return (
            <View key={item.slug} style={styles.line}>
              <View style={styles.lineImage}>
                <ProductImage product={imageProduct} />
              </View>

              <View style={styles.lineBody}>
                <Text style={styles.lineTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.linePrice}>
                  {formatMoney(item.price_cents * item.quantity)}
                </Text>

                <View style={styles.lineControls}>
                  <View style={styles.qtyGroup}>
                    <QuantityButton
                      label="−"
                      onPress={() => setQuantity(item.slug, item.quantity - 1)}
                    />
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <QuantityButton
                      label="+"
                      onPress={() => setQuantity(item.slug, item.quantity + 1)}
                    />
                  </View>
                  <Pressable onPress={() => remove(item.slug)} hitSlop={6}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatMoney(subtotalCents)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {shipping === 0 ? "Free" : formatMoney(shipping)}
            </Text>
          </View>
          {toFree > 0 ? (
            <Text style={styles.freeHint}>
              Add {formatMoney(toFree)} more for free shipping.
            </Text>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalKey}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push(user || loading ? "/checkout" : "/signin")}
          style={styles.checkoutButton}
        >
          <Text style={styles.checkoutText}>{user ? "Checkout" : "Sign in to check out"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  line: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  lineImage: {
    width: 84,
    height: 84,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  lineBody: { flex: 1, gap: 4 },
  lineTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  linePrice: { fontSize: 15, fontWeight: "800", color: "#162445" },
  lineControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  qtyGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  qtyButtonText: { fontSize: 16, fontWeight: "700", color: "#162445", lineHeight: 18 },
  qty: { fontSize: 14, fontWeight: "700", color: "#0f172a", minWidth: 20, textAlign: "center" },
  remove: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  summary: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryKey: { fontSize: 14, color: "#64748b" },
  summaryValue: { fontSize: 14, color: "#0f172a", fontWeight: "600" },
  freeHint: { fontSize: 12, color: "#16a34a" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  totalKey: { fontSize: 16, fontWeight: "800", color: "#162445" },
  totalValue: { fontSize: 16, fontWeight: "900", color: "#162445" },
  footer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  checkoutButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#162445" },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center" },
  emptyButton: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});

