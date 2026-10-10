# React Native iMessage Implementation Plan & Milestones

This document tracks the end-to-end implementation of the React Native client for the iMessage cross-platform chat platform, reusing the existing Express/MongoDB/Socket.IO backend.

---

## Progress Overview

| Milestone | Title | Status | Description |
|---|---|---|---|
| **Milestone 1** | Workspace Scaffolding & Base Client | **COMPLETED** | Expo SDK 52 CNG setup, Clerk auth, SecureStore tokenCache, Axios client, base navigation |
| **Milestone 2** | JIT Backend Fix & Contact Navigation | **COMPLETED** | Backend JIT sync fallback, webhook hardening, Contact list, Conversations list with unread badges, safe peer normalizer |
| **Milestone 3** | Realtime Engine & Core Chat Thread | **COMPLETED** | FlashList inverted message thread, Socket.IO live messages, optimistic send, swipe-to-reply, swipe-left timestamps, tapback reactions |
| **Milestone 4** | Enriched Media & Ephemeral View Once | **IN PROGRESS** | Voice note recording & waveform player with 1x/1.5x/2x speed, View Once photo capsule & viewer, Document sharing, ImageKit lightbox |
| **Milestone 5** | Themes, Customization & Search | Pending | 24 synced solid chat themes, pinned message carousel, in-chat search, global search modal, contact details drawer with 5 tabs |
| **Milestone 6** | Push Notifications & Low-End Profiling | Pending | Native FCM push with `expo-notifications`, system tray channels, notification click deep linking, memory (<120MB) & 60fps profiling |
| **Milestone 7** | CI/CD Pipeline & Standalone APK | Pending | GitHub Actions Android APK workflow (Java 17, Gradle `assembleRelease`), release keystore signing, downloadable artifact |

---

## Detailed Milestone Breakdown

### Milestone 1: Workspace Scaffolding & Base Client
- [x] Create `apps/mobile` (`@imessage/mobile`) using Expo SDK 52 with CNG (`app.json`).
- [x] Add `apps/mobile` to root `package.json` workspaces.
- [x] Configure `.npmrc` with `legacy-peer-deps=true` for React 18/19 monorepo compatibility.
- [x] Configure `apps/mobile/metro.config.js` with monorepo resolution and explicit `react` binding.
- [x] Configure `apps/mobile/tsconfig.json` with React 18 type isolation.
- [x] Implement `tokenCache.ts` using `expo-secure-store` for native Keychain/KeyStore persistence.
- [x] Set up `apiClient` Axios instance with dynamic Clerk JWT interceptor and emulator/device host fallback.
- [x] Create `useAuthStore.ts` Zustand store for user identity, online presence, and Socket.IO lifecycle.
- [x] Build `AuthScreen.tsx` with Clerk sign-in, sign-up, and email verification.
- [x] Build `RootNavigator.tsx` with Clerk auth gating and light/dark theme integration.
- [x] Verify: `npm run typecheck` and `npx expo export --platform android` succeed.

### Milestone 2: JIT Backend Fix & Contact Navigation
- [x] **Backend JIT Sync**: Update `services/api/src/middleware/auth.middleware.js` to synchronously fetch from `clerkClient.users.getUser(userId)` and upsert user in MongoDB if the webhook has not completed.
- [x] **Webhook Hardening**: Add safe fallbacks in `services/api/src/webhooks/clerk.webhook.js` so `fullName` and `email` can never be undefined or fail Mongoose schema validation.
- [x] **Safe Peer Normalizer**: Create `apps/mobile/src/utils/normalize.ts` ensuring peer profiles always have valid names, initials, subtitles, and online indicators.
- [x] **Error Boundary**: Implement `ErrorBoundary.tsx` preventing white/blank screens on uncaught component errors.
- [x] **Messages & Contacts API**: Build `apps/mobile/src/api/messages.ts` for `/messages/users` and `/messages/conversations`.
- [x] **Avatar Component**: Create `Avatar.tsx` with fallback initials and online halo dot.
- [x] **Conversation Row**: Create `ConversationRow.tsx` displaying peer avatar, name, last message preview, unread badge, timestamp, and mute icon.
- [x] **Contacts Screen**: Complete `ContactsScreen.tsx` with instant search filter, online status, and tap-to-chat.
- [x] **Conversations Screen**: Complete `ConversationsScreen.tsx` with pull-to-refresh, conversation list, and navigation to chat thread.
- [x] Verify: All 31 backend smoke tests pass, mobile typecheck passes, and mobile export builds cleanly.

### Milestone 3: Realtime Engine & Core Chat Thread
- [ ] Implement `MessageList.tsx` using `@shopify/flash-list` with inverted rendering and cell recycling.
- [ ] Connect Socket.IO events (`newMessage`, `messageDeleted`, `messageEdited`, `messageReactionUpdated`, `messagesSeen`).
- [ ] Implement `MessageBubble.tsx` with bubble styling matching active chat theme.
- [ ] Implement `ChatComposer.tsx` with multiline text input, send button, and draft persistence.
- [ ] Implement Swipe-to-reply gesture with quote preview bar in composer.
- [ ] Implement Swipe-left gesture to reveal right-hand message timestamps.
- [ ] Implement Tapback reaction picker (❤️ 👍 👎 😂 ‼️ ❓) with haptic feedback.
- [ ] Implement message edit and delete actions via long-press action menu.

### Milestone 4: Enriched Media & Ephemeral View Once
- [ ] Audio Voice Notes: `expo-av` recording to M4A, simulated 26-bar waveform player, and 1x/1.5x/2x playback speed toggle.
- [ ] View Once Ephemeral Photos: Pre-send circled ① toggle, unopened capsule bubble, burned "Opened" state, and fullscreen viewer.
- [ ] Document Sharing: `expo-document-picker` file upload, document bubble chip (name, size, MIME type), and download via `expo-file-system`.
- [ ] Fullscreen Lightbox: Zoomable image/video lightbox with pan and pinch gestures.

### Milestone 5: Themes, Customization & Search
- [ ] Chat Themes: Live-synced 24 solid color themes across Socket.IO.
- [ ] Pinned Messages Banner: Sticky carousel header under navigation bar with tap-to-scroll.
- [ ] In-Chat Search: Search bar highlighting matching messages with jump navigation.
- [ ] Global Search: Modal searching messages and contacts across all conversations.
- [ ] Contact Details Drawer: 5-tab drawer (Info, Media, Audio, Files, Starred).
- [ ] Offline Outbox: Queue failed messages in local storage with automatic reconnect retry.

### Milestone 6: Push Notifications & Low-End Profiling
- [ ] Configure `expo-notifications` for Android & iOS.
- [ ] Register native FCM tokens via `/api/device/register`.
- [ ] Handle notification receipt, system heads-up alert, and tap deep linking to conversation room.
- [ ] Profile memory usage on Android (budget: < 120MB RSS) and scroll performance (60 FPS on `@shopify/flash-list`).

### Milestone 7: CI/CD Pipeline & Standalone APK
- [ ] Create `.github/workflows/build-android-apk.yml`.
- [ ] Set up Java 17 Temurin, Android SDK, and Gradle cache.
- [ ] Run `npx expo prebuild --platform android --clean` in CI.
- [ ] Compile signed release APK using `./gradlew assembleRelease`.
- [ ] Upload APK as downloadable artifact and GitHub release.
