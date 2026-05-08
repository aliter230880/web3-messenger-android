import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { walletService } from '../services/walletService';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'aliterra') => Promise<void>;
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

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      // AliTerra - просто открываем ссылку
      if (walletType === 'aliterra') {
        window.open('https://wallet.aliterra.space/?from=web3gram', '_blank');
        throw new Error('Скопируйте адрес с сайта и вставьте вручную');
      }

      const ethereum = (window as any).ethereum;

      // Есть window.ethereum - прямое подключение (быстро!)
      if (ethereum) {
        console.log('Using direct connection (window.ethereum)');
        const connection = await walletService.connectDirect();
        
        setWallet({
          isConnected: true,
          address: connection.address,
          chainId: 137,
          signer: connection.signer,
          provider: connection.provider,
          walletType: connection.walletType,
          isReadOnly: false,
        });

        setCurrentUser({
          id: connection.address,
          name: `${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.address}`,
        });

        return;
      }

      // Нет window.ethereum - WalletConnect (EthereumProvider, быстрее!)
      console.log('Using WalletConnect (EthereumProvider)');
      
      // Устанавливаем callback для QR URI
      walletService.setDisplayUriCallback((uri) => {
        setWcUri(uri);
      });

      const connection = await walletService.connectWalletConnect(walletType);
      
      setWallet({
        isConnected: true,
        address: connection.address,
        chainId: 137,
        signer: connection.signer,
        provider: connection.provider,
        walletType: connection.walletType,
        isReadOnly: false,
      });

      setCurrentUser({
        id: connection.address,
        name: `${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${connection.address}`,
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
    await walletService.disconnect();
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
