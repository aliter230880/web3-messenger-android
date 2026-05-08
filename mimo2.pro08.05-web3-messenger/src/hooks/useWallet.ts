import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'aliterra') => Promise<void>;
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
  const signClientRef = useRef<any>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const openUrl = (url: string) => {
    if (typeof (window as any).Capacitor !== 'undefined') {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      const ethereum = (window as any).ethereum;
      
      // БЫСТРЫЙ ПУТЬ: Если есть window.ethereum (расширение или Trust Wallet Browser)
      if (ethereum) {
        console.log('Using window.ethereum directly');
        
        // Запрашиваем аккаунты
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
          walletType: ethereum.isMetaMask ? 'metamask' : ethereum.isTrust ? 'trustwallet' : walletType,
          isReadOnly: false,
        });

        setCurrentUser({
          id: address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        });

        return;
      }

      // НЕТ window.ethereum - используем WalletConnect (для мобильных)
      console.log('No window.ethereum, using WalletConnect');
      
      const { SignClient } = await import('@walletconnect/sign-client');
      
      signClientRef.current = await SignClient.init({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: 'Web3Gram',
          description: 'Secure Web3 Messenger',
          url: window.location.origin,
          icons: ['https://chat.aliterra.space/icon.png'],
        },
      });

      const { uri, approval } = await signClientRef.current.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
            chains: ['eip155:137'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });

      if (!uri) {
        throw new Error('Не удалось создать WalletConnect URI');
      }

      setWcUri(uri);

      // Открываем deep link
      if (walletType === 'metamask') {
        openUrl(`metamask://wc?uri=${encodeURIComponent(uri)}`);
      } else if (walletType === 'trustwallet') {
        openUrl(`trust://wc?uri=${encodeURIComponent(uri)}`);
      }

      // Ждём подтверждение
      const session = await Promise.race([
        approval(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000)),
      ]);

      if (!session) {
        throw new Error('Сессия не создана');
      }

      const accounts = (session as any).namespaces.eip155?.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('Нет аккаунтов');
      }

      const address = accounts[0].split(':').pop();

      const wcProvider = {
        request: async (req: { method: string; params?: any[] }) => {
          return signClientRef.current.request({
            topic: (session as any).topic,
            chainId: 'eip155:137',
            request: req,
          });
        },
      };

      const provider = new ethers.providers.Web3Provider(wcProvider as any, 'any');

      setWallet({
        isConnected: true,
        address: address,
        chainId: 137,
        signer: provider.getSigner(),
        provider: provider,
        walletType: walletType,
        isReadOnly: false,
      });

      setCurrentUser({
        id: address!,
        name: `${address!.slice(0, 6)}...${address!.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
      });

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setCurrentUser]);

  const disconnect = useCallback(async () => {
    if (signClientRef.current) {
      try {
        // Отключаем WalletConnect если есть
      } catch (e) {}
    }
    signClientRef.current = null;
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
