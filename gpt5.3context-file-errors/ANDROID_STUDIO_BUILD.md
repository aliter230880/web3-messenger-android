# Android Studio Build (Beginner Friendly)

This project is already prepared for a Capacitor Android build.

## 1) Install required software

- Node.js LTS (20+)
- Android Studio (latest stable)
- Java 17 (usually bundled with Android Studio)

## 2) Build web app

Run these commands in project root:

```bash
npm install
npm run build
```

After this, the `dist/` folder will be created.

## 3) Create Android project from web app

```bash
npx cap add android
npx cap sync android
```

If you already created Android once, use only:

```bash
npx cap sync android
```

## 4) Add wallet deep-link support (MetaMask / Trust / WC)

Open file:

- `android/app/src/main/AndroidManifest.xml`

Copy the content from:

- `android-template/AndroidManifest.queries-snippet.xml`

and paste it inside the root `<manifest>` tag.

Also ensure these are present in the same manifest:

- `<uses-permission android:name="android.permission.INTERNET" />`
- `<application ... android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/network_security_config" ...>`

## 5) Add network security config

Create this file in Android project:

- `android/app/src/main/res/xml/network_security_config.xml`

Use content from:

- `android-template/network_security_config.xml`

## 6) Open Android Studio

```bash
npx cap open android
```

Wait until Gradle Sync finishes.

## 7) Build test APK (Debug)

In Android Studio:

- Build -> Build Bundle(s) / APK(s) -> Build APK(s)

APK output path:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## 8) Install APK to phone

Option A (manual):

- Send `app-debug.apk` to phone and install.

Option B (USB + ADB):

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 9) Build signed APK (Release)

In Android Studio:

- Build -> Generate Signed Bundle / APK -> APK

You will create/select a keystore, then output a release APK.

## Common errors and quick fixes

- Error: `No Android platform found`
  Run: `npx cap add android`

- Error: old web files in app
  Run: `npm run build && npx cap sync android`

- Wallet does not return to app after approval
  Make sure deep link queries were added in manifest and test on real device (not emulator).

- App opens but shows blank screen
  Rebuild web bundle: `npm run build`, then `npx cap sync android`.