import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { Wifi, WifiOff, Loader } from 'lucide-react';

export function ConnectionStatus() {
  const { isConnected, isConnecting } = useWeb3Messenger();

  // Скрываем индикатор если не подключено (чтобы не загромождать UI)
  if (!isConnected && !isConnecting) {
    return null;
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-medium">
        <Loader className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium" title="Web3 подключено">
        <Wifi className="w-3.5 h-3.5" />
      </div>
    );
  }

  return null;
}
