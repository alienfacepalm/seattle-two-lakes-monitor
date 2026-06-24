# 2lakes.app Mobile PWA

Zero-backend PWA for Seattle lake buoy monitoring — packaged for Android/iOS app stores.

## Quick start

```bash
cd mobile
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173 — Vite proxies `/api/kc` to King County.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server (`127.0.0.1:5173`, strict port) |
| `pnpm dev:port:check` | Verify port 5173 is free before starting |
| `pnpm dev:port:free` | Stop processes listening on 5173 |
| `pnpm build` | Typecheck + production bundle → `dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm test:scripts` | Node tests for `scripts/dev-port.mjs` |
| `pnpm test:e2e` | Playwright route tests (starts its own Vite) |
| `pnpm test:pr` | test + scripts + build + lint (CI gate) |
| `pnpm deploy` | Build + Cloudflare Pages deploy |

## Architecture

- **No Express, no Firebase, no Cloud Run**
- King County via `/api/kc` edge proxy + NOAA/NWS direct
- History: **IndexedDB** on device (30-day retention)
- Deploy: **Cloudflare Pages** (free tier)

```
mobile/
├── src/app.tsx              Main app shell + routes
├── src/lib/buoy-api.ts       Client API (King County + NWS)
├── src/lib/history-store.ts  IndexedDB snapshots
├── functions/api/kc.ts      Cloudflare edge proxy (CORS)
├── public/sw.js             Offline app shell
└── store/packaging.md       Play Store / App Store steps
```

See [`docs/cors.md`](docs/cors.md) for the CORS gate decision.

## Deploy (Cloudflare Pages)

```bash
pnpm deploy
```

CI: [`.github/workflows/mobile-ci.yml`](../.github/workflows/mobile-ci.yml) runs `pnpm test:pr` and Playwright e2e on PRs; [`.github/workflows/deploy-mobile.yml`](../.github/workflows/deploy-mobile.yml) deploys on push to `main`.

Required GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

After deploy, follow [`store/packaging.md`](store/packaging.md) for PWABuilder / TWA / iOS wrapper.

## Env vars

| Variable | Purpose |
|----------|---------|
| `VITE_KC_PROXY_URL` | Override King County proxy (default: `/api/kc`) |

## Conventions

Matches [talemail](https://github.com/) / Projocalypse frontend prefs: **pnpm@11.5.0**, Node **>=22**, ESLint flat config, Vitest, Playwright e2e, `tsc -b` build, strict dev port 5173.

**Cursor:** `/full-review` runs end-to-end gap review + tests — see [`.cursor/README.md`](.cursor/README.md).

## Differences from root app (`/`)

| Feature | Root | Mobile |
|---------|------|--------|
| Backend | Express + Cloud Run | Edge proxy only |
| History | Firestore | IndexedDB (local) |
| Developer API | Yes | Removed |
| Package manager | npm | pnpm |
