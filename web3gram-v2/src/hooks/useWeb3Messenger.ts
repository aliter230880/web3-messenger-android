import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { walletService, WalletType } from '../services/walletService';
import { authService } from '../services/authService';
import { xmtpService } from '../services/xmtpService';
import { contractService } from '../services/contractService';
import { encryptionService } from '../services/encryptionService';
import type { Chat, Message } from '../types';

export function useWeb3Messenger() {
  const { setWallet, setE2EInitialized, setXmtpReady, setCurrentUser } = useAppStore();
  const isConnected    = useAppStore((s) => s.wallet.isConnected);
  const address        = useAppStore((s) => s.wallet.address);
  const isE2EInitialized = useAppStore((s) => s.e2e.isInitialized);
  const xmtpReady      = useAppStore((s) => s.e2e.xmtpReady);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── _finishConnect: FAST PATH ────────────────────────────────────────────
  //
  // Стратегия (как в рабочем репо — минимум блокирующих вызовов):
  //
  //   1. Сразу показываем кошелёк как "подключён" → UI разблокируется мгновенно
  //   2. authService.authenticate() → instant (localStorage seed, без подписи)
  //   3. XMTP.init() → background (может попросить 1 подпись при первом входе)
  //      При успехе → setXmtpReady(true) → App.tsx запустит global stream
  //   4. contractService.initialize() → instant (создаёт объекты контрактов)
  //   5. loginWithFactory → полностью убран из hot path (медленный, требует RPC)
  //
  const _finishConnect = useCallback(
    async (connection: Awaited<ReturnType<typeof walletService.connectMetaMask>>) => {
      const { provider, signer, address: addr, walletType } = connection;

      const existingUser  = useAppStore.getState().currentUser;
      const savedName     = existingUser?.name && existingUser.name !== 'Пользователь' ? existingUser.name : null;
      const savedAvatarId = existingUser?.avatarId;

      // ── STEP 1: Мгновенно обновляем store ─────────────────────────────
      setWallet({ isConnected: true, address: addr, chainId: 137, signer: signer as any, provider: provider as any });
      setE2EInitialized(true);
      setCurrentUser({
        id: addr,
        name: savedName || `${addr.slice(0, 6)}…${addr.slice(-4)}`,
        avatarId: savedAvatarId,
        walletAddress: addr,
        isOnline: true,
      });

      console.log(`✅ [${walletType}] кошелёк подключён:`, addr);

      if (!signer) return;

      // ── STEP 2: Auth (мгновенно — только localStorage) ───────────────
      authService.authenticate(signer).catch((e) => console.warn('⚠️ auth:', e));

      // ── STEP 3: Contracts (создание объектов, без RPC) ────────────────
      if (provider) {
        contractService.initialize(provider, signer);
      }

      // ── STEP 4: XMTP — background, не блокирует UI ───────────────────
      // При первом подключении: 1 подпись MetaMask
      // При повторном: ключи из IndexedDB, без подписи
      xmtpService.initialize(signer)
        .then(() => {
          console.log('✅ XMTP ready in background');
          setXmtpReady(true);
        })
        .catch((e) => {
          console.warn('⚠️ XMTP (skipped):', e);
          // Не блокируем — работаем без E2E шифрования
        });
    },
    [setWallet, setE2EInitialized, setXmtpReady, setCurrentUser]
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
      setXmtpReady(false);
      setCurrentUser(null);
    } catch (err) {
      console.error('❌ Ошибка отключения:', err);
    }
  }, [setWallet, setE2EInitialized, setXmtpReady, setCurrentUser]);

  const cancelConnect = useCallback(async () => {
    try { await walletService.cancelConnect(); } catch (_) {}
    setIsConnecting(false);
    setError(null);
  }, []);

  // ── Build Chat entry from peer address ────────────────────────────────────
  const _buildChat = useCallback(
    (peerAddr: string, lastMessage?: Message, createdAt?: Date): Chat => {
      const chatId    = peerAddr.toLowerCase();
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
    const store   = useAppStore.getState();
    const chatId  = peerAddress.toLowerCase();
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
      console.log('💾 Новый чат сохранён:', chatId);
    }
    return chatId;
  }, []);

  // ── Load messages for a specific chat ─────────────────────────────────────
  const loadMessages = useCallback(async (peerAddress: string, chatId: string): Promise<Message[]> => {
    // Сначала — из localStorage (мгновенно)
    const store = useAppStore.getState();
    const cached = store.loadPersistedMessages(chatId);
    if (cached.length > 0) {
      store.setMessages(chatId, cached);
    }

    // Потом — из XMTP (если доступен)
    if (!xmtpService.isInitialized()) return cached;

    const rawMessages = await xmtpService.getMessages(peerAddress, 50);
    const myAddress = store.wallet.address?.toLowerCase();

    const decoded = await Promise.all(
      rawMessages.map(async (msg: any): Promise<Message> => {
        let content = typeof msg.content === 'string' ? msg.content : '[media]';

        if (content.startsWith('v1:')) {
          try {
            const senderAddr   = msg.senderAddress;
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

    let payload = content;
    try {
      const encrypted = await encryptionService.encrypt(content, peerAddress);
      payload = 'v1:' + encrypted.base64;
    } catch (_) {}

    return xmtpService.sendMessage(peerAddress, payload);
  }, []);

  // ── canMessage ────────────────────────────────────────────────────────────
  const canMessage = useCallback(async (_address: string): Promise<boolean> => {
    return true;
  }, []);

  const registerProfile = useCallback(async (nickname: string, avatarId: number) => {
    try {
      const txHash = await contractService.registerProfile(nickname, avatarId);
      const store  = useAppStore.getState();
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
    xmtpReady,
    isMobile:    walletService.isMobile(),
    hasMetaMask: walletService.hasMetaMask(),
    isCapacitor: walletService.isCapacitor(),
  };
}
