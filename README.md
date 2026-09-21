# Tavola Platform Owner Console

Standalone dashboard for Tavola platform operators. The restaurant dashboard stays in the `Tavola` project (`/app`).

## Run

```bash
npm install
npm run dev
```

Opens at **http://localhost:5174/platform** (port 5174 so it does not collide with the restaurant app on 5173).

Sign-in: **http://localhost:5174/platform/login** — `POST /api/v1/platform-admin/login`.

If `npm install` fails for disk space, you can temporarily reuse the restaurant app's packages:

```bash
mklink /J node_modules D:\Tavola\node_modules
```

- Login is required by default. Set `VITE_PLATFORM_PREVIEW=true` only to browse UI chrome without a token.
- API: same backend as restaurant (`https://api.tavola.business` via Vite proxy `/api/v1`).
- Auth is **only** `POST /platform-admin/login` with Bearer `platformAdminAccessToken`. This app does **not** call restaurant `POST /auth/login` or `POST /auth/refresh`.
- Session identity comes from `GET /platform-admin/me` (`userId`, `platformAdminId`, live `role`). JWT `role` is PlatformAdmin / PlatformSupport — not `actorType`.
- Empty list search omits `q` rather than sending `q=`.
- Broadcast `202` is shown as **queued**, not delivered.
- Revenue / dashboard / audit date ranges are validated client-side to 366 days.
- Console pages map to `03 - Platform Owner` in `postman/TAVLA-API.postman_collection.json`. Subscriptions live at `/platform/subscriptions`.

## Layout

```
src/
  api/          # HTTP client (envelope + platform session, no restaurant refresh)
  platform/     # pages, layout, auth gates, /platform-admin client
  components/   # UI primitives + sidebar shell
  context/      # theme, locale, sidebar, toast, platform auth
```
