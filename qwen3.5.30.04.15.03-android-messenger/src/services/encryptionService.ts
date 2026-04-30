import nacl from 'tweetnacl';
import { authService } from './authService';

/**
 * E2E Шифрование v15
 * 
 * Формат сообщения:
 * [0x01][publicKey:32][nonce:24][ciphertext]
 * 
 * Шифрование через Address Key:
 * addrKey = SHA-256([addr1, addr2].sort().join(':web3m:'))
 */

const MESSAGE_VERSION = 0x01;

export interface EncryptedMessage {
  blob: Uint8Array;
  base64: string;
}

export class EncryptionService {
  private static instance: EncryptionService;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Шифрование сообщения (v15 format)
   */
  async encrypt(message: string, recipientAddress: string): Promise<EncryptedMessage> {
    const authData = authService.getAuthData();
    if (!authData) {
      throw new Error('Пользователь не аутентифицирован');
    }

    try {
      // Генерация Address Key
      const addrKey = await authService.getAddressKey(recipientAddress);
      
      // Генерация nonce
      const nonce = nacl.randomBytes(24);
      
      // Шифрование
      const messageBytes = new TextEncoder().encode(message);
      const ciphertext = nacl.secretbox(messageBytes, nonce, addrKey);
      
      // Создание blob: [0x01][pubkey:32][nonce:24][ciphertext]
      const blob = new Uint8Array(1 + 32 + 24 + ciphertext.length);
      blob[0] = MESSAGE_VERSION;
      blob.set(authData.e2eKeyPair.publicKey, 1);
      blob.set(nonce, 1 + 32);
      blob.set(ciphertext, 1 + 32 + 24);
      
      // Base64 кодирование
      const base64 = this.uint8ArrayToBase64(blob);
      
      return { blob, base64 };
    } catch (error) {
      console.error('❌ Ошибка шифрования:', error);
      throw error;
    }
  }

  /**
   * Дешифрование сообщения (cascading fallback v15)
   */
  async decrypt(encryptedBase64: string, senderAddress: string): Promise<string> {
    const authData = authService.getAuthData();
    if (!authData) {
      throw new Error('Пользователь не аутентифицирован');
    }

    try {
      // Decoding из base64
      const blob = this.base64ToUint8Array(encryptedBase64);
      
      // Определение версии
      const version = blob[0];
      
      // Попытка дешифрования v15 (Address Key)
      if (version === MESSAGE_VERSION) {
        const nonce = blob.slice(1 + 32, 1 + 32 + 24);
        const ciphertext = blob.slice(1 + 32 + 24);
        
        const addrKey = await authService.getAddressKey(senderAddress);
        const decrypted = nacl.secretbox.open(ciphertext, nonce, addrKey);
        
        if (decrypted) {
          return new TextDecoder().decode(decrypted);
        }
      }
      
      // Fallback для старых форматов (0x02, 0x03, legacy)
      // Здесь можно добавить поддержку старых форматов если нужно
      
      throw new Error('Не удалось дешифровать сообщение');
    } catch (error) {
      console.error('❌ Ошибка дешифрования:', error);
      throw error;
    }
  }

  /**
   * Генерация хэша сообщения (для on-chain хранения)
   */
  async hashMessage(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(message));
    return this.uint8ArrayToHex(new Uint8Array(hash));
  }

  /**
   * Uint8Array → Base64
   */
  private uint8ArrayToBase64(arr: Uint8Array): string {
    let binary = '';
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Base64 → Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return arr;
  }

  /**
   * Uint8Array → Hex
   */
  private uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

}

// Экспорт singleton instance
export const encryptionService = EncryptionService.getInstance();
