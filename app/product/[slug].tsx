import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PRODUCTS } from "@/data/products";
import { discountPercent, formatMoney } from "@/lib/money";
import type { Product } from "@/lib/types";
import { fetchProducts } from "~/lib/api";
import { ProductImage } from "~/components/ProductImage";
import { useCart } from "~/lib/cart";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const { add, count } = useCart();

  // No single-product endpoint, so the list call doubles as the lookup;
  // the bundled seed data keeps the screen usable offline.
  useEffect(() => {
    let active = true;
    fetchProducts()
      .then((list) => {
        if (active) setProduct(list.find((entry) => entry.slug === slug) ?? null);
      })
      .catch(() => {
        if (active) setProduct(PRODUCTS.find((entry) => entry.slug === slug) ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 48 }} color="#2563eb" size="large" />;
  }

  if (!product) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>That product could not be found.</Text>
      </View>
    );
  }

  const save = discountPercent(product.price_cents, product.compare_at_cents);
  const specs = Object.entries(product.specs);

  const onAdd = () => {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ProductImage product={product} />
        </View>

        <View style={styles.section}>
          <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
          <Text style={styles.title}>{product.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatMoney(product.price_cents, product.currency)}</Text>
            {product.compare_at_cents ? (
              <Text style={styles.compare}>
                {formatMoney(product.compare_at_cents, product.currency)}
              </Text>
            ) : null}
            {save ? <Text style={styles.save}>Save {save}%</Text> : null}
          </View>

          <Text style={styles.meta}>
            ★ {product.rating.toFixed(1)} · {product.reviews_count} reviews ·{" "}
            {product.condition} · {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </Text>

          <Text style={styles.summary}>{product.summary}</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {specs.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {specs.map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{key}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onAdd}
          disabled={product.stock <= 0}
          style={[styles.addButton, product.stock <= 0 && styles.addButtonDisabled]}
        >
          <Text style={styles.addButtonText}>
            {product.stock <= 0 ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push("/cart")} style={styles.cartLink}>
          <Text style={styles.cartLinkText}>View cart ({count})</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { paddingBottom: 24 },
  hero: { width: "100%", aspectRatio: 1, backgroundColor: "#e2e8f0" },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#162445", marginBottom: 4 },
  brand: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a", lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  price: { fontSize: 24, fontWeight: "900", color: "#162445" },
  compare: { fontSize: 15, color: "#94a3b8", textDecorationLine: "line-through" },
  save: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  meta: { fontSize: 13, color: "#64748b" },
  summary: { fontSize: 15, color: "#334155", marginTop: 8, lineHeight: 21 },
  description: { fontSize: 14, color: "#475569", lineHeight: 21, marginTop: 4 },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  specKey: { fontSize: 13, color: "#64748b", flexShrink: 0 },
  specValue: { fontSize: 13, color: "#0f172a", fontWeight: "600", textAlign: "right", flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonDisabled: { backgroundColor: "#94a3b8" },
  addButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  cartLink: { paddingVertical: 14, paddingHorizontal: 4 },
  cartLinkText: { color: "#2563eb", fontSize: 14, fontWeight: "700" },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  missingText: { color: "#64748b", fontSize: 15 },
});

