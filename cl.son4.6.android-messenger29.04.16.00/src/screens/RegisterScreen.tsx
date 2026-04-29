import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function RegisterScreen() {
  const { registerAccount, setScreen, loading } = useApp();
  const [addr, setAddr] = useState('');
  const [uname, setUname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (!addr.trim().startsWith('0x') || addr.trim().length !== 42) return;
    if (!uname.trim()) return;
    setStep(2);
  };

  const handleRegister = async () => {
    if (password !== confirm) return;
    await registerAccount(addr.trim(), uname.trim(), password);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : setScreen('welcome')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <svg className="w-6 h-6 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 ml-2">Регистрация</h1>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-[#2481cc]' : 'w-3 bg-gray-200'}`}/>
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="flex-1 px-6">
          {/* Icon */}
          <div className="flex flex-col items-center py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1a5fa0] flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">Ваш профиль</h2>
            <p className="text-gray-500 text-sm text-center mt-1">Введите адрес кошелька и имя пользователя</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 ml-1">Адрес кошелька (0x...)</label>
              <input
                type="text"
                value={addr}
                onChange={e => setAddr(e.target.value)}
                placeholder="0x1234...abcd"
                className="w-full mt-1.5 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent"
              />
              {addr && addr.trim().length > 0 && (!addr.trim().startsWith('0x') || addr.trim().length !== 42) && (
                <p className="text-red-500 text-xs ml-1 mt-1">Введите корректный Ethereum адрес</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 ml-1">Имя пользователя</label>
              <input
                type="text"
                value={uname}
                onChange={e => setUname(e.target.value)}
                placeholder="Alice, Bob.eth, ..."
                className="w-full mt-1.5 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent"
              />
            </div>

            <button
              onClick={handleNext}
              disabled={!addr.trim().startsWith('0x') || addr.trim().length !== 42 || !uname.trim()}
              className="w-full py-4 bg-[#2481cc] text-white rounded-2xl font-semibold text-base transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              Продолжить →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-6">
          {/* Icon */}
          <div className="flex flex-col items-center py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <span className="text-3xl">🔑</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">Создайте пароль</h2>
            <p className="text-gray-500 text-sm text-center mt-1">Пароль шифрует ваши ключи локально</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 ml-1">Пароль (минимум 6 символов)</label>
              <div className="relative mt-1.5">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent pr-12"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 ml-1">Повторите пароль</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Повторите пароль"
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                className={`w-full mt-1.5 px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2481cc] focus:border-transparent ${confirm && password !== confirm ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'}`}
              />
              {confirm && password !== confirm && (
                <p className="text-red-500 text-xs ml-1 mt-1">Пароли не совпадают</p>
              )}
            </div>

            {/* Password strength */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-yellow-400' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 ml-1">
                  {password.length < 6 ? 'Слабый' : password.length < 9 ? 'Средний' : password.length < 12 ? 'Хороший' : 'Отличный'}
                </p>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading || password.length < 6 || password !== confirm}
              className="w-full py-4 bg-[#2481cc] text-white rounded-2xl font-semibold text-base transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Создание...
                </div>
              ) : '🚀 Создать аккаунт'}
            </button>

            <p className="text-center text-gray-400 text-xs">
              Пароль хранится только на вашем устройстве
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
