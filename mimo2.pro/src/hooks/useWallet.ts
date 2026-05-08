// useWallet.ts — исправленная версия
// ИСПРАВЛЕНИЯ:
//   1. Использует walletService вместо дублирующей реализации SignClient
//   2. _finishConnect: мгновенный store update + фоновый XMTP
//   3. xmtpStatus: 'idle'|'connecting'|'connected'|'error' с авто-retry
//   4. checkAndFinishSession — для кнопки "Я подтвердил"
//   5. wcUri — отдаётся наружу через onDisplayUri callback

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { walletService, WalletConnection } from '../services/walletService';
import { xmtpService } from '../services/xmtpService';

export type XmtpStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'aliterra') => Promise<void>;
  connectAliTerra: (address: string) => Promise<void>;
  openAliTerraWallet: (onAddress: (a: string) => void) => () => void;
  checkAndFinishSession: (walletType: 'metamask' | 'trust' | 'walletconnect') => Promise<boolean>;
  disconnect: () => void;
  cancelConnect: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  wcUri: string | null;
  xmtpStatus: XmtpStatus;
  retryXmtp: () => Promise<void>;
  isMobile: boolean;
  isCapacitor: boolean;
  hasMetaMask: boolean;
}

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [xmtpStatus, setXmtpStatus] = useState<XmtpStatus>('idle');
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setWallet, setCurrentUser, disconnectWallet } = useStore();
  const store = useStore();

  // ── _finishConnect: мгновенно обновляет store, XMTP в фоне ────────────────
  const _finishConnect = useCallback(async (connection: WalletConnection) => {
    const { provider, signer, address, walletType, readOnly } = connection;

    // ШАГ 1: Мгновенно обновляем store → UI разблокируется немедленно
    setWallet({
      isConnected: true,
      address,
      chainId: 137,
      signer: signer as any,
      provider: provider as any,
      walletType,
      isReadOnly: !!readOnly,
    });
    setCurrentUser({
      id: address,
      name: `${address.slice(0, 6)}…${address.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
    });

    console.log(`✅ [${walletType}] подключён:`, address);

    if (!signer || readOnly) return;

    // ШАГ 2: XMTP в фоне — не блокирует UI
    // Fast path: skipContactPublishing → 1-2с для вернувшихся пользователей
    // Full path: с публикацией → ~5-8с при первом входе
    setXmtpStatus('connecting');

    const tryXmtp = async (attempt = 1): Promise<void> => {
      const ok = await xmtpService.initialize(signer);
      if (ok) {
        setXmtpStatus('connected');
      } else {
        setXmtpStatus('error');
        // Авто-retry: через 5с, потом каждые 30с
        const delay = attempt === 1 ? 5000 : 30000;
        retryTimerRef.current = setTimeout(() => tryXmtp(attempt + 1), delay);
      }
    };

    tryXmtp();
  }, [setWallet, setCurrentUser]);

  // ── Основное подключение ───────────────────────────────────────────────────
  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    // Колбек для получения WC URI → QR код
    walletService.onDisplayUri = (uri: string) => setWcUri(uri);

    try {
      let connection: WalletConnection;
      if (walletType === 'trustwallet') {
        connection = await walletService.connectTrust();
      } else if (walletType === 'aliterra') {
        // AliTerra: отдельный flow через connectAliTerra()
        return;
      } else {
        connection = await walletService.connectMetaMask();
      }
      await _finishConnect(connection);
    } catch (err: any) {
      console.error('❌ Ошибка подключения:', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
      walletService.onDisplayUri = null;
    }
  }, [_finishConnect]);

  // ── AliTerra (read-only) ───────────────────────────────────────────────────
  const connectAliTerra = useCallback(async (address: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const connection = walletService.createReadOnlyConnection(address);
      await _finishConnect(connection);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [_finishConnect]);

  const openAliTerraWallet = useCallback((onAddress: (a: string) => void) => {
    return walletService.openAliTerraWallet(onAddress);
  }, []);

  // ── "Я подтвердил" — ручная проверка сессии после deep link ──────────────
  const checkAndFinishSession = useCallback(async (
    walletType: 'metamask' | 'trust' | 'walletconnect'
  ): Promise<boolean> => {
    try {
      await walletService.reconnectRelay();
      const accounts = await walletService.tryGetAccounts();
      if (!accounts.length) return false;
      const connection = await walletService.connectFromExistingSession(walletType);
      await _finishConnect(connection);
      walletService.forceResolveSession();
      return true;
    } catch (err: any) {
      console.error('checkAndFinishSession:', err);
      return false;
    }
  }, [_finishConnect]);

  // ── Open deep link (с QR URI) ─────────────────────────────────────────────
  const openDeepLink = useCallback((wallet: 'metamask' | 'trust' | 'walletconnect') => {
    if (!wcUri) return false;
    return walletService.openDeepLink(wcUri, wallet);
  }, [wcUri]);

  // ── Retry XMTP вручную ────────────────────────────────────────────────────
  const retryXmtp = useCallback(async () => {
    const signer = store.wallet?.signer;
    if (!signer || xmtpService.isReady()) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setXmtpStatus('connecting');
    const ok = await xmtpService.initialize(signer as any);
    setXmtpStatus(ok ? 'connected' : 'error');
    if (!ok) retryTimerRef.current = setTimeout(retryXmtp, 30000);
  }, [store.wallet?.signer]);

  // ── Отключение ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    try { await walletService.disconnect(); } catch (_) {}
    xmtpService.disconnect();
    setXmtpStatus('idle');
    disconnectWallet();
    setError(null);
    setWcUri(null);
  }, [disconnectWallet]);

  const cancelConnect = useCallback(async () => {
    try { await walletService.cancelConnect(); } catch (_) {}
    setIsConnecting(false);
    setError(null);
    setWcUri(null);
  }, []);

  // Очистка таймеров при unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return {
    connect,
    connectAliTerra,
    openAliTerraWallet,
    checkAndFinishSession,
    disconnect,
    cancelConnect,
    isConnecting,
    error,
    wcUri,
    xmtpStatus,
    retryXmtp,
    isMobile: walletService.isMobile(),
    isCapacitor: walletService.isCapacitor(),
    hasMetaMask: walletService.hasMetaMask(),
  };
}
