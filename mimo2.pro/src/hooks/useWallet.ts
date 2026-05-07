import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'aliterra') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

const POLYGON_PARAMS = {
  chainId: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const switchToPolygon = async (ethereum: any) => {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [POLYGON_PARAMS],
        });
      }
    }
  };

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    setIsConnecting(true);
    setError(null);

    try {
      // AliTerra Wallet - открываем в новом окне
      if (walletType === 'aliterra') {
        window.open('https://wallet.aliterra.space/?from=web3gram', '_blank');
        setIsConnecting(false);
        return;
      }

      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        // Нет кошелька - открываем deep link
        if (walletType === 'metamask') {
          window.open(`https://metamask.app.link/dapp/${window.location.host}`, '_blank');
          throw new Error('Установите MetaMask или откройте в MetaMask Browser');
        } else {
          window.open(`https://link.trustwallet.com/open_url?coin_id=966&url=${encodeURIComponent(window.location.href)}`, '_blank');
          throw new Error('Установите Trust Wallet или откройте в Trust Wallet Browser');
        }
      }

      // Запрашиваем подключение
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Нет аккаунтов. Разблокируйте кошелёк.');
      }

      const address = accounts[0];
      
      // Переключаемся на Polygon
      await switchToPolygon(ethereum);

      // Создаём провайдер
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
