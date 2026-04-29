import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { shortAddr } from '../utils/web3';

export default function NewChatScreen() {
  const { contacts, addContact, selectChat, setScreen } = useApp();
  const [addr, setAddr] = useState('');
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
  });

  const handleAddAndOpen = () => {
    if (!addr.trim()) return;
    addContact(addr.trim(), name.trim() || shortAddr(addr.trim()));
    selectChat(addr.trim());
  };

  const isValidAddr = addr.trim().startsWith('0x') && addr.trim().length === 42;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#2481cc] px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setScreen('chats')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">Новый чат</h1>
        </div>

        {/* Search contacts */}
        <div className="flex items-center bg-white/20 rounded-xl px-3 py-2.5 gap-2">
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск контактов..."
            className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add new contact section */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Написать по адресу</p>
          <div className="space-y-3">
            <input
              type="text"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              placeholder="0x1234...abcd (Ethereum адрес)"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent ${addr && !isValidAddr ? 'border-red-300' : 'border-gray-200'}`}
            />
            {addr && !isValidAddr && (
              <p className="text-red-500 text-xs -mt-1">Введите корректный Ethereum адрес (0x + 40 символов)</p>
            )}
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Имя контакта (необязательно)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent"
            />
            <button
              onClick={handleAddAndOpen}
              disabled={!isValidAddr}
              className="w-full py-3.5 bg-[#2481cc] text-white rounded-xl font-semibold text-sm disabled:opacity-50 shadow-md shadow-blue-200/50"
            >
              💬 Открыть чат
            </button>
          </div>
        </div>

        {/* Contacts list */}
        {filteredContacts.length > 0 && (
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Контакты ({filteredContacts.length})
            </p>
            <div className="space-y-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.address}
                  onClick={() => selectChat(contact.address)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 text-left"
                >
                  <Avatar address={contact.address} name={contact.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{shortAddr(contact.address)}</p>
                  </div>
                  <svg className="w-5 h-5 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredContacts.length === 0 && contacts.length > 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-gray-500 font-medium">Контакт не найден</p>
            <p className="text-gray-400 text-sm mt-1">Попробуйте другой запрос</p>
          </div>
        )}

        {contacts.length === 0 && !addr && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <span className="text-4xl mb-3">👥</span>
            <p className="text-gray-700 font-semibold">Нет контактов</p>
            <p className="text-gray-400 text-sm mt-1">Введите Ethereum адрес выше чтобы начать общение</p>
          </div>
        )}
      </div>
    </div>
  );
}
