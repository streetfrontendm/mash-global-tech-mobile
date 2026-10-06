import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";
import { fetchOrders } from "~/lib/api";
import { useAuth } from "~/lib/auth";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function OrdersScreen() {
  const { placed } = useLocalSearchParams<{ placed?: string }>();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }
    if (!accessToken) return;

    // State updates happen after the await, never synchronously in the effect.
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchOrders(accessToken);
        if (!cancelled) {
          setOrders(list);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load your orders.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, accessToken]);

  // Pull-to-refresh (event handler, so state updates are fine).
  const onRefresh = () => {
    if (!accessToken || refreshing) return;
    setRefreshing(true);
    fetchOrders(accessToken)
      .then((list) => {
        setOrders(list);
        setError(null);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Could not load your orders.");
      })
      .finally(() => setRefreshing(false));
  };

  if (authLoading || (!orders && !error)) {
    return <ActivityIndicator style={{ marginTop: 48 }} color="#2563eb" size="large" />;
  }

  return (
    <View style={styles.screen}>
      {placed ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>
            Order placed! A confirmation email is on its way.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                When you place an order it will show up here, on the web, everywhere.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
            </View>

            <View style={styles.badges}>
              <Text style={styles.badge}>{item.status}</Text>
              <Text style={styles.badgeMuted}>{item.payment_status}</Text>
            </View>

            {(item.order_items ?? []).map((line) => (
              <Text key={`${item.id}-${line.slug}`} style={styles.line} numberOfLines={1}>
                {line.quantity} × {line.title}
              </Text>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(item.total_cents, item.currency)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  successBanner: { backgroundColor: "#dcfce7", padding: 10 },
  successText: { color: "#166534", fontSize: 13, fontWeight: "600", textAlign: "center" },
  errorBox: { backgroundColor: "#fee2e2", padding: 10 },
  errorText: { color: "#991b1b", fontSize: 13, textAlign: "center" },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 64, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#162445" },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center", paddingHorizontal: 24 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 15, fontWeight: "900", color: "#162445" },
  orderDate: { fontSize: 13, color: "#64748b" },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  line: { fontSize: 13, color: "#475569" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    marginTop: 2,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#162445" },
  totalValue: { fontSize: 14, fontWeight: "900", color: "#162445" },
});

