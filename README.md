# 💬 iMessage Multi-Platform

A production-ready, full-stack, real-time messaging application designed with authentic Apple iOS aesthetics, featuring an installable Progressive Web App (PWA), React Native mobile client, marketing landing page, and a high-performance Express/Socket.io backend.

---

## 🏗️ Architecture

This repository is organized as an npm workspaces **monorepo**:

```
imessage/
├── apps/
│   ├── web/            # React PWA (Vite + Tailwind CSS + HeroUI + Zustand + Socket.io)
│   ├── mobile/         # React Native (Expo + Clerk + Socket.io)
│   └── landing/        # Marketing Landing Page (Vite + React)
├── services/
│   └── api/            # Backend API (Express + MongoDB + Socket.io + Web Push + FCM)
├── packages/
│   └── design-tokens/  # Shared color palette, gradients, and theme tokens
└── .github/workflows/
    └── release.yml     # Automated CI/CD for testing, builds, and semantic versioning
```

---

## ✨ Features

### 📸 Media Preview & Send Confirmation
- **Pre-Flight Media Preview:** Selecting or pasting an image, video, or audio file opens an Apple-styled preview sheet before anything is sent over the wire.
- **Accidental Send Prevention:** Explicit **"Send"** and **"Don't Send"** controls let you confirm or cancel anytime.
- **Optional Captions:** Add text captions directly with photos or videos in a single message.
- **Clipboard & Drag-and-Drop:** Seamlessly paste screenshots (`Ctrl+V` / `Cmd+V`) or drag media files into the composer.
- **Size Validation:** Automatic 25MB file size checking with immediate user feedback.

### ⚡ Real-Time Messaging & Presence
- **Socket.io Architecture:** Ultra-low latency message delivery, real-time typing indicators, read receipts (`seen`), and online/offline presence tracking.
- **Message Editing:** Edit sent messages within a 15-minute window with `(edited)` audit badges and instant live synchronization across clients.
- **Message Deletion:** Soft delete with clean placeholder state.
- **Replies & Quoting:** Swipe-to-reply or click-to-reply with inline quoted message previews and quick navigation.
- **Voice Messages:** Record voice notes directly in the browser with live pulsing waveform visualization, recording timer, discard control, and custom audio player.

### 🎨 Themes & Apple SF Pro Typography
- **3-Way Theme Switcher:** Seamlessly switch between **Light Mode**, **Dark Mode**, and **Liquid Glass Theme**.
- **Obsidian Liquid Glass:** Ultra-dark translucent glass design with multi-layer specular reflections, frosted backdrop blurs, and glassmorphic borders.
- **Instagram-Style Chat Themes:** Customize individual chats with synchronized accent palettes (Default Blue, Purple Twilight, Emerald, Sunset, Midnight, etc.) that update live for both conversation partners.
- **Authentic Apple SF Pro Typography:** Bundled offline WOFF2 webfonts (SF Pro Display & Text) with authentic subpixel anti-aliasing and letter-spacing across all operating systems.
- **Apple Emoji Rendering:** Native Apple-styled emoji rendering across messages, tapbacks, replies, theme pickers, and modals with responsive single-emoji sizing.

### 🔍 Search & Shared Media Drawer
- **In-Chat Message Search:** Dedicated search toolbar with forward/backward match navigation, match counts (`3 of 12`), and automatic scroll-to-highlight.
- **Contact Details Drawer:** Slide-over panel featuring:
  - **Contact Info & Nicknames:** View contact details and set private two-way custom nicknames.
  - **Shared Media Gallery:** Grid of all past photos and videos shared in the conversation.
  - **Shared Voice Notes:** Playable list of historical audio messages with timestamps.
  - **Shared Links:** Extracted clickable web URLs shared in the chat.
- **Fullscreen Lightbox:** Tap any photo or video for high-resolution inspection with zoom (up to 300%), pan, swipe gestures, download, and native sharing.

### 🔔 Notifications & PWA Mobile Experience
- **Dual-Engine Push Notifications:**
  - **Web Push (VAPID):** Real-time browser notifications for desktop and mobile PWAs.
  - **Firebase Cloud Messaging (FCM):** High-priority push notifications for mobile devices.
- **Heads-Up Banner Alerts:** Configured for maximum visibility even when the app is running in the background.
- **Privacy Mode:** Optional badge-only or sender-only notifications without sensitive preview text.
- **PWA Back-Button Interception:** Intercepts Android/iOS back-swipes and hardware back buttons to dismiss modals or navigate back to the conversations list instead of accidentally exiting the application.
- **Decluttered Mobile Layout:** Safe-area padding, mobile keyboard viewport tracking (`useVisualViewport`), and responsive headers that prevent nickname clipping.

---

## 🧪 Environment Variables

### Backend (`services/api/.env`)
```bash
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/imessage
FRONTEND_URL=http://localhost:5173

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# ImageKit Media Storage
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...

# Push Notifications (Web Push / VAPID)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com

# Push Notifications (Firebase Admin / FCM)
FIREBASE_SERVICE_ACCOUNT=base64_encoded_service_account_json
```

### Web Frontend (`apps/web/.env`)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Mobile App (`apps/mobile/.env`)
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚀 Local Development

### 1. Install Dependencies
From the monorepo root:
```bash
npm install
```

### 2. Run Database Seeding (Optional)
```bash
npm run db:seed -w services/api
```

### 3. Run Development Servers
In separate terminal tabs or using your preferred process manager:
```bash
# Start backend API (Port 3001)
npm run dev -w services/api

# Start Web PWA (Port 5173)
npm run dev -w apps/web

# Start Mobile Expo App (Optional)
cd apps/mobile && npx expo start

# Start Landing Page (Optional)
npm run dev -w apps/landing
```

### 4. Running Tests & Builds
```bash
# Run backend smoke tests (16 tests)
npm test -w services/api

# Build Web application
npm run build -w apps/web

# Build Landing page
npm run build -w apps/landing
```

---

## 🌐 Deployment (Render)

The Web client and API are deployed together on Render as a single web service:

1. **Repository:** Connect Render to your GitHub repository.
2. **Environment:** Node.js.
3. **Build Command:**
   ```bash
   cd services/api && npm install && npm run build && cd ../../apps/web && npm install --legacy-peer-deps && npm run build
   ```
4. **Start Command:**
   ```bash
   cd services/api && npm start
   ```
5. **Environment Variables:** Provide all backend variables and `VITE_CLERK_PUBLISHABLE_KEY` in the Render dashboard.

The static **Landing Page** can be deployed independently to Render, Vercel, or Cloudflare Pages:
- **Build Command:** `cd apps/landing && npm install && npm run build`
- **Publish Directory:** `apps/landing/dist`

---

## 🔄 Automated CI/CD & Releases

This repository uses [Release Please](https://github.com/googleapis/release-please) for automated semantic versioning, changelog generation, and GitHub release creation based on Conventional Commits (`feat:`, `fix:`, `perf:`, etc.).

On every push to `master`, the workflow:
1. Runs all API test suites with Vitest (`services/api/tests/smoke.test.js`).
2. Type-checks and builds the Web application and Landing page.
3. Compiles production assets and creates tagged GitHub releases.
4. Archives release artifacts (`web-dist.tar.gz`, `landing-dist.tar.gz`, `api-dist.tar.gz`).
