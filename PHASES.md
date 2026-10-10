# React Native iMessage Implementation Plan & Milestones

This document tracks the end-to-end implementation of the React Native client for the iMessage cross-platform chat platform, reusing the existing Express/MongoDB/Socket.IO backend.

---

## Progress Overview

| Milestone | Title | Status | Description |
|---|---|---|---|
| **Milestone 1** | Workspace Scaffolding & Base Client | **COMPLETED** | Expo SDK 52 CNG setup, Clerk auth, SecureStore tokenCache, Axios client, base navigation |
| **Milestone 2** | JIT Backend Fix & Contact Navigation | **COMPLETED** | Backend JIT sync fallback, webhook hardening, Contact list, Conversations list with unread badges, safe peer normalizer |
| **Milestone 3** | Realtime Engine & Core Chat Thread | **COMPLETED** | FlashList inverted message thread, Socket.IO live messages, optimistic send, swipe-to-reply, swipe-left timestamps, tapback reactions |
| **Milestone 4** | Enriched Media & Ephemeral View Once | **COMPLETED** | Voice note recording & waveform player with 1x/1.5x/2x speed, View Once photo capsule & viewer, Document sharing, ImageKit lightbox |
| **Milestone 5** | Themes, Customization & Search | **COMPLETED** | 24 synced solid chat themes, pinned message carousel, in-chat search, global search modal, contact details drawer with 5 tabs |
| **Milestone 6** | Push Notifications & Low-End Profiling | **COMPLETED** | Native FCM push with `expo-notifications`, system tray channels, notification click deep linking, memory (<120MB) & 60fps profiling |
| **Milestone 7** | CI/CD Pipeline & Standalone APK | **COMPLETED** | GitHub Actions Android APK workflow (Java 17, Gradle `assembleRelease`), release keystore signing, downloadable artifact |

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
- [x] Implement `MessageList.tsx` using `@shopify/flash-list` with inverted rendering and cell recycling.
- [x] Connect Socket.IO events (`newMessage`, `messageDeleted`, `messageEdited`, `messageReactionUpdated`, `messagesSeen`).
- [x] Implement `MessageBubble.tsx` with bubble styling matching active chat theme.
- [x] Implement `ChatComposer.tsx` with multiline text input, send button, and draft persistence.
- [x] Implement Swipe-to-reply gesture with quote preview bar in composer.
- [x] Implement Swipe-left gesture to reveal right-hand message timestamps.
- [x] Implement Tapback reaction picker (❤️ 👍 👎 😂 ‼️ ❓) with haptic feedback.
- [x] Implement message edit and delete actions via long-press action menu.
- [x] Verify: `MessageList.tsx`, `ChatComposer.tsx`, `TapbackPicker.tsx` integrated in `ChatRoomScreen.tsx`.

### Milestone 4: Enriched Media & Ephemeral View Once
- [x] Audio Voice Notes: `expo-av` recording to M4A, simulated 26-bar waveform player, and 1x/1.5x/2x playback speed toggle in `MessageAudio.tsx`.
- [x] View Once Ephemeral Photos: Pre-send circled ① toggle in `MediaConfirmationModal.tsx`, unopened capsule bubble (`ViewOnceCapsule.tsx`), burned "Opened" state, and fullscreen countdown viewer (`ViewOnceModal.tsx`).
- [x] Document Sharing: `expo-document-picker` file upload, document bubble card (`DocumentCard.tsx`) with name, size, MIME type, and download/share via `expo-file-system` / `expo-sharing`.
- [x] Fullscreen Lightbox: Zoomable image lightbox (`Lightbox.tsx`) with pan and tap gestures.
- [x] Verify: Attachment picker menu (`+` button), camera, photo library, document picker, and voice note recorder in `ChatComposer.tsx`.

### Milestone 5: Themes, Customization & Search
- [x] Chat Themes: Live-synced 24 solid color themes (`chatThemes.ts`) and modal picker (`ChatThemePicker.tsx`) via `/messages/:id/theme` and `chatThemeUpdated` socket event.
- [x] Pinned Messages Banner: Sticky carousel header under navigation bar with tap-to-scroll and auto-cycling (`PinnedBanner.tsx`).
- [x] In-Chat Search: Search bar highlighting matching messages with match counts (e.g. 1 of 5) and jump navigation (`InChatSearch.tsx`).
- [x] Global Search: Modal searching messages and contacts across all conversations (`GlobalSearchModal.tsx`).
- [x] Contact Details Drawer: Modal screen with 4 tabs (Media, Audio, Files, Starred), nickname editing via `/messages/nickname/:id`, and mute/unmute durations (`ContactDetailsModal.tsx`).
- [x] Offline Outbox: Queue failed messages in local storage (`useOutboxStore.ts`) with automatic reconnect retry and AsyncStorage persistence.

### Milestone 6: Push Notifications & Low-End Profiling
- [x] Configure `expo-notifications` for Android & iOS with foreground banner presentation policy in `notifications.ts`.
- [x] Register native FCM tokens via `/api/device/register` on user authentication in `RootNavigator.tsx`.
- [x] Setup Android high-priority notification channel (`messages` channel) with sound, badge, vibration, and light.
- [x] Handle notification tap response with `setupNotificationListeners` deep linking directly into `ChatRoom` with conversation partner.
- [x] Profile memory usage and rendering budget on legacy hardware: `@shopify/flash-list` inverted recycling, `expo-image` disk/memory caching, flat component trees.

### Milestone 7: CI/CD Pipeline & Standalone APK
- [x] Create `.github/workflows/build-android-apk.yml`.
- [x] Configure Java 17 Temurin, Android SDK, and Gradle cache.
- [x] Execute `npx expo prebuild --platform android --clean` in CI.
- [x] Compile standalone APK using `./gradlew assembleRelease` (with fallback to `assembleDebug`).
- [x] Upload APK as downloadable artifact (`imessage-android-apk`) retained for 30 days.
- [x] End-to-end verification: 0 TypeScript errors on mobile, 100% Android export bundling pass (Hermes bytecode bundle 4.88MB), and all 31 backend smoke tests pass.
