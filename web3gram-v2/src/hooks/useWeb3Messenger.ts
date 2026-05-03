import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { walletService, WalletType } from '../services/walletService';
import { authService } from '../services/authService';
import { xmtpService } from '../services/xmtpService';
import { contractService } from '../services/contractService';
import { encryptionService } from '../services/encryptionService';

export function useWeb3Messenger() {
  const { setWallet, setE2EInitialized, setCurrentUser } = useAppStore();
  const isConnected = useAppStore((s) => s.wallet.isConnected);
  const address = useAppStore((s) => s.wallet.address);
  const isE2EInitialized = useAppStore((s) => s.e2e.isInitialized);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Finish any wallet connection that has a real signer ──────────────────
  const _finishConnect = useCallback(
    async (connection: Awaited<ReturnType<typeof walletService.connectMetaMask>>) => {
      const { provider, signer, address: addr, walletType } = connection;

      const existingUser = useAppStore.getState().currentUser;
      const savedName    = existingUser?.name && existingUser.name !== 'Пользователь' ? existingUser.name : null;
      const savedAvatarId = existingUser?.avatarId;

      if (!signer) {
        setWallet({ isConnected: true, address: addr, chainId: 137, signer: null as any, provider: null as any });
        setE2EInitialized(false);
        setCurrentUser({
          id: addr,
          name: savedName || addr.slice(0, 8) + '…',
          avatarId: savedAvatarId,
          walletAddress: addr,
          isOnline: true,
        });
        return;
      }

      // authService.authenticate() has built-in 6s timeout on signMessage.
      // It falls back to a local seed if MetaMask is in background — never hangs.
      const authData = await authService.authenticate(signer);

      // XMTP Client.create() also calls signer.signMessage() internally.
      // Wrap with 10s timeout so it never blocks the UI.
      try {
        await Promise.race([
          xmtpService.initialize(signer),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('XMTP timeout')), 10_000)
          ),
        ]);
      } catch (e) {
        console.warn('⚠️ XMTP (skipped):', e);
      }

      // Smart-wallet contract call — also wrap with timeout.
      let smartWalletAddress = addr;
      try {
        contractService.initialize(provider!, signer);

        const loginResult = await Promise.race([
          contractService.loginWithFactory(addr),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LoginFactory timeout')), 12_000)
          ),
        ]);
        smartWalletAddress = loginResult.smartWalletAddress;

        if (!loginResult.alreadyRegistered) {
          console.log('🆕 Смарт-кошелёк создан на Polygon:', smartWalletAddress);
        } else {
          console.log('✅ Смарт-кошелёк найден в LoginFactory:', smartWalletAddress);
        }
      } catch (e) {
        console.warn('⚠️ Контракты/LoginFactory (skipped):', e);
      }

      setWallet({ isConnected: true, address: addr, chainId: 137, signer, provider });
      setE2EInitialized(true);
      setCurrentUser({
        id: addr,
        name: savedName || authData.address,
        avatarId: savedAvatarId,
        walletAddress: addr,
        smartWalletAddress,
        isOnline: true,
      });

      console.log(`✅ Подключено через ${walletType}:`, addr, '| SmartWallet:', smartWalletAddress);
    },
    [setWallet, setE2EInitialized, setCurrentUser]
  );

  // ── Standard wallet connect (MetaMask / Trust / WalletConnect) ──────────
  const connect = useCallback(
    async (walletType: WalletType = 'metamask') => {
      setIsConnecting(true);
      setError(null);
      try {
        let connection: Awaited<ReturnType<typeof walletService.connectMetaMask>>;

        if (walletType === 'trust') {
          connection = await walletService.connectTrust();
        } else if (walletType === 'walletconnect') {
          connection = await walletService.connectWalletConnect();
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
      }
    },
    [_finishConnect]
  );

  // ── Phase 1: Check if WC session exists — NO signing, instant ────────────
  //
  // Reads accounts from wcProvider.session object (no relay, no RPC).
  // Returns the WalletConnection (address only) or null if no session.
  // Does NOT call _finishConnect — caller must do that separately.
  //
  const checkSessionOnly = useCallback(
    async (
      wallet: 'metamask' | 'trust' | 'walletconnect'
    ): Promise<Awaited<ReturnType<typeof walletService.connectFromExistingSession>> | null> => {
      setError(null);
      try {
        // Reconnect relay (5s timeout built-in)
        await walletService.reconnectRelay();

        // Read accounts from session object — instant, no RPC
        const accounts = await walletService.tryGetAccounts();
        if (accounts.length === 0) return null;

        // Build connection from session (address from session, network check 8s cap)
        return await walletService.connectFromExistingSession(wallet);
      } catch (err: any) {
        console.error('❌ checkSessionOnly:', err);
        return null;
      }
    },
    []
  );

  // ── Phase 2: Finish auth after session is confirmed ───────────────────────
  //
  // Calls _finishConnect (authService.authenticate → signMessage,
  // xmtpService.initialize, contractService.loginWithFactory).
  //
  // signMessage has a 90s timeout — user has time to open MetaMask,
  // find the request (Activity tab if needed), and confirm it.
  //
  const finishConnectAuth = useCallback(
    async (
      connection: Awaited<ReturnType<typeof walletService.connectFromExistingSession>>
    ): Promise<void> => {
      setIsConnecting(true);
      setError(null);
      try {
        await _finishConnect(connection);
        walletService.forceResolveSession();
      } catch (err: any) {
        console.error('❌ finishConnectAuth:', err);
        setError(err.message || 'Ошибка подключения');
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [_finishConnect]
  );

  // ── Legacy combined check (kept for compatibility) ────────────────────────
  const checkAndFinishSession = useCallback(
    async (wallet: 'metamask' | 'trust' | 'walletconnect'): Promise<boolean> => {
      const connection = await checkSessionOnly(wallet);
      if (!connection) return false;
      await finishConnectAuth(connection);
      return true;
    },
    [checkSessionOnly, finishConnectAuth]
  );

  // ── AliTerra Wallet: address-only (read-only) connection ─────────────────
  const connectAliTerra = useCallback(
    async (addr: string) => {
      setIsConnecting(true);
      setError(null);
      try {
        const connection = walletService.createReadOnlyConnection(addr);
        await _finishConnect(connection);
      } catch (err: any) {
        console.error('❌ AliTerra:', err);
        setError(err.message || 'Ошибка');
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [_finishConnect]
  );

  const openAliTerraWallet = useCallback(
    (onAddress: (address: string) => void): (() => void) => {
      return walletService.openAliTerraWallet(onAddress);
    },
    []
  );

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      await walletService.disconnect();
      await xmtpService.disconnect();
      authService.logout();
      setWallet({ isConnected: false, address: null, chainId: null });
      setE2EInitialized(false);
      setCurrentUser(null);
    } catch (err) {
      console.error('❌ Ошибка отключения:', err);
    }
  }, [setWallet, setE2EInitialized, setCurrentUser]);

  const cancelConnect = useCallback(async () => {
    try {
      await walletService.cancelConnect();
    } catch (_) {}
    setIsConnecting(false);
    setError(null);
  }, []);

  // ── Messaging ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (recipient: string, message: string) => {
    try {
      const encrypted = await encryptionService.encrypt(message, recipient);
      await xmtpService.sendMessage(recipient, encrypted.base64);
      try {
        const hash = await encryptionService.hashMessage(message);
        await contractService.storeMessageHash(recipient, hash);
      } catch (e) {
        console.warn('⚠️ Хэш on-chain:', e);
      }
    } catch (err: any) {
      console.error('❌ Ошибка отправки:', err);
      throw err;
    }
  }, []);

  const getMessages = useCallback(async (recipient: string) => {
    try {
      const encryptedMessages = await xmtpService.getMessages(recipient);
      const myAddress = authService.getAddress();
      if (!myAddress) throw new Error('Не аутентифицирован');
      const messages = await Promise.all(
        encryptedMessages.map(async (msg: any) => {
          try {
            const decrypted = await encryptionService.decrypt(msg.content, msg.senderAddress);
            return { id: msg.id, content: decrypted, sender: msg.senderAddress, timestamp: msg.sent };
          } catch {
            return null;
          }
        })
      );
      return messages.filter(Boolean);
    } catch (err: any) {
      console.error('❌ Ошибка получения:', err);
      throw err;
    }
  }, []);

  const registerProfile = useCallback(async (nickname: string, avatarId: number) => {
    try {
      const txHash = await contractService.registerProfile(nickname, avatarId);
      const store = useAppStore.getState();
      if (store.currentUser) {
        store.setCurrentUser({ ...store.currentUser, name: nickname, avatarId });
      }
      return txHash;
    } catch (err: any) {
      console.error('❌ registerProfile:', err);
      throw err;
    }
  }, []);

  return {
    connect,
    connectAliTerra,
    checkAndFinishSession,
    checkSessionOnly,
    finishConnectAuth,
    openAliTerraWallet,
    disconnect,
    cancelConnect,
    sendMessage,
    getMessages,
    registerProfile,
    isConnecting,
    error,
    isConnected,
    address,
    isE2EInitialized,
    isMobile: walletService.isMobile(),
    hasMetaMask: walletService.hasMetaMask(),
    isCapacitor: walletService.isCapacitor(),
  };
}
