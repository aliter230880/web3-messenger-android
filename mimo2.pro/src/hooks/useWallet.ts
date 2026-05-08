import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'aliterra') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);

    try {
      // AliTerra - открываем сайт
      if (walletType === 'aliterra') {
        window.open('https://wallet.aliterra.space/?from=web3gram', '_blank');
        throw new Error('Скопируйте адрес с сайта AliTerra');
      }

      // Проверяем наличие кошелька
      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        throw new Error('Установите MetaMask или Trust Wallet');
      }

      // Запрашиваем подключение - ВЫЗЫВАЕТ POPUP!
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
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

      // Определяем тип кошелька
      let detectedType = walletType;
      if (ethereum.isMetaMask) detectedType = 'metamask';
      else if (ethereum.isTrust) detectedType = 'trustwallet';

      setWallet({
        isConnected: true,
        address: address,
        chainId: 137,
        signer: signer,
        provider: provider,
        walletType: detectedType,
        isReadOnly: false,
      });

      setCurrentUser({
        id: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
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

  const disconnect = useCallback(() => {
    disconnectWallet();
    setError(null);
  }, [disconnectWallet]);

  return {
    connect,
    disconnect,
    isConnecting,
    error,
  };
}
