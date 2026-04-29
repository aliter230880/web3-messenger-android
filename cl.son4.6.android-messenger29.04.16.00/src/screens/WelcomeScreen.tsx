import { useApp } from '../context/AppContext';

export default function WelcomeScreen() {
  const { setScreen, loginWithMetaMask, hasMetaMask, loading } = useApp();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top decorative area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#2481cc] to-[#1a5fa0] px-8 pt-16 pb-8">
        {/* Logo */}
        <div className="w-28 h-28 rounded-[32px] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-6">
          <svg viewBox="0 0 48 48" className="w-18 h-18 w-[72px] h-[72px]" fill="none">
            <path d="M16 22v-4a8 8 0 0116 0v4" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="12" y="21" width="24" height="17" rx="3.5" fill="white"/>
            <circle cx="24" cy="29.5" r="3" fill="#1a5fa0"/>
            <path d="M24 29.5v3.5" stroke="#1a5fa0" strokeWidth="2.2" strokeLinecap="round"/>
            {/* Chain links */}
            <path d="M8 14 Q14 8 20 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
            <path d="M28 12 Q34 8 40 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
          </svg>
        </div>

        <h1 className="text-white text-4xl font-bold text-center">AliTerra</h1>
        <p className="text-white/80 text-lg text-center mt-2 font-medium">Web3 Messenger</p>

        {/* Features */}
        <div className="mt-8 space-y-3 w-full max-w-xs">
          {[
            { icon: '🔐', text: 'E2E шифрование NaCl' },
            { icon: '⛓️', text: 'On-chain сообщения на Polygon' },
            { icon: '🦊', text: 'MetaMask & Web3 кошельки' },
            { icon: '🌐', text: 'Децентрализованный мессенджер' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-white/90">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action area */}
      <div className="bg-white px-6 py-8 space-y-3">
        {hasMetaMask && (
          <button
            onClick={loginWithMetaMask}
            disabled={loading}
            className="w-full py-4 bg-[#2481cc] text-white rounded-2xl font-semibold text-base active:scale-98 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <>
                <span className="text-xl">🦊</span>
                Подключить MetaMask
              </>
            )}
          </button>
        )}

        <button
          onClick={() => setScreen('login')}
          className="w-full py-4 border-2 border-[#2481cc] text-[#2481cc] rounded-2xl font-semibold text-base active:scale-98 transition-all"
        >
          Войти с паролем
        </button>

        <button
          onClick={() => setScreen('register')}
          className="w-full py-3 text-[#2481cc] font-medium text-sm"
        >
          Создать новый аккаунт →
        </button>

        <p className="text-center text-gray-400 text-xs mt-2">
          {hasMetaMask ? 'MetaMask обнаружен' : 'Для on-chain функций установите MetaMask'}
        </p>
      </div>
    </div>
  );
}
