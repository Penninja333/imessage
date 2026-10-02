# iMessage Multi-Platform Build Plan

**Status:** M1–M5 + M7 complete · M3 partial · M6 not started  
**Last updated:** 2026-10-02 · commit `3b22272`  
**Live site:** https://imessage-fwxv.onrender.com/ · `/health` → `{"ok":true}`

---

## What's done

### ✅ M1 — Foundations (complete)
- Monorepo restructure: `apps/web/`, `apps/landing/`, `apps/mobile/`, `services/api/`, `packages/design-tokens/`
- `packages/design-tokens/` — `tokens.json` → `tokens.css` + `tokens.ts` via `build.mjs`
- Vitest smoke-test suite: **12/12 passing** (`services/api/tests/smoke.test.js`)
- Dockerfile updated to new paths. Render deploy green.

### ✅ M2 — Responsive web polish (complete)
- Tailwind 4 custom breakpoints: `sm:320px`, `md:768px`, `lg:1440px`
- All interactive elements bumped to `size-11` (44 px) touch targets: ChatHeader back/sound/close buttons, ThemeToggle, WallpaperPicker trigger, ThemePresetPicker trigger, ChatComposer send/media buttons
- `lg` sidebar breakpoint updated to 1440 px (`useSelectedConversation.js`)
- Favicon swapped from default Vite SVG to branded `logo.png`
- Web build: ✅ green (`apps/web/npm run build`)

### ✅ M3 — Landing page (scaffolded, needs Render deploy wiring)
- `apps/landing/` exists with Vite + React + full App.jsx (hero, feature grid, theme showcase, footer)
- **Remaining:** deploy as separate static service on Render; wire `RENDER_DEPLOY_HOOK` in `release.yml`; add `og:image` and proper `<meta>` tags.

### ✅ M4 — Nicknames backend + frontend (complete — semantics changed)
- **Schema change (confirmed by user):** Instagram-style shared nicknames. Each user sets their nickname for the other; both see their own setting.
  - Old schema: `{ setterId, targetId, nickname }` — private to setter only
  - **New schema:** `{ forUserId, withUserId, setByUserId, nickname }` — `forUserId` = who the nickname describes, `withUserId` = who can see it
- `getConversationsForSidebar` aggregation returns both `nickname` (what the peer called me) and `myNickname` (what I called the peer)
- Web: `ChatHeader` inline nickname editor, `ConversationRow` nick badge, `useChatStore.setNickname()`
- Smoke tests updated and passing

### ✅ M5 — React Native app (complete — no push yet)
All source in `apps/mobile/src/`:

| File | Status |
|---|---|
| `App.js` | ✅ ClerkProvider + SafeArea + ThemeProvider + NavigationContainer |
| `navigation/AppNavigator.js` | ✅ Clerk auth state → stack routing with loading screen |
| `screens/AuthScreen.js` | ✅ Dark hero, feature list, Google OAuth via `expo-web-browser` |
| `screens/ChatListScreen.js` | ✅ Chats/People tabs, search, avatar+online dot, nickname badge, ThemePickerModal |
| `screens/ChatScreen.js` | ✅ Live messages (Socket.io), ImagePicker upload, NicknameModal, per-accent bubbles, auto-scroll |
| `components/NicknameModal.js` | ✅ Bottom sheet, set/clear, 32-char limit |
| `components/ThemePickerModal.js` | ✅ Light/dark toggle + 8 accent presets, AsyncStorage persist |
| `context/ThemeContext.js` | ✅ theme + accent, AsyncStorage backed |
| `store/useAuthStore.js` | ✅ Clerk token → `/auth/check` → Socket.io connect; dynamic import avoids circular dep |
| `store/useChatStore.js` | ✅ Full feature parity with web store |
| `lib/axios.js` | ✅ Bearer token interceptor from `useAuthStore.sessionToken` |
| `hooks/useWarmUpBrowser.js` | ✅ Expo web browser warm-up |

**Known gaps to address in next session:**
- `expo-image-picker` permissions declaration in `app.json` (`NSPhotoLibraryUsageDescription` for iOS)
- Background/foreground socket reconnect + `?since=` REST hydration on resume (B.6 risk)
- `assets/icon.png` placeholder (app.json references it but file doesn't exist yet — add before EAS build)
- `AppEntry.js` entrypoint in `package.json` should switch to `App.js` if using bare Expo

### 🔴 M6 — Push notifications (not started)
**Blocked on Firebase credentials.** All design is documented in §A.5 below. The code can be written and tested in dry-run mode without credentials.

### ✅ M7 — GitHub Actions release workflow (complete)
- `.github/workflows/release.yml` — triggers on push to `master`
- Pipeline: `test-api` → `build-web` + `build-api` → `release` (release-please) → `upload-artifacts`
- EAS mobile build: conditional on `vars.EXPO_TOKEN_AVAILABLE == 'true'`
- Artifacts: `web-dist.tar.gz`, `api-dist.tar.gz` attached to GitHub Release
- **To activate releases:** add `VITE_CLERK_PUBLISHABLE_KEY` as a repo secret on GitHub

---

## Current schema

### User
```
clerkId (unique), email (unique), fullName, profilePic, timestamps
```

### Message
```
senderId (ref User), receiverId (ref User), text, image, video, timestamps
```

### Nickname ← updated schema
```js
{
  forUserId:   ObjectId (ref User),   // who the nickname describes
  withUserId:  ObjectId (ref User),   // who set + can see this nickname
  setByUserId: ObjectId (ref User),   // same as withUserId (for audit)
  nickname:    String (max 32)
}
// compound unique index: { forUserId, withUserId }
```

**Semantics:** User A sets a nickname for User B. Record: `{ forUserId: B, withUserId: A }`. Only A sees this nickname. B can set their own nickname for A with `{ forUserId: A, withUserId: B }`. Each sees only what they set.

---

## Current API surface

```
GET  /api/auth/check                     — returns authUser doc
GET  /api/messages/users                 — all users (with nickname field)
GET  /api/messages/conversations         — sidebar (nickname + myNickname fields)
GET  /api/messages/nicknames             — all nicknames where I am withUserId
GET  /api/messages/:id                   — message history
POST /api/messages/send/:id              — send text or media
PUT  /api/messages/nickname/:id          — set/clear my nickname for :id
POST /api/webhooks/clerk                 — user.created/updated/deleted sync
Socket.io: newMessage, getOnlineUsers
```

---

## A. Architecture decisions (unchanged from original)

### A.1 Mono-repo
One repo. `apps/`, `services/`, `packages/`. Docker builds `services/api` + `apps/web`. Render auto-deploys on push.

### A.2 Shared design tokens: `packages/design-tokens/`
- `tokens.json` → `tokens.css` (web/landing Tailwind `@theme`) + `tokens.ts` (mobile style constants)
- Build: `node packages/design-tokens/build.mjs`

### A.3 Clerk cross-platform
- Web: `VITE_CLERK_PUBLISHABLE_KEY`
- Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (same key value)
- Backend: `CLERK_SECRET_KEY` — `protectRoute` reads Bearer token from `Authorization` header, works for both web and mobile

### A.4 Nicknames — final design
Schema described above. Both users set independent nicknames. Each API call to `PUT /api/messages/nickname/:id` upserts `{ forUserId: :id, withUserId: me }`.

### A.5 Push notifications (M6 — not yet implemented)

Push runs in the existing Express service. Add `firebase-admin` as a backend dep.

**Backend changes needed:**
1. `services/api/src/models/deviceToken.model.js`
   ```js
   { userId, token, platform: "ios"|"android", appVersion, lastSeen }
   // unique index: { userId, token }
   ```
2. `POST /api/devices/register` (protected) — upserts token, updates `lastSeen`
3. `services/api/src/lib/push.js` — wraps `admin.messaging().sendMulticast()`
4. In `sendMessage` controller: after save, if receiver has no active socket → `DeviceToken.find({ userId: receiverId })` → push

**Mobile changes needed:**
1. `npm install expo-notifications` in `apps/mobile`
2. Permission request on first foreground after auth
3. Call `POST /api/devices/register` with the Expo push token
4. Handle `AppState` changes to reconnect socket on foreground + fetch missed messages

**Credentials required (provide to unlock M6):**
- Firebase project → Cloud Messaging → service account JSON (base64 as `FIREBASE_SERVICE_ACCOUNT` on Render)
- iOS push: Apple Developer account + `.p8` AuthKey uploaded to Firebase (optional, Android works without it)

### A.6 GitHub Actions
Workflow live. See `.github/workflows/release.yml`. Does NOT auto-deploy (Render handles that via its own webhook).

---

## B. Risks & blockers

| # | Risk | Status |
|---|---|---|
| 1 | APNs requires paid Apple Dev account | 🔴 Still blocked — iOS push unverifiable without it |
| 2 | FCM requires Firebase service account JSON | 🔴 Still blocked — push code not written yet |
| 3 | EAS signed builds require credentials | 🟡 Workflow ready; set `EXPO_TOKEN_AVAILABLE=true` + `EXPO_TOKEN` secret to activate |
| 4 | Zero test coverage | ✅ 12 smoke tests passing |
| 5 | Nickname privacy semantics | ✅ Resolved — shared/independent (Instagram-style) per user confirmation |
| 6 | Socket.io background/foreground on mobile | 🟡 Store wired, but `AppState` listener not yet added |
| 7 | HeroUI not available on mobile | ✅ Mitigated — RN primitives used throughout |

---

## C. Milestone status

| Milestone | Status | Commit |
|---|---|---|
| M1 Foundations | ✅ Done | `a7145fb` |
| M2 Responsive web | ✅ Done | `3b22272` |
| M3 Landing page | 🟡 Scaffolded — needs Render deploy | `a7145fb` |
| M4 Nicknames | ✅ Done (schema changed) | `3b22272` |
| M5 React Native app | ✅ Done (no push) | `3b22272` |
| M6 Push notifications | 🔴 Not started | — |
| M7 GitHub Actions | ✅ Done | `3b22272` |

---

## D. Verification checklist

| Deliverable | Verified |
|---|---|
| `npm test` (API, 12 tests) | ✅ Local |
| Web build `npm run build` | ✅ Local |
| API build `npm run build` | ✅ Local |
| Responsive web (320/768/1440) | 🟡 Code complete — Lighthouse on prod pending |
| Mobile app (Expo Go) | 🟡 Code complete — device test pending |
| Cross-platform message round-trip | 🟡 Pending device test |
| Nickname set/clear (web) | ✅ Local API tests |
| Nickname set/clear (mobile) | 🟡 Pending device test |
| GitHub Actions release | 🟡 Workflow present — first `feat:` push will trigger |
| Landing page | 🟡 Scaffolded — Render deploy pending |
| Push notifications | 🔴 Not started |

---

## E. Out of scope (v1 non-goals)

- E2EE — messages stored in plaintext
- Group chat — 1:1 only
- Voice/video
- Read receipts, typing indicators
- Message search, pin, archive
- Message edit/delete/recall
- In-app account deletion UX
- Billing/subscriptions
- Offline outbox (beyond `?since=` hydration on resume)
- Tablet-specific RN layouts (falls back to responsive web)
- i18n — English only
- Analytics/telemetry
- Admin dashboard

---

## Next session — prompt for the next agent

> **Context:** You are continuing work on a production-ready multi-platform chat app. The repo is at `/home/wind/Desktop/Sem_3/uncook/imessage`. All commands run from that directory. The live backend is at `https://imessage-fwxv.onrender.com`. Git branch is `master`.
>
> **Read `PLAN.md` first.** Then check `git log --oneline -5` to confirm you are on commit `3b22272`.
>
> **Your tasks for this session (in order):**
>
> **Task 1 — M5 mobile polish (no new installs needed):**
> - Add `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` to `apps/mobile/app.json` under `expo.ios.infoPlist`
> - Create `apps/mobile/assets/icon.png` — copy `apps/web/public/logo.png` there (EAS will fail without it)
> - Add `AppState` listener in `apps/mobile/src/navigation/AppNavigator.js`: on `active` → call `connectSocket()` + `getConversations()`; on `background`/`inactive` → call `disconnectSocket()`
> - Add `?since=` query support to `getMessages` in `useChatStore.js`: on foreground resume, call `getMessages(activeConversationId)` to fetch missed messages (the backend endpoint already accepts any query params and ignores them — the since filter can be a future enhancement; just re-fetch the full history for now)
>
> **Task 2 — M3 landing page Render deploy wiring:**
> - In `apps/landing/`, ensure `vite.config.js` has `base: '/'` and outputs to `dist/`
> - Add a `landing-dist` artifact step to `.github/workflows/release.yml` (same pattern as `web-dist`)
> - Add instructions to `README.md` for deploying `apps/landing/` as a Static Site on Render (Build command: `npm run build`, Publish directory: `dist`)
>
> **Task 3 — M6 push notifications (dry-run mode — no Firebase credentials yet):**
> - Create `services/api/src/models/deviceToken.model.js` with schema `{ userId, token, platform, appVersion, lastSeen }`
> - Create `services/api/src/lib/push.js` — if `process.env.FIREBASE_SERVICE_ACCOUNT` is set, init `firebase-admin` and send real pushes; otherwise log the payload to console (dry-run)
> - Create `POST /api/devices/register` route and controller (`services/api/src/controllers/device.controller.js`) — upsert token, update `lastSeen`
> - Wire push into `sendMessage` controller: after `newMessage.save()`, if no active socket for receiver, call `push.send()`
> - Add `npm install firebase-admin` to `services/api`
> - Add Vitest test: `POST /api/devices/register` returns 200 with a valid token body; dry-run push logs payload
> - In `apps/mobile`: `npm install expo-notifications --legacy-peer-deps`; add permission request + token registration call in `AppNavigator.js` after auth succeeds
>
> **Task 4 — README update:**
> - Update `README.md` to cover: monorepo structure, env vars for each app (web/mobile/api), how to run each app locally, how to deploy to Render, how GitHub Actions releases work, how to activate EAS mobile builds, branding/design token usage
>
> **When each task is done, run the full test suite (`cd services/api && npm test`) and the web build (`cd apps/web && npm run build`) to verify nothing is broken. Commit with a conventional commit message (`feat:` for new features, `fix:` for bugs, `chore:` for tooling) and push to `master`.**
>
> **Do not start M6 Firebase credential wiring until the user provides the `FIREBASE_SERVICE_ACCOUNT` JSON. Write the code in dry-run mode only.**
