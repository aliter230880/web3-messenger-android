import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { shortAddr } from '../utils/web3';

export default function SettingsScreen() {
  const { setScreen, userAddress, signer, showToast } = useApp();
  const [contractAddr, setContractAddr] = useState(
    () => localStorage.getItem('w3m_msg_contract') || ''
  );
  const [savedContract, setSavedContract] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme] = useState<'light' | 'dark'>('light');

  const handleSaveContract = () => {
    if (contractAddr.trim().startsWith('0x') && contractAddr.trim().length === 42) {
      localStorage.setItem('w3m_msg_contract', contractAddr.trim());
      setSavedContract(true);
      showToast('Контракт сохранён: ' + shortAddr(contractAddr.trim()), 'success');
      setTimeout(() => setSavedContract(false), 2000);
    } else {
      showToast('Неверный адрес контракта', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#efeff4]">
      {/* Header */}
      <div className="bg-[#2481cc] px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chats')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">Настройки</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 px-4">
        {/* Notifications */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Уведомления</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🔔</div>
              <div>
                <p className="text-gray-800 font-medium">Push уведомления</p>
                <p className="text-gray-400 text-xs">Новые сообщения</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-7 rounded-full transition-colors relative ${notifications ? 'bg-[#2481cc]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
          </div>
        </div>

        {/* Web3 Contract Settings */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Web3 контракт</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-gray-700 font-medium text-sm mb-2">Адрес контракта сообщений</p>
              <p className="text-gray-400 text-xs mb-2">Введите адрес смарт-контракта Web3Messenger на Polygon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contractAddr}
                  onChange={e => setContractAddr(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc]"
                />
                <button
                  onClick={handleSaveContract}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${savedContract ? 'bg-green-500 text-white' : 'bg-[#2481cc] text-white'}`}
                >
                  {savedContract ? '✓' : 'OK'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-[#2481cc] font-medium mb-1">💡 Подсказка</p>
              <p className="text-xs text-blue-600">
                Получите адрес контракта на{' '}
                <span
                  onClick={() => window.open('https://chat.aliterra.space', '_blank')}
                  className="underline cursor-pointer"
                >
                  chat.aliterra.space
                </span>
                {' '}в настройках. Контракт хранит сообщения на Polygon блокчейне.
              </p>
            </div>
          </div>
        </div>

        {/* Network info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Сеть</p>
          </div>
          {[
            { icon: '⛓️', label: 'Блокчейн', value: 'Polygon Mainnet' },
            { icon: '💎', label: 'Chain ID', value: '137' },
            { icon: '⛽', label: 'Газ', value: 'MATIC' },
            { icon: '🔒', label: 'Шифрование', value: 'NaCl E2E + PBKDF2' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-gray-700 flex-1">{item.label}</span>
              <span className="text-gray-500 text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Auth info */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Аккаунт</p>
          </div>
          <div className={`flex items-center gap-3 px-4 py-3`}>
            <span className="text-xl">{signer ? '🦊' : '🔑'}</span>
            <div>
              <p className="text-gray-700 font-medium">{signer ? 'MetaMask' : 'Пароль'}</p>
              <p className="text-gray-400 text-xs">{shortAddr(userAddress)}</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"/>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ресурсы</p>
          </div>
          {[
            { icon: '🌐', label: 'Веб-версия', url: 'https://chat.aliterra.space' },
            { icon: '📁', label: 'GitHub', url: 'https://github.com/aliter230880/web3-messenger-android' },
            { icon: '🔍', label: 'Polygonscan', url: 'https://polygonscan.com' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => window.open(item.url, '_blank')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-gray-700 flex-1 text-left">{item.label}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Version */}
        <div className="text-center py-2">
          <p className="text-gray-400 text-xs">AliTerra Web3 Messenger v1.0</p>
          <p className="text-gray-300 text-xs">React + Vite + Tailwind + Ethers.js</p>
        </div>
      </div>
    </div>
  );
}
