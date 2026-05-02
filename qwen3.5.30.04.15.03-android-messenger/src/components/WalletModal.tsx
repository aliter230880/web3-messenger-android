import { useState } from 'react';
import { X, Copy, Check, Smartphone, QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { motion, AnimatePresence } from 'framer-motion';

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
    <path d="M20 8l10 4.5v9c0 5.5-4.5 10-10 11-5.5-1-10-5.5-10-11v-9L20 8z" fill="white" fillOpacity=".2"/>
    <path d="M20 10.5l8 3.6v7.4c0 4.4-3.6 8-8 8.8-4.4-.8-8-4.4-8-8.8v-7.4l8-3.6z" fill="white"/>
    <path d="M16.5 20l2.5 2.5 5-5" stroke="#3375BB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AliTerraIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
    <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
    <circle cx="20" cy="20" r="9" stroke="#fbbf24" strokeWidth="1.8" fill="none"/>
    <path d="M20 11 L20 29 M11 20 L29 20" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="3" fill="#fbbf24"/>
  </svg>
);

type ConnectingTarget = 'metamask' | 'trust' | 'walletconnect' | null;

const CONNECTING_LABELS: Record<NonNullable<ConnectingTarget>, string> = {
  metamask: 'Открываем MetaMask…',
  trust: 'Открываем Trust Wallet…',
  walletconnect: 'Подключение через WalletConnect…',
};

const CONNECTING_SUB: Record<NonNullable<ConnectingTarget>, string> = {
  metamask: 'Подтвердите запрос в приложении MetaMask',
  trust: 'Подтвердите запрос в приложении Trust Wallet',
  walletconnect: 'Отсканируйте QR-код в вашем кошельке',
};

export function WalletModal() {
  const { isWalletModalOpen, toggleWalletModal } = useAppStore();
  const {
    connect, disconnect, isConnecting, isConnected, address,
    isCapacitor, hasMetaMask, openInWalletBrowser, cancelConnect,
  } = useWeb3Messenger();

  const [copied, setCopied] = useState(false);
  const [connectingTarget, setConnectingTarget] = useState<ConnectingTarget>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async (target: NonNullable<ConnectingTarget>) => {
    setConnectError(null);
    setConnectingTarget(target);
    try {
      await connect(target === 'walletconnect' ? 'walletconnect' : target === 'trust' ? 'trust' : 'metamask');
      toggleWalletModal();
    } catch (err: any) {
      setConnectError(err.message || 'Ошибка подключения');
    } finally {
      setConnectingTarget(null);
    }
  };

  const handleCancel = async () => {
    await cancelConnect();
    setConnectingTarget(null);
    setConnectError(null);
  };

  const handleDisconnect = async () => {
    await disconnect();
    toggleWalletModal();
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (!isConnecting) toggleWalletModal();
  };

  return (
    <AnimatePresence>
      {isWalletModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#1c1c1e] rounded-t-3xl shadow-2xl z-50 max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <span className="w-9" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isConnected ? 'Кошелёк' : 'Подключить кошелёк'}
              </h2>
              <button
                onClick={handleClose}
                disabled={isConnecting}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="px-5 pb-8 pt-4">

              {/* ── Connected ── */}
              {isConnected ? (
                <div className="space-y-5">
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      Подключено
                    </h3>
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
                        {copied
                          ? <Check className="w-4.5 h-4.5 text-emerald-500" />
                          : <Copy className="w-4.5 h-4.5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <button onClick={handleDisconnect} className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 font-medium rounded-2xl transition-colors">
                    Отключить кошелёк
                  </button>
                </div>

              ) : isConnecting && connectingTarget ? (

                /* ── Connecting screen ── */
                <div className="py-6 text-center space-y-5">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
                      {connectingTarget === 'metamask' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MetaMaskIcon />
                        </div>
                      )}
                      {connectingTarget === 'trust' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <TrustWalletIcon />
                        </div>
                      )}
                      {connectingTarget === 'walletconnect' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <WalletConnectIcon />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {CONNECTING_LABELS[connectingTarget]}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 px-6">
                      {CONNECTING_SUB[connectingTarget]}
                    </p>
                  </div>

                  {/* Steps hint for mobile WC */}
                  {(connectingTarget === 'metamask' || connectingTarget === 'trust') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl px-5 py-4 text-left text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
                      <p className="font-medium mb-2">Что нужно сделать:</p>
                      <p>1. Кошелёк откроется автоматически</p>
                      <p>2. Нажмите «Подтвердить» / «Connect»</p>
                      <p>3. Вернитесь в Web3Gram</p>
                    </div>
                  )}

                  <button
                    onClick={handleCancel}
                    className="mt-2 px-6 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                  >
                    Отмена
                  </button>
                </div>

              ) : (

                /* ── Wallet picker ── */
                <div className="space-y-3">

                  {connectError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center">
                      {connectError}
                    </div>
                  )}

                  {/* ── Capacitor / Mobile ── */}
                  {isCapacitor ? (
                    <>
                      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-1">
                        Выберите кошелёк — откроется запрос подключения к Web3Gram
                      </p>

                      {/* MetaMask */}
                      <WalletButton
                        onClick={() => handleConnect('metamask')}
                        disabled={isConnecting}
                        bg="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        icon={<MetaMaskIcon />}
                        title="MetaMask"
                        subtitle={<><Smartphone className="w-3 h-3 inline mr-1" />WalletConnect · подключение к Web3Gram</>}
                      />

                      {/* Trust Wallet */}
                      <WalletButton
                        onClick={() => handleConnect('trust')}
                        disabled={isConnecting}
                        bg="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        icon={<TrustWalletIcon />}
                        title="Trust Wallet"
                        subtitle={<><Smartphone className="w-3 h-3 inline mr-1" />WalletConnect · подключение к Web3Gram</>}
                      />

                      {/* AliTerra Wallet — external browser */}
                      <WalletButton
                        onClick={() => openInWalletBrowser('aliterra')}
                        disabled={false}
                        bg="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                        icon={<AliTerraIcon />}
                        title="AliTerra Wallet"
                        subtitle={<><ExternalLink className="w-3 h-3 inline mr-1" />wallet.aliterra.space — открыть в браузере</>}
                        badge={<ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />}
                      />

                      {/* WalletConnect QR */}
                      <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-400 text-center my-2">
                          Или подключите другой кошелёк через QR
                        </p>
                        <WalletButton
                          onClick={() => handleConnect('walletconnect')}
                          disabled={isConnecting}
                          bg="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                          icon={<WalletConnectIcon />}
                          title="WalletConnect QR"
                          subtitle={<><QrCode className="w-3 h-3 inline mr-1" />Любой кошелёк с поддержкой WC</>}
                        />
                      </div>
                    </>

                  ) : (

                    /* ── Desktop / Web ── */
                    <>
                      <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-1">
                        Подключитесь к Web3Gram на Polygon Mainnet
                      </p>

                      <WalletButton
                        onClick={() => handleConnect('walletconnect')}
                        disabled={isConnecting}
                        bg="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        icon={<WalletConnectIcon />}
                        title="WalletConnect"
                        subtitle={<><QrCode className="w-3 h-3 inline mr-1" />QR-код для MetaMask, Trust и других</>}
                      />

                      <WalletButton
                        onClick={() => handleConnect('metamask')}
                        disabled={isConnecting}
                        bg="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                        icon={<MetaMaskIcon />}
                        title="MetaMask"
                        subtitle={hasMetaMask
                          ? <><span className="text-emerald-500">✓</span> Расширение обнаружено</>
                          : <>Браузерное расширение</>
                        }
                      />

                      <WalletButton
                        onClick={() => openInWalletBrowser('aliterra')}
                        disabled={false}
                        bg="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
                        icon={<AliTerraIcon />}
                        title="AliTerra Wallet"
                        subtitle={<><ExternalLink className="w-3 h-3 inline mr-1" />wallet.aliterra.space</>}
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

function WalletButton({
  onClick, disabled, bg, icon, title, subtitle, badge,
}: {
  onClick: () => void;
  disabled: boolean;
  bg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3.5 py-3.5 px-4 ${bg} text-gray-800 dark:text-white font-medium rounded-2xl transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none`}
    >
      {icon}
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 mt-0.5">
          {subtitle}
        </div>
      </div>
      {badge}
    </button>
  );
}
