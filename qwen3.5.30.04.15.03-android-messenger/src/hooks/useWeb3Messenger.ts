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

      if (!signer) {
        // Read-only (AliTerra) path — skip auth/xmtp/contracts
        setWallet({ isConnected: true, address: addr, chainId: 137, signer: null as any, provider: null as any });
        setE2EInitialized(false);
        setCurrentUser({ id: addr, name: addr.slice(0, 8) + '…', walletAddress: addr, isOnline: true });
        return;
      }

      const authData = await authService.authenticate(signer);

      try {
        await xmtpService.initialize(signer);
      } catch (e) {
        console.warn('⚠️ XMTP:', e);
      }

      try {
        contractService.initialize(provider!, signer);
      } catch (e) {
        console.warn('⚠️ Контракты:', e);
      }

      setWallet({ isConnected: true, address: addr, chainId: 137, signer, provider });
      setE2EInitialized(true);
      setCurrentUser({
        id: addr,
        name: authData.address,
        walletAddress: addr,
        isOnline: true,
      });

      console.log(`✅ Подключено через ${walletType}:`, addr);
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

  // ── AliTerra Wallet: address-only (read-only) connection ─────────────────
  // Called after WalletModal receives the address via postMessage or paste.
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

  // ── openAliTerraWallet: opens the site, listens for postMessage ──────────
  // Returns a cancel function. Calls onAddress(addr) when address arrives.
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

  // ── Cancel in-progress WC session ────────────────────────────────────────
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
