#  Web3 Messenger Android App

## 📦 Быстрая Сборка APK

### Способ 1: Capacitor (Рекомендуется)

```bash
# 1. Установка зависимостей
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Инициализация
npx cap init "Web3 Messenger" "space.aliterra.messenger"

# 3. Сборка веб-приложения
npm run build

# 4. Добавление Android
npx cap add android

# 5. Синхронизация
npx cap sync

# 6. Открытие в Android Studio
npx cap open android

# 7. В Android Studio:
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### Способ 2: Онлайн Конвертер

1. **Соберите проект:**
   ```bash
   npm run build
   ```

2. **Загрузите `dist/` папку на:**
   - https://webintoapp.com/
   - https://www.appsgeyser.com/
   - https://gonative.io/

3. **Скачайте готовый APK**

### Способ 3: TWA (Trusted Web Activity)

```bash
# Требует deployed сайта
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://chat.aliterra.space/manifest.json
bubblewrap build
```

---

## 📱 Настройка AndroidManifest.xml

### Разрешения:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

### MetaMask Deep Linking:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="metamask" />
</intent-filter>
```

---

## 🔐 Подпись Приложения

### Генерация Keystore:

```bash
keytool -genkey -v \
  -keystore web3-messenger.keystore \
  -alias web3messenger \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Сборка Release APK:

```bash
cd android
./gradlew assembleRelease
```

**APK будет в:** `android/app/build/outputs/apk/release/`

---

## 📊 Размеры APK

| Тип | Размер | Примечание |
|-----|--------|------------|
| **Debug** | ~25MB | Для тестирования |
| **Release** | ~15MB | Оптимизированный |
| **TWA** | ~5MB | Минимальный |
| **AAB (Play Store)** | ~12MB | Для публикации |

---

## 🎯 Оптимизация Размера

### 1. Включите ProGuard/R8:

```properties
# android/gradle.properties
android.enableR8=true
android.enableR8.fullMode=true
```

### 2. Настройте ProGuard Rules:

```proguard
# android/app/proguard-rules.pro
-keep class com.web3messenger.** { *; }
-keep class * extends org.web3j.protocol.core.RemoteCall
-keep class * extends org.web3j.abi.datatypes.Type
```

### 3. Разделите по ABI:

```gradle
// android/app/build.gradle
splits {
    abi {
        enable true
        reset()
        include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        universalApk true
    }
}
```

---

## 🚀 Публикация в Google Play

### Требования:

1. **Google Play Console аккаунт** ($25 единоразово)
2. **Signed AAB файл** (не APK)
3. **Privacy Policy URL**
4. **Скриншоты приложения**
5. **Описание приложения**

### Сборка AAB:

```bash
cd android
./gradlew bundleRelease
```

**AAB будет в:** `android/app/build/outputs/bundle/release/`

---

## 📲 Установка APK на Устройство

### Через ADB:

```bash
adb install app-debug.apk
```

### Через USB:

1. Включите **Developer Options** на устройстве
2. Включите **USB Debugging**
3. Подключите устройство к ПК
4. `adb install app-release.apk`

### Через Файл:

1. Скопируйте APK на устройство
2. Откройте файл менеджер
3. Нажмите на APK → Install
4. Разрешите установку из неизвестных источников

---

## 🔧 Troubleshooting

### Ошибка: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

```bash
adb uninstall space.aliterra.messenger
adb install app-debug.apk
```

### Ошибка: "Cleartext HTTP traffic not permitted"

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
    android:usesCleartextTraffic="true"
    ...>
```

### Ошибка: "Network Security Config"

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">chat.aliterra.space</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

---

## 📞 Поддержка

При проблемах:
1. Проверьте логи: `adb logcat | grep -i web3messenger`
2. Проверьте консоль Chrome: `chrome://inspect`
3. Убедитесь что MetaMask установлен на устройстве

---

**Удачи с публикацией! 🚀**
