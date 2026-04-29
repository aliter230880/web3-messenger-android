import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
      <div className={`${colors[toast.type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-medium max-w-xs`}>
        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
          {icons[toast.type]}
        </span>
        {toast.message}
      </div>
    </div>
  );
}
