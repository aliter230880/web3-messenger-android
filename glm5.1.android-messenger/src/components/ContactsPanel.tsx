import { useState } from 'react';
import { ArrowLeft, Plus, Search, MessageCircle, UserPlus } from 'lucide-react';
import { useStore, Chat, User } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';
import { generateMockMessages } from '../lib/mockData';

export function ContactsPanel() {
  const { contacts, setActivePanel, chats, addChat, setActiveChat, wallet, setMessages } = useStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, User[]> = {};
  filtered.forEach((c) => {
    const letter = c.name[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(c);
  });

  const openChat = (user: User) => {
    const existingChat = chats.find(
      (c) => c.type === 'private' && c.address?.toLowerCase() === user.address.toLowerCase()
    );

    if (existingChat) {
      setActiveChat(existingChat);
      setActivePanel('chats');
      return;
    }

    const newChat: Chat = {
      id: `chat_pm_${user.address.slice(2, 10)}`,
      type: 'private',
      name: user.name,
      address: user.address,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      unreadCount: 0,
    };
    addChat(newChat);

    if (wallet) {
      const msgs = generateMockMessages(newChat.id, wallet.address);
      setMessages(newChat.id, msgs);
    }

    setActiveChat(newChat);
    setActivePanel('chats');
  };

  const handleAddContact = () => {
    setAddError('');
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
      setAddError('Введите корректный Ethereum адрес (0x...)');
      return;
    }
    const name = newName || formatAddress(newAddress, 4);
    const newUser: User = { address: newAddress, name, isOnline: false, bio: 'Web3 user' };
    useStore.getState().setContacts([...contacts, newUser]);
    setNewAddress('');
    setNewName('');
    setShowAdd(false);
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
        <h2 className="text-white font-semibold text-[19px] flex-1 ml-1">Контакты</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="w-[54px] h-[54px] rounded-full flex items-center justify-center transition-colors"
        >
          <UserPlus size={22} className="text-[#8899a8]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center bg-[#242f3d] rounded-[22px] px-4 py-[9px]">
          <Search size={18} className="text-[#8899a8] flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск контактов"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[#e0eaf3] text-[15px] placeholder-[#8899a8] outline-none min-w-0 ml-2"
          />
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="mx-3 mb-3 p-4 bg-[#1e2c3a] rounded-[12px] animate-fade-in-up" style={{ border: '1px solid #2a3a4a' }}>
          <h3 className="text-white font-semibold text-[15px] mb-3 flex items-center gap-2">
            <Plus size={16} className="text-[#2aabee]" />
            Новый контакт
          </h3>
          <input
            type="text"
            placeholder="Адрес кошелька (0x...)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full bg-[#17212b] text-[#e0eaf3] rounded-[10px] px-3 py-[10px] text-[15px] placeholder-[#6c7c8c] outline-none mb-2 font-mono" style={{ border: '1px solid #2a3a4a' }}
          />
          <input
            type="text"
            placeholder="Имя (необязательно)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-[#17212b] text-[#e0eaf3] rounded-[10px] px-3 py-[10px] text-[15px] placeholder-[#6c7c8c] outline-none mb-3" style={{ border: '1px solid #2a3a4a' }}
          />
          {addError && <p className="text-[#e25555] text-[13px] mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAdd(false); setAddError(''); }}
              className="flex-1 h-[40px] rounded-[10px] text-[#8899a8] text-[15px] font-medium hover:bg-[#17212b] transition-colors" style={{ border: '1px solid #2a3a4a' }}
            >
              Отмена
            </button>
            <button
              onClick={handleAddContact}
              className="flex-1 h-[40px] rounded-[10px] bg-[#2aabee] text-white text-[15px] font-semibold hover:bg-[#229ED9] transition-colors"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letter, users]) => (
            <div key={letter}>
              <div className="px-5 pt-3 pb-1">
                <span className="text-[#2aabee] text-[14px] font-bold uppercase">{letter}</span>
              </div>
              {users.map((user) => (
                <div
                  key={user.address}
                  onClick={() => openChat(user)}
                  className="flex items-center gap-3 px-4 py-[9px] hover:bg-[#202d3b] active:bg-[#2a3a4a] cursor-pointer transition-colors"
                >
                  <Avatar name={user.name} address={user.address} size="chat" isOnline={user.isOnline} type="private" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e0eaf3] font-semibold text-[16px] truncate leading-tight">{user.name}</p>
                    <p className="text-[#8899a8] text-[14px] truncate mt-[1px]">
                      {user.isOnline ? 'в сети' : formatAddress(user.address, 6)}
                    </p>
                  </div>
                  <button
                    className="w-[40px] h-[40px] rounded-full bg-[#2aabee]/[0.08] hover:bg-[#2aabee]/[0.15] flex items-center justify-center transition-colors flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); openChat(user); }}
                  >
                    <MessageCircle size={18} className="text-[#2aabee]" />
                  </button>
                </div>
              ))}
            </div>
          ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
            <Search size={48} className="text-[#3a4a5a] mb-4" />
            <p className="text-[#6c7c8c] text-[15px] text-center mb-4">Контакты не найдены</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-[10px] bg-[#2aabee] rounded-[10px] text-white text-[15px] font-semibold hover:bg-[#229ED9] transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Добавить контакт
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
