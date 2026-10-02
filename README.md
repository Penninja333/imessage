# 💬 iMessage Multi-Platform

A production-ready, full-stack, real-time chat application extending across web, mobile (React Native), and a landing page, powered by a unified API.

---

## 🏗️ Architecture

This repository is structured as a **monorepo**:

```
imessage/
├── apps/
│   ├── web/            # React SPA (Vite + Tailwind + Zustand + Socket.io)
│   ├── mobile/         # React Native (Expo + Clerk + Socket.io)
│   └── landing/        # Landing page (Vite + React)
├── services/
│   └── api/            # Backend (Express + MongoDB + Socket.io + Firebase Push)
├── packages/
│   └── design-tokens/  # Shared color palette/themes across web and mobile
└── .github/workflows/
    └── release.yml     # Automated CI/CD for versioning and artifacts
```

## ✨ Features

- **Cross-Platform:** Full feature parity between Web and iOS/Android.
- **Real-Time:** Socket.io for instant messaging and online presence tracking.
- **Push Notifications:** Firebase Cloud Messaging (FCM) and APNs for offline message delivery.
- **Shared Nicknames:** Instagram-style private nicknames for contacts.
- **Themes:** Light/dark modes with 8 accent colors synced across devices.
- **Auth:** Clerk identity provider across all apps.
- **Media:** Image and video sharing via ImageKit.

---

## 🧪 Environment Variables

### Backend (`services/api/.env`)
```bash
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb+srv://...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...
FRONTEND_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT=base64_encoded_json_string  # For Push Notifications
```

### Web (`apps/web/.env`)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Mobile (`apps/mobile/.env`)
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚀 Local Development

1. **Install dependencies:** Run `npm install` in `services/api`, `apps/web`, `apps/mobile`, and `apps/landing`.
2. **Start the API:** `cd services/api && npm run dev`
3. **Start the Web app:** `cd apps/web && npm run dev`
4. **Start the Mobile app:** `cd apps/mobile && npx expo start`

---

## 🌐 Deployment (Render)

The web and API applications are deployed together on Render as a single web service.
1. Connect Render to the GitHub repository.
2. Build Command: `cd services/api && npm install && npm run build && cd ../../apps/web && npm install --legacy-peer-deps && npm run build`
3. Start Command: `cd services/api && npm start`
4. Provide all required environment variables in the Render dashboard.

The Landing page can be deployed as a static site:
1. Build Command: `cd apps/landing && npm install && npm run build`
2. Publish Directory: `apps/landing/dist`

---

## 🔄 GitHub Actions Releases

This repository uses [Release Please](https://github.com/googleapis/release-please) for automated versioning and changelog generation based on Conventional Commits (`feat:`, `fix:`, etc.).

On every push to `master`, the `.github/workflows/release.yml` workflow:
1. Runs API smoke tests (`services/api/tests/smoke.test.js`).
2. Builds the Web SPA and Landing Page.
3. Compiles the API bundle.
4. Generates a new GitHub Release (if a feature or fix was merged).
5. Uploads `web-dist.tar.gz`, `landing-dist.tar.gz`, and `api-dist.tar.gz` as release artifacts.

*Note: Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set in your repository's GitHub Secrets for the CI web build to succeed.*
