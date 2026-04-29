import { useState } from 'react';
import {
  ArrowLeft, Bell, Shield, Moon, Palette,
  LogOut, ChevronRight, Copy, Check, Wallet, ExternalLink, Globe, Lock
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';

export function SettingsPanel() {
  const { wallet, user, setWallet, setUser, setActivePanel, setChats, setActiveChat } = useStore();
  const [copied, setCopied] = useState(false);
  const [_darkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [username, setUsername] = useState(user?.name || '');
  const [editingName, setEditingName] = useState(false);

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setWallet(null);
    setUser(null);
    setChats([]);
    setActiveChat(null);
  };

  const handleSaveName = () => {
    if (user && username.trim()) {
      useStore.getState().setUser({ ...user, name: username.trim() });
    }
    setEditingName(false);
  };

  const networkColors: Record<string, string> = {
    'Ethereum': '#627EEA',
    'Polygon': '#8247E5',
    'BSC': '#F0B90B',
    'Arbitrum': '#12AAFF',
    'Optimism': '#FF0420',
    'Base': '#0052FF',
    'Sepolia': '#627EEA',
    'Mumbai': '#8247E5',
  };
  const netColor = networkColors[wallet?.networkName || ''] || '#2aabee';

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-[#1e2c3a]">
        <button
          onClick={() => setActivePanel('chats')}
          className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={20} className="text-[#8899a8]" />
        </button>
        <h2 className="text-white font-semibold text-lg flex-1">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={user?.name || ''} address={wallet?.address} size="xl" />
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className="flex-1 bg-[#1e2c3a] text-white rounded-xl px-3 py-2 text-sm outline-none border border-[#2aabee]/50"
                  />
                  <button onClick={handleSaveName} className="text-[#2aabee]">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-lg truncate">{user?.name}</p>
                  <button onClick={() => setEditingName(true)} className="text-[#8899a8] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-[#8899a8] text-sm font-mono truncate">{formatAddress(wallet?.address || '', 6)}</p>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="bg-gradient-to-br from-[#1e2c3a] to-[#182533] rounded-2xl p-4 border border-[#2a3a4a]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-[#2aabee]" />
                <span className="text-[#8899a8] text-sm font-medium">Connected Wallet</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: netColor + '22', color: netColor }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: netColor }} />
                {wallet?.networkName}
              </div>
            </div>
            <p className="text-white font-mono text-xs break-all mb-3">{wallet?.address}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#8899a8] text-xs">Balance</p>
                <p className="text-white font-semibold">{wallet?.balance} ETH</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 bg-[#2aabee]/10 hover:bg-[#2aabee]/20 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {copied ? <Check size={14} className="text-[#4dcd5e]" /> : <Copy size={14} className="text-[#2aabee]" />}
                  <span className="text-[#2aabee] text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <a
                  href={`https://etherscan.io/address/${wallet?.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#2aabee]/10 hover:bg-[#2aabee]/20 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <ExternalLink size={14} className="text-[#2aabee]" />
                  <span className="text-[#2aabee] text-xs">Explorer</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="px-3 space-y-4">
          {/* Notifications */}
          <div className="bg-[#1e2c3a] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2aabee]/15 rounded-full flex items-center justify-center">
                  <Bell size={16} className="text-[#2aabee]" />
                </div>
                <span className="text-[#e0eaf3] font-medium">Notifications</span>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  notifications ? 'bg-[#2aabee]' : 'bg-[#3a4a5a]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    notifications ? 'left-6' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-[#1e2c3a] rounded-2xl overflow-hidden">
            <SettingItem icon={<Lock size={16} className="text-[#4dcd5e]" />} iconBg="bg-[#4dcd5e]/15" label="Privacy" />
            <div className="h-px bg-[#2a3a4a] ml-16" />
            <SettingItem icon={<Shield size={16} className="text-[#f0a500]" />} iconBg="bg-[#f0a500]/15" label="Security" />
            <div className="h-px bg-[#2a3a4a] ml-16" />
            <SettingItem icon={<Globe size={16} className="text-[#2aabee]" />} iconBg="bg-[#2aabee]/15" label="Network" badge={wallet?.networkName} />
          </div>

          {/* Appearance */}
          <div className="bg-[#1e2c3a] rounded-2xl overflow-hidden">
            <SettingItem icon={<Moon size={16} className="text-[#8899a8]" />} iconBg="bg-[#3a4a5a]" label="Dark Mode" badge="On" />
            <div className="h-px bg-[#2a3a4a] ml-16" />
            <SettingItem icon={<Palette size={16} className="text-[#f07c7c]" />} iconBg="bg-[#f07c7c]/15" label="Chat Wallpaper" />
          </div>

          {/* About */}
          <div className="bg-[#1e2c3a] rounded-2xl overflow-hidden">
            <div className="px-4 py-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2aabee] to-[#1e96c8] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                    <path d="M8 16l16 8 16-8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M24 24v12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="24" cy="12" r="5" fill="white"/>
                  </svg>
                </div>
                <span className="text-white font-semibold">Web3 Messenger</span>
              </div>
              <p className="text-[#8899a8] text-xs ml-10">Version 2.0.0 · Build on Ethereum</p>
              <p className="text-[#6c7c8c] text-xs ml-10">Based on Aliterra Protocol</p>
            </div>
          </div>

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="w-full bg-[#1e2c3a] rounded-2xl px-4 py-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <div className="w-8 h-8 bg-red-500/15 rounded-full flex items-center justify-center">
              <LogOut size={16} className="text-red-400" />
            </div>
            <span className="text-red-400 font-medium">Disconnect Wallet</span>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

function SettingItem({
  icon,
  iconBg,
  label,
  badge,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  badge?: string;
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-[#243040] cursor-pointer transition-colors">
      <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-[#e0eaf3] font-medium flex-1">{label}</span>
      {badge && <span className="text-[#8899a8] text-sm">{badge}</span>}
      <ChevronRight size={16} className="text-[#3a4a5a]" />
    </div>
  );
}
