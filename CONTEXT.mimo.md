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
