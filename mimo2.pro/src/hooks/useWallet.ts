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
  const sessionTopicRef = useRef<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  // Определяем платформу
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const isCapacitor = () => {
    return typeof (window as any).Capacitor !== 'undefined';
  };

  // Открываем URL
  const openUrl = (url: string) => {
    if (isCapacitor()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };

  // Создаём WalletConnect сессию
  const createWCSession = async (walletType: string): Promise<{ address: string; provider: any }> => {
    // Динамически импортируем WalletConnect
    const { SignClient } = await import('@walletconnect/sign-client');
    
    // Инициализируем клиент
    signClientRef.current = await SignClient.init({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: 'Web3Gram',
        description: 'Secure Web3 Messenger',
        url: window.location.origin,
        icons: ['https://chat.aliterra.space/icon.png'],
      },
    });

    // Создаём connect request
    const { uri, approval } = await signClientRef.current.connect({
      requiredNamespaces: {
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction', 
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
          ],
          chains: ['eip155:137'], // Polygon
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    if (!uri) {
      throw new Error('Не удалось создать WalletConnect URI');
    }

    setWcUri(uri);

    // Открываем deep link
    if (isMobile() || isCapacitor()) {
      if (walletType === 'metamask') {
        openUrl(`metamask://wc?uri=${encodeURIComponent(uri)}`);
      } else if (walletType === 'trustwallet') {
        openUrl(`trust://wc?uri=${encodeURIComponent(uri)}`);
      }
    }

    // Ждём подтверждение от пользователя (таймаут 5 минут)
    const session = await Promise.race([
      approval(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Время ожидания истекло')), 300000)
      ),
    ]);

    if (!session) {
      throw new Error('Сессия не создана');
    }

    sessionTopicRef.current = (session as any).topic;

    // Получаем адрес из сессии
    const accounts = (session as any).namespaces.eip155?.accounts;
    if (!accounts || accounts.length === 0) {
      throw new Error('Нет аккаунтов в сессии');
    }

    // Формат: "eip155:137:0xABC..."
    const address = accounts[0].split(':').pop();

    // Создаём провайдер через WalletConnect
    const wcProvider = {
      request: async (req: { method: string; params?: any[] }) => {
        return signClientRef.current!.request({
          topic: sessionTopicRef.current!,
          chainId: 'eip155:137',
          request: req,
        });
      },
    };

    const provider = new ethers.providers.Web3Provider(wcProvider as any, 'any');

    return { address, provider };
  };

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      // AliTerra - открываем сайт для ручного копирования адреса
      if (walletType === 'aliterra') {
        openUrl('https://wallet.aliterra.space/?from=web3gram');
        throw new Error('Скопируйте адрес кошелька с сайта AliTerra и вставьте в "Новый чат"');
      }

      const ethereum = (window as any).ethereum;
      
      // Desktop с расширением - прямое подключение
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
        // Mobile - используем WalletConnect
        const { address, provider } = await createWCSession(walletType);
        const signer = provider.getSigner();

        setWallet({
          isConnected: true,
          address: address,
          chainId: 137,
          signer: signer,
          provider: provider,
          walletType: walletType,
          isReadOnly: false,
        });

        setCurrentUser({
          id: address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        });
      }

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setCurrentUser]);

  const disconnect = useCallback(async () => {
    // Отключаем WalletConnect если есть сессия
    if (signClientRef.current && sessionTopicRef.current) {
      try {
        await signClientRef.current.disconnect({
          topic: sessionTopicRef.current,
          reason: { code: 6000, message: 'User disconnected' },
        });
      } catch (e) {
        console.warn('WC disconnect error:', e);
      }
    }
    
    signClientRef.current = null;
    sessionTopicRef.current = null;
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
