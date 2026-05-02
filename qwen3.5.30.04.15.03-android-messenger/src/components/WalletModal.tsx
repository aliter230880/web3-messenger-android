import { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Loader2, Clipboard, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
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

// ── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'picker'       // wallet selection
  | 'connecting'   // waiting for MetaMask/Trust WC
  | 'aliterra'     // waiting for address from wallet.aliterra.space
  | 'connected';

// ── Component ────────────────────────────────────────────────────────────────

export function WalletModal() {
  const { isWalletModalOpen, toggleWalletModal } = useAppStore();
  const {
    connect, connectAliTerra, disconnect,
    isConnecting, isConnected, address,
    isCapacitor, hasMetaMask,
    openAliTerraWallet, cancelConnect,
  } = useWeb3Messenger();

  const [screen, setScreen] = useState<Screen>('picker');
  const [connectingFor, setConnectingFor] = useState<'metamask' | 'trust' | 'walletconnect' | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasteAddr, setPasteAddr] = useState('');
  const [aliTerraGotAddress, setAliTerraGotAddress] = useState('');
  const cancelAliTerraRef = useRef<(() => void) | null>(null);

  // Reset to picker when modal opens/closes
  useEffect(() => {
    if (!isWalletModalOpen) {
      setScreen(isConnected ? 'connected' : 'picker');
      setConnectError(null);
      setPasteAddr('');
      setAliTerraGotAddress('');
    } else {
      setScreen(isConnected ? 'connected' : 'picker');
    }
  }, [isWalletModalOpen, isConnected]);

  // ── Connect MetaMask / Trust (Capacitor deep link) ───────────────────────
  const handleConnect = async (wallet: 'metamask' | 'trust' | 'walletconnect') => {
    setConnectError(null);
    setConnectingFor(wallet);
    setScreen('connecting');
    try {
      await connect(wallet);
      setScreen('connected');
      setTimeout(() => toggleWalletModal(), 500);
    } catch (err: any) {
      setConnectError(err.message || 'Ошибка подключения');
      setScreen('picker');
    } finally {
      setConnectingFor(null);
    }
  };

  // ── Cancel WC deep link ───────────────────────────────────────────────────
  const handleCancelConnect = async () => {
    await cancelConnect();
    setConnectingFor(null);
    setConnectError(null);
    setScreen('picker');
  };

  // ── AliTerra: open site + wait for postMessage ────────────────────────────
  const handleOpenAliTerra = () => {
    setConnectError(null);
    setPasteAddr('');
    setAliTerraGotAddress('');
    setScreen('aliterra');

    const cancel = openAliTerraWallet((addr) => {
      // postMessage received automatically
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
    setScreen('connecting');
    setConnectingFor(null);
    try {
      await connectAliTerra(addr);
      setScreen('connected');
      setTimeout(() => toggleWalletModal(), 500);
    } catch (err: any) {
      setConnectError(err.message || 'Ошибка');
      setScreen('picker');
    }
  };

  // Try paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.startsWith('0x')) setPasteAddr(text.trim());
    } catch (_) {}
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
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

  // ── Wallet name helper ────────────────────────────────────────────────────
  const walletName = connectingFor === 'metamask' ? 'MetaMask'
    : connectingFor === 'trust' ? 'Trust Wallet'
    : 'WalletConnect';

  return (
    <AnimatePresence>
      {isWalletModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={screen === 'picker' || screen === 'connected' ? toggleWalletModal : undefined}
          />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#1c1c1e] rounded-t-3xl shadow-2xl z-50 max-h-[92vh] overflow-y-auto"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="w-9" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {screen === 'connected' ? 'Кошелёк подключён'
                  : screen === 'connecting' ? 'Подключение…'
                  : screen === 'aliterra' ? 'AliTerra Wallet'
                  : 'Подключить кошелёк'}
              </h2>
              <button
                onClick={
                  screen === 'connecting' ? handleCancelConnect
                  : screen === 'aliterra' ? handleCancelAliTerra
                  : toggleWalletModal
                }
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="px-5 pb-8 pt-4">

              {/* ═══════════════ CONNECTED ═══════════════ */}
              {screen === 'connected' && (
                <div className="space-y-5">
                  <div className="text-center py-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Подключено</h3>
                    <span className="inline-block mt-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium">
                      ✓ Polygon Mainnet
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Адрес кошелька</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300 flex-1 text-center">
                        {address?.slice(0, 10)}…{address?.slice(-8)}
                      </code>
                      <button onClick={copyAddress} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleDisconnect} className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 font-medium rounded-2xl transition-colors">
                    Отключить
                  </button>
                </div>
              )}

              {/* ═══════════════ CONNECTING (MetaMask/Trust deep link) ═══════════════ */}
              {screen === 'connecting' && (
                <div className="py-8 text-center space-y-5">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
                      {connectingFor === 'metamask' ? <MetaMaskIcon /> : connectingFor === 'trust' ? <TrustWalletIcon /> : <WalletConnectIcon />}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      Открываем {walletName}…
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Ожидаем подтверждение подключения
                    </p>
                  </div>

                  {connectingFor && connectingFor !== 'walletconnect' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl px-5 py-4 text-left space-y-2">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Шаги:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">1. Приложение {walletName} откроется автоматически</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">2. Нажмите <b>«Подключить»</b> / <b>«Confirm»</b> в кошельке</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">3. Вернитесь в Web3Gram — подключение завершится</p>
                    </div>
                  )}

                  <button
                    onClick={handleCancelConnect}
                    className="px-8 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              )}

              {/* ═══════════════ ALITERRA — address pull ═══════════════ */}
              {screen === 'aliterra' && (
                <div className="space-y-4 py-2">
                  {/* Status */}
                  <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0">
                      <AliTerraIcon />
                    </div>
                    <div>
                      {aliTerraGotAddress ? (
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Адрес получен автоматически
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            wallet.aliterra.space открыт
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Войдите в кошелёк — адрес подтянется сам
                          </p>
                        </>
                      )}
                    </div>
                    {!aliTerraGotAddress && (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin ml-auto shrink-0" />
                    )}
                  </div>

                  {/* Re-open link */}
                  <button
                    onClick={() => window.open('https://wallet.aliterra.space/?from=web3gram', 'aliterra_wallet', 'width=440,height=680,noopener=false')}
                    className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть wallet.aliterra.space снова
                  </button>

                  {/* Address field */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Адрес кошелька (вставьте вручную если не определился автоматически):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pasteAddr}
                        onChange={(e) => setPasteAddr(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={handlePasteFromClipboard}
                        title="Вставить из буфера"
                        className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Clipboard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {connectError && (
                    <p className="text-sm text-red-500 text-center">{connectError}</p>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirmAliTerra}
                    disabled={!pasteAddr.trim() && !aliTerraGotAddress}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold rounded-2xl transition-colors"
                  >
                    Подключить адрес
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button onClick={handleCancelAliTerra} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                    Отмена
                  </button>
                </div>
              )}

              {/* ═══════════════ WALLET PICKER ═══════════════ */}
              {screen === 'picker' && (
                <div className="space-y-3">
                  {connectError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
                      {connectError}
                    </div>
                  )}

                  {/* ── Mobile / Capacitor ── */}
                  {isCapacitor ? (
                    <>
                      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-1">
                        Выберите кошелёк — приложение откроется автоматически
                      </p>

                      {/* MetaMask */}
                      <WalletBtn
                        onClick={() => handleConnect('metamask')}
                        bg="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        icon={<MetaMaskIcon />}
                        title="MetaMask"
                        subtitle="Открывает приложение MetaMask напрямую"
                      />

                      {/* Trust Wallet */}
                      <WalletBtn
                        onClick={() => handleConnect('trust')}
                        bg="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        icon={<TrustWalletIcon />}
                        title="Trust Wallet"
                        subtitle="Открывает приложение Trust Wallet напрямую"
                      />

                      {/* Divider */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                        <span className="text-xs text-gray-400">или</span>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      </div>

                      {/* AliTerra */}
                      <WalletBtn
                        onClick={handleOpenAliTerra}
                        bg="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                        icon={<AliTerraIcon />}
                        title="AliTerra Wallet"
                        subtitle="Адрес подтянется автоматически из wallet.aliterra.space"
                      />
                    </>

                  ) : (
                    /* ── Desktop / Web ── */
                    <>
                      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-1">
                        Подключитесь к Web3Gram на Polygon Mainnet
                      </p>

                      {/* WalletConnect QR (desktop primary) */}
                      <WalletBtn
                        onClick={() => handleConnect('walletconnect')}
                        bg="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        icon={<WalletConnectIcon />}
                        title="WalletConnect"
                        subtitle="QR-код для MetaMask, Trust и любых других кошельков"
                      />

                      {/* MetaMask extension */}
                      <WalletBtn
                        onClick={() => handleConnect('metamask')}
                        bg="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        icon={<MetaMaskIcon />}
                        title="MetaMask"
                        subtitle={hasMetaMask ? '✓ Расширение установлено' : 'Расширение для браузера'}
                      />

                      {/* AliTerra */}
                      <WalletBtn
                        onClick={handleOpenAliTerra}
                        bg="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                        icon={<AliTerraIcon />}
                        title="AliTerra Wallet"
                        subtitle="Адрес подтянется автоматически из wallet.aliterra.space"
                        badge={<ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />}
                      />
                    </>
                  )}

                  <p className="text-xs text-center text-gray-300 dark:text-gray-600 px-4 pt-1">
                    Подключая кошелёк, вы соглашаетесь с условиями использования
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

function WalletBtn({
  onClick, bg, icon, title, subtitle, badge,
}: {
  onClick: () => void;
  bg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 py-3.5 px-4 ${bg} text-gray-800 dark:text-white rounded-2xl transition-all active:scale-[.98] hover:opacity-90`}
    >
      {icon}
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>
      </div>
      {badge}
    </button>
  );
}
