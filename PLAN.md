# iMessage Multi-Platform Build Plan

**Status:** Draft for review — not yet started
**Baseline verified:** 2026-10-02 — live site at https://imessage-fwxv.onrender.com/ is green. `/health` returns `{"ok":true}`, `/api/auth/check` returns proper 401 JSON, Clerk publishable key (`pk_test_…musical-dory-2604…`) is baked into the JS bundle, CORS origin matches, backend env vars are live. Push of `350f3fb` (title fix + Clerk wiring + PORT fallback + CORS slash fix) is rebuilding on Render now.

---

## Current state (what we're building on)

**Stack**
- Backend: Node 22 ESM, Express 5, Mongoose 9, Socket.io 4, Multer, `@clerk/express`, `@imagekit/nodejs`, cron.
- Frontend: Vite 8, React 19, Tailwind 4, `@heroui/react` 3, Zustand 5, React Router 7, `@clerk/react` 6, `socket.io-client`, axios, `react-hot-toast`, `lucide-react`.
- Infra: Monolith Docker image, single origin, Express serves the built SPA from `public/`. Deployed on Render.
- Auth: Clerk (publishable + secret + webhook signing secret). Webhook at `/api/webhooks/clerk` handles `user.created/updated/deleted`.

**Schema (today)**
- `User`: `clerkId` (unique), `email` (unique), `fullName`, `profilePic`, timestamps.
- `Message`: `senderId` (ref User), `receiverId` (ref User), `text`, `image`, `video`, timestamps.

**API surface (today)**
- `GET /api/auth/check` (protected)
- `GET /api/messages/users` (all users except me)
- `GET /api/messages/conversations` (aggregated recent chat partners)
- `GET /api/messages/:id` (message history with a user)
- `POST /api/messages/send/:id` (optional media upload via ImageKit)
- `POST /api/webhooks/clerk` (user sync)
- Socket.io events: `newMessage` (to receiver), `getOnlineUsers` (broadcast).

**What's missing:** tests, CI, mobile app, landing page, themes persistence, nicknames, push notifications.

---

## A. Architecture decisions

### A.1 Repo structure: mono-repo (recommended)

Keep one repo, restructure into:

```
imessage/
├── apps/
│   ├── web/            ← current frontend/ (Vite + React)
│   ├── landing/        ← new Vite + React static site
│   └── mobile/         ← new React Native (Expo) app
├── services/
│   └── api/            ← current backend/ (Express + Socket.io)
├── packages/
│   └── design-tokens/  ← single source of truth for colors/type/spacing
├── .github/workflows/
│   └── release.yml
├── Dockerfile          ← builds services/api + apps/web
└── render.yaml
```

**Why one repo:** shared design tokens, shared types, atomic releases, one CI workflow. The current repo is already a monolith Docker build; splitting into poly-repos would force coordinated multi-repo releases for a feature set that changes together.

**Why Expo for mobile:** Expo handles the FCM/APNs plugin wiring, over-the-air updates, and build submission (EAS) that would otherwise be weeks of native config. Bare React Native would require manual `firebase-messaging` + APNs setup per platform.

### A.2 Shared design tokens: `packages/design-tokens/`

Single source of truth consumed three ways:
- **Web + landing:** `tokens.css` → CSS custom properties imported by Tailwind 4's `@theme` block. Tailwind already in use; this just centralizes the palette.
- **Mobile:** `tokens.ts` → typed color/spacing exports consumed by a thin RN style abstraction.
- **Docs:** `tokens.json` → consumed by the README's branding section and any future Figma sync.

Format: one `tokens.json` (Style Dictionary-compatible) as the canonical source, with a tiny build script generating `tokens.css` and `tokens.ts`. This avoids three hand-maintained copies drifting.

### A.3 Clerk cross-platform

Clerk has separate SDKs: `@clerk/react` (web) and `@clerk/expo` (mobile). Both consume the **same publishable key** but from different env surfaces:
- **Web:** `VITE_CLERK_PUBLISHABLE_KEY` baked into the Vite build (already wired).
- **Mobile:** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/mobile/.env` (Expo's convention for client-side env). Same key value, different env var name.
- **Backend:** `CLERK_SECRET_KEY` for session verification (already set on Render).

The backend `protectRoute` middleware uses `getAuth(req)` from `@clerk/express` which validates the Clerk session token from the `Authorization` header. Mobile sends the same session token via axios `Authorization: Bearer <session-token>` — no backend change needed; the middleware is already token-agnostic.

### A.4 Schema evolution for themes + nicknames + push

**Add `User.settings` (embedded, no new collection):**
```js
settings: {
  theme: { type: String, enum: ["light", "dark", "midnight", "solar"], default: "light" },
  accentColor: { type: String, default: "#3B82F6" },
}
```
Themes sync to mobile via `GET /api/auth/check` (already returns the user doc). Mobile persists a local copy in AsyncStorage for offline-first rendering, then reconciles on check-in.

**New `Nickname` collection (private, per-setter):**
```js
const nicknameSchema = new Schema({
  setterId:   { type: ObjectId, ref: "User", required: true },
  targetId:   { type: ObjectId, ref: "User", required: true },
  nickname:   { type: String, required: true, trim: true, maxlength: 32 },
}, { timestamps: true });
// Compound unique index: one nickname per setter→target pair.
nicknameSchema.index({ setterId: 1, targetId: 1 }, { unique: true });
```
**Privacy semantics (Instagram-style):** Nicknames are visible ONLY to the setter. The target never sees what nickname was set for them. The setter's nickname for a target overrides the target's `fullName` in the setter's chat list and message header — but only in the setter's view. The target's own name remains their `fullName` in their own view.

API additions under `/api/messages` (protected):
- `PUT /api/messages/nickname/:userId` — set/update my nickname for `:userId`. Body: `{ nickname }`. Upserts the `Nickname` doc where `setterId = me, targetId = :userId`.
- `GET /api/messages/nicknames` — returns all nicknames I've set (for bulk hydration of the sidebar on mobile).

The `getConversationsForSidebar` aggregation gets a `$lookup` into `nicknames` filtered by `setterId = loggedInUserId` so each conversation row includes the optional `nickname` field. The mobile and web clients render `nickname ?? user.fullName`.

**New `DeviceToken` collection (for push):**
```js
const deviceTokenSchema = new Schema({
  userId:  { type: ObjectId, ref: "User", required: true },
  token:   { type: String, required: true },
  platform:{ type: String, enum: ["ios", "android"], required: true },
  appVersion: { type: String },
  lastSeen:{ type: Date, default: Date.now },
});
deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
```
API: `POST /api/devices/register` (protected) — body `{ token, platform, appVersion }`. Upserts. Called on app foreground and after push permission grant.

### A.5 Push notifications: where the FCM/APNs admin SDK runs

Push runs in the **existing Express service**, not a separate worker. Adds `firebase-admin` as a backend dependency. A `services/api/src/lib/push.js` module wraps `admin.messaging().sendMulticast()`.

**When to push:** In `sendMessage` controller, after `newMessage.save()`:
1. If the receiver has an active socket (`getReceiverSocketId(receiverId)` returns a value) → skip push (they're online; the socket delivers).
2. If no active socket → query `DeviceToken.find({ userId: receiverId })` and send an FCM multicast with payload `{ title: senderName, body: messagePreview, data: { senderId, messageId } }`.

FCM's multicast API natively routes to APNs for iOS tokens and FCM for Android tokens when the token is registered with the correct platform — one SDK call handles both. **No separate APNs code path needed.**

**Credentials:** `firebase-admin` needs a service account JSON. Stored as a Render env var `FIREBASE_SERVICE_ACCOUNT` (JSON string, base64-encoded to survive Render's env var parser). The backend loads it on boot: `admin.initializeApp({ credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString())) })`.

### A.6 GitHub Actions: release-only, not CD

The workflow **publishes a GitHub Release**, it does NOT deploy to Render. Render already auto-deploys on push to `master` via its own webhook. The Actions workflow:
- Triggers on push to `master`.
- Runs the web build (`apps/web`), the backend build (`services/api`), and (once mobile exists) the EAS build for iOS + Android.
- Computes the next version via `google-github-actions/release-please-action` (conventional-commits-driven) — no manual version bumping.
- Uploads build artifacts (web `dist/` tarball, backend `dist/` tarball, mobile `.ipa`/`.apk` if EAS is configured) to the GitHub Release.
- For mobile, EAS requires `EXPO_TOKEN` secret in the GitHub repo secrets; without it, the mobile build step is skipped with a clear log message rather than failing the workflow.

---

## B. Risks & unknowns (blockers — read these before committing)

1. **APNs blocker (iOS push).** Apple requires a paid Apple Developer account ($99/yr), an App Store Connect app ID with Push Notifications capability, and a `.p8` AuthKey uploaded to Firebase. None of this exists. **iOS push will be code-complete but unverifiable until you provide an Apple Developer account.** Android push (FCM) is verifiable with a free Firebase project + a real Android device.

2. **FCM blocker (Android push).** Requires a Firebase project + service account JSON. Free, but you have to create the project, enable Cloud Messaging, and hand me the service account JSON. **Until provided, push is code-complete with a mock sender that logs to console — verifiable only in dry-run mode.**

3. **Expo EAS build blocker (mobile artifacts in releases).** Free Expo account works for development builds, but producing signed `.ipa`/`.apk` for release requires EAS credentials (Apple App ID + provisioning for iOS, a keystore for Android). Without these, the Actions workflow will skip the mobile artifact upload and publish web + backend artifacts only.

4. **Zero test coverage.** The backend has no tests. A multi-platform refactor without tests is high-risk. **M1 (below) includes a minimum smoke-test suite** before any feature work. Coverage targets: auth route, message CRUD, webhook handler, socket broadcast. ~12-15 tests, Vitest.

5. **Nickname privacy semantics — must be confirmed.** The spec says "visible only to the person who set them." I've designed the schema and API to enforce this server-side. **Confirm:** does the target ever see a hint that a nickname exists (e.g., "X set a nickname for you")? My plan: **no** — the target gets zero signal. If you want a "you've been nicknamed" notification, that's a separate feature and out of scope for v1.

6. **Socket.io on mobile.** Mobile apps background/foreground constantly. The current socket model (connect on auth, disconnect on logout) will drop messages when the app backgrounds. Plan: socket connects on foreground, disconnects on background, and missed messages are fetched via REST on resume (`GET /api/messages/:id` with a `?since=` cursor). This is a behavioral change from the web version and must be documented.

7. **`@heroui/react` on mobile.** HeroUI is a web component library; it does not work in React Native. The mobile app will need to rebuild the UI with RN primitives + `@expo/vector-icons` (for `lucide-react` equivalents). Visual parity will be "same palette, same layout intent, native components." Pixel-perfect parity is not achievable and not a goal.

---

## C. Sequencing & milestones

### M1 — Foundations: tokens, tests, repo restructure
**Ships:** `packages/design-tokens/` with `tokens.json` + generated `tokens.css`/`tokens.ts`. Backend smoke tests (Vitest). Repo restructure into `apps/`, `services/`, `packages/`. Dockerfile updated to new paths. Render redeploy green.
**Verify:** `npm test` green in CI; live site still returns `{"ok":true}` after restructure; design tokens importable from both web and mobile.
**Blocks:** everything — no feature work until tokens are centralized and tests exist.

### M2 — Responsive web polish
**Ships:** Tailwind 4 breakpoints at 320/768/1440px. Audit of every page (`AuthPage`, `ChatPage`, sidebar, message list, input bar, settings sheet). No layout restructure — only container widths, font-size scaling, touch-target sizing (min 44px), and overflow fixes. Favicon updated from default Vite svg to a branded mark.
**Verify:** Lighthouse mobile pass on prod URL (target: Performance ≥ 85, Accessibility ≥ 95). Manual walkthrough at 320/768/1440 in Chrome DevTools device mode. No horizontal scroll at 320px.
**Blocks:** mobile (mobile needs the final web layout to mirror).

### M3 — Landing page
**Ships:** `apps/landing/` — Vite + React static site, deployed as a separate static service on Render (or as a route on the main service). Sections: hero with product screenshot, feature grid, theme showcase, platform download badges, footer. Pulls `design-tokens` for palette/type. Copy deck written.
**Verify:** Lighthouse ≥ 90 all categories. Responsive at 320/768/1440. No layout shift. CTA buttons link to the app URL and (once mobile ships) app store links.
**Blocks:** nothing — can parallelize with M4.

### M4 — Nicknames backend + frontend
**Ships:** `Nickname` model + index. Two new routes. `getConversationsForSidebar` aggregation updated with nickname `$lookup`. Web: nickname shown in sidebar + message header; editable via a long-press / context menu on the conversation. API tests for the privacy boundary (setter can read/write, target cannot read).
**Verify:** Vitest test that asserts `GET /api/messages/nicknames` returns only the caller's set nicknames. Manual: user A sets nickname for user B; user B's sidebar shows their own name, not A's nickname. Web + (later) mobile render `nickname ?? fullName`.
**Blocks:** mobile (mobile needs the nickname API to mirror).

### M5 — React Native app: scaffolding + feature port (no push yet)
**Ships:** `apps/mobile/` Expo project. Clerk auth via `@clerk/expo`. Chat list, conversation view, message send (text + image via ImageKit). Theme selector pulling from `design-tokens`. Local nickname editing. Socket.io with foreground/background handling. Offline message hydration via REST `?since=`.
**Verify:** App runs in Expo Go on iOS simulator + Android emulator. Can sign in with a Clerk test user, see the conversation list, send/receive a message in real time between web and mobile. Theme switch persists across app restarts (AsyncStorage + server sync).
**Blocks:** M6 (push needs a real device with a registered token).

### M6 — Push notifications
**Ships:** `firebase-admin` in backend. `DeviceToken` model + `/api/devices/register` route. Push logic in `sendMessage`. Mobile: `expo-notifications` for permission flow + token registration on foreground. FCM service account wired as `FIREBASE_SERVICE_ACCOUNT` Render env var.
**Verify (Android, if Firebase creds provided):** Real Android device receives a push when the app is backgrounded and a message is sent from web. **Verify (iOS, if Apple Dev creds provided):** Same on a real iOS device via TestFlight. **If no creds:** dry-run mode logs the FCM payload to console; a unit test asserts the push function builds the correct payload and calls `sendMulticast` with the right tokens.
**Blocks:** nothing downstream — push is the last feature.

### M7 — GitHub Actions release workflow
**Ships:** `.github/workflows/release.yml`. Uses `release-please` for versioning. Builds web + backend tarballs, uploads to the GitHub Release. Mobile artifact upload is conditional on `EXPO_TOKEN` being present in repo secrets. Changelog generated from conventional commits.
**Verify:** Push a `feat:` commit to `master`; confirm a draft Release appears on GitHub with artifacts attached. Push a `chore:` commit; confirm no version bump (release-please only bumps on `feat:`/`fix:`).
**Blocks:** nothing — this is the last deliverable and can be drafted in parallel with M5/M6.

---

## D. Verification approach (how we know each deliverable is done)

| Deliverable | How we verify it's working in production |
|---|---|
| Responsive web | Lighthouse on prod URL at 320/768/1440. Manual click-through of auth → chat → send message → receive message → switch theme. No horizontal scroll. Touch targets ≥ 44px. |
| Mobile app (no push) | EAS development build installs on iOS simulator + Android emulator. Sign in with Clerk test user. Cross-platform message round-trip (web sends → mobile receives, and vice versa). Theme + nickname persist across app restarts. |
| Push notifications (Android) | Real Android device, app backgrounded. Send a message from web. Device receives a system notification within ~5s. Tapping notification opens the conversation. |
| Push notifications (iOS) | Same as Android on a real iOS device via TestFlight. **Blocked on Apple Developer account.** |
| GitHub Actions release | A `feat:` push to `master` produces a GitHub Release with attached `web-dist.tar.gz` and `api-dist.tar.gz`. Release tag follows `vX.Y.Z`. Changelog populated. |
| Landing page | Lighthouse ≥ 90 on all categories. CTA links resolve. No layout shift on load. Responsive at all three breakpoints. Branded mark (favicon + og:image) present. |

---

## E. Out of scope — explicit non-goals for v1

These are **not** being built. If any of these are needed, they're a separate scoping conversation:

- End-to-end message encryption (E2EE). Messages are stored in plaintext in MongoDB, same as today.
- Group chat / multi-party conversations. v1 is 1:1 only, matching the current schema.
- Voice messages, voice calls, video calls.
- Read receipts / typing indicators. (The current app has neither; v1 keeps it that way.)
- Message search, pinned conversations, archived conversations.
- Message editing, deletion, or recall. Once sent, a message is immutable.
- Account deletion / data export UX (the Clerk webhook handles user deletion from Clerk's side, but there's no in-app "delete my account" button).
- Billing, subscriptions, or premium tiers.
- Offline-first message queueing on mobile beyond the `?since=` REST hydration (no outbox for messages composed offline).
- Tablet-specific layouts for the mobile app (the mobile app is phone-only; tablets fall back to the responsive web app).
- Internationalization / multi-language support. English only for v1.
- Analytics / product telemetry instrumentation.
- Admin dashboard or user-management UI.

---

## Next step after review

When you approve this plan, I'll start with **M1** (foundations: tokens, tests, repo restructure) since it blocks everything else. Confirm or adjust the non-goals in section E — that's where scope creep usually hides.
