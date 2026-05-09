import { useState, useRef } from 'react';
import { useStore } from '../store';
import { ethers } from 'ethers';

const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';

export function useWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const signClientRef = useRef<any>(null);
  
  const { setWallet, setCurrentUser, disconnectWallet } = useStore();

  // Открыть URL (нативно в Capacitor)
  const openUrl = (url: string) => {
    if (typeof (window as any).Capacitor !== 'undefined') {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };

  const connect = async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    console.log('=== CONNECT START ===', walletType);
    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      // AliTerra
      if (walletType === 'aliterra') {
        openUrl('https://wallet.aliterra.space/?from=web3gram');
        setIsConnecting(false);
        return;
      }

      const ethereum = (window as any).ethereum;
      console.log('window.ethereum exists:', !!ethereum);

      // Есть window.ethereum (desktop расширение или mobile browser кошелька)
      if (ethereum) {
        console.log('Using window.ethereum directly');
        
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        
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

        return;
      }

      // НЕТ window.ethereum - используем WalletConnect
      console.log('No window.ethereum - using WalletConnect');
      
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
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction', 
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
            ],
            chains: ['eip155:137'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });

      if (!uri) {
        throw new Error('Не удалось создать WalletConnect URI');
      }

      console.log('WC URI created:', uri.substring(0, 50) + '...');
      setWcUri(uri);

      // Открываем deep link в кошелёк
      if (walletType === 'metamask') {
        console.log('Opening MetaMask deep link');
        openUrl(`metamask://wc?uri=${encodeURIComponent(uri)}`);
      } else if (walletType === 'trustwallet') {
        console.log('Opening Trust Wallet deep link');
        openUrl(`trust://wc?uri=${encodeURIComponent(uri)}`);
      }

      // Ждём подтверждение
      console.log('Waiting for session approval...');
      const session = await Promise.race([
        approval(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout - попробуйте снова')), 120000)
        ),
      ]);

      if (!session) {
        throw new Error('Сессия не создана');
      }

      console.log('Session approved!');

      // Получаем адрес
      const accounts = (session as any).namespaces.eip155?.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('Нет аккаунтов в сессии');
      }

      const address = accounts[0].split(':').pop();

      // Создаём провайдер
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
        address: address!,
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
      console.error('=== CONNECT ERROR ===', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    signClientRef.current = null;
    disconnectWallet();
    setError(null);
    setWcUri(null);
  };

  return { connect, disconnect, isConnecting, error, wcUri, setWcUri };
}
