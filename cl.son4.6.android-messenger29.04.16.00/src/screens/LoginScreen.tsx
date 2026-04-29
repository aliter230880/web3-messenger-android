import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { loginWithPassword, setScreen, loading } = useApp();
  const [addr, setAddr] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    await loginWithPassword(addr.trim(), password);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-6">
        <button onClick={() => setScreen('welcome')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 ml-2">Вход</h1>
      </div>

      {/* Icon */}
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1a5fa0] flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none">
            <path d="M16 22v-4a8 8 0 0116 0v4" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
            <rect x="12" y="21" width="24" height="17" rx="3.5" fill="white"/>
            <circle cx="24" cy="29.5" r="3" fill="#2481cc"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mt-4">Web3 Messenger</h2>
        <p className="text-gray-500 text-sm mt-1">Введите адрес и пароль</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 ml-1">Адрес кошелька (0x...)</label>
          <input
            type="text"
            value={addr}
            onChange={e => setAddr(e.target.value)}
            placeholder="0x1234...abcd"
            className="w-full mt-1.5 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 ml-1">Пароль</label>
          <div className="relative mt-1.5">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
            >
              {showPass ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !addr || !password}
          className="w-full py-4 bg-[#2481cc] text-white rounded-2xl font-semibold text-base transition-all active:scale-98 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none mt-2"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Вход...
            </div>
          ) : 'Войти'}
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-gray-400 text-xs">или</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>

        <button
          onClick={() => setScreen('register')}
          className="w-full py-3.5 border border-gray-200 text-gray-600 rounded-2xl font-medium text-sm"
        >
          Создать новый аккаунт
        </button>
      </div>
    </div>
  );
}
