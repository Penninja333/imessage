# Comprehensive PWA & Backend Audit Report

**Date:** October 12, 2026  
**Auditor:** Antigravity Engineering Review Team  
**Scope:** `apps/web` (Progressive Web Application), `services/api` (Backend & Web Push Services)

---

## 1. Executive Summary & Repo State

The iMessage codebase features a modern real-time messaging stack:
- **Frontend PWA (`apps/web`)**: Built on React 19, Tailwind CSS v4, HeroUI, Lucide Icons, and Zustand with persistent storage. Includes Service Worker caching (`sw.js` v10), PushManager integration, and Web Audio/MediaRecorder support.
- **Backend API (`services/api`)**: Node.js/Express with MongoDB/Mongoose, Socket.io for bidirectional communication, ImageKit for media storage, and Web Push (VAPID) / Firebase Admin FCM for background push notifications.

A prior implementation attempt established initial endpoints and components for shared wallpapers, web push, and voice notes. However, a deep skeptical audit uncovered multiple runtime bugs, edge-case regressions, and missing requirements across browser environments (especially Chromium, mobile Android, and WebKit/Safari).

---

## 2. Issues Discovered, Root Causes, and Applied Fixes

### Issue 1: Shared Conversation Wallpaper Leaking into Global Defaults & Unbound in `MessageList.jsx`
- **Symptom:** Setting a conversation wallpaper in one chat leaked that wallpaper to other chats that had no wallpaper set. Additionally, `MessageList.jsx` was not updated to react directly to conversation wallpaper changes from `useChatStore`.
- **Root Cause:** In `WallpaperContext.jsx`, `setWallpaperId` unconditionally invoked `setDefaultWallpaperIdState(id)`, persisting the specific conversation's wallpaper into `localStorage[chat-wallpaper-id]`. Furthermore, `MessageList.jsx` did not subscribe to `conversationWallpapers`.
- **Fix Applied:** 
  1. Updated `WallpaperContext.jsx` to scope `setDefaultWallpaperIdState(id)` strictly when no active conversation or partner is targeted.
  2. Updated `MessageList.jsx` to directly subscribe to `conversationWallpapers[activeConversationId]` with graceful fallback to `useWallpaper()` default presets.

### Issue 2: Chromium WebM Duration Infinity Seeking Recursion in `MessageAudio.jsx`
- **Symptom:** When loading voice notes recorded in Chrome/WebM format without container duration headers, setting `audio.currentTime = 1e10` triggered a `durationchange` event that re-executed `handleDuration` repeatedly without an exit flag. Also, setting `currentTime` before `readyState >= 2` could throw `InvalidStateError`.
- **Root Cause:** Absence of a guard ref (`hasProbedRef`) in `MessageAudio.jsx` allowed recursive seek events whenever Chromium attempted to determine the end of an infinite WebM stream.
- **Fix Applied:** Introduced `hasProbedRef` to restrict seek probing to at most once per audio `src`, wrapped `currentTime` seek commands in `try/catch`, and ensured probe timers and listeners are cleaned up deterministically.

### Issue 3: Safari Mobile Audio Recording MIME Type Fallback Bug in `ChatComposer.jsx`
- **Symptom:** In iOS Safari / WebKit browsers where `audio/webm` is unsupported, voice recordings failed to upload or play back because `recorder.mimeType` evaluated to an empty string upon stopping, falling back to `"audio/webm"`.
- **Root Cause:** `recorder.mimeType` on Safari is often `""` in `onstop`. The selected supported MIME type (e.g. `audio/mp4`) from `startRecording` was not stored in a component ref.
- **Fix Applied:** Added `recordingMimeTypeRef` in `ChatComposer.jsx`. It records the detected format from `MediaRecorder.isTypeSupported` (e.g. `audio/mp4;codecs=aac`) and provides the authoritative fallback during Blob construction in `recorder.onstop`.

### Issue 4: Backend Audio Extension Missing `.webm` in `message.controller.js`
- **Symptom:** Uploaded voice notes recorded as `.webm` could be mistakenly classified as video files (`videoUrl`) if the client MIME type was transmitted as `video/webm` or `application/octet-stream`.
- **Root Cause:** The regular expression checking audio filenames in `message.controller.js` was `/\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i`, missing `webm`.
- **Fix Applied:** Updated the regex to `/\.(mp3|wav|ogg|m4a|aac|opus|flac|webm)$/i`.

### Issue 5: Mobile Android `Notification` Constructor TypeError on Uncontrolled PWA in `notifications.js`
- **Symptom:** When a user reloads the PWA or opens it before the Service Worker claims the client (`navigator.serviceWorker.controller === null`), `showWebNotification` attempted `new Notification(...)`, which throws `TypeError: Illegal constructor` on Android Chrome and WebKit.
- **Root Cause:** Mobile Android Chrome does not permit window-level `new Notification()`; only `ServiceWorkerRegistration.showNotification()` is legal.
- **Fix Applied:** Updated `showWebNotification` to always check `'serviceWorker' in navigator` and resolve `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))`. Wrapped `new Notification()` fallback in `try/catch`.

### Issue 6: Premature Push Token Deletion on Non-Terminal HTTP Error Status Codes in `push.js`
- **Symptom:** If the push server experienced temporary authentication issues (401) or bad payload formats (400) when calling Web Push endpoints, valid client push subscriptions were permanently purged from the database.
- **Root Cause:** Status code check included `[400, 401, 403, 404, 410]`.
- **Fix Applied:** Refined cleanup to strictly `[404, 410]`, which are the only HTTP status codes specified by RFC 8030 as indicating that a push subscription has expired or unsubscribed.

### Issue 7: Quoted Message Preview Missing Sender Name in `useSelectedConversation.js`
- **Symptom:** In quoted reply previews inside `MessageBubble.jsx`, messages replied to the other participant always displayed `"Friend"` instead of the actual user's name or nickname.
- **Root Cause:** `getCachedMappedMessage` in `useSelectedConversation.js` omitted `senderName` from the mapped `replyTo` object.
- **Fix Applied:** Updated `getCachedMappedMessage` and `mappedMessages` memoization to compute `senderName: isReplyOwn ? "You" : (message.replyTo.senderName || partnerName || "Friend")`.

### Issue 8: Quoted Reply Navigation Failing on Non-Rendered Paginated Messages in `MessageBubble.jsx`
- **Symptom:** Clicking a quote referencing an older message outside the current viewport/page resulted in a toast warning with no option to view the message.
- **Root Cause:** `handleReplyQuoteClick` did not trigger message fetching when `#msg-${id}` was not found in the DOM.
- **Fix Applied:** Enhanced `handleReplyQuoteClick` to check `hasMoreMessages` and trigger `loadMoreMessages(activeId)`. Upon completion, it locates the newly rendered DOM node and smoothly scrolls to center with the pulse animation.

### Issue 9: Wallpaper ID Validation & System Message Text in `message.controller.js`
- **Symptom:** Setting `wallpaperId: null` generated system message `"Alice changed the chat wallpaper to Default 🖼️"`, and input IDs were unvalidated.
- **Root Cause:** Lack of string format / catalog validation and static text template.
- **Fix Applied:** Validated `wallpaperId` against catalog and alphanumeric IDs; generated polite reset text (`"Alice reset the chat wallpaper to Default 🖼️"`).

### Issue 10: Artifact Directory Placement Correction
- **Symptom:** The prior report was placed into an ephemeral directory (`.../brain/298ef36e-74f2-4141-afd5-30f0f7bc0eff/`) instead of the project directory specified in the task (`.../brain/90019017-c21e-4bcb-bd32-52181af902eb/`).
- **Fix Applied:** Placed comprehensive audit report directly into `/home/wind/.gemini/antigravity-cli/brain/b112c719-01dd-4b0c-8b5e-ef9a45327e2f/pwa-audit-report.md`, mirrored to `/home/wind/.gemini/antigravity-cli/brain/90019017-c21e-4bcb-bd32-52181af902eb/pwa-audit-report.md`, and committed to `PWA_AUDIT_REPORT.md`.

---

## 3. Verification Record

1. **Backend Automated Tests:**
   - Command: `npm test -w services/api`
   - Result: **34/34 tests passed** (100% pass rate).
2. **Web Automated Tests:**
   - Command: `npm test -w apps/web`
   - Result: **25/25 tests passed** (including voice messaging, wallpaper store management, socket listeners, and edge cases).
3. **Web Production Build & Staging:**
   - Command: `npm run build -w apps/web`
   - Result: Built in 536ms. Staged updated bundle (`index-BD3hAgPd.js`, `index-xXZDoohi.css`) to `services/api/public/` and removed stale chunks.
4. **Backend Build:**
   - Command: `npm run build -w services/api`
   - Result: Compiled clean `dist/`.

---

## 4. Recommendations & Edge Cases

1. **Production VAPID Keys**: Ensure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` environment variables are configured on hosting providers so external browser push services (FCM Web Push, Mozilla Push Service, Apple Push Service) can dispatch background notifications.
2. **Audio Chunk Size**: On low-end mobile hardware, `mediaRecorder.start(100)` provides smooth 100ms chunk streaming. If audio buffer pressure occurs, fallback to timeslice 250ms is well tolerated.
3. **PWA Standalone Mode**: On iOS Safari 16.4+, web push requires the user to "Add to Home Screen" first; our `InstallPwaBanner.jsx` and `PermissionsModal.jsx` guide users cleanly through this workflow.
