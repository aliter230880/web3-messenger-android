import { useState } from 'react';
import {
  Shield,
  Bell,
  Moon,
  Sun,
  Lock,
  LogOut,
  Copy,
  Check,
  Wifi,
  Globe,
  Info,
  Trash2,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import { wsClient } from '../utils/ws';
import Avatar from './Avatar';

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange()}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-purple-600' : 'bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SettingsView() {
  const { walletAddress, ensName, networkName, theme, toggleTheme, disconnectWallet, chats } = useStore();
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    wsClient.disconnect();
    disconnectWallet();
  };

  const handleExport = () => {
    const data = { chats, walletAddress, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web3-messenger-export.json';
    a.click();
  };

  const handleClearData = () => {
    if (confirm('Очистить все данные? Это действие нельзя отменить.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);

  return (
    <div className="h-full flex flex-col bg-[#0f0f1a] overflow-y-auto">
      {/* Profile Card */}
      <div className="px-4 py-6 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-white/5">
        <div className="flex items-center gap-4">
          <Avatar address={walletAddress || '0x0'} name={ensName || undefined} size="lg" status="online" />
          <div>
            <div className="text-lg font-bold text-white mb-1">
              {ensName || (walletAddress ? formatAddress(walletAddress, 6) : 'Аноним')}
            </div>
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="font-mono text-xs">{walletAddress ? formatAddress(walletAddress, 8) : ''}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-gray-500">{networkName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Notifications */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Уведомления</h3>
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Уведомления</div>
                <div className="text-xs text-gray-500">Новые сообщения</div>
              </div>
              <Toggle value={notifications} onChange={() => setNotifications(!notifications)} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Безопасность</h3>
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">E2E шифрование</div>
                <div className="text-xs text-gray-500">Всегда включено</div>
              </div>
              <Toggle value={true} onChange={() => {}} disabled />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Shield className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Протокол</div>
                <div className="text-xs text-gray-500">Wallet Signature + XOR encryption</div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Внешний вид</h3>
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Тёмная тема</div>
              </div>
              <Toggle value={theme === 'dark'} onChange={toggleTheme} />
            </div>
          </div>
        </div>

        {/* Network */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Сеть</h3>
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Сеть</div>
                <div className="text-xs text-gray-500">{networkName || 'Не подключено'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Globe className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Протокол</div>
                <div className="text-xs text-gray-500">Web3 / Ethereum</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Данные</h3>
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Всего чатов</div>
              </div>
              <span className="text-sm text-gray-400">{chats.length}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Всего сообщений</div>
              </div>
              <span className="text-sm text-gray-400">{totalMessages}</span>
            </div>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Download className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">Экспорт данных</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleClearData}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-red-400">Очистить все данные</div>
              </div>
            </button>
          </div>
        </div>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-semibold rounded-2xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Отключить кошелёк
        </button>

        <div className="text-center py-4">
          <p className="text-gray-600 text-xs">Web3 Messenger v1.0.0</p>
          <p className="text-gray-700 text-xs mt-0.5">Построен на Ethereum · E2E encrypted</p>
        </div>
      </div>
    </div>
  );
}
