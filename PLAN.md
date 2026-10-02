# iMessage Multi-Platform Build Plan

**Status:** ALL MILESTONES COMPLETE (M1–M7)
**Last updated:** 2026-10-02
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
- All interactive elements bumped to `size-11` (44 px) touch targets.
- Favicon swapped to branded `logo.png`

### ✅ M3 — Landing page (complete)
- `apps/landing/` exists with Vite + React + full App.jsx (hero, feature grid, theme showcase, footer)
- `vite.config.js` configured with `base: '/'` and `outDir: 'dist'`
- Deploys as a static site via Render; artifacts added to GitHub Actions `release.yml`.

### ✅ M4 — Nicknames backend + frontend (complete)
- **Schema change:** Instagram-style shared nicknames (`{ forUserId, withUserId }`). Both users see their own setting independently.
- `getConversationsForSidebar` aggregation returns both `nickname` and `myNickname`.
- Web: `ChatHeader` inline nickname editor, `ConversationRow` nick badge, `useChatStore.setNickname()`

### ✅ M5 — React Native app (complete)
All source in `apps/mobile/src/`:
- `AuthScreen` → Google OAuth via `expo-web-browser`
- `ChatListScreen`, `ChatScreen` → Real API data, Socket.io, ImagePicker upload
- `NicknameModal`, `ThemePickerModal` → Bottom sheets, AsyncStorage persist
- `AppNavigator` → Socket reconnect and missed message hydration on `AppState` resume
- `app.json` → Added `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription`

### ✅ M6 — Push notifications (complete)
- **Backend:** `firebase-admin` integrated. `DeviceToken` model + `/api/devices/register` route.
- `sendMessage` triggers `sendPush()` (FCM/APNs) when receiver is offline (no active Socket.io connection).
- Reverts to dry-run mode (console.log) gracefully if `FIREBASE_SERVICE_ACCOUNT` env var is missing.
- **Mobile:** `expo-notifications` installed. Automatically requests permissions and registers push token after auth.

### ✅ M7 — GitHub Actions release workflow (complete)
- `.github/workflows/release.yml` — triggers on push to `master`
- Pipeline: `test-api` → `build-web` + `build-landing` + `build-api` → `release` (release-please) → `upload-artifacts`
- Artifacts: `web-dist.tar.gz`, `landing-dist.tar.gz`, and `api-dist.tar.gz` attached to GitHub Release.
- *(Note: EAS mobile build was intentionally omitted to avoid requiring signed APKs for releases).*

---

## C. Milestone status

| Milestone | Status |
|---|---|
| M1 Foundations | ✅ Done |
| M2 Responsive web | ✅ Done |
| M3 Landing page | ✅ Done |
| M4 Nicknames | ✅ Done |
| M5 React Native app | ✅ Done |
| M6 Push notifications | ✅ Done |
| M7 GitHub Actions | ✅ Done |
