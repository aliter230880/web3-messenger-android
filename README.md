# Web3 Messenger Android

Мобильное приложение на базе Expo (React Native) для [AliTerra Web3 Messenger](https://chat.aliterra.space).

## Описание

Приложение-обёртка (WebView) над работающим Web3-мессенджером chat.aliterra.space с нативным интерфейсом для Android и iOS.

## Стек

- **Framework**: Expo (React Native)
- **Routing**: Expo Router
- **WebView**: react-native-webview
- **Шрифты**: Inter (400/500/600/700)

## Установка и запуск

```bash
npm install -g pnpm
pnpm install
pnpm exec expo start
```

## Сборка APK (Android)

### 1. Через EAS Build (рекомендуется)

```bash
# Установить EAS CLI
npm install -g eas-cli

# Авторизация в Expo
eas login

# Настройка проекта
eas build:configure

# Сборка APK для Android
eas build --platform android --profile preview
```

### 2. Локальная сборка

```bash
# Генерация нативного Android проекта
pnpm exec expo prebuild --platform android

# Сборка через Gradle
cd android && ./gradlew assembleRelease
```

APK будет в: `android/app/build/outputs/apk/release/app-release.apk`

## Возможности

- Полный функционал Web3-мессенджера (E2E шифрование, Polygon network)
- Нативная тёмная тема (#0b0f19)
- Кнопка назад и перезагрузки
- Экран ошибки при отсутствии интернета
- Haptic feedback
- Кастомная иконка приложения

## Контракты (Polygon Mainnet)

- **Identity**: 0xcFcA16C8c38a83a71936395039757DcFF6040c1E
- **Messages**: 0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb
- **Key Escrow**: 0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53
