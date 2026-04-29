import { useState } from 'react';
import { X, MessageCircle, Users, Search, Check, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import { generateId } from '../store/useStore';
import Avatar from './Avatar';

export default function NewChatModal() {
  const { walletAddress, contacts, chats, addChat, addContact, setActiveChat, setView } = useStore();
  const [mode, setMode] = useState<'choose' | 'dm' | 'group'>('choose');
  const [search, setSearch] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.address.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.ens?.toLowerCase().includes(q)
    );
  });

  const handleStartDM = (address: string) => {
    setError('');
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Неверный адрес кошелька');
      return;
    }
    if (address.toLowerCase() === walletAddress?.toLowerCase()) {
      setError('Нельзя создать чат с собой');
      return;
    }
    const existing = chats.find(
      (c) =>
        c.type === 'dm' &&
        c.participants.includes(address) &&
        c.participants.includes(walletAddress || '')
    );
    if (existing) {
      setActiveChat(existing.id);
      setView('chats');
      return;
    }
    // Add to contacts if not exists
    if (!contacts.find((c) => c.address.toLowerCase() === address.toLowerCase())) {
      addContact({ address, status: 'offline' });
    }
    const chat = {
      id: `chat-${generateId()}`,
      type: 'dm' as const,
      participants: [walletAddress || '', address],
      messages: [
        {
          id: generateId(),
          from: 'system',
          to: address,
          content: '🔐 Чат защищён end-to-end шифрованием',
          timestamp: Date.now(),
          type: 'system' as const,
        },
      ],
      unread: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addChat(chat);
    setActiveChat(chat.id);
    setView('chats');
  };

  const handleToggleSelect = (address: string) => {
    setSelected((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    );
  };

  const handleCreateGroup = () => {
    setError('');
    if (selected.length < 2) {
      setError('Выберите минимум 2 участника');
      return;
    }
    if (!groupName.trim()) {
      setError('Введите название группы');
      return;
    }
    const chat = {
      id: `group-${generateId()}`,
      type: 'group' as const,
      name: groupName.trim(),
      participants: [walletAddress || '', ...selected],
      messages: [
        {
          id: generateId(),
          from: 'system',
          to: `group-${generateId()}`,
          content: `🔐 Группа "${groupName.trim()}" создана. Сообщения зашифрованы.`,
          timestamp: Date.now(),
          type: 'system' as const,
        },
      ],
      unread: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addChat(chat);
    setActiveChat(chat.id);
    setView('chats');
  };

  return (
    <div className="h-full flex flex-col bg-[#0f0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">
          {mode === 'choose' ? 'Новый чат' : mode === 'dm' ? 'Личное сообщение' : 'Создать группу'}
        </h2>
        <button
          onClick={() => { setView('chats'); setMode('choose'); }}
          className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Choose mode */}
      {mode === 'choose' && (
        <div className="p-4 space-y-3">
          <button
            onClick={() => setMode('dm')}
            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Личное сообщение</div>
              <div className="text-sm text-gray-400">Чат с одним пользователем</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-purple-400" />
          </button>

          <button
            onClick={() => setMode('group')}
            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-2xl transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Групповой чат</div>
              <div className="text-sm text-gray-400">Общение с несколькими людьми</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 ml-auto group-hover:text-purple-400" />
          </button>
        </div>
      )}

      {/* DM mode */}
      {mode === 'dm' && (
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 block">Адрес кошелька</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none font-mono"
              />
              <button
                onClick={() => handleStartDM(customAddress.trim())}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          <div className="text-xs text-gray-500 mb-2">Или выберите из контактов:</div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredContacts.map((c) => (
              <button
                key={c.address}
                onClick={() => handleStartDM(c.address)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <Avatar address={c.address} name={c.name || c.ens} size="sm" status={c.status} />
                <div>
                  <div className="text-sm font-medium text-white">{c.name || c.ens || formatAddress(c.address)}</div>
                  <div className="text-xs text-gray-500 font-mono">{formatAddress(c.address)}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Group mode */}
      {mode === 'group' && (
        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 block">Название группы</label>
            <input
              type="text"
              placeholder="Например: DeFi Alpha 🚀"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>

          <div className="text-xs text-gray-500 mb-2">Участники ({selected.length} выбрано):</div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 mb-4">
            {filteredContacts.map((c) => {
              const isSelected = selected.includes(c.address);
              return (
                <button
                  key={c.address}
                  onClick={() => handleToggleSelect(c.address)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    isSelected ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-white/5'
                  }`}
                >
                  <Avatar address={c.address} name={c.name || c.ens} size="sm" status={c.status} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{c.name || c.ens || formatAddress(c.address)}</div>
                    <div className="text-xs text-gray-500 font-mono">{formatAddress(c.address)}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <button
            onClick={handleCreateGroup}
            disabled={selected.length < 2}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Создать группу
          </button>
        </div>
      )}
    </div>
  );
}
