'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { walletService } from '@/services/walletService';
import { xmtpService } from '@/services/xmtpService';
import { encryptionService } from '@/services/encryptionService';
import { ethers } from 'ethers';

// ============ TYPES ============

type ModalType = 'wallet' | 'newChat' | 'profile' | null;
type WalletScreen = 'picker' | 'connecting' | 'qr' | 'waiting' | 'connected';
type View = 'chats' | 'chat';

// ============ HELPER FUNCTIONS ============

function getAvatarUrl(seed: string): string {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#fa709a'];
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  return colors[index];
}

function getInitials(address: string): string {
  return address.slice(2, 4).toUpperCase();
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============ SVG ICONS ============

const Icons = {
  Send: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  Back: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  User: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  CheckAll: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 6 9 17 4 12"></polyline>
      <polyline points="22 6 13 17" opacity="0.5"></polyline>
    </svg>
  ),
  X: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Trash: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  ),
  Wallet: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  Message: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
};

// ============ AVATAR COMPONENT ============

function Avatar({ address, name, size = 48, isOnline }: { address: string; name?: string; size?: number; isOnline?: boolean }) {
  const bgColor = getAvatarUrl(address);
  const initials = name ? name.slice(0, 2).toUpperCase() : getInitials(address);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold"
        style={{
          width: size,
          height: size,
          background: bgColor,
          fontSize: size * 0.35,
        }}
      >
        {initials}
      </div>
      {isOnline && (
        <div
          className="absolute bottom-0 right-0 rounded-full online-indicator"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}

// ============ WALLET MODAL ============

function WalletModal({ onClose }: { onClose: () => void }) {
  const { wallet, setWallet, setCurrentUser, setXmtpReady, setXmtpAvailable } = useStore();
  const [screen, setScreen] = useState<WalletScreen>(wallet.isConnected ? 'connected' : 'picker');
  const [error, setError] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [deepLinkOpened, setDeepLinkOpened] = useState(false);

  const handleConnect = async (type: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setScreen('connecting');
    setError(null);

    try {
      let connection;

      if (type === 'metamask') {
        connection = await walletService.connectMetaMask();
      } else if (type === 'trustwallet') {
        connection = await walletService.connectTrustWallet();
      } else {
        // Set up URI display handler
        walletService.onDisplayUri = (uri) => {
          setWcUri(uri);
          setScreen('qr');
        };
        connection = await walletService.connectViaWalletConnect();
      }

      if (connection) {
        await finishConnection(connection);
      }
    } catch (err: any) {
      console.error('[WalletModal] Connection error:', err);
      setError(err.message);
      setScreen('picker');
    }
  };

  const finishConnection = async (connection: any) => {
    const { address, signer, provider, walletType } = connection;

    setWallet({
      isConnected: true,
      address,
      chainId: 137,
      signer,
      provider,
      walletType,
      isReadOnly: !signer,
    });

    setCurrentUser({
      id: address,
      name: truncateAddress(address),
      avatar: getAvatarUrl(address),
    });

    setScreen('connected');

    // Initialize XMTP in background
    if (signer) {
      xmtpService.initialize(signer).then((success) => {
        setXmtpReady(true);
        setXmtpAvailable(success);
      });
    }

    setTimeout(() => onClose(), 800);
  };

  const handleOpenDeepLink = (type: 'metamask' | 'trustwallet') => {
    if (wcUri) {
      walletService.openWalletDeepLink(wcUri, type);
      setDeepLinkOpened(true);
      setScreen('waiting');
    }
  };

  const handleIConfirmed = async () => {
    setScreen('connecting');
    walletService.forceResolveSession();

    // Wait a moment then check
    await new Promise((r) => setTimeout(r, 2000));

    const uri = wcUri;
    if (uri) {
      try {
        // Try to get the session
        const connection = await walletService.connectViaWalletConnect();
        if (connection) {
          await finishConnection(connection);
        }
      } catch {
        setError('Connection not confirmed. Please try again.');
        setScreen('qr');
      }
    }
  };

  const handleDisconnect = () => {
    walletService.disconnect();
    xmtpService.disconnect();
    useStore.getState().disconnectWallet();
    setScreen('picker');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fadeIn" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md mx-4 animate-slideUp overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">
            {screen === 'connected' ? 'Wallet Connected' : 'Connect Wallet'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
            <Icons.X />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {screen === 'picker' && (
            <div className="space-y-3">
              {/* MetaMask */}
              <button
                onClick={() => handleConnect('metamask')}
                className="wallet-option w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 35 33" fill="none">
                    <path d="M32.9 1L19.7 10.8l2.5-5.8L32.9 1z" fill="#E17726" stroke="#E17726" strokeWidth="0.25"/>
                    <path d="M2.1 1l13.1 9.9-2.4-6L2.1 1z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M28.2 23.4l-3.5 5.4 7.5 2.1 2.1-7.3-6.1-.2z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M.5 23.6l2.1 7.3 7.5-2.1-3.5-5.4-6.1.2z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M9.9 14.4l-2.1 3.2 7.4.3-.2-8-5.1 4.5z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M25 14.4l-5.2-4.6v8l7.4-.3-2.2-3.1z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M10.3 28.8l4.5-2.2-3.9-3-.6 5.2z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                    <path d="M20.2 26.6l4.5 2.2-.5-5.2-4 3z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">MetaMask</div>
                  <div className="text-sm text-[var(--text-muted)]">Connect with MetaMask wallet</div>
                </div>
              </button>

              {/* Trust Wallet */}
              <button
                onClick={() => handleConnect('trustwallet')}
                className="wallet-option w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#3375BB"/>
                    <path d="M12 4.5L5.5 8.25v4.5c0 4.16 2.88 8.05 6.5 9 3.62-.95 6.5-4.84 6.5-9v-4.5L12 4.5z" fill="#3375BB"/>
                    <path d="M12 7l-4 2.5v3c0 2.76 1.79 5.35 4 6 2.21-.65 4-3.24 4-6v-3L12 7z" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Trust Wallet</div>
                  <div className="text-sm text-[var(--text-muted)]">Connect with Trust Wallet</div>
                </div>
              </button>

              {/* WalletConnect */}
              <button
                onClick={() => handleConnect('walletconnect')}
                className="wallet-option w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-[#3B99FC]/20 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M6.09 8.5c3.26-3.19 8.56-3.19 11.82 0l.39.38a.4.4 0 0 1 0 .58l-1.34 1.31a.21.21 0 0 1-.3 0l-.54-.53a5.94 5.94 0 0 0-8.26 0l-.58.56a.21.21 0 0 1-.3 0L5.65 9.5a.4.4 0 0 1 0-.58l.44-.42zm14.6 2.72l1.19 1.17a.4.4 0 0 1 0 .58l-5.38 5.26a.42.42 0 0 1-.59 0l-3.82-3.74a.1.1 0 0 0-.15 0l-3.82 3.74a.42.42 0 0 1-.59 0L2.12 12.97a.4.4 0 0 1 0-.58l1.2-1.17a.42.42 0 0 1 .58 0l3.82 3.74a.1.1 0 0 0 .15 0l3.82-3.74a.42.42 0 0 1 .59 0l3.82 3.74a.1.1 0 0 0 .15 0l3.82-3.74a.42.42 0 0 1 .6 0z" fill="#3B99FC"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">WalletConnect</div>
                  <div className="text-sm text-[var(--text-muted)]">Scan QR code with any wallet</div>
                </div>
              </button>

              {/* AliTerra */}
              <button
                onClick={() => {
                  walletService.connectAliTerra();
                  setError('AliTerra: Copy your address and paste it manually');
                }}
                className="wallet-option w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-400">A</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">AliTerra Wallet</div>
                  <div className="text-sm text-[var(--text-muted)]">Read-only connection</div>
                </div>
              </button>
            </div>
          )}

          {screen === 'connecting' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[var(--text-secondary)]">Connecting wallet...</p>
              <p className="text-sm text-[var(--text-muted)] mt-2">Check your wallet for confirmation</p>
            </div>
          )}

          {screen === 'qr' && wcUri && (
            <div className="flex flex-col items-center py-4">
              <p className="text-[var(--text-secondary)] mb-4">Scan with your wallet app</p>

              {/* QR Code placeholder */}
              <div className="qr-container mb-6">
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  QR Code
                  <br />
                  Use deep link buttons below
                </div>
              </div>

              {/* Deep link buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => handleOpenDeepLink('metamask')}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  Open MetaMask
                </button>
                <button
                  onClick={() => handleOpenDeepLink('trustwallet')}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  Open Trust
                </button>
              </div>
            </div>
          )}

          {screen === 'waiting' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[var(--text-secondary)] mb-2">Waiting for confirmation...</p>
              <p className="text-sm text-[var(--text-muted)] mb-6">Approve the connection in your wallet</p>

              <button
                onClick={handleIConfirmed}
                className="btn-primary w-full"
              >
                I confirmed — continue
              </button>
            </div>
          )}

          {screen === 'connected' && wallet.address && (
            <div className="flex flex-col items-center py-4">
              <Avatar address={wallet.address} size={80} />
              <p className="font-mono text-lg mt-4 mb-1">{truncateAddress(wallet.address)}</p>
              <p className="text-sm text-[var(--text-muted)] mb-2">
                {wallet.walletType === 'metamask' ? 'MetaMask' : wallet.walletType === 'trustwallet' ? 'Trust Wallet' : 'WalletConnect'}
              </p>
              <div className="e2e-badge e2e-active mb-6">
                <Icons.Lock />
                Polygon Network
              </div>

              <button
                onClick={handleDisconnect}
                className="btn-secondary w-full text-red-400 border-red-500/20 hover:bg-red-500/10"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ NEW CHAT MODAL ============

function NewChatModal({ onClose, onChatCreated }: { onClose: () => void; onChatCreated: (address: string) => void }) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { wallet } = useStore();

  const handleStartChat = () => {
    if (!ethers.isAddress(address)) {
      setError('Invalid Ethereum address');
      return;
    }

    if (address.toLowerCase() === wallet.address?.toLowerCase()) {
      setError("You can't chat with yourself");
      return;
    }

    onChatCreated(address);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fadeIn" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">New Chat</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
            <Icons.X />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <label className="block text-sm text-[var(--text-secondary)] mb-2">Ethereum Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(null); }}
            placeholder="0x..."
            className="telegram-input mb-4"
          />

          <button
            onClick={handleStartChat}
            disabled={!address}
            className="btn-primary w-full"
          >
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PROFILE MODAL ============

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { wallet, currentUser, setCurrentUser, xmtpReady, xmtpAvailable } = useStore();
  const [name, setName] = useState(currentUser?.name || '');

  const handleSave = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, name });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fadeIn" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
            <Icons.X />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <Avatar address={wallet.address || '0x00'} name={name} size={80} />
            <p className="font-mono text-sm text-[var(--text-muted)] mt-3">{truncateAddress(wallet.address || '0x00')}</p>
          </div>

          <label className="block text-sm text-[var(--text-secondary)] mb-2">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="telegram-input mb-4"
          />

          {/* E2E Status */}
          <div className="mb-6">
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Encryption Status</label>
            <div className={`e2e-badge ${xmtpAvailable ? 'e2e-active' : xmtpReady ? 'e2e-inactive' : 'e2e-connecting'}`}>
              <Icons.Lock />
              {xmtpAvailable ? 'E2E Active' : xmtpReady ? 'XMTP Unavailable' : 'Connecting...'}
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary w-full">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ SIDEBAR ============

function Sidebar({
  onOpenWallet,
  onOpenNewChat,
  onOpenProfile,
  onSelectChat,
}: {
  onOpenWallet: () => void;
  onOpenNewChat: () => void;
  onOpenProfile: () => void;
  onSelectChat: (chatId: string) => void;
}) {
  const { chats, activeChat, wallet, xmtpAvailable, xmtpReady } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(
    (chat) =>
      chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contactAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by last message time
  const sortedChats = [...filteredChats].sort(
    (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-[var(--accent)]">Web3</span>Gram
          </h1>
          <div className="flex items-center gap-2">
            {wallet.isConnected && (
              <button
                onClick={onOpenProfile}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                title="Profile"
              >
                <Icons.User />
              </button>
            )}
            <button
              onClick={onOpenNewChat}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              title="New Chat"
              disabled={!wallet.isConnected}
            >
              <Icons.Plus />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="telegram-input pl-10"
            style={{ paddingLeft: '40px' }}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <Icons.Search />
          </div>
        </div>
      </div>

      {/* E2E Status */}
      {wallet.isConnected && (
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <div className={`e2e-badge text-xs ${xmtpAvailable ? 'e2e-active' : xmtpReady ? 'e2e-inactive' : 'e2e-connecting'}`}>
            <Icons.Lock />
            {xmtpAvailable ? 'E2E Encrypted' : xmtpReady ? 'XMTP Offline' : 'Initializing...'}
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {!wallet.isConnected ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Icons.Wallet />
            </div>
            <p className="text-[var(--text-secondary)] mb-4">Connect your wallet to start chatting</p>
            <button onClick={onOpenWallet} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Icons.Message />
            </div>
            <p className="text-[var(--text-secondary)] mb-2">No chats yet</p>
            <p className="text-sm text-[var(--text-muted)]">Start a new chat to begin messaging</p>
          </div>
        ) : (
          sortedChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
              onClick={() => {
                onSelectChat(chat.id);
                useStore.getState().markAsRead(chat.id);
              }}
            >
              <Avatar address={chat.contactAddress} name={chat.contactName} size={52} isOnline={chat.isOnline} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{chat.contactName}</span>
                  {chat.lastMessageTime && (
                    <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-muted)] truncate">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge ml-2">{chat.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Wallet button */}
      {wallet.isConnected && (
        <div className="p-3 border-t border-[var(--border)]">
          <button
            onClick={onOpenWallet}
            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <Avatar address={wallet.address || '0x00'} size={36} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{truncateAddress(wallet.address || '')}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {wallet.walletType === 'metamask' ? 'MetaMask' : 'Connected'}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ============ CHAT VIEW ============

function ChatView({
  chatId,
  onBack,
}: {
  chatId: string;
  onBack: () => void;
}) {
  const { chats, wallet, addMessage, xmtpAvailable } = useStore();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find((c) => c.id === chatId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, scrollToBottom]);

  // Load XMTP messages when chat opens
  useEffect(() => {
    if (!chat || !xmtpService.isReady()) return;

    const loadMessages = async () => {
      const xmtpMessages = await xmtpService.getMessages(chat.contactAddress, 50);
      xmtpMessages.forEach((msg) => {
        const existing = chat.messages.find((m) => m.id === msg.id);
        if (!existing) {
          addMessage(chatId, {
            id: msg.id,
            chatId,
            senderAddress: msg.senderAddress,
            receiverAddress: msg.recipientAddress,
            content: msg.content,
            timestamp: msg.timestamp,
            isSent: true,
            isDelivered: true,
          });
        }
      });
    };

    loadMessages();
  }, [chatId, xmtpAvailable]);

  const handleSend = async () => {
    if (!message.trim() || !chat || isSending) return;

    const msgContent = message.trim();
    setMessage('');
    setIsSending(true);

    // Add message to local state immediately
    const localMsg = {
      id: `local_${Date.now()}`,
      chatId,
      senderAddress: wallet.address || '',
      receiverAddress: chat.contactAddress,
      content: msgContent,
      timestamp: Date.now(),
      isSent: true,
      isDelivered: false,
    };

    addMessage(chatId, localMsg);

    // Send via XMTP
    try {
      if (xmtpService.isReady()) {
        const encrypted = encryptionService.formatPayload(msgContent);
        const sent = await xmtpService.sendMessage(chat.contactAddress, encrypted);

        // Update with XMTP message ID
        addMessage(chatId, {
          id: sent.id,
          chatId,
          senderAddress: sent.senderAddress,
          receiverAddress: sent.recipientAddress,
          content: msgContent,
          timestamp: sent.timestamp,
          isSent: true,
          isDelivered: true,
        });
      }
    } catch (err) {
      console.error('[ChatView] Send error:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-[var(--text-muted)]">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors lg:hidden"
        >
          <Icons.Back />
        </button>
        <Avatar address={chat.contactAddress} name={chat.contactName} size={40} isOnline={chat.isOnline} />
        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate">{chat.contactName}</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {chat.isOnline ? 'online' : truncateAddress(chat.contactAddress)}
          </p>
        </div>
        {xmtpAvailable && (
          <div className="e2e-badge e2e-active text-xs">
            <Icons.Lock />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Icons.Lock />
            </div>
            <p className="text-[var(--text-secondary)] mb-1">End-to-end encrypted</p>
            <p className="text-sm text-[var(--text-muted)]">
              Messages are secured with XMTP encryption
            </p>
          </div>
        ) : (
          chat.messages.map((msg, index) => {
            const isMe = msg.senderAddress.toLowerCase() === wallet.address?.toLowerCase();
            const showAvatar = !isMe && (index === 0 || chat.messages[index - 1]?.senderAddress !== msg.senderAddress);

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {!isMe && showAvatar && (
                  <Avatar address={msg.senderAddress} size={32} />
                )}
                {!isMe && !showAvatar && <div className="w-8" />}

                <div className={`max-w-[70%] ${isMe ? 'ml-2' : 'mr-2'}`}>
                  <div className={`px-4 py-2 ${isMe ? 'message-sent' : 'message-received'}`}>
                    <p className="text-[15px] whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-[var(--accent)]">
                        {msg.isRead ? <Icons.CheckAll /> : msg.isDelivered ? <Icons.CheckAll /> : <Icons.Check />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={xmtpAvailable ? 'Write a message...' : 'Initializing encryption...'}
            className="telegram-input flex-1"
            disabled={!wallet.isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending || !wallet.isConnected}
            className="p-3 bg-[var(--accent)] rounded-full hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============

export default function Web3Gram() {
  const {
    wallet,
    activeChat,
    setActiveChat,
    addChat,
    addMessage,
    chats,
    xmtpAvailable,
  } = useStore();

  const [modal, setModal] = useState<ModalType>(null);
  const [view, setView] = useState<View>('chats');

  // Stream incoming messages
  useEffect(() => {
    if (!xmtpAvailable || !wallet.address) return;

    const startStream = async () => {
      try {
        await xmtpService.streamAllMessages((msg) => {
          const chatId = encryptionService.generateChatId(
            wallet.address!,
            msg.senderAddress
          );

          // Find or create chat
          const existingChat = chats.find((c) => c.id === chatId);
          if (!existingChat) {
            addChat({
              id: chatId,
              contactAddress: msg.senderAddress,
              contactName: truncateAddress(msg.senderAddress),
              messages: [],
              unreadCount: 1,
              lastMessage: msg.content,
              lastMessageTime: msg.timestamp,
            });
          }

          addMessage(chatId, {
            id: msg.id,
            chatId,
            senderAddress: msg.senderAddress,
            receiverAddress: msg.recipientAddress || wallet.address!,
            content: msg.content,
            timestamp: msg.timestamp,
            isSent: true,
            isDelivered: true,
          });
        });
      } catch (err) {
        console.error('[App] Stream error:', err);
      }
    };

    startStream();
  }, [xmtpAvailable, wallet.address]);

  const handleChatCreated = (address: string) => {
    if (!wallet.address) return;

    const chatId = encryptionService.generateChatId(wallet.address, address);
    const existingChat = chats.find((c) => c.id === chatId);

    if (!existingChat) {
      addChat({
        id: chatId,
        contactAddress: address,
        contactName: truncateAddress(address),
        messages: [],
        unreadCount: 0,
      });
    }

    setActiveChat(chatId);
    setView('chat');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChat(chatId);
    setView('chat');
  };

  const handleBack = () => {
    setView('chats');
    setActiveChat(null);
  };

  return (
    <div className="h-full flex">
      {/* Sidebar - always visible on desktop, conditionally on mobile */}
      <div className={`w-full lg:w-[380px] lg:border-r lg:border-[var(--border)] ${view === 'chat' ? 'hidden lg:block' : ''}`}>
        <Sidebar
          onOpenWallet={() => setModal('wallet')}
          onOpenNewChat={() => setModal('newChat')}
          onOpenProfile={() => setModal('profile')}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Chat View - visible when a chat is selected */}
      <div className={`flex-1 ${view === 'chats' ? 'hidden lg:flex' : 'flex'}`}>
        {activeChat ? (
          <ChatView chatId={activeChat} onBack={handleBack} />
        ) : (
          <div className="h-full flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <Icons.Message />
              </div>
              <h2 className="text-xl font-semibold mb-2">Web3Gram</h2>
              <p className="text-[var(--text-muted)]">
                {wallet.isConnected
                  ? 'Select a chat to start messaging'
                  : 'Connect your wallet to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'wallet' && <WalletModal onClose={() => setModal(null)} />}
      {modal === 'newChat' && (
        <NewChatModal
          onClose={() => setModal(null)}
          onChatCreated={handleChatCreated}
        />
      )}
      {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
    </div>
  );
}
