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

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      const ethereum = (window as any).ethereum;
      
      // Если есть window.ethereum (расширение или Trust Wallet Browser)
      if (ethereum) {
        // Запрашиваем подключение
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
          walletType: walletType,
          isReadOnly: false,
        });

        setCurrentUser({
          id: address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        });

      } else {
        // Нет window.ethereum - открываем deep link
        const currentUrl = encodeURIComponent(window.location.href);
        
        if (walletType === 'metamask') {
          // MetaMask deep link
          window.open(`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`, '_blank');
          throw new Error('Откройте сайт через MetaMask Browser');
        } else if (walletType === 'trustwallet') {
          // Trust Wallet deep link
          window.open(`https://link.trustwallet.com/open_url?coin_id=966&url=${currentUrl}`, '_blank');
          throw new Error('Откройте сайт через Trust Wallet Browser');
        } else {
          // WalletConnect - создаём mock URI
          const mockUri = `wc:${Math.random().toString(36).substring(2)}@2?relay-protocol=irn`;
          setWcUri(mockUri);
          throw new Error('Отсканируйте QR в кошельке');
        }
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
