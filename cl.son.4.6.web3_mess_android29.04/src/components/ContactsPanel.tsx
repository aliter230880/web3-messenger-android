import { useState } from 'react';
import { ArrowLeft, Plus, Search, MessageCircle, UserPlus } from 'lucide-react';
import { useStore, Chat, User } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';
import { format } from 'date-fns';

function ContactItem({ user, onClick }: { user: User; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#1e2c3a] active:bg-[#243040] cursor-pointer transition-colors"
    >
      <div className="relative">
        <Avatar name={user.name} address={user.address} size="md" isOnline={user.isOnline} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#e0eaf3] font-medium truncate">{user.name}</p>
        <p className="text-[#8899a8] text-sm truncate">
          {user.isOnline
            ? 'online'
            : user.lastSeen
              ? `last seen at ${format(new Date(user.lastSeen), 'HH:mm')}`
              : formatAddress(user.address, 6)}
        </p>
      </div>
      <button
        className="w-8 h-8 rounded-full bg-[#2aabee]/10 hover:bg-[#2aabee]/20 flex items-center justify-center transition-colors"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <MessageCircle size={16} className="text-[#2aabee]" />
      </button>
    </div>
  );
}

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
      setMessages(newChat.id, [
        {
          id: `sys_${Date.now()}`,
          chatId: newChat.id,
          senderId: 'system',
          senderAddress: '0x0',
          senderName: 'System',
          content: `Chat with ${user.name} started. Messages are end-to-end encrypted.`,
          timestamp: Date.now(),
          status: 'delivered',
          type: 'system',
        },
      ]);
    }

    setActiveChat(newChat);
    setActivePanel('chats');
  };

  const handleAddContact = () => {
    setAddError('');
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
      setAddError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    const name = newName || formatAddress(newAddress, 4);
    const newUser: User = {
      address: newAddress,
      name,
      isOnline: false,
      bio: 'Web3 user',
    };
    useStore.getState().setContacts([...contacts, newUser]);
    setNewAddress('');
    setNewName('');
    setShowAdd(false);
  };

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
        <h2 className="text-white font-semibold text-lg flex-1">Contacts</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors"
        >
          <UserPlus size={18} className="text-[#8899a8]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-[#1e2c3a] rounded-xl px-3 py-2">
          <Search size={16} className="text-[#6c7c8c]" />
          <input
            type="text"
            placeholder="Search contacts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[#e0eaf3] text-sm placeholder-[#6c7c8c] outline-none"
          />
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="mx-3 mb-3 p-4 bg-[#1e2c3a] rounded-2xl border border-[#2a3a4a]">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Plus size={16} className="text-[#2aabee]" />
            Add Contact
          </h3>
          <input
            type="text"
            placeholder="Wallet address (0x...)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full bg-[#17212b] text-[#e0eaf3] rounded-xl px-3 py-2.5 text-sm placeholder-[#6c7c8c] outline-none border border-[#2a3a4a] focus:border-[#2aabee]/50 mb-2 font-mono"
          />
          <input
            type="text"
            placeholder="Display name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-[#17212b] text-[#e0eaf3] rounded-xl px-3 py-2.5 text-sm placeholder-[#6c7c8c] outline-none border border-[#2a3a4a] focus:border-[#2aabee]/50 mb-3"
          />
          {addError && <p className="text-red-400 text-xs mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAdd(false); setAddError(''); }}
              className="flex-1 py-2 rounded-xl border border-[#2a3a4a] text-[#8899a8] text-sm font-medium hover:bg-[#17212b] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddContact}
              className="flex-1 py-2 rounded-xl bg-[#2aabee] text-white text-sm font-semibold hover:bg-[#1e96c8] transition-colors"
            >
              Add
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
              <div className="px-4 py-1.5">
                <span className="text-[#2aabee] text-sm font-semibold">{letter}</span>
              </div>
              {users.map((user) => (
                <ContactItem key={user.address} user={user} onClick={() => openChat(user)} />
              ))}
            </div>
          ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Search size={40} className="text-[#3a4a5a] mb-3" />
            <p className="text-[#6c7c8c] text-sm text-center">No contacts found</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 bg-[#2aabee] rounded-xl text-white text-sm font-medium hover:bg-[#1e96c8] transition-colors"
            >
              Add Contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
