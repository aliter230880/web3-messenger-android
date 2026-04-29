import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function SplashScreen() {
  const { setScreen } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      setScreen('welcome');
    }, 2000);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#2481cc]">
      {/* Telegram-style icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-[28px] bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl">
          <svg viewBox="0 0 48 48" className="w-16 h-16" fill="none">
            <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.15"/>
            {/* Lock icon + Web3 */}
            <path d="M16 22v-4a8 8 0 0116 0v4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="12" y="21" width="24" height="16" rx="3" fill="white"/>
            <circle cx="24" cy="29" r="2.5" fill="#2481cc"/>
            <path d="M24 29v3" stroke="#2481cc" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-[28px] border-2 border-white/30 animate-ping" style={{ animationDuration: '2s' }}/>
      </div>

      <h1 className="text-white text-3xl font-bold mt-8 tracking-wide">AliTerra</h1>
      <p className="text-white/70 text-base mt-1">Web3 Messenger</p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-12">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
