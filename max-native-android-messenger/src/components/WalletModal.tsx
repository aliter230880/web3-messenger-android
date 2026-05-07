import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { walletService, WalletConnection } from '../services/walletService';
import { shortenAddress, isValidEthAddress } from '../utils/helpers';
import { getDemoChats } from '../services/demoService';
import { X, Copy, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Screen = 'picker' | 'connecting' | 'qr' | 'waiting' | 'checking' | 'aliterra' | 'connected';
type WalletChoice = 'metamask' | 'trust' | 'walletconnect' | 'aliterra' | 'demo';

const WALLETS: Record<WalletChoice, { name: string; icon: string; color: string }> = {
  metamask:      { name: 'MetaMask',      icon: '🦊', color: '#E2761B' },
  trust:         { name: 'Trust Wallet',  icon: '🛡️', color: '#3375BB' },
  walletconnect: { name: 'WalletConnect', icon: '🔗', color: '#3B99FC' },
  aliterra:      { name: 'AliTerra',      icon: '🌍', color: '#10B981' },
  demo:          { name: 'Демо',          icon: '🎮', color: '#8B5CF6' },
};

export function WalletModal() {
  const isOpen      = useAppStore((s) => s.isWalletModalOpen);
  const toggleModal = useAppStore((s) => s.toggleWalletModal);
  const wallet      = useAppStore((s) => s.wallet);
  const setWallet   = useAppStore((s) => s.setWallet);
  const setUser     = useAppStore((s) => s.setCurrentUser);
  const setChats    = useAppStore((s) => s.setChats);

  const [screen, setScreen]           = useState<Screen>('picker');
  const [activeWallet, setActive]     = useState<WalletChoice>('metamask');
  const [wcUri, setWcUri]             = useState('');
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);
  const [aliAddress, setAliAddress]   = useState('');
  const [aliAuto, setAliAuto]         = useState('');

  const aliRef = useRef<((e: MessageEvent) => void) | null>(null);

  // ─── Финализация ────────────────────────────────────────────────────────
  const finishConnect = useCallback((address: string) => {
    setWallet({ isConnected: true, address, chainId: 137 });
    setUser({
      id: 'current',
      name: shortenAddress(address),
      avatar: address.slice(2, 4).toUpperCase(),
      walletAddress: address,
      isOnline: true,
    });
    if (useAppStore.getState().chats.length === 0) setChats(getDemoChats());
    setScreen('connected');
    setError('');
  }, [setWallet, setUser, setChats]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setScreen(wallet.isConnected ? 'connected' : 'picker');
      setError(''); setWcUri(''); setAliAddress(''); setAliAuto('');
    }
    return () => {
      if (aliRef.current) { window.removeEventListener('message', aliRef.current); aliRef.current = null; }
    };
  }, [isOpen, wallet.isConnected]);

  // AliTerra postMessage listener
  useEffect(() => {
    if (screen !== 'aliterra') return;
    const handler = (ev: MessageEvent) => {
      const addr = ev.data?.address;
      if (addr && typeof addr === 'string' && addr.startsWith('0x')) {
        setAliAuto(addr); setAliAddress(addr);
      }
    };
    aliRef.current = handler;
    window.addEventListener('message', handler);
    // Check URL params
    const p = new URLSearchParams(window.location.search);
    const a = p.get('address') || p.get('wallet') || p.get('w3g_addr');
    if (a?.startsWith('0x')) { setAliAuto(a); setAliAddress(a); window.history.replaceState({}, '', window.location.pathname); }
    return () => { window.removeEventListener('message', handler); aliRef.current = null; };
  }, [screen]);

  // ─── Подключение ────────────────────────────────────────────────────────
  // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: MetaMask, Trust, WalletConnect — ВСЕГДА через
  // WalletConnect v2. Это откроет приложение кошелька на смартфоне.
  // Injected provider (расширение) НЕ используется здесь.
  const handleConnect = useCallback(async (choice: WalletChoice) => {
    setError(''); setActive(choice); setWcUri('');

    if (choice === 'demo') {
      setScreen('connecting');
      await new Promise(r => setTimeout(r, 500));
      finishConnect('0xDEMO' + Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(36, '0'));
      return;
    }

    if (choice === 'aliterra') {
      setScreen('aliterra'); setAliAddress(''); setAliAuto('');
      return;
    }

    // === WalletConnect flow для MetaMask / Trust / WalletConnect ===
    setScreen('connecting');

    try {
      await walletService.initWalletConnect(
        // onUri: QR / deep link URI готов
        (uri: string) => {
          setWcUri(uri);

          // Если конкретный кошелёк — сразу открываем его
          if (choice === 'metamask' || choice === 'trust') {
            walletService.openWalletWithUri(uri, choice);
            setScreen('waiting');
          } else {
            // WalletConnect generic — показываем выбор
            setScreen('qr');
          }
        },
        // onConnect: подключились!
        (conn: WalletConnection) => {
          finishConnect(conn.address);
        },
      );
    } catch (e: any) {
      setError(e.message || 'Ошибка WalletConnect');
      setScreen('picker');
    }
  }, [finishConnect]);

  // Открыть кошелёк повторно
  const handleOpenWallet = useCallback((target: 'metamask' | 'trust') => {
    if (!wcUri) return;
    walletService.openWalletWithUri(wcUri, target);
    setScreen('waiting');
  }, [wcUri]);

  // «Я подтвердил»
  const handleCheckSession = useCallback(async () => {
    setScreen('checking'); setError('');
    try {
      const conn = await walletService.checkSession();
      if (conn) {
        finishConnect(conn.address);
      } else {
        setError('Подключение не найдено. Подтвердите в кошельке и попробуйте ещё раз.');
        setScreen('waiting');
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка'); setScreen('waiting');
    }
  }, [finishConnect]);

  // AliTerra
  const handleAliConnect = useCallback(() => {
    const addr = aliAddress.trim();
    if (!addr) { setError('Введите адрес'); return; }
    if (!isValidEthAddress(addr)) { setError('Некорректный адрес'); return; }
    finishConnect(addr);
  }, [aliAddress, finishConnect]);

  const handlePaste = useCallback(async () => {
    try { const t = await navigator.clipboard.readText(); if (t?.startsWith('0x')) setAliAddress(t.trim()); } catch {}
  }, []);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    await walletService.cleanup();
    setWallet({ isConnected: false, address: null, chainId: null });
    setUser({ id: 'current', name: 'Пользователь', avatar: 'П', isOnline: true });
    setChats([]); localStorage.removeItem('w3g_address'); setScreen('picker');
  }, [setWallet, setUser, setChats]);

  const handleCopy = useCallback(() => {
    if (wallet.address) { navigator.clipboard.writeText(wallet.address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, [wallet.address]);

  const handleClose = useCallback(() => {
    if (screen !== 'connected') walletService.cleanup();
    toggleModal();
  }, [screen, toggleModal]);

  const goBack = useCallback(() => { walletService.cleanup(); setScreen('picker'); setError(''); }, []);

  const info = WALLETS[activeWallet];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={screen === 'aliterra' ? undefined : handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 sm:p-4"
          >
            <div className="bg-white dark:bg-[#17212b] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-[#17212b] z-10">
                {screen !== 'picker' && screen !== 'connected' && (
                  <button onClick={goBack} className="p-1.5 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                <h2 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {screen === 'picker' && 'Подключение'}
                  {screen === 'connecting' && 'Подключение...'}
                  {screen === 'qr' && 'Выберите кошелёк'}
                  {screen === 'waiting' && 'Подтвердите в кошельке'}
                  {screen === 'checking' && 'Проверка...'}
                  {screen === 'aliterra' && 'AliTerra Wallet'}
                  {screen === 'connected' && 'Кошелёк подключён'}
                </h2>
                <button onClick={handleClose} className="p-1.5 -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{error}</span>
                  </div>
                )}

                {/* ═══ PICKER ══════════════════════════════════════════════ */}
                {screen === 'picker' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Выберите кошелёк — приложение откроется на смартфоне
                    </p>
                    {(['metamask', 'trust', 'walletconnect', 'aliterra', 'demo'] as WalletChoice[]).map((w) => (
                      <button key={w} onClick={() => handleConnect(w)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]">
                        <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: WALLETS[w].color + '15' }}>
                          {WALLETS[w].icon}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{WALLETS[w].name}</span>
                      </button>
                    ))}
                    <p className="text-xs text-gray-400 text-center pt-2">Polygon Mainnet · WalletConnect v2</p>
                  </div>
                )}

                {/* ═══ CONNECTING ══════════════════════════════════════════ */}
                {screen === 'connecting' && (
                  <div className="py-14 text-center">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: info.color + '15' }}>
                      <span className="text-4xl">{info.icon}</span>
                    </div>
                    <Loader2 className="w-8 h-8 mx-auto mb-3 text-tg-blue animate-spin" />
                    <p className="text-gray-700 dark:text-gray-200 font-medium">Подключение к {info.name}...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Генерируем QR-код</p>
                  </div>
                )}

                {/* ═══ QR / OPEN WALLET (generic WalletConnect) ═══════════ */}
                {screen === 'qr' && wcUri && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 text-center">
                      Выберите приложение кошелька:
                    </p>
                    <div className="space-y-3">
                      <button onClick={() => handleOpenWallet('metamask')}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl text-white font-semibold shadow-lg active:scale-95 transition-transform"
                        style={{ background: WALLETS.metamask.color }}>
                        <span className="text-2xl">🦊</span> Открыть MetaMask
                      </button>
                      <button onClick={() => handleOpenWallet('trust')}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl text-white font-semibold shadow-lg active:scale-95 transition-transform"
                        style={{ background: WALLETS.trust.color }}>
                        <span className="text-2xl">🛡️</span> Открыть Trust Wallet
                      </button>
                    </div>
                    <div className="text-center pt-2">
                      <p className="text-xs text-gray-400 mb-2">Или отсканируйте в кошельке:</p>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 font-mono break-all select-all">{wcUri}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ WAITING ═════════════════════════════════════════════ */}
                {screen === 'waiting' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: info.color + '15' }}>
                        <span className="text-3xl">{info.icon}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">Подтвердите в {info.name}</p>
                      <p className="text-sm text-gray-500 mt-1">Нажмите «Подключить» в приложении кошелька</p>
                    </div>

                    <button onClick={handleCheckSession}
                      className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                      <CheckCircle2 className="w-6 h-6" />
                      Я подтвердил — завершить
                    </button>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm space-y-2">
                      <p className="font-semibold text-blue-800 dark:text-blue-200">Инструкция:</p>
                      <p className="text-blue-700 dark:text-blue-300">1. Откройте {info.name} (если не открылся)</p>
                      <p className="text-blue-700 dark:text-blue-300">2. Подтвердите подключение</p>
                      <p className="text-blue-700 dark:text-blue-300">3. Вернитесь сюда → зелёная кнопка</p>
                    </div>

                    {wcUri && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleOpenWallet('metamask')}
                          className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-transform">
                          🦊 MetaMask
                        </button>
                        <button onClick={() => handleOpenWallet('trust')}
                          className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-transform">
                          🛡️ Trust
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ CHECKING ════════════════════════════════════════════ */}
                {screen === 'checking' && (
                  <div className="py-14 text-center">
                    <Loader2 className="w-10 h-10 mx-auto mb-4 text-tg-blue animate-spin" />
                    <p className="text-gray-700 dark:text-gray-200 font-medium">Проверяем подключение...</p>
                    <p className="text-sm text-gray-500 mt-1">Ожидаем ответ от кошелька</p>
                  </div>
                )}

                {/* ═══ ALITERRA ════════════════════════════════════════════ */}
                {screen === 'aliterra' && (
                  <div className="space-y-4">
                    {aliAuto ? (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Адрес получен!</p>
                          <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">{aliAuto}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Откройте AliTerra Wallet, скопируйте адрес и вставьте ниже
                        </p>
                      </div>
                    )}
                    <button onClick={() => walletService.openAliTerraWallet()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-green-900/10">
                      <ExternalLink className="w-5 h-5" /> Открыть AliTerra Wallet
                    </button>
                    <div>
                      <label className="text-sm text-gray-500 mb-2 block">Ethereum адрес</label>
                      <div className="flex gap-2">
                        <input type="text" value={aliAddress}
                          onChange={(e) => { setAliAddress(e.target.value); setError(''); }}
                          placeholder="0x..."
                          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500/30" />
                        <button onClick={handlePaste}
                          className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-lg" title="Вставить">📋</button>
                      </div>
                    </div>
                    <button onClick={handleAliConnect} disabled={!aliAddress.trim()}
                      className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold">
                      Подключить
                    </button>
                  </div>
                )}

                {/* ═══ CONNECTED ═══════════════════════════════════════════ */}
                {screen === 'connected' && wallet.isConnected && (
                  <div className="space-y-4">
                    <div className="flex justify-center py-3">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Адрес кошелька</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm text-gray-900 dark:text-white flex-1 break-all">{wallet.address}</p>
                        <button onClick={handleCopy} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                          {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Polygon Mainnet
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleDisconnect}
                        className="flex-1 py-3 border border-red-200 dark:border-red-800 rounded-xl text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/10">
                        Отключить
                      </button>
                      <button onClick={handleClose}
                        className="flex-1 py-3 bg-tg-blue hover:bg-tg-blue-dark rounded-xl text-white font-medium">
                        Готово
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:hidden flex justify-center pb-2"><div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" /></div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
