# Web3Gram - Контекст разработки

> Последнее обновление: 2026  
> GitHub: `aliter230880/web3-messenger-android`  
> Папка: `mimo2.pro/`

---

## ✅ РАБОЧИЕ КОШЕЛЬКИ (ЗАФИКСИРОВАНО)

### MetaMask / Trust Wallet - ПОДКЛЮЧЕНИЕ РАБОТАЕТ

Используется **настоящий WalletConnect SignClient** через динамический импорт:

```typescript
const { SignClient } = await import('@walletconnect/sign-client');

signClientRef.current = await SignClient.init({
  projectId: '2de1d724533083c2ed68197548dead4e',
  metadata: {
    name: 'Web3Gram',
    description: 'Secure Web3 Messenger',
    url: window.location.origin,
    icons: ['https://chat.aliterra.space/icon.png'],
  },
});

const { uri, approval } = await signClientRef.current.connect({
  requiredNamespaces: {
    eip155: {
      methods: [
        'eth_sendTransaction',
        'eth_signTransaction', 
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
      ],
      chains: ['eip155:137'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
});
```

### Deep Links (для мобильных):

```typescript
// MetaMask
window.open(`metamask://wc?uri=${encodeURIComponent(uri)}`, '_system');

// Trust Wallet  
window.open(`trust://wc?uri=${encodeURIComponent(uri)}`, '_system');
```

### Platform Detection:

```typescript
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isCapacitor = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

const openUrl = (url: string) => {
  if (isCapacitor()) {
    window.open(url, '_system'); // Не перезагружает WebView
  } else {
    window.open(url, '_blank');
  }
};
```

### Desktop с расширением:

```typescript
if (ethereum && !isMobile()) {
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  // ... прямое подключение через window.ethereum
}
```

---

## Смарт-контракты (Polygon Mainnet)

| Контракт | Адрес |
|----------|-------|
| LoginFactory | `0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8` |
| SocialWalletRegistry | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` |
| HybridMessenger | `0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5` |

## Константы

- **WalletConnect Project ID**: `2de1d724533083c2ed68197548dead4e`
- **Chain ID**: 137 (Polygon Mainnet)
- **RPC**: `https://polygon-rpc.com`

---

## Стек технологий

| Технология | Версия | Назначение |
|------------|--------|------------|
| React + Vite + TypeScript | latest | UI |
| Zustand | ^5.0 | State management |
| @walletconnect/sign-client | ^2.23 | WalletConnect v2 |
| ethers.js | ^5.7 | Blockchain |
| @xmtp/xmtp-js | ^13.0 | E2E messaging |
| Framer Motion | latest | Анимации |
| Lucide React | latest | Иконки |

---

## Структура проекта

```
mimo2.pro/
├── src/
│   ├── App.tsx                    # Главный компонент
│   ├── store/index.ts             # Zustand store
│   ├── hooks/
│   │   └── useWallet.ts           # ✅ РАБОЧИЙ хук подключения
│   └── services/
│       ├── walletService.ts       # Wallet service
│       ├── xmtpService.ts         # XMTP messaging
│       └── encryptionService.ts   # E2E encryption
├── capacitor.config.json          # Capacitor config
├── .github/workflows/
│   └── build-web3gram-apk.yml    # GitHub Actions сборка APK
└── package.json
```

---

## История исправлений

| Дата | Проблема | Решение |
|------|----------|---------|
| - | Deep links не работали | Используем `window.open(url, '_system')` в Capacitor |
| - | WC сессия зависала | Настоящий SignClient с правильным Project ID |
| - | QR код не отображался | Убрали QR, используем deep links напрямую |
| - | MetaMask лого сломан | SVG иконка вместо img |
| ✅ | **MetaMask/Trust Wallet работают** | **WalletConnect SignClient + deep links** |

---

## Ограничения

- AliTerra Wallet - только сайт, нет интеграции
- XMTP - mock данные, нужна реальная интеграция
- Нет push уведомлений
# Web3Gram - Контекст разработки

> Последнее обновление: 2026  
> GitHub: `aliter230880/web3-messenger-android`  
> Папка: `mimo2.pro/`  
> Статус: **✅ РАБОТАЕТ - подключение кошельков, UI, чаты, аватарки**

---

## ✅ РЕАЛИЗОВАННОЕ

### 1. Подключение кошельков - РАБОТАЕТ ✅

#### MetaMask / Trust Wallet (WalletConnect SignClient)
```typescript
// src/hooks/useWallet.ts
const { SignClient } = await import('@walletconnect/sign-client');

signClientRef.current = await SignClient.init({
  projectId: '2de1d724533083c2ed68197548dead4e',
  metadata: {
    name: 'Web3Gram',
    description: 'Secure Web3 Messenger',
    url: window.location.origin,
    icons: ['https://chat.aliterra.space/icon.png'],
  },
});

const { uri, approval } = await signClientRef.current.connect({
  requiredNamespaces: {
    eip155: {
      methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
      chains: ['eip155:137'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
});
```

#### Deep Links
```typescript
// MetaMask
window.open(`metamask://wc?uri=${encodeURIComponent(uri)}`, '_system');

// Trust Wallet  
window.open(`trust://wc?uri=${encodeURIComponent(uri)}`, '_system');
```

#### AliTerra Wallet
- Модалка с ручным вводом адреса
- Открывает wallet.aliterra.space
- Пользователь копирует адрес и вставляет вручную

---

### 2. UI/UX - РАБОТАЕТ ✅

#### Telegram-подобный интерфейс:
- ✅ Тёмная тема
- ✅ Список чатов с аватарами и статусами онлайн
- ✅ Индикатор непрочитанных сообщений
- ✅ Анимации (Framer Motion)
- ✅ Статусы прочтения (✓✓ синие/серые)
- ✅ SVG иконки + PNG логотипы

#### Модалки:
- ✅ Подключение кошелька (3 варианта с логотипами)
- ✅ AliTerra ручной ввод адреса
- ✅ Новый чат (ввод Ethereum адреса)
- ✅ Профиль (информация)
- ✅ Редактирование профиля (выбор аватара + имя)
- ✅ Deep links (кнопки открыть в MetaMask/Trust Wallet)

#### Функции чатов:
- ✅ Создание нового чата
- ✅ Удаление чата (long press → кнопка удаления)
- ✅ Отправка сообщений
- ✅ Симуляция доставки/прочтения

---

### 3. Локальные аватарки ✅

#### Расположение: `public/ava/`
- `ava (1).png` до `ava (22).png` - аватарки пользователей
- `metamask.png` - логотип MetaMask
- `trust.png` - логотип Trust Wallet
- `aliterra.png` - логотип AliTerra

#### Использование:
```typescript
const avatarOptions = [
  'ava (1)', 'ava (2)', 'ava (3)', /* ... */ 'ava (22)'
];

const getAvatarUrl = (seed: string) => {
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarOptions.length;
  return `/ava/${avatarOptions[index]}.png`;
};
```

---

### 4. XMTP (E2E сообщения) - ЧАСТИЧНО ✅

#### Сервис: `src/services/xmtpService.ts`
- Динамический импорт `@xmtp/xmtp-js`
- Инициализация при подключении кошелька
- Отправка/получение сообщений
- Подписка на входящие сообщения

#### Статусы:
- `disconnected` - кошелёк не подключён
- `connecting` - XMTP инициализируется
- `connected` - E2E активно

#### Известные проблемы:
- ⚠️ Долгая инициализация (может зависнуть)
- ⚠️ Нет fallback при ошибке

---

### 5. Смарт-контракты (Polygon Mainnet)

| Контракт | Адрес |
|----------|-------|
| LoginFactory | `0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8` |
| SocialWalletRegistry | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` |
| HybridMessenger | `0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5` |

---

### 6. Константы

- **WalletConnect Project ID**: `2de1d724533083c2ed68197548dead4e`
- **Chain ID**: 137 (Polygon Mainnet)
- **RPC**: `https://polygon-rpc.com`
- **APP_URL**: `https://chat.aliterra.space`

---

### 7. Стек технологий

| Технология | Версия | Назначение |
|------------|--------|------------|
| React + Vite + TypeScript | latest | UI |
| Zustand | ^5.0 | State management |
| @walletconnect/sign-client | ^2.23 | WalletConnect v2 |
| ethers.js | ^5.7 | Blockchain |
| @xmtp/xmtp-js | ^13.0 | E2E messaging |
| Framer Motion | latest | Анимации |
| Lucide React | latest | Иконки |

---

### 8. Структура проекта

```
mimo2.pro/
├── public/
│   └── ava/                    # Локальные аватарки и логотипы
│       ├── ava (1-22).png      # Аватарки пользователей
│       ├── metamask.png        # Логотип MetaMask
│       ├── trust.png           # Логотип Trust Wallet
│       └── aliterra.png        # Логотип AliTerra
├── src/
│   ├── App.tsx                 # Главный компонент ✅
│   ├── store/index.ts          # Zustand store с persist ✅
│   ├── hooks/
│   │   └── useWallet.ts        # ✅ РАБОЧИЙ хук подключения
│   └── services/
│       ├── walletService.ts    # Wallet service (устарел)
│       ├── xmtpService.ts      # XMTP (частично работает)
│       └── encryptionService.ts # E2E (заглушка)
├── capacitor.config.json       # Capacitor config ✅
├── .github/workflows/
│   └── build-web3gram-apk.yml # GitHub Actions APK ✅
├── CONTEXT.md                  # Этот файл ✅
└── package.json
```

---

### 9. GitHub Actions Workflow

```yaml
# .github/workflows/build-web3gram-apk.yml
# Java 21, Node 20, Kotlin fix
# Автоматическая сборка APK
```

---

### 10. История исправлений

| Дата | Проблема | Решение |
|------|----------|---------|
| - | Deep links не работали | `window.open(url, '_system')` в Capacitor |
| - | WC сессия зависала | Настоящий SignClient |
| - | QR код не отображался | Убрали QR, deep links |
| - | MetaMask лого сломан | SVG иконка → PNG локальный |
| - | Java 17 ошибка | Обновили до Java 21 |
| - | Kotlin duplicate classes | resolutionStrategy в build.gradle |
| - | dicebear API не загружался | Локальные PNG аватарки |
| ✅ | **MetaMask/Trust Wallet работают** | **WalletConnect SignClient + deep links** |
| ✅ | **AliTerra подключение** | **Модалка с ручным вводом адреса** |
| ✅ | **Редактирование профиля** | **Выбор аватара + имя** |
| ✅ | **Удаление чатов** | **Long press + кнопка удаления** |
| ✅ | **Локальные аватарки** | **PNG файлы в public/ava/** |

---

## ⚠️ ИЗВЕСТНЫЕ ПРОБЛЕМЫ

- **Состояние не сохраняется** - при перезапуске всё сбрасывается (нужен persist в Zustand)
- **XMTP зависает** - долгая инициализация, нет timeout
- **Лого приложения** - стандартное, нужно заменить на aliterra.png
- **Нет push уведомлений**
- **Нет оффлайн режима**

---

## 📋 ПЛАН РАЗРАБОТКИ

### 🔴 БЛОК 1: Сохранение состояния (СЕЙЧАС)
- localStorage persist для Zustand
- Сохранение подключённого кошелька
- Сохранение чатов и сообщений
- Сохранение профиля пользователя

### 🟡 БЛОК 2: Исправление XMTP
- Timeout для инициализации (10 секунд)
- Fallback при ошибке
- Retry механизм

### 🟡 БЛОК 3: Лого приложения
- Замена стандартного логотипа на aliterra.png
- Splash screen

### 🟢 БЛОК 4: Реальный XMTP
- Полная интеграция E2E
- Stream сообщений
- Кэширование

### 🟢 БЛОК 5: UX улучшения
- Поиск сообщений
- Индикатор набора
- Reply/Forward

### 🔵 БЛОК 6: Файлы и медиа
- Изображения через IPFS
- Голосовые сообщения

### 🔵 БЛОК 7: Безопасность
- Биометрия
- Авто-удаление

---

## 🔒 КРИТИЧЕСКИЙ КОД (НЕ ИЗМЕНЯТЬ!)

### useWallet.ts - ПОДКЛЮЧЕНИЕ КОШЕЛЬКОВ
```typescript
// ВЕСЬ ФАЙЛ src/hooks/useWallet.ts - НЕ ИЗМЕНЯТЬ СТРУКТУРУ!
```

### Deep Links формат
```typescript
metamask://wc?uri=${encodeURIComponent(uri)}
trust://wc?uri=${encodeURIComponent(uri)}
```

### Capacitor openUrl
```typescript
window.open(url, '_system'); // ВСЕГДА использовать в APK!
```

### Локальные аватарки
```typescript
const getAvatarUrl = (seed: string) => {
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 22;
  return `/ava/ava (${index + 1}).png`;
};
```
