import { useState } from 'react';
import { UserPlus, Search, MessageCircle, Wallet, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import { generateId } from '../store/useStore';
import Avatar from './Avatar';

export default function ContactsView() {
  const { contacts, walletAddress, chats, addContact, addChat, setActiveChat, setView } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.address.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.ens?.toLowerCase().includes(q)
    );
  });

  const handleOpenChat = (address: string) => {
    // Find or create DM chat
    const existing = chats.find(
      (c) => c.type === 'dm' && c.participants.includes(address) && c.participants.includes(walletAddress || '')
    );
    if (existing) {
      setActiveChat(existing.id);
      setView('chats');
      return;
    }
    // Create new chat
    const newChat = {
      id: `chat-${generateId()}`,
      type: 'dm' as const,
      participants: [walletAddress || '', address],
      messages: [],
      unread: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addChat(newChat);
    setActiveChat(newChat.id);
    setView('chats');
  };

  const handleAddContact = () => {
    setAddError('');
    const trimmed = newAddress.trim();
    if (!trimmed.match(/^0x[a-fA-F0-9]{40}$/)) {
      setAddError('Неверный формат адреса (0x...)');
      return;
    }
    if (contacts.find((c) => c.address.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('Контакт уже существует');
      return;
    }
    addContact({
      address: trimmed,
      name: newName.trim() || undefined,
      status: 'offline',
    });
    setNewAddress('');
    setNewName('');
    setShowAddForm(false);
  };

  const statusLabel = (status?: string) => {
    if (status === 'online') return { text: 'онлайн', color: 'text-green-400' };
    if (status === 'away') return { text: 'отошёл', color: 'text-yellow-400' };
    return { text: 'оффлайн', color: 'text-gray-500' };
  };

  return (
    <div className="h-full flex flex-col bg-[#0f0f1a]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Контакты</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск контактов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="mx-4 mt-4 p-4 bg-[#1a1a2e] border border-white/10 rounded-2xl">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            Добавить контакт
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="0x адрес кошелька *"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/50"
            />
            <input
              type="text"
              placeholder="Имя (необязательно)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/50"
            />
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddContact}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                Добавить
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddError(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online section */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {['online', 'away', 'offline'].map((statusFilter) => {
          const group = filtered.filter((c) => (c.status || 'offline') === statusFilter);
          if (group.length === 0) return null;
          const label = statusFilter === 'online' ? '🟢 Онлайн' : statusFilter === 'away' ? '🟡 Отошёл' : '⚫ Оффлайн';
          return (
            <div key={statusFilter} className="mb-4">
              <div className="text-xs text-gray-500 font-medium mb-2 px-1">
                {label} — {group.length}
              </div>
              <div className="space-y-1">
                {group.map((contact) => {
                  const { text, color } = statusLabel(contact.status);
                  return (
                    <div
                      key={contact.address}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <Avatar
                        address={contact.address}
                        name={contact.name || contact.ens}
                        size="md"
                        status={contact.status}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white">
                          {contact.name || contact.ens || formatAddress(contact.address)}
                        </div>
                        <div className="flex items-center gap-2">
                          {(contact.name || contact.ens) && (
                            <span className="text-xs text-gray-500 font-mono truncate">
                              {formatAddress(contact.address)}
                            </span>
                          )}
                          <span className={`text-xs ${color}`}>{text}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenChat(contact.address)}
                        className="p-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserPlus className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm mb-1">Нет контактов</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-purple-400 hover:text-purple-300 text-sm underline mt-2"
            >
              Добавить первый контакт
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
