import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { walletService, WalletType } from '../services/walletService';
import { authService } from '../services/authService';
import { xmtpService } from '../services/xmtpService';
import { contractService } from '../services/contractService';
import { encryptionService } from '../services/encryptionService';
import type { Chat, Message } from '../types';

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

      const authData = await authService.authenticate(signer);

      try {
        // No timeout here — Client.create() needs a wallet signature
        // which requires user interaction; cutting it off means keys never register
        await xmtpService.initialize(signer);
      } catch (e) {
        console.warn('⚠️ XMTP (skipped):', e);
      }

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
          console.log('✅ Смарт-кошелёк найден:', smartWalletAddress);
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

      console.log(`✅ Подключено через ${walletType}:`, addr);
    },
    [setWallet, setE2EInitialized, setCurrentUser]
  );

  // ── Standard wallet connect ───────────────────────────────────────────────
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

  // ── Phase 1: Check if WC session exists — instant ─────────────────────────
  const checkSessionOnly = useCallback(
    async (
      wallet: 'metamask' | 'trust' | 'walletconnect'
    ): Promise<Awaited<ReturnType<typeof walletService.connectFromExistingSession>> | null> => {
      setError(null);
      try {
        await walletService.reconnectRelay();
        const accounts = await walletService.tryGetAccounts();
        if (accounts.length === 0) return null;
        return await walletService.connectFromExistingSession(wallet);
      } catch (err: any) {
        console.error('❌ checkSessionOnly:', err);
        return null;
      }
    },
    []
  );

  // ── Phase 2: Finish auth after session is confirmed ───────────────────────
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

  const checkAndFinishSession = useCallback(
    async (wallet: 'metamask' | 'trust' | 'walletconnect'): Promise<boolean> => {
      const connection = await checkSessionOnly(wallet);
      if (!connection) return false;
      await finishConnectAuth(connection);
      return true;
    },
    [checkSessionOnly, finishConnectAuth]
  );

  // ── AliTerra Wallet ───────────────────────────────────────────────────────
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
    try { await walletService.cancelConnect(); } catch (_) {}
    setIsConnecting(false);
    setError(null);
  }, []);

  // ── Build Chat entry from peer address ────────────────────────────────────
  const _buildChat = useCallback(
    (peerAddr: string, lastMessage?: Message, createdAt?: Date): Chat => {
      const chatId = peerAddr.toLowerCase();
      const shortAddr = `${peerAddr.slice(0, 6)}…${peerAddr.slice(-4)}`;
      return {
        id: chatId,
        type: 'private',
        name: shortAddr,
        avatar: peerAddr.slice(2, 4).toUpperCase(),
        participants: [{ id: peerAddr, name: shortAddr, walletAddress: peerAddr, isOnline: false }],
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        createdAt: createdAt || new Date(),
        updatedAt: lastMessage?.timestamp || new Date(),
        lastMessage,
      };
    },
    []
  );

  // ── Load chats: on-chain discovery + XMTP conversations ──────────────────
  //
  // Стратегия (как в рабочем репо aliter230880/web3-messenger):
  //   1. Сканируем события MessageSent в MessageStorage → находим всех собеседников
  //      (работает для ЛЮБОГО Ethereum-адреса, без регистрации в XMTP)
  //   2. Дополнительно загружаем XMTP-диалоги → последнее сообщение + дата
  //   3. Объединяем: on-chain peers + xmtp peers → уникальный список чатов
  const loadChats = useCallback(async () => {
    const store = useAppStore.getState();
    const myAddress = store.wallet.address;
    if (!myAddress) return;

    try {
      store.clearMockData();

      // ── 1. On-chain peer discovery ─────────────────────────────────────
      let onChainPeers: string[] = [];
      try {
        onChainPeers = await contractService.discoverChatPeers(myAddress);
      } catch (e) {
        console.warn('⚠️ discoverChatPeers failed:', e);
      }

      // Add discovered peers to store immediately (so they appear in list)
      for (const peer of onChainPeers) {
        store.upsertChat(_buildChat(peer));
      }

      // ── 2. XMTP conversations (if available) ──────────────────────────
      if (!xmtpService.isInitialized()) return;

      const conversations = await xmtpService.getConversations();
      console.log('📬 XMTP диалогов:', conversations.length);

      for (const conv of conversations) {
        const peerAddr: string = (conv as any).peerAddress;
        const chatId = peerAddr.toLowerCase();

        let lastMessage: Message | undefined;
        try {
          const msgs = await (conv as any).messages({ limit: 1 });
          if (msgs.length > 0) {
            const m = msgs[0];
            const rawContent = typeof m.content === 'string' ? m.content : '[media]';
            const displayContent = rawContent.startsWith('v1:') ? '🔒 зашифровано' : rawContent;
            lastMessage = {
              id: m.id,
              chatId,
              senderId: m.senderAddress.toLowerCase(),
              content: displayContent,
              timestamp: m.sent,
              status: 'read',
              type: 'text',
            };
          }
        } catch (_) {}

        store.upsertChat(_buildChat(peerAddr, lastMessage, new Date((conv as any).createdAt || Date.now())));
      }
    } catch (e) {
      console.error('❌ loadChats:', e);
    }
  }, [_buildChat]);

  // ── Start new chat with a wallet address ─────────────────────────────────
  const startChat = useCallback((peerAddress: string): string => {
    const store = useAppStore.getState();
    const chatId = peerAddress.toLowerCase();
    const shortAddr = `${peerAddress.slice(0, 6)}…${peerAddress.slice(-4)}`;

    const existingChat = store.chats.find((c) => c.id === chatId);
    if (!existingChat) {
      const newChat: Chat = {
        id: chatId,
        type: 'private',
        name: shortAddr,
        avatar: peerAddress.slice(2, 4).toUpperCase(),
        participants: [{
          id: peerAddress,
          name: shortAddr,
          walletAddress: peerAddress,
          isOnline: false,
        }],
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.upsertChat(newChat);
    }
    return chatId;
  }, []);

  // ── Load messages for a specific chat into store ──────────────────────────
  const loadMessages = useCallback(async (peerAddress: string, chatId: string): Promise<Message[]> => {
    if (!xmtpService.isInitialized()) return [];
    const store = useAppStore.getState();

    const rawMessages = await xmtpService.getMessages(peerAddress, 50);
    const myAddress = store.wallet.address?.toLowerCase();

    const decoded = await Promise.all(
      rawMessages.map(async (msg: any): Promise<Message> => {
        let content = typeof msg.content === 'string' ? msg.content : '[media]';

        // Try custom E2E decrypt if prefixed with 'v1:'
        if (content.startsWith('v1:')) {
          try {
            const senderAddr = msg.senderAddress;
            const peerForDecrypt = msg.senderAddress.toLowerCase() === myAddress
              ? peerAddress
              : senderAddr;
            content = await encryptionService.decrypt(content.slice(3), peerForDecrypt);
          } catch (_) {
            content = '🔒 зашифровано';
          }
        }

        return {
          id: msg.id,
          chatId,
          senderId: msg.senderAddress.toLowerCase(),
          content,
          timestamp: msg.sent,
          status: 'read' as const,
          type: 'text' as const,
        };
      })
    );

    store.setMessages(chatId, decoded);
    return decoded;
  }, []);

  // ── Send message via XMTP ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (peerAddress: string, content: string): Promise<string> => {
    if (!xmtpService.isInitialized()) throw new Error('XMTP не инициализирован');

    // Try custom E2E encrypt (XMTP already encrypts at protocol level, this is extra)
    let payload = content;
    try {
      const encrypted = await encryptionService.encrypt(content, peerAddress);
      payload = 'v1:' + encrypted.base64;
    } catch (_) {
      // Fallback to plain text (XMTP still encrypts it via protocol)
    }

    return xmtpService.sendMessage(peerAddress, payload);
  }, []);

  // ── Check if address can receive messages ────────────────────────────────
  // Всегда возвращает true: собеседника находим по on-chain событиям (MessageStorage),
  // для XMTP не нужна предварительная регистрация — отправим, дойдёт когда откроет.
  const canMessage = useCallback(async (_address: string): Promise<boolean> => {
    return true;
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
    loadMessages,
    loadChats,
    startChat,
    canMessage,
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
