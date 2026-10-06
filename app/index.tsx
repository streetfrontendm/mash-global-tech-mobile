import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PRODUCTS } from "@/data/products";
import {
  BRANDS,
  CATEGORIES,
  CONDITIONS,
  SORTS,
  filterProducts,
  type CatalogQuery,
} from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { fetchProducts } from "~/lib/api";
import { ProductCard } from "~/components/ProductCard";

interface Filters extends CatalogQuery {
  sort: string;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function CatalogueScreen() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("featured");

  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Server-side filtering via /api/products (the same code the web pages use);
  // debounced for typing, with the bundled seed data as the offline fallback.
  useEffect(() => {
    let active = true;
    const filters: Filters = { q, brand, category, condition, sort };

    const timer = setTimeout(() => {
      fetchProducts(filters)
        .then((list) => {
          if (!active) return;
          setProducts(list);
          setOffline(false);
        })
        .catch(() => {
          if (!active) return;
          setProducts(filterProducts(PRODUCTS, filters));
          setOffline(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, brand, category, condition, sort]);

  const cycleSort = () => {
    const index = SORTS.findIndex((entry) => entry.value === sort);
    setSort(SORTS[(index + 1) % SORTS.length].value);
  };

  const clearFilters = () => {
    setQ("");
    setBrand("");
    setCategory("");
    setCondition("");
    setSort("featured");
  };

  const sortLabel = SORTS.find((entry) => entry.value === sort)?.label ?? "Featured";

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search Apple, Samsung, Google…"
          placeholderTextColor="#94a3b8"
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <View style={styles.chipRow}>
          <Chip label={sortLabel} active={sort !== "featured"} onPress={cycleSort} />
          <Chip label="Clear" active={false} onPress={clearFilters} />
        </View>

        <FlatList
          horizontal
          data={[{ value: "", label: "All" }, ...CATEGORIES]}
          keyExtractor={(item) => `cat-${item.value}`}
          showsHorizontalScrollIndicator={false}
          style={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              active={category === item.value}
              onPress={() => setCategory(category === item.value ? "" : item.value)}
            />
          )}
        />

        <FlatList
          horizontal
          data={[
            { value: "", label: "All brands" },
            ...BRANDS.map((entry) => ({ value: entry as string, label: entry })),
          ]}
          keyExtractor={(item) => `brand-${item.value}`}
          showsHorizontalScrollIndicator={false}
          style={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              active={brand === item.value}
              onPress={() => setBrand(brand === item.value ? "" : item.value)}
            />
          )}
        />

        <FlatList
          horizontal
          data={[{ value: "", label: "Any condition" }, ...CONDITIONS]}
          keyExtractor={(item) => `cond-${item.value}`}
          showsHorizontalScrollIndicator={false}
          style={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              active={condition === item.value}
              onPress={() => setCondition(condition === item.value ? "" : item.value)}
            />
          )}
        />
      </View>

      {offline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline — showing the bundled catalogue. Cart and checkout need a connection.
          </Text>
        </View>
      ) : null}

      {loading && !products ? (
        <ActivityIndicator style={{ marginTop: 48 }} color="#2563eb" size="large" />
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? "Loading…" : "No products match those filters."}
            </Text>
          }
          ListFooterComponent={
            <Text style={styles.count}>{products ? `${products.length} products` : ""}</Text>
          }
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  toolbar: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  search: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chipList: { flexGrow: 0 },
  chip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  offlineBanner: { backgroundColor: "#fef3c7", padding: 8, marginTop: 8 },
  offlineText: { color: "#92400e", fontSize: 12, textAlign: "center" },
  listContent: { padding: 12, gap: 12 },
  row: { gap: 12 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40, fontSize: 15 },
  count: { textAlign: "center", color: "#94a3b8", fontSize: 12, paddingVertical: 16 },
});
