import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

export interface UseWalletReturn {
  connect: (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setIsConnecting(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      
      // Check if MetaMask or other wallet is available
      if (ethereum) {
        // Request accounts
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please unlock your wallet.');
        }

        const address = accounts[0];
        
        // Create provider
        const provider = new ethers.providers.Web3Provider(ethereum, 'any');
        
        // Try to switch to Polygon
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // Polygon Mainnet
          });
        } catch (switchError: any) {
          // If Polygon not added, add it
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
        // No wallet extension - open deep link
        const currentUrl = window.location.href;
        
        if (walletType === 'metamask') {
          // MetaMask deep link
          window.open(`https://metamask.app.link/dapp/${window.location.host}`, '_blank');
          throw new Error('MetaMask не установлен. Откройте ссылку в MetaMask Browser.');
        } else if (walletType === 'trustwallet') {
          // Trust Wallet deep link
          window.open(`https://link.trustwallet.com/open_url?coin_id=966&url=${encodeURIComponent(currentUrl)}`, '_blank');
          throw new Error('Trust Wallet не установлен. Откройте ссылку в Trust Wallet Browser.');
        } else {
          throw new Error('Кошелёк не найден. Установите MetaMask или Trust Wallet.');
        }
      }

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
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
