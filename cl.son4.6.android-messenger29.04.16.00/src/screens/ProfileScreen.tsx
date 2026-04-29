import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { shortAddr } from '../utils/web3';

export default function ProfileScreen() {
  const { username, userAddress, avatarId, updateProfile, setScreen, signer, logout } = useApp();
  const [editName, setEditName] = useState(username);
  const [editingName, setEditingName] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard?.writeText(userAddress);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      updateProfile(editName.trim(), avatarId);
    }
    setEditingName(false);
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
          <h1 className="text-xl font-semibold text-white">Мой профиль</h1>
        </div>
      </div>

      {/* Profile hero */}
      <div className="bg-[#2481cc] pb-8 px-4 flex flex-col items-center -mt-1">
        <div className="relative">
          <Avatar address={userAddress} name={username} size="xl" />
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </button>
        </div>

        <div className="mt-3 text-center">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                className="bg-white/20 text-white text-xl font-bold text-center rounded-lg px-3 py-1 outline-none border-b-2 border-white"
              />
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-2">
              <h2 className="text-white text-2xl font-bold">{username}</h2>
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          )}
          <p className="text-white/70 text-sm mt-1">
            {signer ? '🔐 MetaMask Connected' : '🔑 Password Auth'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Address card */}
        <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Адрес кошелька</p>
            <div className="flex items-center gap-2">
              <p className="text-gray-700 font-mono text-sm flex-1 break-all">{userAddress}</p>
              <button
                onClick={copyAddress}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showCopied ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-[#2481cc]'}`}
              >
                {showCopied ? '✓ Скопировано' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Информация</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Сеть', value: 'Polygon' },
                { label: 'Шифрование', value: 'NaCl E2E' },
                { label: 'Хранение', value: 'On-Chain' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 p-3 rounded-xl text-center">
                  <p className="text-gray-800 font-bold text-sm">{item.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security card */}
        <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Безопасность</p>
          </div>
          {[
            { icon: '🔐', label: 'E2E Шифрование', desc: 'NaCl secretbox', color: 'bg-blue-50' },
            { icon: '⛓️', label: 'Blockchain', desc: 'Polygon Mainnet', color: 'bg-purple-50' },
            { icon: '🦊', label: 'Кошелёк', desc: signer ? 'MetaMask подключён' : 'Password режим', color: 'bg-orange-50' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center text-xl`}>
                {item.icon}
              </div>
              <div>
                <p className="text-gray-800 font-medium text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
              <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"/>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mx-4 mt-3 mb-6 bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setScreen('settings')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">⚙️</div>
            <span className="text-gray-800 font-medium">Настройки</span>
            <svg className="w-5 h-5 text-gray-300 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <div className="border-t border-gray-50"/>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">🚪</div>
            <span className="text-red-500 font-medium">Выйти из аккаунта</span>
          </button>
        </div>
      </div>
    </div>
  );
}
