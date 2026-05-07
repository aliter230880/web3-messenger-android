# Web3Gram — Контекст разработки

> Последнее обновление: 07.05.2026  
> Replit проект: `artifacts/web3-messenger` (Vite + React + TypeScript)  
> GitHub repo: `aliter230880/web3-messenger-android`  
> APK папка: `web3gram-v2/` (workflow: `build-apk-v2.yml`)

---

## Стек технологий

| Технология | Версия | Назначение |
|---|---|---|
| React + Vite + TypeScript | latest | UI фреймворк |
| Zustand | ^5.0.12 | Глобальный state |
| @walletconnect/ethereum-provider | ^2.23.9 | WalletConnect v2 |
| ethers.js | ^5.7.2 | Работа с Polygon |
| @xmtp/xmtp-js | ^13.0.4 | E2E мессенджер |
| Framer Motion | ^11.0.0 | Анимации |
| qrcode | ^1.5.4 | Генерация QR локально |
| tweetnacl | ^1.0.3 | Шифрование сообщений |
| vite-plugin-node-polyfills | ^0.22.0 | Node.js полифилы для браузера |

### Смарт-контракты (Polygon Mainnet, Chain ID 137)

| Контракт | Адрес |
|---|---|
| Identity | `0xcFcA16C8c38a83a71936395039757DcFF6040c1E` |
| MessageStorage | `0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb` |
| LoginFactory | `0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8` |
| IdentityV2 | `0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC` |
| KeyEscrow | `0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53` |
| SocialWalletRegistry | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` |
| HybridMessenger | `0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5` |

### Константы
- **WalletConnect Project ID**: `2de1d724533083c2ed68197548dead4e`
- **APP_URL**: `https://chat.aliterra.space`
- **AliTerra Wallet**: `https://wallet.aliterra.space`

---

## Структура исходников (`web3gram-v2/src/`)

```
src/
├── services/
│   ├── walletService.ts        ★ WalletConnect подключение, deep links, session recovery
│   ├── contractService.ts        LoginFactory, смарт-контракты
│   ├── authService.ts            localStorage seed, keypair (без лишних попапов)
│   ├── encryptionService.ts      TweetNaCl E2E шифрование
│   └── xmtpService.ts          ★ XMTP Client.create() + fast path
├── components/
│   ├── WalletModal.tsx         ★ UI подключения кошельков (8 экранов)
│   ├── ChatView.tsx              3-phase загрузка, отправка сообщений
│   ├── NewChatModal.tsx          Начать чат по Ethereum-адресу
│   ├── ProfileSetup.tsx          Настройка профиля (никнейм, аватар)
│   └── Sidebar.tsx               Список диалогов
├── hooks/
│   └── useWeb3Messenger.ts     ★ connect(), _finishConnect(), retryXmtp()
├── store/index.ts                Zustand: wallet, chats, messages, e2e
├── types/index.ts                Все TypeScript типы
└── App.tsx                       Главный компонент, global XMTP stream
```

---

# ПОДКЛЮЧЕНИЕ КОШЕЛЬКОВ — Полное описание

## 1. Поддерживаемые кошельки

| Кошелёк | Тип подключения | Особенности |
|---|---|---|
| **MetaMask** | WalletConnect v2 (mobile/APK) или `window.ethereum` (desktop) | На desktop — прямо через браузерный extension |
| **Trust Wallet** | WalletConnect v2 | Только через WC, deep link `trust://wc?uri=...` |
| **WalletConnect** | WalletConnect v2 | Универсально — любой WC2-совместимый кошелёк |
| **AliTerra** | Read-only (адрес без signer) | Нет транзакций/подписей; адрес через postMessage или вручную |

---

## 2. Определение платформы

Перед подключением `walletService` определяет окружение:

```typescript
isCapacitor()  → window.Capacitor !== undefined   // APK (Capacitor WebView)
isMobile()     → navigator.userAgent regex         // Мобильный браузер
hasMetaMask()  → window.ethereum !== undefined     // MetaMask Extension в браузере
```

Это влияет на:
- Способ открытия deep link (смотри раздел 5)
- Доступность QR-кода vs кнопки "Открыть в MetaMask"
- Используемый путь подключения MetaMask

---

## 3. Главный поток подключения (WalletConnect)

```
Пользователь нажимает "MetaMask" / "Trust" / "WalletConnect"
    │
    ▼
WalletModal: handleConnect(wallet)
    │   setScreen('initializing')
    │   walletService.onDisplayUri = (uri) => { setWcUri(uri); setScreen('qr') }
    │
    ▼
useWeb3Messenger: connect(walletType)
    │
    ▼
walletService: connectMetaMask() / connectTrust() / connectWalletConnect()
    │
    │   Desktop + MetaMask Extension?
    │   ├── YES → window.ethereum path (раздел 3а)
    │   └── NO  → _connectWC(wallet) (раздел 3б)
    │
    ▼
_finishConnect(connection)            ← вызывается после успешного подключения
    │   мгновенно обновляет store (UI разблокирован)
    │   фоново запускает XMTP (раздел 7)
    │
    ▼
setWallet({ isConnected: true, address, signer, provider })
setCurrentUser({ id: address, name: "0x1234…5678" })
WalletModal: setScreen('connected') → закрывается через 600мс
```

### 3а. Desktop MetaMask Extension (быстрый путь)

Только на desktop-браузере, когда `window.ethereum` есть и это не Capacitor:

```typescript
const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
await provider.send('eth_requestAccounts', []);  // PopUp MetaMask "Подключить"
await _switchToPolygon(provider);                // Переключаем сеть если нужно
const signer = provider.getSigner();
const address = await signer.getAddress();
```

**Итог**: 1 попап MetaMask → адрес получен → подключено.

### 3б. WalletConnect путь (mobile / APK / Trust / универсальный)

Смотри раздел 4 ниже.

---

## 4. WalletConnect подключение (`_connectWC`)

### Retry-обёртка
```typescript
// До 3 попыток при сетевых ошибках:
// 'Failed to publish' | 'WebSocket' | 'relay' | 'tag:undefined' | 'No internet'
// Между попытками: sleep(1500ms * attempt) + очистка WC localStorage/IndexedDB
for (let attempt = 1; attempt <= 3; attempt++) {
    return await _connectWCOnce(wallet, attempt);
    // при сетевой ошибке: sleep + clearWCStorage + retry
}
```

### `_connectWCOnce` — детальный поток

**Шаг 1: Инициализация EthereumProvider**
```typescript
const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

const wcProvider = await Promise.race([
  EthereumProvider.init({
    projectId: '2de1d724533083c2ed68197548dead4e',
    chains: [137],          // Polygon Mainnet
    showQrModal: false,     // Своя модалка, без @web3modal
    metadata: {
      name: 'Web3Gram',
      url: 'https://chat.aliterra.space',
      ...
    },
  }),
  timeout(20_000)           // 20 секунд на инициализацию
]);
```

**Шаг 2: Получение pairing URI**
```typescript
wcProvider.on('display_uri', (uri: string) => {
  walletService.onDisplayUri?.(uri);
  // → WalletModal: setWcUri(uri) + setScreen('qr')
});
```
URI формата: `wc:abc123...@2?relay-protocol=irn&symKey=...`

**Шаг 3: Ожидание подтверждения (три параллельных слоя)**

```
sessionPromise = new Promise((resolve, reject) => {
    _sessionResolve = resolve;   // внешний bypass через forceResolveSession()

    // СЛОЙ 1: connect() promise
    wcProvider.connect().then(resolve).catch(reject);

    // СЛОЙ 2а: SDK 'connect' event
    wcProvider.on('connect', () => resolve());

    // СЛОЙ 2б: session_update event
    wcProvider.on('session_update', () => {
      if (wcProvider.session) resolve();
    });

    // Таймаут: 5 минут
    setTimeout(() => reject("Сессия не установлена за 5 минут..."), 5 * 60 * 1000);
});

// СЛОЙ 3: visibilitychange handler
document.on('visibilitychange', async () => {
  if (!document.hidden && wcProvider) {
    await reconnectRelay();          // Восстанавливаем WebSocket к relay
    await sleep(2000);               // Ждём доставки pending session_approve
    if (wcProvider.session && _sessionResolve) {
      _sessionResolve();             // Force-resolve
    }
  }
});

await sessionPromise;
```

**Шаг 4: Построение подключения**
```typescript
const provider = new ethers.providers.Web3Provider(wcProvider, 'any');
await _switchToPolygon(provider);       // До 4 попыток с backoff
const signer = provider.getSigner();
const address = await signer.getAddress();
return { provider, signer, address, walletType: 'walletconnect' };
```

---

## 5. Deep Links — открытие кошелька

После появления QR-кода пользователь может нажать "Открыть в MetaMask" (мобильный):

```typescript
openDeepLink(uri, wallet):
    encoded = encodeURIComponent(uri)
    url = `metamask://wc?uri=${encoded}`   // или trust://wc?...

    if (isCapacitor):
        window.open(url, '_system')        // Android Intent — НЕ перезагружает WebView ★
    else:
        window.open(url, '_blank')         // Мобильный браузер
```

**Почему `_system` важен**: `window.location.href = 'metamask://...'` перезагружает Capacitor WebView → теряется WC сессия. `window.open(url, '_system')` вызывает Android Intent и не трогает WebView.

### Что происходит после открытия кошелька

```
Пользователь видит QR → нажимает "Открыть MetaMask"
    │
    ▼
openDeepLink(wcUri, 'metamask')
    │   WalletModal: setDeepLinkOpened(true); setScreen('waiting')
    │
    ▼ [MetaMask открывается, пользователь видит запрос подключения]
    │
    ▼ [Пользователь нажимает "Connect" в MetaMask]
    │
    ▼ [Пользователь возвращается в приложение]
    │
    ├─ visibilitychange → reconnectRelay() + проверка session → resolve ✓
    ├─ wcProvider.on('connect') → resolve ✓
    └─ Кнопка "Я подтвердил — завершить" (ручной bypass)
```

---

## 6. Кнопка "Я подтвердил — завершить" (двухфазный поток)

Кнопка появляется на экране `waiting` — на случай если автоматические слои не сработали.

### Фаза 1: Проверка сессии (`handleIConfirmed`)

```typescript
handleIConfirmed():
    setScreen('checking')

    // checkSessionOnly — читает session объект WC, без RPC (мгновенно)
    connection = await checkSessionOnly(connectingFor)
    /*
        checkSessionOnly:
            await reconnectRelay()              // Восстановить WebSocket
            accounts = await tryGetAccounts()   // Читаем из session.namespaces (instant)
            return await connectFromExistingSession(wallet)
    */

    if (!connection):
        setConnectError('Подтверждение не получено...')
        setScreen('waiting')
        return

    pendingConnectionRef.current = connection   // Сохраняем для фазы 2

    walletService.openWalletApp(connectingFor)  // Открываем MetaMask (для подписи XMTP)
    setScreen('signing')
```

### Фаза 2: Финализация (`finishConnectAuth` → `_finishConnect`)

```typescript
finishConnectAuth(connection):
    setIsConnecting(true)
    await _finishConnect(connection)        // Обновляем store, запускаем XMTP
    walletService.forceResolveSession()     // Резолвим исходный connect() promise
```

### `tryGetAccounts` — стратегия получения адреса

```typescript
// Приоритет 1: session.namespaces (instant, нет сети)
const ns = wcProvider.session?.namespaces
// Парсим "eip155:137:0xABC..." → "0xABC..."

// Приоритет 2: wcProvider.accounts (прямой доступ)
const directAccounts = wcProvider.accounts

// Приоритет 3: eth_accounts RPC (8-секундный таймаут)
await wcProvider.request({ method: 'eth_accounts' })
```

---

## 7. `_finishConnect` — финализация после получения connection

```typescript
_finishConnect(connection):
    { provider, signer, address, walletType } = connection

    // ── НЕМЕДЛЕННО (синхронно) ─────────────────────────────────────────
    setWallet({ isConnected: true, address, chainId: 137, signer, provider })
    setCurrentUser({ id: address, name: "0x1234…5678" })
    setE2EInitialized(true)
    // → UI мгновенно разблокируется, пользователь видит список чатов

    if (!signer) return;  // AliTerra (read-only) — дальше не идём

    // ── ФОНОВО (не блокируют UI) ───────────────────────────────────────
    authService.authenticate(signer)      // localStorage seed, без попапов
    contractService.initialize(provider, signer)  // Создаём объекты контрактов

    // XMTP — background, может занять 1-8 секунд
    xmtpService.initialize(signer)
        .then(() => {
            setXmtpReady(true)     // Попытка завершена
            setXmtpAvailable(true) // E2E активно
        })
        .catch(() => {
            setXmtpReady(true)      // Разблокируем UI даже при ошибке
            // xmtpAvailable=false → App.tsx авто-ретрай через 5с, потом каждые 30с
        })
```

---

## 8. Переключение на Polygon (`_switchToPolygon`)

Вызывается после установки WC сессии. До 4 попыток с backoff при ошибках сети:

```typescript
network = await provider.getNetwork()
if (network.chainId === 137) return  // Уже на Polygon

try:
    await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }])
catch (err):
    if (err.code === 4902):           // Polygon не добавлен
        await provider.send('wallet_addEthereumChain', [POLYGON_PARAMS])
        // POLYGON_PARAMS: chainId='0x89', rpcUrls=['https://polygon-rpc.com'], ...

// При NETWORK_ERROR / noNetwork: sleep(1500ms * attempt) + retry
```

---

## 9. AliTerra Wallet (особый кейс)

AliTerra — кастомный кошелёк проекта. Подключение только через адрес (read-only):

```typescript
// Desktop: открываем popup окно, слушаем postMessage
openAliTerraWallet(onAddress):
    window.open('https://wallet.aliterra.space/?from=web3gram', 'aliterra_wallet', 'width=440,height=680')
    window.addEventListener('message', (ev) => {
        if (ev.data?.type === 'WEB3GRAM_ADDRESS' && ev.data?.address.startsWith('0x')):
            onAddress(ev.data.address)
    })

// APK: открываем через Intent
window.open(`https://wallet.aliterra.space/?from=web3gram&return=${returnUrl}`, '_system')

// После получения адреса:
createReadOnlyConnection(address):
    return { provider: null, signer: null, address, walletType: 'aliterra', readOnly: true }
```

**Ограничение**: нет signer → нет транзакций, нет XMTP подписи → только read-only просмотр.

---

## 10. Отключение (`disconnect`)

```typescript
disconnect():
    walletService.disconnect()    // aborted=true, cleanupWC(), removeHandlers
    xmtpService.disconnect()      // client=null
    authService.logout()          // очищает localStorage seed

    setWallet({ isConnected: false, address: null })
    setE2EInitialized(false)
    setXmtpReady(false)
    setXmtpAvailable(false)
    setCurrentUser(null)
```

---

## 11. Экраны WalletModal

| Экран | Когда показывается | Что происходит |
|---|---|---|
| `picker` | По умолчанию / после ошибки | 4 кнопки выбора кошелька |
| `initializing` | После нажатия кнопки | EthereumProvider.init() работает |
| `qr` | `display_uri` получен | QR + кнопки deep link (mobile) |
| `waiting` | После deep link | Кнопка "Я подтвердил — завершить" |
| `checking` | Нажата кнопка "Я подтвердил" | `tryGetAccounts()` — instant |
| `signing` | Сессия найдена | Ожидание XMTP подписи в MetaMask |
| `aliterra` | Нажата AliTerra | Поле ввода адреса + кнопка из буфера |
| `connected` | Успешное подключение | Адрес + кнопка "Отключить" |

---

## 12. Reconnect relay (`reconnectRelay`)

Вызывается в двух местах:
1. `visibilitychange` в WalletService (слой 3)
2. `visibilitychange` в WalletModal (экраны `waiting`, `qr`, `signing`)

```typescript
reconnectRelay():
    // Пробует 3 метода по приоритету:
    relayer.restartTransport()             // WC v2.23+ (предпочтительно)
    relayer.transportClose() + transportOpen()  // Альтернатива
    relayer.connect()                      // Fallback
    // Таймаут: 5 секунд — никогда не зависает
```

---

## 13. Очистка WC состояния (`_clearWCStorage`)

Вызывается между retry попытками:

```typescript
// Удаляет все IndexedDB с именами: 'WALLET_CONNECT', 'wc@2'
// Удаляет из localStorage все ключи начинающиеся с 'wc@2' или 'WALLET_CONNECT'
```

---

## 14. XMTP инициализация (подробно)

```typescript
xmtpService.initialize(signer):

    // FAST PATH (для вернувшихся пользователей):
    // skipContactPublishing:true — пропускает публикацию бандла в сеть
    // Экономит 1-2 секунды для всех кто уже подключался
    Client.create(signer, { env: 'production', skipContactPublishing: true }, 4s timeout)
        ✓ Ключи в IndexedDB, relay handshake, готово за ~1-2с

    // FULL PATH (если fast path упал — новый пользователь):
    Client.create(signer, { env: 'production' }, 4s timeout)
        ✓ Запрос подписи MetaMask, публикация контакта, ~5-8с

    // Если оба упали → throw → xmtpAvailable=false
    // Auto-retry в App.tsx: через 5с → каждые 30с

// Итого максимальное время ожидания: 8с (fast 4с + full 4с)
// Для возвращающихся пользователей: обычно 1-2с
```

---

## 15. Статусы E2E в UI

| Флаг | Значение в store | Что показывается |
|---|---|---|
| `xmtpReady=false` | XMTP инициализируется | Спиннер "XMTP подключается…" |
| `xmtpReady=true, xmtpAvailable=false` | Попытка завершена, нет соединения | "⚠️ XMTP недоступен" + кнопка "Повторить" |
| `xmtpAvailable=true` | Подключено | "🔒 E2E активно" |

---

## 16. Загрузка сообщений (3 фазы)

Три раздельных `useEffect` в `ChatView`:

```
Фаза 1 (instant):   localStorage cache → setMessages() мгновенно
                     Пользователь видит историю сразу, без сети

Фаза 2 (xmtpAvailable): getMessages(peerAddress, 50) → merge с cache по ID
                          Дешифруем v1:... сообщения через encryptionService

Фаза 3 (stream):    xmtpService.subscribeToAllMessages() → real-time
```

**Merge стратегия**: `Map<id, Message>` из обоих источников → sort по времени.  
Это гарантирует что исходящие сообщения из кэша не исчезнут после загрузки XMTP.

---

## 17. Отправка сообщений

```typescript
sendMessage(peerAddress, content):
    if (!xmtpService.isInitialized()):
        throw Error('XMTP не инициализирован')
        // ChatView показывает предупреждение, не отправляет "в пустоту"

    // Шифруем через TweetNaCl:
    encrypted = encryptionService.encrypt(content, peerAddress)
    payload = 'v1:' + encrypted.base64

    xmtpService.sendMessage(peerAddress, payload)
```

---

## Полная история исправлений

| Дата | Проблема | Решение | Результат |
|---|---|---|---|
| ранее | WC 2.17.0 — ошибка `tag:undefined` | Обновление до 2.23.9 | APK build прошёл |
| ранее | QR через внешний API требовал интернет | Локальный `qrcode` пакет | Работает offline |
| ранее | `import QRCode from 'qrcode'` — ошибка | `import * as QRCode` | Компиляция OK |
| ранее | WC сессия не восстанавливалась | `reconnectRelay()` в visibilitychange | Сессия жива после background |
| 03.05 | `window.location.href` перезагружал WebView (APK) | `window.open(url, '_system')` | WebView не перезагружается |
| 03.05 | `connect()` не резолвился после возврата из MetaMask | 3 слоя detection + кнопка "Я подтвердил" | Bypass connect() |
| 03.05 | Пользователь не видел когда подписывать | Экран `signing` с инструкцией | UX ясен |
| 06.05 | Sidebar показывал "Не подключён" вместо адреса | `wallet.isConnected` check | Адрес корректен |
| 06.05 | Только mock чаты | Реальный XMTP: `loadChats`, `sendMessage`, `subscribeToAllMessages` | E2E сообщения |
| 06.05 | Нельзя написать новому адресу | NewChatModal + canMessage() | Начать чат с любым |
| 06.05 | Mock данные мешали реальным | `clearMockData`, deduplication | Реальные данные |
| 06.05 | 12 попапов MetaMask при входе | localStorage seed в authService | Max 1 попап |
| 06.05 | XMTP двойная подпись | Один `Client.create()` | 1 подпись |
| 06.05 | loginWithFactory — повторные транзакции | Кэш в localStorage | 0 транзакций при re-login |
| 06.05 | XMTP stream не стартовал | `useEffect` зависимость от `xmtpAvailable` | Stream работает |
| 06.05 | Сообщения не видны до загрузки XMTP | 3-phase load: кэш → XMTP → stream | Мгновенный кэш |
| 06.05 | Отправка "терялась" если XMTP не готов | Блокировка + предупреждение | Не теряются |
| 06.05 | Исходящие пропадали при открытии нового чата | Merge XMTP+cache по ID | Всё сохраняется |
| 06.05 | `xmtpAvailable` показывал "активно" при обрыве | Разделение `xmtpReady` / `xmtpAvailable` | Точный статус |
| 07.05 | XMTP 5-9 секунд подключения | `skipContactPublishing:true` + 4s timeout | 1-2с для re-connect |
| 07.05 | При обрыве XMTP нет auto-recovery | Retry 5с + каждые 30с + кнопка | Авто-восстановление |

---

## Известные ограничения

- **Desktop browser**: deep links (`metamask://`) не работают — только QR
- **APK**: нужен MetaMask или Trust Wallet на устройстве
- **AliTerra**: read-only — нет транзакций, нет XMTP
- **XMTP первый раз**: требует 1 подпись MetaMask
- **XMTP canMessage()**: всегда `true` (не блокирует начало чата при недоступном XMTP)

---

## Планы / TODO

### Высокий приоритет
- [ ] **E2E тест чата** — две wallet сессии, отправить и получить
- [ ] **Push уведомления в APK** — Capacitor Notifications при новом сообщении
- [ ] **Offline-очередь** — исходящие копятся при недоступном XMTP, отправляются при восстановлении
- [ ] **ENS имена и аватары** через публичное API

### Средний приоритет
- [ ] **Поиск сообщений** в истории чата
- [ ] **Голосовые сообщения** — Web Audio API + IPFS
- [ ] **Файлы/изображения** — XMTP attachment codec
- [ ] **Групповые чаты** — XMTP GroupChat API (v3)

### Архитектурные улучшения
- [ ] **IndexedDB вместо localStorage** для больших историй
- [ ] **Service Worker** — offline режим + background sync
- [ ] **Code splitting** — lazy-load XMTP/WalletConnect (быстрый первый рендер)

---

## APK Build (GitHub Actions)

### Workflow: `build-apk-v2.yml`
- **Тригер**: push в `web3gram-v2/**` или `workflow_dispatch`
- **Артефакт**: `web3gram-v2-debug`

**Ключевые шаги сборки:**
1. Install deps + `@capacitor/browser`
2. Patch `vite.config.ts` (base: `./`, nodePolyfills)
3. `npm run build`
4. `capacitor.config.json` (appId: `andr.web3gram`)
5. `cap add android && cap sync android`
6. `network_security_config.xml` — WalletConnect relay WebSocket разрешён
7. `AndroidManifest.xml` — `<queries>` для `metamask://`, `trust://`, `wc://`
8. Fix Kotlin duplicates в `build.gradle`
9. `./gradlew assembleDebug`

**Скачать APK**: Actions → Build APK (web3gram-v2) → Artifacts → `web3gram-v2-debug`

---

## Workflows Replit

| Workflow | Команда | Назначение |
|---|---|---|
| `artifacts/web3-messenger: web` | `pnpm --filter @workspace/web3-messenger run dev` | Vite dev server |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | Express API |
| `artifacts/mockup-sandbox: Component Preview` | `pnpm --filter @workspace/mockup-sandbox run dev` | Canvas previews |
