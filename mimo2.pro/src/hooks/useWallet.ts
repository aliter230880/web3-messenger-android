import { useState } from 'react';
import { useStore } from '../store';

export function useWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  const connect = async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    console.log('useWallet.connect called:', walletType);
    setIsConnecting(true);
    setError(null);

    try {
      // AliTerra
      if (walletType === 'aliterra') {
        window.open('https://wallet.aliterra.space/', '_blank');
        setIsConnecting(false);
        return;
      }

      // Проверяем есть ли кошелёк
      const ethereum = (window as any).ethereum;
      console.log('window.ethereum:', !!ethereum);
      
      if (!ethereum) {
        throw new Error('Кошелёк не найден. Откройте сайт через MetaMask или Trust Wallet Browser.');
      }

      // Запрашиваем подключение
      console.log('Requesting accounts...');
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      console.log('Got accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('Нет аккаунтов');
      }

      const address = accounts[0];

      // Переключаем на Polygon
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x89',
              chainName: 'Polygon',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com'],
            }],
          });
        }
      }

      // Сохраняем
      setWallet({
        isConnected: true,
        address: address,
        chainId: 137,
        signer: null,
        provider: null,
        walletType: ethereum.isMetaMask ? 'metamask' : 'trustwallet',
        isReadOnly: false,
      });

      setCurrentUser({
        id: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
      });

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    disconnectWallet();
    setError(null);
  };

  return { connect, disconnect, isConnecting, error };
}
