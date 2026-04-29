import { useState } from 'react';
import {
  ArrowLeft, Shield, Bell, Palette, Lock, Globe,
  Database, Info, HelpCircle, ChevronRight, Moon,
  Wallet, Eye, EyeOff, Copy, Check
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';

export function SettingsPanel() {
  const { wallet, user, setActivePanel, setUser } = useStore();
  const [showAddress, setShowAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(user?.name || '');

  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard?.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
      setUser(user ? { ...user, name: tempName.trim() } : null);
    }
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header */}
      <div className="flex items-center px-3 pt-2 pb-1 bg-[#17212b]">
        <button
          onClick={() => setActivePanel('chats')}
          className="w-[54px] h-[54px] rounded-full flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={24} className="text-[#8899a8]" />
        </button>
        <h2 className="text-white font-semibold text-[19px] flex-1 ml-1">Настройки</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="flex items-center gap-4 px-5 py-4">
          <Avatar
            name={user?.name || ''}
            address={wallet?.address || ''}
            size="xl"
            isOnline={true}
            type="private"
          />
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  autoFocus
                  className="flex-1 bg-[#1e2c3a] text-white rounded-[8px] px-3 py-[6px] text-[16px] outline-none min-w-0" style={{ border: '1px solid #2aabee80' }}
                />
                <button onClick={saveName} className="text-[#2aabee] text-[14px] font-medium flex-shrink-0">
                  Готово
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempName(user?.name || ''); setEditingName(true); }}
                className="text-white font-semibold text-[18px] hover:text-[#2aabee] transition-colors text-left leading-tight"
              >
                {user?.name}
              </button>
            )}
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="flex items-center gap-1.5 text-[#8899a8] text-[14px] hover:text-[#e0eaf3] transition-colors mt-[3px]"
            >
              {showAddress ? (
                <>
                  <EyeOff size={13} />
                  <span className="font-mono">{wallet?.address}</span>
                </>
              ) : (
                <>
                  <Eye size={13} />
                  <span>{formatAddress(wallet?.address || '', 8)}</span>
                </>
              )}
            </button>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-[#2aabee] text-[13px] font-medium hover:text-[#229ED9] transition-colors mt-[2px]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Скопировано!' : 'Копировать адрес'}
            </button>
          </div>
        </div>

        {/* Wallet Info Card */}
        <div className="mx-4 mb-3 p-3.5 bg-[#1e2c3a] rounded-[12px]">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-[38px] h-[38px] rounded-full bg-[#2aabee]/[0.1] flex items-center justify-center flex-shrink-0">
              <Wallet size={18} className="text-[#2aabee]" />
            </div>
            <div>
              <p className="text-white font-semibold text-[14px]">Подключённый кошелёк</p>
              <p className="text-[#8899a8] text-[12px]">{wallet?.networkName}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#17212b] rounded-[10px] px-3 py-2.5">
            <div>
              <p className="text-[#6c7c8c] text-[10px] uppercase tracking-widest">Баланс</p>
              <p className="text-white font-bold text-[18px] leading-tight mt-[1px]">
                {wallet?.balance} <span className="text-[13px] text-[#8899a8] font-normal">ETH</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#6c7c8c] text-[10px] uppercase tracking-widest">Сеть</p>
              <p className="text-[#2aabee] text-[14px] font-medium leading-tight mt-[1px]">{wallet?.networkName}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="mt-1">
          <SettingsSection>
            <SettingsItem icon={Bell} label="Уведомления и звуки" />
            <SettingsItem icon={Lock} label="Конфиденциальность" />
            <SettingsItem icon={Database} label="Данные и хранилище" />
          </SettingsSection>

          <SettingsSection>
            <SettingsItem icon={Palette} label="Оформление чата" />
            <SettingsItem icon={Globe} label="Язык" value="Русский" />
            <SettingsItem icon={Moon} label="Тёмная тема" value="ВКЛ" />
          </SettingsSection>

          <SettingsSection>
            <SettingsItem icon={Shield} label="Web3 Безопасность" />
            <SettingsItem icon={Info} label="О приложении" value="v2.0" />
            <SettingsItem icon={HelpCircle} label="Помощь" />
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="py-6 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-[5px] h-[5px] rounded-full bg-[#4dcd5e]" />
            <p className="text-[#5a6a7a] text-[12px]">Aliterra Web3 Messenger</p>
          </div>
          <p className="text-[#3a4a5a] text-[11px]">chat.aliterra.space · v2.0.0</p>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-[3px] mx-4">
      {children}
    </div>
  );
}

function SettingsItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <button className="w-full flex items-center gap-4 px-3 py-[13px] rounded-[10px] hover:bg-[#202d3b] active:bg-[#2a3a4a] transition-colors">
      <div className="w-[32px] h-[32px] rounded-full bg-[#1e2c3a] flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-[#8899a8]" />
      </div>
      <span className="text-[#e0eaf3] text-[16px] flex-1 text-left">{label}</span>
      {value && <span className="text-[#6c7c8c] text-[14px]">{value}</span>}
      <ChevronRight size={18} className="text-[#3a4a5a] flex-shrink-0" />
    </button>
  );
}
