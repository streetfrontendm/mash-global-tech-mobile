import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { discountPercent, formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";
import { ProductImage } from "~/components/ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const save = discountPercent(product.price_cents, product.compare_at_cents);

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.slug}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <ProductImage product={product} />
        {save ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{save}%</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatMoney(product.price_cents, product.currency)}</Text>
          {product.compare_at_cents ? (
            <Text style={styles.compare}>
              {formatMoney(product.compare_at_cents, product.currency)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.meta}>
          ★ {product.rating.toFixed(1)} · {product.reviews_count} reviews
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pressed: { opacity: 0.85 },
  imageWrap: { width: "100%", aspectRatio: 1, backgroundColor: "#e2e8f0" },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#2563eb",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  body: { padding: 10, gap: 2 },
  brand: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: "#0f172a", fontSize: 13, fontWeight: "600", lineHeight: 17, minHeight: 34 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price: { color: "#162445", fontSize: 15, fontWeight: "800" },
  compare: { color: "#94a3b8", fontSize: 12, textDecorationLine: "line-through" },
  meta: { color: "#64748b", fontSize: 11 },
});
