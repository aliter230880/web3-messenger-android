import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
  wcUri: string | null;
}

const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  // Определяем платформу
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const isCapacitor = () => {
    return typeof (window as any).Capacitor !== 'undefined';
  };

  // Открываем URL (нативно в Capacitor)
  const openUrl = (url: string) => {
    if (isCapacitor()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      const ethereum = (window as any).ethereum;
      
      // Если есть расширение кошелька в браузере
      if (ethereum && !isMobile()) {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          throw new Error('Нет аккаунтов');
        }

        const address = accounts[0];
        
        // Переключаемся на Polygon
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com'],
              }],
            });
          }
        }

        const provider = new ethers.providers.Web3Provider(ethereum, 'any');
        const signer = provider.getSigner();

        setWallet({
          isConnected: true,
          address: address,
          chainId: 137,
          signer: signer,
          provider: provider,
          walletType: ethereum.isMetaMask ? 'metamask' : 'trustwallet',
          isReadOnly: false,
        });

        setCurrentUser({
          id: address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        });

      } else {
        // Мобильный - используем WalletConnect deep links
        // Генерируем URI для WalletConnect (в реальном приложении нужен @walletconnect/sign-client)
        const wcUriGenerated = `wc:${generateWcPairingTopic()}@2?relay-protocol=irn&symKey=${generateRandomHex(64)}`;
        setWcUri(wcUriGenerated);

        // Открываем deep link в нужный кошелёк
        if (walletType === 'metamask') {
          openUrl(`metamask://wc?uri=${encodeURIComponent(wcUriGenerated)}`);
        } else if (walletType === 'trustwallet') {
          openUrl(`trust://wc?uri=${encodeURIComponent(wcUriGenerated)}`);
        } else {
          // WalletConnect - показываем URI для сканирования
          // URI уже установлен через setWcUri
        }

        throw new Error('Подтвердите подключение в кошельке');
      }

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setCurrentUser]);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setError(null);
    setWcUri(null);
  }, [disconnectWallet]);

  return {
    connect,
    disconnect,
    isConnecting,
    error,
    wcUri,
  };
}

// Генераторы для WalletConnect URI
function generateWcPairingTopic(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRandomHex(length: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length / 2)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
