# Web3Gram — Контекст разработки

> Последнее обновление: 06.05.2026  
> Replit проект: `artifacts/web3-messenger` (Vite + React + TypeScript)  
> GitHub repo: `aliter230880/web3-messenger-android`  
> APK папка: `web3gram-v2/` (тригер: push в `web3gram-v2/**`)

---

## Архитектура

### Стек
- **Frontend**: React + Vite + TypeScript
- **State**: Zustand
- **Кошельки**: WalletConnect v2 (`@walletconnect/ethereum-provider@^2.23.9`)
- **Блокчейн**: Polygon Mainnet (Chain ID 137), `ethers@^5.7.2`
- **Мессенджер**: XMTP (`@xmtp/xmtp-js@^13.0.4`) — E2E шифрование
- **Анимации**: Framer Motion
- **QR**: локальный пакет `qrcode@^1.5.4`
- **Полифилы**: `vite-plugin-node-polyfills@^0.22.0`

### Смарт-контракты (Polygon Mainnet)

| Контракт | Адрес |
|---|---|
| Identity | `0xcFcA16C8c38a83a71936395039757DcFF6040c1E` |
| MessageStorage | `0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb` |
| LoginFactory | `0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8` |
| IdentityV2 | `0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC` |
| KeyEscrow | `0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53` |
| SocialWalletRegistry | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` |
| HybridMessenger | `0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5` |

### Ключевые константы
- WalletConnect Project ID: `2de1d724533083c2ed68197548dead4e`
- APP_URL: `https://chat.aliterra.space`
- AliTerra Wallet: `https://wallet.aliterra.space`

---

## Структура исходников (`web3gram-v2/src/`)

```
src/
├── services/
│   ├── walletService.ts        ★ WalletConnect подключение + deep links
│   ├── contractService.ts      ← LoginFactory + смарт-контракты
│   ├── authService.ts          ← localStorage seed, без лишних попапов
│   ├── encryptionService.ts    ← TweetNaCl E2E ключи
│   └── xmtpService.ts          ★ XMTP клиент + fast init
├── components/
│   ├── WalletModal.tsx          ★ UI подключения кошельков (6 экранов)
│   ├── ChatView.tsx             ← Просмотр и отправка сообщений
│   ├── NewChatModal.tsx         ← Начать чат с Ethereum-адресом
│   ├── ProfileSetup.tsx         ← Настройка профиля
│   └── Sidebar.tsx              ← Список чатов
├── hooks/
│   └── useWeb3Messenger.ts     ★ connect(), _finishConnect(), retryXmtp()
├── store/index.ts              ← Zustand: wallet, chats, messages, e2e
├── types/index.ts              ← Все TypeScript типы
└── App.tsx                     ← Главный компонент + global XMTP stream
```

---

## Поток подключения кошелька

```
handleConnect(wallet)
  → walletService.onDisplayUri = (uri) => setWcUri(uri)
  → connect(wallet) [в хуке]
    → walletService.connectMetaMask/Trust/WalletConnect()
      → _connectWC(wallet)  [retry до 3x]
        → EthereumProvider.init({projectId, chains:[137], showQrModal:false})
        → wcProvider.on('display_uri', uri => onDisplayUri(uri))
        → wcProvider.connect()  ← ждёт подтверждения в кошельке
      → ethers.Web3Provider → switchToPolygon() → getAddress()
  → _finishConnect()
    → authService.authenticate()        [localStorage seed, 0 попапов]
    → xmtpService.initialize()          [фоновая задача, не блокирует UI]
    → contractService.loginWithFactory() [с кэшем в localStorage]
    → setWallet() + setCurrentUser()
```

### XMTP инициализация (раздельная от UI)
```
xmtpService.initialize(signer)
  → FAST PATH: Client.create(signer, {env:'production', skipContactPublishing:true}, 4s timeout)
      ✓ Пропускает публикацию контакт-бандла (экономит 1-2с для вернувшихся пользователей)
  → FULL PATH (если fast path упал): Client.create(signer, {env:'production'}, 4s timeout)
      ✓ Нужен для новых пользователей или повреждённого состояния
  → Если всё упало: xmtpAvailable=false, UI разблокирован, авто-retry через 5с/30с
```

---

## Экраны WalletModal

| Экран | Когда |
|---|---|
| `picker` | Начало — 4 кнопки: MetaMask, Trust, WalletConnect, AliTerra |
| `initializing` | Идёт `EthereumProvider.init()` |
| `qr` | QR-код готов — сканировать или открыть кошелёк |
| `waiting` | После deep link — кнопка **"Я подтвердил — завершить"** |
| `checking` | `tryGetAccounts()` / `connectFromExistingSession()` |
| `signing` | Ожидание подписи XMTP (первый раз) |
| `connected` | Успех — адрес + кнопка "Отключить" |
| `aliterra` | Вставить адрес AliTerra вручную |

---

## Восстановление сессии WalletConnect (3 слоя)

**Проблема**: После подтверждения в MetaMask возвращаешься в приложение — `wcProvider.connect()` не резолвится (WebSocket к relay закрылся в фоне).

**Слой 1** — `wcProvider.connect()` promise (работает на desktop и быстром mobile)  
**Слой 2** — `wcProvider.on('connect', ...)` + `on('session_update', ...)` — SDK события  
**Слой 3** — `visibilitychange` handler → `reconnectRelay()` → ждёт 2с → проверяет `wcProvider.session`

**Ручной bypass** — кнопка **"Я подтвердил — завершить"**:
```
checkAndFinishSession(wallet)
  → reconnectRelay() + sleep(2s)
  → walletService.tryGetAccounts()   [прямой RPC eth_accounts]
  → if (accounts.length > 0):
      connectFromExistingSession()   [без нового connect()]
      → _finishConnect()
```

---

## Deep Links (APK vs Browser)

| Платформа | Метод | Причина |
|---|---|---|
| APK (Capacitor) | `window.open(url, '_system')` | Не перезагружает WebView |
| Mobile browser | `window.open(url, '_blank')` | Через custom scheme |
| Desktop | Только QR-код | Custom scheme не работает |

**Была проблема**: `window.location.href = 'metamask://...'` на Capacitor перезагружал WebView → теряло WC сессию. **Исправлено**: `openDeepLink()` проверяет `window.Capacitor?.isNativePlatform()`.

---

## Статусы XMTP в UI

| Флаг | Значение |
|---|---|
| `xmtpReady=false` | XMTP ещё инициализируется |
| `xmtpReady=true, xmtpAvailable=false` | XMTP завершил попытку, но соединение упало |
| `xmtpAvailable=true` | XMTP подключён, E2E активно |

Авто-retry: через 5с после `xmtpReady=true && xmtpAvailable=false`, потом каждые 30с.  
Кнопка "Повторить" в шапке чата.

---

## Сообщения (ChatView)

**3 раздельных effect'а при открытии чата:**
1. **Instant**: загружаем из localStorage кэша (без сети — мгновенно)
2. **XMTP history**: загружаем из XMTP когда `xmtpAvailable=true`
3. **XMTP stream**: подписываемся на новые когда `xmtpAvailable=true`

**Слияние сообщений** (deduplication): merge по ID — XMTP + localStorage кэш.

**Блокировка отправки**: если XMTP недоступен → показываем предупреждение, не отправляем (сообщение не потеряется, но и не "исчезнет в пустоту").

---

## APK Build (GitHub Actions)

### Workflow: `build-apk-v2.yml`
- **Папка**: `web3gram-v2/`
- **Тригер**: push в `web3gram-v2/**` или `workflow_dispatch`
- **Артефакт**: `web3gram-v2-debug`

**Шаги сборки:**
1. Install deps + `@capacitor/browser`
2. Patch `vite.config.ts` (base: `./`, nodePolyfills)
3. `npm run build`
4. `capacitor.config.json` (appId: `andr.web3gram`)
5. `cap add android && cap sync android`
6. `network_security_config.xml` — разрешить WalletConnect relay WebSocket
7. `AndroidManifest.xml` — `<queries>` для `metamask://`, `trust://`, `wc://`
8. Fix Kotlin duplicates в `build.gradle`
9. `./gradlew assembleDebug`

---

## История всех исправлений

| Дата | Проблема | Решение | Результат |
|---|---|---|---|
| ранее | WC 2.17.0 → `tag:undefined` ошибка | Обновление до 2.23.9 | APK build прошёл |
| ранее | QR через внешний API — нужен инет | Локальный `qrcode` пакет | Работает offline |
| ранее | `import QRCode from 'qrcode'` — ошибка компиляции | `import * as QRCode` | Компиляция OK |
| ранее | `handleReturnedFromWallet` не восстанавливал WC | Добавлен `reconnectRelay()` | WC сессия жива |
| 03.05 | `window.location.href` перезагружал WebView в APK | `window.open(url, '_system')` | WebView не перезагружается |
| 03.05 | `wcProvider.connect()` не резолвился после MetaMask | 3-слойное восстановление + кнопка "Я подтвердил" | Bypass connect() |
| 03.05 | Пользователь не знал когда подписывать | Экран `signing` с инструкцией | UX ясен |
| 06.05 | Sidebar показывал "Не подключён" вместо адреса | `wallet.isConnected` check вместо `wallet.balance` | Адрес корректен |
| 06.05 | **Чат только с mock данными** | Реальный XMTP: `loadChats()`, `sendMessage()`, `loadMessages()`, `subscribeToAllMessages()` | Настоящие E2E сообщения |
| 06.05 | Нельзя написать новому адресу | `NewChatModal` с `canMessage()` проверкой | Начать чат с любым адресом |
| 06.05 | Mock данные мешали реальным | `upsertChat`, `setMessages`, `clearMockData`, deduplication по ID | Реальные данные |
| 06.05 | XMTP `code:14` на production → упал | Production→dev fallback (временно) | XMTP работает |
| 06.05 | 12 попапов MetaMask при входе | `authService` использует localStorage seed для E2E keypair | Max 1 попап (только XMTP) |
| 06.05 | XMTP двойная подпись | Один `Client.create()` без re-init | 1 подпись |
| 06.05 | `loginWithFactory` повторные транзакции | Кэш в localStorage → skip RPC при повторном входе | 0 транзакций при re-login |
| 06.05 | XMTP stream не стартовал после фонового init | `useEffect` зависимость от `xmtpAvailable` вместо `xmtpReady` | Stream работает |
| 06.05 | Сообщения не видны до загрузки XMTP | 3-phase load: instant кэш → XMTP history → stream | Мгновенный кэш |
| 06.05 | Отправка "терялась" если XMTP не готов | Блокировка отправки + предупреждение | Не теряются |
| 06.05 | Исходящие пропадали при открытии нового чата | Merge XMTP+cache по ID | Всё видно |
| 06.05 | `xmtpAvailable` показывал "активно" даже при обрыве | Новый флаг `xmtpAvailable` (отдельно от `xmtpReady`) | Точный статус |
| 06.05 | XMTP подключался 5-9 секунд | `skipContactPublishing:true` fast path + 4s timeout + убран dev fallback | 1-2с для re-connect |
| 06.05 | XMTP обрыв — нет auto-recovery | Retry через 5с + каждые 30с + кнопка "Повторить" | Авто-восстановление |

---

## Известные ограничения

- **Desktop browser**: deep links (`metamask://`) не работают — только QR сканирование
- **APK**: требует MetaMask или Trust Wallet установленных на устройстве
- **AliTerra**: read-only подключение — нет signer для транзакций
- **XMTP**: иногда медленно на первый запуск (требует подпись MetaMask 1 раз)
- **XMTP canMessage()**: если XMTP недоступен, возвращает `true` чтобы не блокировать чат
- **LoginFactory**: не вызывается если адрес уже в localStorage кэше

---

## Планы / TODO

### Высокий приоритет
- [ ] **Тест реального чата end-to-end** — две разные wallet сессии, отправить и получить
- [ ] **Push уведомления в APK** — Capacitor Local Notifications при новом сообщении
- [ ] **Offline-first**: если XMTP упал → очередь исходящих, отправка при восстановлении
- [ ] **Профили пользователей**: ENS имена / аватары через публичное API
- [ ] **Группы/комнаты** — XMTP GroupChat API (v3)

### Средний приоритет
- [ ] **Поиск сообщений** в истории чата
- [ ] **Голосовые сообщения** — запись через Web Audio API + хранение в IPFS/Arweave
- [ ] **Доставка файлов/изображений** — XMTP attachment codec
- [ ] **WalletConnect v2 → v3** когда выйдет стабильный релиз
- [ ] **Тёмная/светлая тема** переключатель

### Архитектурные улучшения
- [ ] **IndexedDB вместо localStorage** для больших историй чатов
- [ ] **Service Worker** для offline режима и background sync
- [ ] **Code splitting** — lazy-load XMTP и WalletConnect для быстрого первого рендера
- [ ] **E2E тесты** — Playwright сценарии для ключевых flow

---

## Структура workflows Replit

```
artifacts/api-server:    API Server           — Express на $PORT
artifacts/web3-messenger: web                 — Vite dev server на $PORT
artifacts/mockup-sandbox: Component Preview   — Canvas previews
```

## GitHub Actions

```
.github/workflows/
├── build-apk.yml      ← СТАРЫЙ (папка qwen3.5.30.04.15.03-android-messenger/)
└── build-apk-v2.yml   ← НОВЫЙ ★ (папка web3gram-v2/, скачивать отсюда)
```

**Скачать APK**: Actions → Build APK (web3gram-v2) → Artifacts → `web3gram-v2-debug`
