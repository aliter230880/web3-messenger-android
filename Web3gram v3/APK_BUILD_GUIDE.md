# Web3Gram - Инструкция по сборке APK

## 🚀 Вариант 1: Локальная сборка через Capacitor

### Требования
- Node.js 18+
- Android Studio с SDK
- Java 17+

### Шаги

1. **Клонировать репозиторий**
```bash
git clone <repo-url>
cd web3gram
npm install
```

2. **Установить Capacitor**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

3. **Собрать веб-приложение**
```bash
npm run build
```

4. **Инициализировать Capacitor**
```bash
npx cap init Web3Gram andr.web3gram --web-dir dist
```

5. **Добавить Android платформу**
```bash
npx cap add android
npx cap sync android
```

6. **Настроить Android**

Создайте `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">relay.walletconnect.com</domain>
        <domain includeSubdomains="true">rpc.walletconnect.com</domain>
        <domain includeSubdomains="true">polygon-rpc.com</domain>
    </domain-config>
</network-security-config>
```

В `android/app/src/main/AndroidManifest.xml` добавьте:
```xml
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        ...
        android:networkSecurityConfig="@xml/network_security_config">
        
        <!-- Deep links для кошельков -->
        <queries>
            <intent>
                <action android:name="android.intent.action.VIEW" />
                <data android:scheme="metamask" />
            </intent>
            <intent>
                <action android:name="android.intent.action.VIEW" />
                <data android:scheme="trust" />
            </intent>
            <intent>
                <action android:name="android.intent.action.VIEW" />
                <data android:scheme="wc" />
            </intent>
        </queries>
        
    </application>
</manifest>
```

7. **Собрать APK**

Через Android Studio:
```bash
npx cap open android
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Или через командную строку:
```bash
cd android
./gradlew assembleDebug
```

APK будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Вариант 2: GitHub Actions (автоматическая сборка)

### Настройка

1. **Создайте файл `.github/workflows/build-apk.yml`** (уже добавлен)

2. **Пушьте код в GitHub**

3. **Перейдите в Actions** → Build Web3Gram APK → Run workflow

4. **Скачайте APK** из Artifacts

---

## 🔧 Как работает подключение кошельков

### MetaMask (Desktop)
1. Пользователь нажимает "MetaMask"
2. Открывается popup MetaMask расширения
3. Пользователь подтверждает подключение
4. Приложение получает адрес и signer

### MetaMask (Mobile / APK)
1. Пользователь нажимает "MetaMask"
2. WalletConnect создаёт pairing URI
3. Приложение открывает `metamask://wc?uri=...`
4. MetaMask открывается с запросом подключения
5. Пользователь подтверждает
6. Приложение получает сессию через WalletConnect

### Trust Wallet (Mobile)
1. Пользователь нажимает "Trust Wallet"
2. WalletConnect создаёт pairing URI
3. Приложение открывает `trust://wc?uri=...`
4. Trust Wallet открывается с запросом подключения
5. Пользователь подтверждает
6. Приложение получает сессию через WalletConnect

---

## 🏗️ Смарт-контракты (Polygon Mainnet)

| Контракт             | Адрес                                      |
| -------------------- | ------------------------------------------ |
| LoginFactory         | 0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8 |
| IdentityV2           | 0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC |
| MessageStorage       | 0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb |
| HybridMessenger      | 0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5 |

---

## 🔑 Константы

- **WalletConnect Project ID**: `2de1d724533083c2ed68197548dead4e`
- **Chain**: Polygon Mainnet (Chain ID: 137)
- **APP_URL**: `https://chat.aliterra.space`

---

## 📱 Функции

- ✅ WalletConnect v2 для подключения кошельков
- ✅ MetaMask через расширение (desktop) или deep link (mobile)
- ✅ Trust Wallet через WalletConnect + deep link
- ✅ E2E шифрование через XMTP Protocol
- ✅ Telegram-подобный UI с тёмной темой
- ✅ Список чатов с аватарами и статусами
- ✅ Индикатор статуса сообщений (✓✓)
- ✅ Кэширование сообщений в localStorage
- ✅ On-chain обнаружение собеседников
- ✅ Синхронизация с Polygon Mainnet

---

## ⚠️ Известные ограничения

- **Desktop browser**: deep links (`metamask://`) не работают — только QR
- **APK**: нужен MetaMask или Trust Wallet на устройстве
- **AliTerra**: read-only — нет транзакций, нет XMTP
- **XMTP первый раз**: требует 1 подпись MetaMask

---

## 🔗 Ссылки

- Сайт: https://chat.aliterra.space
- Кошелёк: https://wallet.aliterra.space
- Polygon: https://polygonscan.com
