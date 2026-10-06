import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text } from "react-native";
import { CartSync } from "~/components/CartSync";
import { AuthProvider, useAuth } from "~/lib/auth";
import { CartProvider, useCart } from "~/lib/cart";

/** Runs the web/phone cart mirror, but only once auth state is known. */
function CartSyncGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <CartSync enabled={Boolean(user)} />;
}

/** Header buttons: "Orders"/"Sign in" plus the cart with a live count. */
function HeaderButtons() {
  const { user } = useAuth();

  return (
    <Pressable
      onPress={() => router.push(user ? "/orders" : "/signin")}
      hitSlop={8}
      style={{ marginRight: 14 }}
    >
      <Text style={styles.headerLink}>{user ? "Orders" : "Sign in"}</Text>
    </Pressable>
  );
}

function CartLinkButton() {
  const { count } = useCart();
  return (
    <Pressable onPress={() => router.push("/cart")} hitSlop={8} style={{ marginRight: 14 }}>
      <Text style={styles.headerLink}>Cart{count > 0 ? ` (${count})` : ""}</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <CartSyncGate />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: "#162445",
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: "#f8fafc" },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Mash Global Tech",
              headerRight: () => (
                <>
                  <HeaderButtons />
                  <CartLinkButton />
                </>
              ),
            }}
          />
          <Stack.Screen name="product/[slug]" options={{ title: "" }} />
          <Stack.Screen name="cart" options={{ title: "Your cart" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="orders" options={{ title: "Your orders" }} />
          <Stack.Screen name="signin" options={{ title: "Sign in" }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
});

