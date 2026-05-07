import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { Client, ConsentState, type Dm, type Identifier, type Signer } from "@xmtp/browser-sdk";
import { BrowserProvider } from "ethers";
import { AnimatePresence, motion } from "framer-motion";
import * as QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  text: string;
  outgoing: boolean;
  time: string;
};

type Chat = {
  id: string;
  name: string;
  address: string;
  conversationId?: string;
  peerInboxId?: string;
  online: boolean;
  lastSeen: string;
  unread: number;
};

type WalletStep = "idle" | "initializing" | "qr" | "waiting" | "checking" | "connected" | "error";
type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;

const CHAT_STORAGE_KEY = "aliterra-messenger-v1";
const WC_PROJECT_ID = (import.meta as ImportMeta & { env: { VITE_WALLETCONNECT_PROJECT_ID?: string } }).env
  .VITE_WALLETCONNECT_PROJECT_ID ?? "2de1d724533083c2ed68197548dead4e";
const POLYGON_CHAIN_ID = "0x89";

const seedChats: Chat[] = [];

const seedMessages: Record<string, Message[]> = {};

function readInitialState() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) {
      return { chats: seedChats, messages: seedMessages };
    }
    const parsed = JSON.parse(saved) as { chats: Chat[]; messages: Record<string, Message[]> };
    const cleanedChats = parsed.chats.filter((chat) => chat.id.startsWith("xmtp-") || Boolean(chat.conversationId));
    const allowedChatIds = new Set(cleanedChats.map((chat) => chat.id));
    const cleanedMessages = Object.fromEntries(
      Object.entries(parsed.messages).filter(([chatId]) => allowedChatIds.has(chatId))
    ) as Record<string, Message[]>;
    return { chats: cleanedChats, messages: cleanedMessages };
  } catch {
    return { chats: seedChats, messages: seedMessages };
  }
}

function shortName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isNativeCapacitor() {
  const appWindow = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(appWindow.Capacitor?.isNativePlatform?.());
}

function shortAddress(address: string) {
  if (!address) {
    return "";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function nsToLocalTime(sentAtNs?: bigint) {
  if (!sentAtNs) {
    return nowTime();
  }
  const ms = Number(sentAtNs / 1000000n);
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function hexToBytes(hexValue: string) {
  const hex = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export default function App() {
  const initialState = useMemo(readInitialState, []);
  const [chats, setChats] = useState<Chat[]>(initialState.chats);
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialState.messages);
  const [activeChatId, setActiveChatId] = useState<string>(initialState.chats[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [xmtpReady, setXmtpReady] = useState(false);
  const [xmtpAvailable, setXmtpAvailable] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStep, setWalletStep] = useState<WalletStep>("idle");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [showInstallLinks, setShowInstallLinks] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [wcUri, setWcUri] = useState("");
  const [wcQr, setWcQr] = useState("");
  const openExternalUrl = (url: string) => {
    if (isNativeCapacitor()) {
      window.open(url, "_system");
      return;
    }

    // Embedded Android WebViews often ignore custom schemes in _blank.
    // For wallet schemes, use same-tab navigation to trigger app handoff.
    if (url.startsWith("metamask://") || url.startsWith("trust://") || url.startsWith("intent://")) {
      window.location.href = url;
      return;
    }

    window.open(url, "_blank");
  };


  const wcProviderRef = useRef<WalletConnectProvider | null>(null);
  const xmtpClientRef = useRef<Client | null>(null);
  const xmtpStreamRef = useRef<{ return?: () => Promise<unknown> } | null>(null);
  const xmtpDmByChatIdRef = useRef<Map<string, Dm>>(new Map());
  const xmtpChatIdByConversationIdRef = useRef<Map<string, string>>(new Map());
  const xmtpInboxAddressRef = useRef<Map<string, string>>(new Map());

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const currentMessages = messages[activeChatId] ?? [];

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ chats, messages }));
  }, [chats, messages]);

  const upsertMessages = (chatId: string, incoming: Message[]) => {
    setMessages((prev) => {
      const existing = prev[chatId] ?? [];
      const map = new Map(existing.map((item) => [item.id, item]));
      for (const item of incoming) {
        map.set(item.id, item);
      }
      return { ...prev, [chatId]: Array.from(map.values()) };
    });
  };

  const resolveInboxAddress = async (client: Client, inboxId: string) => {
    if (xmtpInboxAddressRef.current.has(inboxId)) {
      return xmtpInboxAddressRef.current.get(inboxId) ?? inboxId;
    }

    try {
      const states = await client.preferences.inboxStateFromInboxIds([inboxId], true);
      const account = states[0]?.identifiers[0]?.identifier ?? inboxId;
      xmtpInboxAddressRef.current.set(inboxId, account);
      return account;
    } catch {
      return inboxId;
    }
  };

  const conversationToChatId = (conversationId: string) => `xmtp-${conversationId}`;

  const ensureChatForDm = async (client: Client, dm: Dm) => {
    const peerInboxId = await dm.peerInboxId();
    const peerAddress = await resolveInboxAddress(client, peerInboxId);
    const chatId = conversationToChatId(dm.id);

    xmtpDmByChatIdRef.current.set(chatId, dm);
    xmtpChatIdByConversationIdRef.current.set(dm.id, chatId);

    setChats((prev) => {
      const next: Chat = {
        id: chatId,
        name: `Wallet ${peerAddress.slice(0, 6)}`,
        address: shortAddress(peerAddress),
        conversationId: dm.id,
        peerInboxId,
        online: false,
        lastSeen: "encrypted",
        unread: 0,
      };

      const exists = prev.find((item) => item.id === chatId);
      if (exists) {
        return prev.map((item) => (item.id === chatId ? { ...item, ...next, unread: item.unread } : item));
      }
      return [next, ...prev];
    });

    const dmMessages = await dm.messages({ limit: 80n });
    const ownInboxId = client.inboxId ?? "";
    const normalized = dmMessages.map((item) => ({
      id: item.id,
      text: typeof item.content === "string" ? item.content : item.fallback ?? "Unsupported message",
      outgoing: item.senderInboxId === ownInboxId,
      time: nsToLocalTime(item.sentAtNs),
    }));
    upsertMessages(chatId, normalized);
    return chatId;
  };

  const startXmtpStream = async (client: Client) => {
    if (xmtpStreamRef.current) {
      await xmtpStreamRef.current.return?.();
      xmtpStreamRef.current = null;
    }

    const stream = await client.conversations.streamAllDmMessages({
      consentStates: [ConsentState.Allowed, ConsentState.Unknown],
    });
    xmtpStreamRef.current = stream;

    (async () => {
      for await (const item of stream) {
        const conversationId = item.conversationId;
        const knownChatId = xmtpChatIdByConversationIdRef.current.get(conversationId);
        let chatId = knownChatId;

        if (!chatId) {
          const conversation = await client.conversations.getConversationById(conversationId);
          if (conversation && "peerInboxId" in conversation) {
            chatId = await ensureChatForDm(client, conversation as Dm);
          }
        }

        if (!chatId) {
          continue;
        }

        upsertMessages(chatId, [
          {
            id: item.id,
            text: typeof item.content === "string" ? item.content : item.fallback ?? "Unsupported message",
            outgoing: item.senderInboxId === (client.inboxId ?? ""),
            time: nsToLocalTime(item.sentAtNs),
          },
        ]);
      }
    })().catch(() => {
      setXmtpAvailable(false);
    });
  };

  const teardownXmtp = async () => {
    await xmtpStreamRef.current?.return?.();
    xmtpStreamRef.current = null;
    xmtpClientRef.current = null;
    xmtpDmByChatIdRef.current.clear();
    xmtpChatIdByConversationIdRef.current.clear();
    xmtpInboxAddressRef.current.clear();
    setXmtpReady(false);
    setXmtpAvailable(false);
  };

  const initializeXmtp = async (walletProvider: WalletConnectProvider, walletAddr: string) => {
    setXmtpReady(false);
    setXmtpAvailable(false);
    setComposeError("");

    try {
      const ethersProvider = new BrowserProvider(walletProvider as never);
      const signer = await ethersProvider.getSigner();

      const xmtpSigner: Signer = {
        type: "EOA",
        getIdentifier: (): Identifier => ({ identifier: walletAddr, identifierKind: "Ethereum" }),
        signMessage: async (message: string) => {
          const signature = await signer.signMessage(message);
          return hexToBytes(signature);
        },
      };

      const client = await Client.create(xmtpSigner, {
        env: "production",
        appVersion: "aliterra-messenger/1.0.0",
      });

      xmtpClientRef.current = client;
      await client.conversations.syncAll([ConsentState.Allowed, ConsentState.Unknown]);
      const dms = await client.conversations.listDms({ consentStates: [ConsentState.Allowed, ConsentState.Unknown] });
      for (const dm of dms) {
        await ensureChatForDm(client, dm);
      }
      if (!activeChatId && dms.length > 0) {
        setActiveChatId(conversationToChatId(dms[0].id));
      }
      await startXmtpStream(client);
      setXmtpReady(true);
      setXmtpAvailable(true);
    } catch {
      setXmtpReady(true);
      setXmtpAvailable(false);
    }
  };

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (walletStep !== "waiting" && walletStep !== "qr") {
        return;
      }
      await checkAndFinishSession();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [walletStep]);

  const filteredChats = chats.filter((chat) => {
    const value = query.toLowerCase();
    return chat.name.toLowerCase().includes(value) || chat.address.toLowerCase().includes(value);
  });

  const ensureWalletProvider = async () => {
    if (wcProviderRef.current) {
      return wcProviderRef.current;
    }

    const wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [137],
      showQrModal: false,
      metadata: {
        name: "AliTerra Messenger",
        description: "Secure wallet chat",
        url: "https://chat.aliterra.space",
        icons: ["https://chat.aliterra.space/favicon.ico"],
      },
    });

    wcProvider.on("display_uri", async (uri: string) => {
      setWcUri(uri);
      setWalletStep("qr");
      try {
        const qrData = await QRCode.toDataURL(uri, { width: 260, margin: 1 });
        setWcQr(qrData);
      } catch {
        setWcQr("");
      }
    });

    wcProvider.on("disconnect", () => {
      setWalletAddress("");
      setWalletStep("idle");
      setWcUri("");
      setWcQr("");
    });

    wcProviderRef.current = wcProvider;
    return wcProvider;
  };

  const switchToPolygon = async (provider: WalletConnectProvider) => {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: POLYGON_CHAIN_ID }] });
    } catch (error) {
      const err = error as { code?: number };
      if (err?.code !== 4902) {
        throw error;
      }

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: POLYGON_CHAIN_ID,
            chainName: "Polygon Mainnet",
            nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
            rpcUrls: ["https://polygon-rpc.com"],
            blockExplorerUrls: ["https://polygonscan.com"],
          },
        ],
      });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: POLYGON_CHAIN_ID }] });
    }
  };

  const finishWalletConnection = async (provider: WalletConnectProvider) => {
    await switchToPolygon(provider);
    const ethersProvider = new BrowserProvider(provider as never);
    const signer = await ethersProvider.getSigner();
    const address = await signer.getAddress();

    setWalletAddress(address);
    setWalletStep("connected");
    setWalletError("");
    setWcUri("");
    setWcQr("");
    setWalletModalOpen(false);
    await initializeXmtp(provider, address);
  };

  const connectWallet = async () => {
    setWalletModalOpen(true);
    setWalletStep("initializing");
    setWalletError("");

    try {
      const provider = await ensureWalletProvider();

      if (provider.session) {
        await finishWalletConnection(provider);
        return;
      }

      setWalletStep("waiting");
      await provider.connect();
      await finishWalletConnection(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed";
      setWalletError(message);
      setWalletStep("error");
    }
  };

  const disconnectWallet = async () => {
    const provider = wcProviderRef.current;
    if (!provider) {
      setWalletAddress("");
      setWalletStep("idle");
      return;
    }

    await provider.disconnect();
    await teardownXmtp();
    setWalletAddress("");
    setWalletStep("idle");
    setWalletModalOpen(false);
  };

  const checkAndFinishSession = async () => {
    const provider = wcProviderRef.current;
    if (!provider) {
      return;
    }

    setWalletStep("checking");
    try {
      const accounts = await provider.request<string[]>({ method: "eth_accounts" });
      if (accounts.length > 0) {
        await finishWalletConnection(provider);
      } else {
        setWalletStep("waiting");
      }
    } catch {
      setWalletStep("waiting");
    }
  };

  const openWalletDeepLink = (wallet: "metamask" | "trust") => {
    if (!wcUri) {
      setWalletError("WalletConnect URI is not ready yet. Wait for QR or reconnect.");
      return;
    }

    const encodedUri = encodeURIComponent(wcUri);
    const customScheme = wallet === "metamask" ? `metamask://wc?uri=${encodedUri}` : `trust://wc?uri=${encodedUri}`;

    setShowInstallLinks(false);
    setWalletError("");

    // Use only direct deep links first, exactly as in the working flow docs.
    openExternalUrl(customScheme);

    setTimeout(() => {
      if (document.visibilityState === "visible") {
        setWalletError("Wallet app did not open automatically.");
        setShowInstallLinks(true);
      }
    }, 1400);
    setWalletStep("waiting");
  };

  const openInstallLink = (wallet: "metamask" | "trust") => {
    const url =
      wallet === "metamask"
        ? "https://play.google.com/store/apps/details?id=io.metamask"
        : "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp";
    openExternalUrl(url);
  };

  const copyWcUri = async () => {
    if (!wcUri) {
      return;
    }
    try {
      await navigator.clipboard.writeText(wcUri);
      setWalletError("WalletConnect URI copied. Paste it in wallet if deep link does not open.");
    } catch {
      setWalletError("Could not copy URI. Use QR scan instead.");
    }
  };

  const sendMessage = () => {
    if (!draft.trim() || !activeChatId || !xmtpAvailable) {
      return;
    }
    const dm = xmtpDmByChatIdRef.current.get(activeChatId);
    if (!dm) {
      setComposeError("Conversation is not synced with XMTP yet.");
      return;
    }

    const text = draft.trim();
    setComposeError("");
    setDraft("");

    dm
      .send(text)
      .then((messageId) => {
        upsertMessages(activeChatId, [{ id: messageId, text, outgoing: true, time: nowTime() }]);
      })
      .catch(() => {
        setComposeError("Failed to send over XMTP.");
      });
  };

  const addChatByAddress = async () => {
    const value = newAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setComposeError("Invalid wallet address.");
      return;
    }

    if (!xmtpClientRef.current) {
      setComposeError("Connect wallet and wait for XMTP.");
      return;
    }

    try {
      const canMessage = await Client.canMessage([{ identifier: value, identifierKind: "Ethereum" }], "production");
      if (!canMessage.get(value)) {
        setComposeError("This wallet is not reachable on XMTP yet.");
        return;
      }

      const dm = await xmtpClientRef.current.conversations.newDmWithIdentifier({ identifier: value, identifierKind: "Ethereum" });
      const chatId = await ensureChatForDm(xmtpClientRef.current, dm);
      setActiveChatId(chatId);
      setMobileChatOpen(true);
      setNewAddress("");
      setComposeError("");
    } catch {
      setComposeError("Could not create XMTP chat.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1722] p-0 text-slate-100 md:p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex h-screen max-w-7xl overflow-hidden bg-[#17212b] md:h-[92vh] md:rounded-2xl"
      >
        <aside className={`${mobileChatOpen ? "hidden" : "flex"} w-full flex-col border-r border-[#253243] md:flex md:w-[360px]`}>
          <div className="border-b border-[#253243] px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-lg font-semibold tracking-tight">AliTerra Messenger</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const provider = wcProviderRef.current;
                    if (provider && walletAddress) {
                      void initializeXmtp(provider, walletAddress);
                    }
                  }}
                  className="rounded-md bg-[#2b5278] px-3 py-1 text-sm font-medium hover:bg-[#33608d]"
                >
                  Retry
                </button>
                {walletAddress ? (
                  <button
                    onClick={disconnectWallet}
                    className="rounded-md bg-[#24384c] px-3 py-1 text-xs font-medium hover:bg-[#2b4561]"
                  >
                    {shortAddress(walletAddress)}
                  </button>
                ) : (
                  <button onClick={connectWallet} className="rounded-md bg-[#3e6389] px-3 py-1 text-xs font-medium hover:bg-[#4b76a3]">
                    Connect
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-[#242f3d] px-3 py-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <motion.button
                key={chat.id}
                layout
                onClick={() => {
                  setActiveChatId(chat.id);
                  setMobileChatOpen(true);
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  activeChatId === chat.id ? "bg-[#2b5278]/70" : "hover:bg-[#202b38]"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4f7fa8] text-sm font-semibold">
                  {shortName(chat.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{chat.name}</p>
                    <span className="text-xs text-slate-400">{chat.lastSeen}</span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{chat.address}</p>
                </div>
                {chat.unread > 0 && (
                  <span className="rounded-full bg-[#5fa9dd] px-2 py-0.5 text-xs font-semibold text-white">{chat.unread}</span>
                )}
              </motion.button>
            ))}
          </div>

          <div className="border-t border-[#253243] p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">New chat by wallet</p>
            <div className="flex gap-2">
              <input
                value={newAddress}
                onChange={(event) => setNewAddress(event.target.value)}
                placeholder="0x..."
                className="min-w-0 flex-1 rounded-lg bg-[#242f3d] px-3 py-2 text-xs outline-none placeholder:text-slate-500"
              />
              <button
                onClick={addChatByAddress}
                className="rounded-lg bg-[#2b5278] px-3 text-sm font-medium hover:bg-[#33608d]"
              >
                Add
              </button>
            </div>
          </div>
        </aside>

        <main className={`${mobileChatOpen ? "flex" : "hidden"} flex-1 flex-col md:flex`}>
          {activeChat ? (
            <>
              <header className="flex items-center gap-3 border-b border-[#253243] px-4 py-3">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-[#202b38] md:hidden"
                >
                  Back
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f7fa8] text-sm font-semibold">
                  {shortName(activeChat.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{activeChat.name}</h2>
                  <p className="text-xs text-slate-400">
                    {!xmtpReady ? "XMTP connecting..." : xmtpAvailable ? activeChat.lastSeen : "XMTP offline"}
                  </p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-[#0e1621] px-3 py-4 md:px-6">
                <AnimatePresence initial={false}>
                  {currentMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`mb-2 flex ${message.outgoing ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          message.outgoing ? "bg-[#2b5278] text-white" : "bg-[#182533] text-slate-100"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="mt-1 text-right text-[11px] text-slate-300">{message.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <footer className="border-t border-[#253243] bg-[#17212b] p-3 md:p-4">
                {!xmtpAvailable && (
                  <p className="mb-2 text-xs text-amber-300">XMTP disconnected. Sending is temporarily locked.</p>
                )}
                {composeError && <p className="mb-2 text-xs text-rose-300">{composeError}</p>}
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message"
                    className="min-w-0 flex-1 rounded-full bg-[#242f3d] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!xmtpAvailable || !draft.trim()}
                    className="rounded-full bg-[#2b5278] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">Select a chat to start messaging</div>
          )}
        </main>
      </motion.div>

      <AnimatePresence>
        {walletModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setWalletModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#17212b] p-5"
            >
              <h3 className="text-base font-semibold">WalletConnect</h3>
              <p className="mt-1 text-sm text-slate-400">
                {walletStep === "initializing" && "Initializing secure session..."}
                {walletStep === "qr" && "Scan QR or open wallet app."}
                {walletStep === "waiting" && "Approve connection in your wallet."}
                {walletStep === "checking" && "Checking approved session..."}
                {walletStep === "connected" && "Connected"}
                {walletStep === "error" && "Connection failed"}
              </p>

              {wcQr && walletStep === "qr" && (
                <div className="mt-4 flex justify-center rounded-xl bg-white p-3">
                  <img src={wcQr} alt="WalletConnect QR" className="h-56 w-56" />
                </div>
              )}

              {(walletStep === "qr" || walletStep === "waiting" || walletStep === "checking") && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => openWalletDeepLink("metamask")} className="rounded-lg bg-[#2b5278] px-3 py-2 text-sm font-medium">
                    Open MetaMask
                  </button>
                  <button onClick={() => openWalletDeepLink("trust")} className="rounded-lg bg-[#2b5278] px-3 py-2 text-sm font-medium">
                    Open Trust
                  </button>
                  <button onClick={checkAndFinishSession} className="col-span-2 rounded-lg bg-[#3e6389] px-3 py-2 text-sm font-medium">
                    I approved, finish
                  </button>
                  <button onClick={copyWcUri} className="col-span-2 rounded-lg bg-[#24384c] px-3 py-2 text-sm font-medium">
                    Copy WalletConnect URI
                  </button>
                  {showInstallLinks && (
                    <>
                      <button onClick={() => openInstallLink("metamask")} className="rounded-lg bg-[#3b2d56] px-3 py-2 text-sm font-medium">
                        Install MetaMask
                      </button>
                      <button onClick={() => openInstallLink("trust")} className="rounded-lg bg-[#3b2d56] px-3 py-2 text-sm font-medium">
                        Install Trust
                      </button>
                    </>
                  )}
                </div>
              )}

              {walletError && <p className="mt-3 text-xs text-rose-300">{walletError}</p>}

              <div className="mt-4 flex justify-end">
                <button onClick={() => setWalletModalOpen(false)} className="rounded-lg bg-[#223243] px-3 py-2 text-sm">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
