// Typed client for the storefront's own API.
//
// The mobile app deliberately talks to the same Next.js endpoints the web app
// uses (`/api/products`, `/api/cart/sync`, `/api/orders`) instead of talking to
// Supabase directly — one place where validation, shipping maths and RLS-scoped
// queries happen, and identical behaviour on both platforms.
//
// Signed-in calls carry the Supabase session's access token as a Bearer
// header; the server's `authenticateRequest()` accepts that exactly like the
// web cookie session and returns the same user-scoped (RLS) client.

import type { CatalogQuery } from "@/lib/catalog";
import type { CartItem, Order, Product, ShippingAddress } from "@/lib/types";
import { API_URL } from "~/lib/env";

export interface ApiOptions {
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string | null;
}

export async function apiFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Reads the error message a route returns, falling back to a generic one. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error) return data.error;
  } catch {
    // Non-JSON body — use the fallback.
  }
  return fallback;
}

/** `GET /api/products` — the exact catalogue the web pages render. */
export async function fetchProducts(query: CatalogQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.brand) params.set("brand", query.brand);
  if (query.category) params.set("category", query.category);
  if (query.condition) params.set("condition", query.condition);
  if (query.sort) params.set("sort", query.sort);
  const qs = params.toString();

  const res = await apiFetch(`/api/products${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(await readError(res, "Could not load the catalogue."));
  const data = (await res.json()) as { products?: Product[] };
  return Array.isArray(data.products) ? data.products : [];
}

/** `GET /api/cart/sync` — the signed-in user's server-side cart. */
export async function fetchServerCart(
  accessToken: string,
): Promise<{ items: CartItem[]; updatedAt: string | null }> {
  const res = await apiFetch("/api/cart/sync", { accessToken });
  if (!res.ok) throw new Error(await readError(res, "Could not load your cart."));
  const data = (await res.json()) as { items?: unknown; updated_at?: string | null };
  const items = Array.isArray(data.items) ? (data.items as CartItem[]) : [];
  return { items, updatedAt: data.updated_at ?? null };
}

/** `POST /api/cart/sync` — mirrors the local cart to the server. */
export async function pushServerCart(
  accessToken: string,
  items: CartItem[],
): Promise<void> {
  const res = await apiFetch("/api/cart/sync", {
    method: "POST",
    body: { items, currency: "USD" },
    accessToken,
  });
  if (!res.ok) throw new Error(await readError(res, "Could not save your cart."));
}

/** `GET /api/orders` — the signed-in user's orders, newest first. */
export async function fetchOrders(accessToken: string): Promise<Order[]> {
  const res = await apiFetch("/api/orders", { accessToken });
  if (!res.ok) throw new Error(await readError(res, "Could not load your orders."));
  const data = (await res.json()) as { orders?: Order[] };
  return Array.isArray(data.orders) ? data.orders : [];
}

export interface PlaceOrderInput {
  items: CartItem[];
  fullName: string;
  address: ShippingAddress;
}

/** `POST /api/orders` — server re-prices from the database and creates it. */
export async function placeOrder(
  accessToken: string,
  input: PlaceOrderInput,
): Promise<Order> {
  const res = await apiFetch("/api/orders", {
    method: "POST",
    body: input,
    accessToken,
  });
  if (!res.ok) throw new Error(await readError(res, "Could not place your order."));
  const data = (await res.json()) as { order?: Order };
  if (!data.order) throw new Error("Could not place your order.");
  return data.order;
}
