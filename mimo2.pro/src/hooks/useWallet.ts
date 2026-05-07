import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { walletService } from '../services/walletService';

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

  // Set up URI callback for QR code
  walletService.onDisplayUri = (uri: string) => {
    setWcUri(uri);
  };

  const connect = useCallback(async (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      let connection;

      switch (walletType) {
        case 'metamask':
          connection = await walletService.connectMetaMask();
          break;
        case 'trustwallet':
          connection = await walletService.connectTrust();
          break;
        case 'walletconnect':
          connection = await walletService.connectWalletConnect();
          break;
        default:
          throw new Error('Unknown wallet type');
      }

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
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setCurrentUser]);

  const disconnect = useCallback(() => {
    walletService.disconnect();
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
