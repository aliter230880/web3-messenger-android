import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { shortAddr } from '../utils/web3';

export default function ContactsScreen() {
  const { contacts, addContact, removeContact, selectChat, setScreen } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState('');
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
  });

  const isValidAddr = newAddr.trim().startsWith('0x') && newAddr.trim().length === 42;

  const handleAdd = () => {
    if (!isValidAddr) return;
    addContact(newAddr.trim(), newName.trim() || shortAddr(newAddr.trim()));
    setNewAddr('');
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#efeff4]">
      {/* Header */}
      <div className="bg-[#2481cc] px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen('chats')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">Контакты</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="ml-auto w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

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
        {/* Add contact form */}
        {showAdd && (
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Новый контакт</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newAddr}
                onChange={e => setNewAddr(e.target.value)}
                placeholder="0x адрес кошелька"
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] ${newAddr && !isValidAddr ? 'border-red-300' : 'border-gray-200'}`}
              />
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Имя контакта"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAdd(false); setNewAddr(''); setNewName(''); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!isValidAddr}
                  className="flex-1 py-3 bg-[#2481cc] text-white rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts list */}
        {filtered.length > 0 ? (
          <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {filtered.length} контакт{filtered.length === 1 ? '' : filtered.length < 5 ? 'а' : 'ов'}
              </p>
            </div>
            {filtered.map((contact, i) => (
              <div key={contact.address} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <button onClick={() => selectChat(contact.address)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar address={contact.address} name={contact.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{shortAddr(contact.address)}</p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => selectChat(contact.address)}
                    className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => { if (confirm('Удалить контакт ' + contact.name + '?')) removeContact(contact.address); }}
                    className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
              <span className="text-4xl">👥</span>
            </div>
            <p className="text-gray-700 font-semibold text-lg">
              {searchQuery ? 'Не найдено' : 'Контактов нет'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {searchQuery ? 'Попробуйте другой запрос' : 'Нажмите + чтобы добавить контакт'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
