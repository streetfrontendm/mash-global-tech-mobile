# Mash Global Tech — mobile app (Expo / React Native)

The phone counterpart to the Next.js storefront in the repo root. Same Supabase
project, same API endpoints, same cart — change something on the web and it
shows up here within a second or two, and vice versa.

## How it fits together

```
mobile (Expo)  ── Bearer token ──┐
                                 ├──> /api/products, /api/cart/sync, /api/orders
web (Next.js)  ── cookie session ┘         (repo root, deployed on Vercel)
        │                                        │
        └──── Supabase Realtime on `carts` <─────┘   (push notification to pull)
```

- **Auth**: same Supabase project, Google OAuth via deep link (PKCE). The app
  sends the session's access token as `Authorization: Bearer …`; the server's
  `authenticateRequest()` accepts it exactly like the web cookie and returns the
  same RLS-scoped client.
- **Cart sync**: local edits are pushed to `POST /api/cart/sync` (debounced),
  remote changes are pulled from `GET /api/cart/sync` on Realtime events,
  polling (8 s) and app-foregrounding. Loop protection mirrors the web:
  a pull never clobbers an in-flight local edit, and adopted state is never
  echoed back.
- **Shared code** (imported from the repo root through `@/*` — no duplication):
  `lib/money.ts`, `lib/types.ts`, `lib/catalog.ts`, `lib/product-images.ts`,
  `data/products.ts` (offline fallback), `data/product-images.json`.
  Metro watches the repo root (see `metro.config.js`).

## Screens (expo-router)

| Route | Purpose |
| --- | --- |
| `/` | Catalogue: search, category/brand/condition chips, sort, 2-up grid |
| `/product/[slug]` | Detail: photos, price, specs, add to cart |
| `/cart` | Lines, quantities, shipping maths (shared `shippingFor`) |
| `/checkout` | Address form → `POST /api/orders` |
| `/orders` | Order history (pull to refresh) + post-purchase confirmation |
| `/signin` | Google sign-in (mirrors the web `SignInButton`) |

## Commands

```bash
npm install        # once
npm start          # Expo dev server (scan the QR with Expo Go)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npx expo export -p all --no-bytecode   # production bundle check
```

> `--no-bytecode`: this machine's Application Control policy blocks
> `hermesc.exe` (and `.node` natives), so Hermes bytecode generation fails
> locally. Bundling itself is fully verified; on CI/EAS, plain
> `npx expo export` (or a real build) will produce the bytecode normally.

## Environment (`mobile/.env`)

```
EXPO_PUBLIC_API_URL=https://mash-global-tech.vercel.app
EXPO_PUBLIC_SUPABASE_URL=…
EXPO_PUBLIC_SUPABASE_ANON_KEY=…
```

All `EXPO_PUBLIC_*` values are inlined into the bundle (public by design —
Row-Level Security does the protecting). Copy `.env.example` for a fresh setup.

## Supabase Auth URL configuration (required for sign-in)

Supabase → Authentication → URL Configuration → Redirect URLs, add:

- `https://mash-global-tech.vercel.app/**` (web)
- `exp://**` (development in Expo Go — the redirect is
  `exp://<host>:8081/--/auth-callback`; must be `**` because `*` does not
  cross `/` or `.`)
- `mgtmobile://**` (production build; the scheme comes from `app.json`)

## Notes / limitations

- Checkout is a demo flow: orders are created and the confirmation email is
  queued, but no real payment provider is attached (same as web).
- Offline: the catalogue falls back to the bundled seed data; cart works
  locally; checkout/sign-in need a connection.
- The condition filter ships in the chip row; the API also accepts `q`, `brand`,
  `category` and `sort` query params for anything else.
