# React Native APK Build Plan

## Goal
Build a signed debug/release APK directly from the Expo project using **`expo prebuild`** (bare workflow) and **Gradle**, without EAS. This produces a native `.apk` that can be sideloaded on any Android device.

## Environment

| Tool | Status |
|---|---|
| Java (OpenJDK 26) | ✅ `/usr/bin/java` |
| ADB | ✅ `/usr/bin/adb` |
| Android SDK | ✅ `/home/wind/Desktop/APP/.tools/android-sdk` |
| Gradle Wrapper | ⬇️ Auto-downloaded by generated project |
| EAS | ❌ NOT used |

## Strategy: Expo Prebuild → Gradle APK

### Why `expo prebuild`?
The current project is a managed Expo app (no `android/` directory). `expo prebuild` generates the native Android project files (gradle, manifests, java sources) from the JS config (`app.json` + plugins). After that it's a standard React Native app that builds with Gradle — **zero EAS required**.

---

## Step-by-Step Plan

### Phase 1 — Prep the environment
1. Export `ANDROID_HOME=/home/wind/Desktop/APP/.tools/android-sdk`
2. Ensure `build-tools`, `platforms/android-35`, `platform-tools` are installed via `sdkmanager`
3. Accept SDK licenses

### Phase 2 — Update app.json
4. Add `android.adaptiveIcon`, proper `versionCode`, `permissions`

### Phase 3 — Prebuild (generate native Android project)
5. Run `npx expo prebuild --platform android --clean` in `apps/mobile/`
   - Reads `app.json`, processes plugins, generates `apps/mobile/android/`

### Phase 4 — Configure build
6. Write `android/local.properties` with correct `sdk.dir`

### Phase 5 — Build the APK
7. Run `./gradlew assembleDebug` in `apps/mobile/android/`
8. APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Phase 6 — Wire into GitHub Actions CI
9. Add `build-android` job in `.github/workflows/release.yml`

## Output
- `app-debug.apk` — installable on any Android with "Unknown sources" enabled
- Attached to GitHub Release as artifact on every push to master
