import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAppStore } from '../store';
import { authService } from '../services/authService';
import { xmtpService } from '../services/xmtpService';
import { contractService } from '../services/contractService';
import { encryptionService } from '../services/encryptionService';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWeb3Messenger() {
  const { setWallet, setE2EInitialized, setCurrentUser } = useAppStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Подключение кошелька и инициализация всех сервисов
   */
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // 1. Подключение MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask не установлен');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum!);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // 2. Проверка сети (Polygon Mainnet = 137)
      if (network.chainId !== 137) {
        // Попытка переключения на Polygon
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // 137 in hex
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Сеть не добавлена, добавляем
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com'],
              }],
            });
          } else {
            throw new Error('Не удалось переключиться на Polygon');
          }
        }
      }

      // 3. Аутентификация
      const authData = await authService.authenticate(signer);

      // 4. Инициализация XMTP
      try {
        await xmtpService.initialize(signer);
        console.log('✅ XMTP инициализирован');
      } catch (xmtpError) {
        console.warn('⚠️ XMTP не инициализирован:', xmtpError);
      }

      // 5. Инициализация контрактов
      try {
        contractService.initialize(provider, signer);
        console.log('✅ Контракты инициализированы');
      } catch (contractError) {
        console.warn('⚠️ Контракты не инициализированы:', contractError);
      }

      // 6. Обновление store
      setWallet({
        isConnected: true,
        address,
        chainId: 137,
        signer,
        provider,
      });

      setE2EInitialized(true);

      setCurrentUser({
        id: address,
        name: authData.address,
        walletAddress: address,
        isOnline: true,
      });

      console.log('✅ Подключение успешно');
    } catch (err: any) {
      console.error('❌ Ошибка подключения:', err);
      setError(err.message || 'Ошибка подключения');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setWallet, setE2EInitialized, setCurrentUser]);

  /**
   * Отключение
   */
  const disconnect = useCallback(async () => {
    try {
      await xmtpService.disconnect();
      authService.logout();
      setWallet({
        isConnected: false,
        address: null,
        chainId: null,
      });
      setE2EInitialized(false);
      setCurrentUser(null);
      console.log('🔌 Отключение успешно');
    } catch (err) {
      console.error('❌ Ошибка отключения:', err);
    }
  }, [setWallet, setE2EInitialized, setCurrentUser]);

  /**
   * Отправка сообщения (XMTP)
   */
  const sendMessage = useCallback(async (recipient: string, message: string) => {
    try {
      // Шифрование
      const encrypted = await encryptionService.encrypt(message, recipient);
      
      // Отправка через XMTP
      await xmtpService.sendMessage(recipient, encrypted.base64);
      
      // Сохранение хэша on-chain (опционально)
      try {
        const hash = await encryptionService.hashMessage(message);
        await contractService.storeMessageHash(recipient, hash);
      } catch (chainError) {
        console.warn('⚠️ Не удалось сохранить хэш on-chain:', chainError);
      }
      
      console.log('✅ Сообщение отправлено');
    } catch (err: any) {
      console.error('❌ Ошибка отправки сообщения:', err);
      throw err;
    }
  }, []);

  /**
   * Получение сообщений (XMTP)
   */
  const getMessages = useCallback(async (recipient: string) => {
    try {
      const encryptedMessages = await xmtpService.getMessages(recipient);
      
      // Дешифрование
      const myAddress = authService.getAddress();
      if (!myAddress) {
        throw new Error('Не аутентифицирован');
      }

      const messages = await Promise.all(
        encryptedMessages.map(async (msg: any) => {
          try {
            const decrypted = await encryptionService.decrypt(msg.content, msg.senderAddress);
            return {
              id: msg.id,
              content: decrypted,
              sender: msg.senderAddress,
              timestamp: msg.sent,
            };
          } catch (decryptError) {
            console.warn('⚠️ Не удалось дешифровать сообщение:', decryptError);
            return null;
          }
        })
      );

      return messages.filter(Boolean);
    } catch (err: any) {
      console.error('❌ Ошибка получения сообщений:', err);
      throw err;
    }
  }, []);

  /**
   * Регистрация профиля (IdentityV2 on-chain)
   */
  const registerProfile = useCallback(async (nickname: string, avatarId: number) => {
    try {
      const txHash = await contractService.registerProfile(nickname, avatarId);
      console.log('✅ Профиль зарегистрирован:', txHash);
      return txHash;
    } catch (err: any) {
      console.error('❌ Ошибка регистрации профиля:', err);
      throw err;
    }
  }, []);

  /**
   * Обновление профиля (IdentityV2 on-chain)
   */
  const updateProfile = useCallback(async (nickname: string, avatarId: number) => {
    try {
      const txHash = await contractService.updateProfile(nickname, avatarId);
      console.log('✅ Профиль обновлён:', txHash);
      return txHash;
    } catch (err: any) {
      console.error('❌ Ошибка обновления профиля:', err);
      throw err;
    }
  }, []);

  /**
   * Поиск пользователя по никнейму
   */
  const findUserByNickname = useCallback(async (nickname: string) => {
    try {
      const address = await contractService.getAddressByNickname(nickname);
      if (address !== ethers.constants.AddressZero) {
        return address;
      }
      return null;
    } catch (err: any) {
      console.error('❌ Ошибка поиска пользователя:', err);
      return null;
    }
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    getMessages,
    registerProfile,
    updateProfile,
    findUserByNickname,
    isConnecting,
    error,
    isConnected: useAppStore((state) => state.wallet.isConnected),
    address: useAppStore((state) => state.wallet.address),
    isE2EInitialized: useAppStore((state) => state.e2e.isInitialized),
  };
}
