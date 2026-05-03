import { useState, useRef, useEffect, useCallback } from 'react';
import * as QRCode from 'qrcode';
import { X, Copy, Check, Loader2, Clipboard, Smartphone, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { walletService } from '../services/walletService';
import { motion, AnimatePresence } from 'framer-motion';

// ── Wallet icons ─────────────────────────────────────────────────────────────

const MetaMaskIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
    <path d="M36.1 3L22.1 13.3l2.6-6.1L36.1 3z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.9 3l13.9 10.4-2.5-6.1L3.9 3z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M31 27.1l-3.7 5.7 8 2.2 2.3-7.7-6.6-.2zM2.4 27.3l2.2 7.7 8-2.2-3.7-5.7-6.5.2z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.2 17.8l-2.2 3.3 7.8.4-.3-8.4-5.3 4.7zM27.8 17.8l-5.4-4.8-.2 8.5 7.8-.4-2.2-3.3zM12.6 32.8l4.7-2.3-4-3.1-.7 5.4zM22.7 30.5l4.7 2.3-.8-5.4-3.9 3.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M27.4 32.8l-4.7-2.3.4 3.2-.1 2.9 4.4-5.8zM12.6 32.8l4.4 5.8-.1-2.9.4-3.2-4.7 2.3z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.1 25.1l-3.9-1.1 2.7-1.3 1.2 2.4zM22.9 25.1l1.2-2.4 2.8 1.3-4 1.1z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.6 32.8l.7-5.7-4.4.1 3.7 5.6zM26.7 27.1l.7 5.7 3.7-5.6-4.4-.1zM30.6 21.1l-7.8.4.7 4 1.2-2.4 2.8 1.3 3.1-3.3zM13.2 24l2.8-1.3 1.2 2.4.7-4-7.8-.4 3.1 3.3z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 21.1l3.3 6.4-.1-3.2L10 21.1zM26.8 24.3l-.2 3.2 3.3-6.4-3.1 3.2zM17.9 21.5l-.7 4 .9 4.5.2-5.9-.4-2.6zM22.1 21.5l-.4 2.5.2 5.9.9-4.5-.7-3.9z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.9 25.1l-.9 4.5.7.5 4-3.1.2-3.2-4 1.3zM13.2 24l.1 3.2 4 3.1.7-.5-.9-4.5-3.9-1.3z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 38.6l.1-2.9-.3-.3h-5.6l-.3.3.1 2.9-4.4-5.8 1.5 1.2 6.2.4 6.2-.4 1.5-1.2L23 38.6z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.7 30.5l-.7-.5h-4l-.7.5-.4 3.2.3-.3h5.6l.3.3-.4-3.2z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M36.7 13.9l1.2-5.6L36.1 3l-13.4 10 5 4.2 7.1 2.1 1.6-1.8-.7-.5 1.1-1-.8-.6 1.1-.8-.4-.7zM2.1 8.3l1.2 5.6-.8.6 1.1.8-.8.6 1.1 1-.7.5 1.5 1.8 7.1-2.1 5-4.2L3.9 3 2.1 8.3z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35.8 20l-7.1-2.1 2.2 3.3-3.3 6.4 4.3-.1h6.5L35.8 20zM11.3 17.9L4.2 20l-2.6 7.5h6.5l4.3.1-3.3-6.4 2.2-3.3zM22.8 21.5l.5-8.4 2.1-5.7h-10.7l2.1 5.7.5 8.4.2 2.6v5.9h4l.1-5.9.2-2.6z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WalletConnectIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
    <rect width="40" height="40" rx="10" fill="#3B99FC"/>
    <path d="M12.5 15.8c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.5-2.8-10.4 0l-.7.7c-.1.1-.3.1-.4 0l-1.7-1.7c-.2-.2-.2-.5 0-.7l.5-.5zm18.5 3.4l1.5 1.5c.2.2.2.5 0 .7l-6.8 6.6c-.2.2-.5.2-.7 0l-4.8-4.7c-.1-.1-.2-.1-.3 0l-4.8 4.7c-.2.2-.5.2-.7 0L7.5 21.4c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.3 0l4.8-4.7c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.3 0l4.8-4.7c.2-.2.5-.2.7 0z" fill="white"/>
  </svg>
);

const TrustWalletIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
    <rect width="40" height="40" rx="10" fill="#3375BB"/>
    <path d="M20 8l10 4.5v9c0 5.5-4.5 10-10 11-5.5-1-10-5.5-10-11v-9L20 8z" fill="white" fillOpacity=".15"/>
    <path d="M20 10.5l8 3.6v7.4c0 4.4-3.6 8-8 8.8-4.4-.8-8-4.4-8-8.8v-7.4l8-3.6z" fill="white"/>
    <path d="M16.5 20l2.5 2.5 5-5" stroke="#3375BB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AliTerraIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
    <rect width="40" height="40" rx="10" fill="#0f0f1a"/>
    <circle cx="20" cy="20" r="9" stroke="#fbbf24" strokeWidth="1.8" fill="none"/>
    <path d="M20 11v18M11 20h18" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="3" fill="#fbbf24"/>
  </svg>
);

// ── Screen types ─────────────────────────────────────────────────────────────

type Screen =
  | 'picker'
  | 'initializing'
  | 'qr'
  | 'waiting'
  | 'checking'
  | 'aliterra'
  | 'connected';

// ── Component ────────────────────────────────────────────────────────────────

export function WalletModal() {
  const { isWalletModalOpen, toggleWalletModal } = useAppStore();
  const {
    connect, connectAliTerra, disconnect,
    checkAndFinishSession,
    isConnecting, isConnected, address,
    isCapacitor, hasMetaMask,
    openAliTerraWallet, cancelConnect,
  } = useWeb3Messenger();

  const [screen, setScreen] = useState<Screen>('picker');
  const [connectingFor, setConnectingFor] = useState<'metamask' | 'trust' | 'walletconnect' | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wcUri, setWcUri] = useState('');
  const [uriCopied, setUriCopied] = useState(false);
  const [pasteAddr, setPasteAddr] = useState('');
  const [aliTerraGotAddress, setAliTerraGotAddress] = useState('');
  const [deepLinkOpened, setDeepLinkOpened] = useState(false);
  const [checkingMsg, setCheckingMsg] = useState('');
  const cancelAliTerraRef = useRef<(() => void) | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Render QR code locally ────────────────────────────────────────────────
  useEffect(() => {
    if (!wcUri) return;
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, wcUri, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).catch(console.error);
  }, [wcUri, screen]);

  // ── Auto-reconnect relay when returning from wallet app ──────────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      if ((screen === 'waiting' || screen === 'qr') && wcUri) {
        walletService.reconnectRelay().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [screen, wcUri]);

  useEffect(() => {
    if (!isWalletModalOpen) {
      setScreen(isConnected ? 'connected' : 'picker');
      setConnectError(null);
      setWcUri('');
      setPasteAddr('');
      setAliTerraGotAddress('');
      setDeepLinkOpened(false);
    } else {
      setScreen(isConnected ? 'connected' : 'picker');
    }
  }, [isWalletModalOpen, isConnected]);

  // ── Connect MetaMask / Trust / WalletConnect ──────────────────────────────
  const handleConnect = async (wallet: 'metamask' | 'trust' | 'walletconnect') => {
    setConnectError(null);
    setConnectingFor(wallet);
    setWcUri('');
    setDeepLinkOpened(false);
    setScreen('initializing');

    walletService.onDisplayUri = (uri: string) => {
      setWcUri(uri);
      setScreen('qr');
    };

    connect(wallet)
      .then(() => {
        setScreen('connected');
        setTimeout(() => toggleWalletModal(), 600);
      })
      .catch((err: any) => {
        setConnectError(err.message || 'Ошибка подключения');
        setScreen('picker');
      })
      .finally(() => {
        setConnectingFor(null);
        walletService.onDisplayUri = null;
      });
  };

  const handleCancelConnect = async () => {
    walletService.onDisplayUri = null;
    await cancelConnect();
    setConnectingFor(null);
    setConnectError(null);
    setWcUri('');
    setDeepLinkOpened(false);
    setScreen('picker');
  };

  // Open wallet via deep link — works on mobile/APK
  const handleOpenInWallet = (wallet: 'metamask' | 'trust' | 'walletconnect') => {
    if (!wcUri) return;
    const ok = walletService.openDeepLink(wcUri, wallet);
    if (ok) {
      setDeepLinkOpened(true);
      setScreen('waiting');
    }
  };

  // ── "I confirmed in MetaMask" — manual session check ─────────────────────
  //
  // Problem: After approving in MetaMask and returning, connect() may not
  // resolve because the relay WebSocket disconnected in background.
  // This button bypasses connect() and directly queries eth_accounts.
  //
  const handleIConfirmed = useCallback(async () => {
    if (!connectingFor) return;
    setScreen('checking');
    setCheckingMsg('Проверяем сессию с ' + (connectingFor === 'metamask' ? 'MetaMask' : connectingFor === 'trust' ? 'Trust Wallet' : 'кошельком') + '…');

    try {
      const ok = await checkAndFinishSession(connectingFor);
      if (ok) {
        setScreen('connected');
        setConnectingFor(null);
        setTimeout(() => toggleWalletModal(), 700);
      } else {
        // Session not found — relay may need more time, send back to waiting
        setConnectError('Подтверждение ещё не получено. Убедитесь что нажали «Подключить» в кошельке и повторите.');
        setScreen('waiting');
      }
    } catch (err: any) {
      setConnectError(err.message || 'Ошибка при проверке сессии');
      setScreen('waiting');
    }
  }, [connectingFor, checkAndFinishSession, toggleWalletModal]);

  // User pressed "show QR again" after returning from wallet
  const handleReturnedFromWallet = useCallback(async () => {
    setScreen(wcUri ? 'qr' : 'initializing');
    await walletService.reconnectRelay();
  }, [wcUri]);

  // ── AliTerra ──────────────────────────────────────────────────────────────
  const handleOpenAliTerra = () => {
    setConnectError(null);
    setPasteAddr('');
    setAliTerraGotAddress('');

    if (isCapacitor) {
      openAliTerraWallet(() => {});
      return;
    }

    setScreen('aliterra');
    const cancel = openAliTerraWallet((addr) => {
      setAliTerraGotAddress(addr);
      setPasteAddr(addr);
    });
    cancelAliTerraRef.current = cancel;
  };

  const handleCancelAliTerra = () => {
    cancelAliTerraRef.current?.();
    cancelAliTerraRef.current = null;
    setScreen('picker');
    setConnectError(null);
    setPasteAddr('');
    setAliTerraGotAddress('');
  };

  const handleConfirmAliTerra = async () => {
    const addr = (pasteAddr || aliTerraGotAddress).trim();
    if (!addr.startsWith('0x') || addr.length < 40) {
      setConnectError('Введите корректный Ethereum адрес (0x...)');
      return;
    }
    cancelAliTerraRef.current?.();
    cancelAliTerraRef.current = null;
    setConnectError(null);
    setScreen('initializing');
    try {
      await connectAliTerra(addr);
      setScreen('connected');
      setTimeout(() => toggleWalletModal(), 600);
    } catch (err: any) {
      setConnectError(err.message || 'Ошибка');
      setScreen('picker');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.startsWith('0x')) setPasteAddr(text.trim());
    } catch (_) {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const copyWcUri = () => {
    if (wcUri) {
      navigator.clipboard.writeText(wcUri).catch(() => {});
      setUriCopied(true);
      setTimeout(() => setUriCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setScreen('picker');
    toggleWalletModal();
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isMobileOrCapacitor = isCapacitor || walletService.isMobile();

  const walletLabel =
    connectingFor === 'metamask' ? 'MetaMask'
    : connectingFor === 'trust' ? 'Trust Wallet'
    : 'WalletConnect';

  const screenTitle =
    screen === 'connected' ? 'Кошелёк подключён'
    : screen === 'initializing' ? `Подготовка ${walletLabel}…`
    : screen === 'qr' ? 'Подключить кошелёк'
    : screen === 'waiting' ? 'Ожидание подтверждения…'
    : screen === 'checking' ? 'Проверяем сессию…'
    : screen === 'aliterra' ? 'AliTerra Wallet'
    : 'Подключить кошелёк';

  const isInProgress = screen === 'initializing' || screen === 'qr' || screen === 'waiting' || screen === 'checking';

  return (
    <AnimatePresence>
      {isWalletModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={!isInProgress && screen !== 'aliterra' ? toggleWalletModal : undefined}
          />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#1c1c1e] rounded-t-3xl shadow-2xl z-50 max-h-[92vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-3 mb-1" />

            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="w-9" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {screenTitle}
              </h2>
              <button
                onClick={
                  isInProgress ? handleCancelConnect
                  : screen === 'aliterra' ? handleCancelAliTerra
                  : toggleWalletModal
                }
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="px-5 pb-8 pt-4">

              {/* ═══ CONNECTED ══════════════════════════════════════════════ */}
              {screen === 'connected' && (
                <div className="space-y-5">
                  <div className="text-center py-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Подключено!</h3>
                    <span className="inline-block mt-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium">
                      ✓ Polygon Mainnet
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Адрес кошелька</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300 flex-1 text-center break-all">
                        {address?.slice(0, 10)}…{address?.slice(-8)}
                      </code>
                      <button onClick={copyAddress} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors shrink-0">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleDisconnect} className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 font-medium rounded-2xl transition-colors">
                    Отключить
                  </button>
                </div>
              )}

              {/* ═══ INITIALIZING ═══════════════════════════════════════════ */}
              {screen === 'initializing' && (
                <div className="py-10 flex flex-col items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      {connectingFor === 'metamask' ? <MetaMaskIcon />
                        : connectingFor === 'trust' ? <TrustWalletIcon />
                        : <WalletConnectIcon />}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      Генерируем QR-код…
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Соединяемся с {walletLabel} через WalletConnect
                    </p>
                  </div>
                  <button onClick={handleCancelConnect} className="px-8 py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-700 rounded-xl">
                    Отмена
                  </button>
                </div>
              )}

              {/* ═══ CHECKING SESSION ═══════════════════════════════════════ */}
              {screen === 'checking' && (
                <div className="py-10 flex flex-col items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      {connectingFor === 'metamask' ? <MetaMaskIcon />
                        : connectingFor === 'trust' ? <TrustWalletIcon />
                        : <WalletConnectIcon />}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {checkingMsg || 'Проверяем сессию…'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Запрашиваем адрес у кошелька…
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ QR CODE ════════════════════════════════════════════════ */}
              {screen === 'qr' && (
                <div className="space-y-4 py-2">

                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                      <canvas
                        ref={qrCanvasRef}
                        width={220}
                        height={220}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Mobile/Capacitor: show "Open in wallet" buttons */}
                  {isMobileOrCapacitor ? (
                    <>
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Нажмите кнопку ниже, чтобы открыть кошелёк
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(connectingFor === 'metamask' || connectingFor === 'walletconnect') && (
                          <button
                            onClick={() => handleOpenInWallet('metamask')}
                            className="flex items-center justify-center gap-2 py-3.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition-colors"
                          >
                            <MetaMaskIcon />
                            <span>MetaMask</span>
                          </button>
                        )}
                        {(connectingFor === 'trust' || connectingFor === 'walletconnect') && (
                          <button
                            onClick={() => handleOpenInWallet('trust')}
                            className="flex items-center justify-center gap-2 py-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            <TrustWalletIcon />
                            <span>Trust</span>
                          </button>
                        )}
                        {connectingFor === 'metamask' && (
                          <button
                            onClick={() => handleOpenInWallet('trust')}
                            className="flex items-center justify-center gap-2 py-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            <TrustWalletIcon />
                            <span>Trust</span>
                          </button>
                        )}
                        {connectingFor === 'trust' && (
                          <button
                            onClick={() => handleOpenInWallet('metamask')}
                            className="flex items-center justify-center gap-2 py-3.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition-colors"
                          >
                            <MetaMaskIcon />
                            <span>MetaMask</span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center">
                      <Smartphone className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        Отсканируйте QR кодом в MetaMask или Trust Wallet
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        В кошельке: WalletConnect → Сканировать QR
                      </p>
                    </div>
                  )}

                  <button
                    onClick={copyWcUri}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                  >
                    {uriCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {uriCopied ? 'Скопировано!' : 'Скопировать WC URI'}
                  </button>

                  <button onClick={handleCancelConnect} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                    Отмена
                  </button>
                </div>
              )}

              {/* ═══ WAITING FOR WALLET APPROVAL ════════════════════════════ */}
              {screen === 'waiting' && (
                <div className="py-6 flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                      {connectingFor === 'metamask' ? <MetaMaskIcon />
                        : connectingFor === 'trust' ? <TrustWalletIcon />
                        : <WalletConnectIcon />}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      Подтвердите в {walletLabel}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Нажмите «Подключить» в кошельке, затем вернитесь сюда
                    </p>
                  </div>

                  {connectError && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 w-full text-left">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{connectError}</p>
                    </div>
                  )}

                  {/* ── KEY BUTTON: I confirmed in wallet ── */}
                  <button
                    onClick={handleIConfirmed}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-base font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Я подтвердил в {walletLabel} — завершить
                  </button>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3 w-full text-left space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Инструкция</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">1. В {walletLabel} нажмите <b>Подключить</b></p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">2. Вернитесь в это приложение</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">3. Нажмите зелёную кнопку выше</p>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleReturnedFromWallet}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Показать QR снова
                    </button>
                    <button
                      onClick={handleCancelConnect}
                      className="px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-2xl text-sm transition-colors"
                    >
                      Отмена
                    </button>
                  </div>

                  {/* Retry deep link */}
                  {deepLinkOpened && wcUri && (
                    <div className="flex gap-2 w-full">
                      {connectingFor !== 'trust' && (
                        <button
                          onClick={() => walletService.openDeepLink(wcUri, 'metamask')}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl text-xs font-medium text-orange-700 dark:text-orange-300"
                        >
                          <MetaMaskIcon />
                          Открыть MetaMask снова
                        </button>
                      )}
                      {connectingFor !== 'metamask' && (
                        <button
                          onClick={() => walletService.openDeepLink(wcUri, 'trust')}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs font-medium text-blue-700 dark:text-blue-300"
                        >
                          <TrustWalletIcon />
                          Открыть Trust снова
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ ALITERRA SCREEN ════════════════════════════════════════ */}
              {screen === 'aliterra' && (
                <div className="space-y-5 py-2">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0f0f1a] mb-3">
                      <AliTerraIcon />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {aliTerraGotAddress
                        ? 'Адрес получен! Нажмите «Подключить»'
                        : 'Сайт AliTerra открылся в новой вкладке. Войдите там и вернитесь сюда.'}
                    </p>
                  </div>

                  {aliTerraGotAddress && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 text-center">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono break-all">
                        {aliTerraGotAddress}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Или вставьте адрес вручную
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={pasteAddr}
                        onChange={(e) => setPasteAddr(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={handlePasteFromClipboard}
                        className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Вставить из буфера"
                      >
                        <Clipboard className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {connectError && (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{connectError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmAliTerra}
                    disabled={!pasteAddr && !aliTerraGotAddress}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-medium rounded-2xl transition-colors"
                  >
                    Подключить
                  </button>
                  <button onClick={handleCancelAliTerra} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                    Отмена
                  </button>
                </div>
              )}

              {/* ═══ PICKER ══════════════════════════════════════════════════ */}
              {screen === 'picker' && (
                <div className="space-y-3">

                  {connectError && (
                    <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{connectError}</p>
                    </div>
                  )}

                  {/* MetaMask */}
                  <button
                    onClick={() => handleConnect('metamask')}
                    className="w-full flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl transition-all group"
                  >
                    <MetaMaskIcon />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">MetaMask</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {!isCapacitor && hasMetaMask
                          ? 'Подключить через расширение браузера'
                          : 'Открыть через WalletConnect'}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 dark:border-orange-600 group-hover:border-orange-500 flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  {/* Trust Wallet */}
                  <button
                    onClick={() => handleConnect('trust')}
                    className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl transition-all group"
                  >
                    <TrustWalletIcon />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Trust Wallet</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Открыть через WalletConnect</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-blue-300 dark:border-blue-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  {/* WalletConnect (generic) */}
                  <button
                    onClick={() => handleConnect('walletconnect')}
                    className="w-full flex items-center gap-4 p-4 bg-[#3B99FC]/5 hover:bg-[#3B99FC]/10 border border-[#3B99FC]/20 rounded-2xl transition-all group"
                  >
                    <WalletConnectIcon />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">WalletConnect</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Любой совместимый кошелёк</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-[#3B99FC]/40 group-hover:border-[#3B99FC] flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-[#3B99FC] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  {/* AliTerra */}
                  <button
                    onClick={handleOpenAliTerra}
                    className="w-full flex items-center gap-4 p-4 bg-[#0f0f1a]/5 hover:bg-[#0f0f1a]/10 dark:bg-white/5 dark:hover:bg-white/10 border border-amber-200 dark:border-amber-800 rounded-2xl transition-all group"
                  >
                    <AliTerraIcon />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">AliTerra Wallet</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Войдите через AliTerra</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-amber-300 dark:border-amber-600 group-hover:border-amber-500 flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
                    Polygon Mainnet · WalletConnect v2 · E2E шифрование
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
