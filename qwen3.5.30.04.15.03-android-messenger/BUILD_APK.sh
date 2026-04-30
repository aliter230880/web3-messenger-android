#!/bin/bash

echo "🚀 Web3 Messenger - Сборка Android APK"
echo "======================================"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите с https://nodejs.org/"
    exit 1
fi

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Установка зависимостей
echo "📦 Установка Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android --save

# Инициализация Capacitor
echo ""
echo "⚙️ Инициализация Capacitor..."
npx cap init "Web3 Messenger" "space.aliterra.messenger" --web-dir=dist

# Сборка веб-приложения
echo ""
echo "🔨 Сборка веб-приложения..."
npm run build

# Добавление Android платформы
echo ""
echo "📱 Добавление Android платформы..."
npx cap add android

# Синхронизация
echo ""
echo "🔄 Синхронизация..."
npx cap sync

echo ""
echo "✅ Готово!"
echo ""
echo "📂 APK будет в: android/app/build/outputs/apk/debug/"
echo ""
echo "🎯 Следующие шаги:"
echo "   1. npx cap open android  (открыть в Android Studio)"
echo "   2. Build → Build APK"
echo "   3. Или: cd android && ./gradlew assembleDebug"
echo ""
echo "📲 Для release версии:"
echo "   1. Создайте keystore: keytool -genkey -v -keystore web3messenger.keystore -alias web3messenger -keyalg RSA -keysize 2048 -validity 10000"
echo "   2. cd android && ./gradlew assembleRelease"
echo ""
