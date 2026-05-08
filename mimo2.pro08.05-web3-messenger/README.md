# Web3Gram - Web3 Messenger for Android

Безопасный мессенджер на базе блокчейна Polygon с E2E шифрованием через XMTP.

## ⚠️ ВАЖНО: Сборка APK

**WebIntoApp и подобные сервисы НЕ поддерживают WalletConnect!** Они создают простой WebView без нативных мостов.

Для полноценной работы с кошельками нужен **Capacitor** — он создаёт нативный мост между WebView и Android.

## 🚀 Функции

### Web3 Интеграция (РЕАЛЬНАЯ)
- **WalletConnect v2** - подключение любых кошельков через QR/deep links
- **MetaMask** - через расширение (desktop) или deep link (mobile)
- **Trust Wallet** - через WalletConnect + deep link
- **Социальные логины** - Google, Twitter, Discord → LoginFactory контракт создаёт кошелёк

### Безопасность
- **E2E шифрование** через XMTP Protocol
- **Polygon Network** - низкие комиссии

### UI/UX (Telegram-подобный)
- Тёмная тема
- Список чатов с аватарами и статусами
- Индикатор набора текста
- Статусы прочтения сообщений (✓✓)
- Анимации и плавные переходы

## 📱 Сборка НАСТОЯЩЕГО APK через Capacitor

### Шаг 1: Установка

```bash
# Скачайте проект
git clone https://github.com/aliter230880/web3-messenger-android.git
cd web3-messenger-android

# Установите зависимости
npm install

# Установите Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Шаг 2: Сборка веб-приложения

```bash
npm run build
```

### Шаг 3: Инициализация Capacitor

```bash
npx cap init Web3Gram andr.web3gram --web-dir dist
```

### Шаг 4: Добавление Android платформы

```bash
npx cap add android
npx cap sync android
```

### Шаг 5: Настройка Android

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
        
        <!-- Добавьте queries для deep links -->
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

### Шаг 6: Сборка APK

```bash
# Откройте в Android Studio
npx cap open android

# В Android Studio:
# Build → Build Bundle(s) / APK(s) → Build APK(s)

# Или через командную строку:
cd android
./gradlew assembleDebug
```

APK будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

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

### Социальные логины (Google/Twitter/Discord)
1. Пользователь нажимает на иконку соцсети
2. Открывается OAuth popup
3. Пользователь авторизуется
4. Сервер вызывает LoginFactory контракт на Polygon:
   ```solidity
   createLogin(provider, socialId, username)
   ```
5. Контракт создаёт/возвращает кошелёк для пользователя
6. Адрес кошелька возвращается в приложение

## 🏗️ Смарт-контракты (Polygon Mainnet)

| Контракт | Адрес |
|----------|-------|
| LoginFactory | `0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8` |
| SocialWalletRegistry | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` |
| HybridMessenger | `0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5` |

## 🔑 WalletConnect Project ID

`2de1d724533083c2ed68197548dead4e`

## 📂 Структура проекта

```
src/
├── App.tsx                    # Главный компонент (Telegram-подобный UI)
├── store/index.ts             # Zustand store
├── services/
│   ├── walletService.ts       # WalletConnect, MetaMask, deep links
│   ├── xmtpService.ts         # XMTP мессенджер
│   └── encryptionService.ts   # E2E шифрование
├── hooks/
│   └── useWallet.ts           # Хук для работы с кошельком
└── index.css                  # Стили
```

## 🚫 Почему WebIntoApp НЕ работает

WebIntoApp и подобные сервисы создают простой WebView wrapper. Они **не поддерживают**:

1. **Deep Links** - `metamask://`, `trust://`, `wc:` не работают
2. **Нативные мосты** - WalletConnect требует нативный WebSocket
3. **System Intents** - `window.open(url, '_system')` не работает

Capacitor решает все эти проблемы через нативный Android мост.

## 📝 Лицензия

MIT License

## 🔗 Ссылки

- Сайт: https://chat.aliterra.space
- Кошелёк: https://wallet.aliterra.space
- GitHub: https://github.com/aliter230880/web3-messenger-android
