import nacl from 'tweetnacl';
import { authService } from './authService';

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

  async encrypt(message: string, recipientAddress: string): Promise<EncryptedMessage> {
    const authData = authService.getAuthData();
    if (!authData) {
      throw new Error('Пользователь не аутентифицирован');
    }

    try {
      const addrKey = await authService.getAddressKey(recipientAddress);
      const nonce = nacl.randomBytes(24);
      const messageBytes = new TextEncoder().encode(message);
      const ciphertext = nacl.secretbox(messageBytes, nonce, addrKey);

      const blob = new Uint8Array(1 + 32 + 24 + ciphertext.length);
      blob[0] = MESSAGE_VERSION;
      blob.set(authData.e2eKeyPair.publicKey, 1);
      blob.set(nonce, 1 + 32);
      blob.set(ciphertext, 1 + 32 + 24);

      const base64 = this.uint8ArrayToBase64(blob);
      return { blob, base64 };
    } catch (error) {
      console.error('❌ Ошибка шифрования:', error);
      throw error;
    }
  }

  async decrypt(encryptedBase64: string, senderAddress: string): Promise<string> {
    const authData = authService.getAuthData();
    if (!authData) {
      throw new Error('Пользователь не аутентифицирован');
    }

    try {
      const blob = this.base64ToUint8Array(encryptedBase64);
      const version = blob[0];

      if (version === MESSAGE_VERSION) {
        const nonce = blob.slice(1 + 32, 1 + 32 + 24);
        const ciphertext = blob.slice(1 + 32 + 24);
        const addrKey = await authService.getAddressKey(senderAddress);
        const decrypted = nacl.secretbox.open(ciphertext, nonce, addrKey);
        if (decrypted) {
          return new TextDecoder().decode(decrypted);
        }
      }

      throw new Error('Не удалось дешифровать сообщение');
    } catch (error) {
      console.error('❌ Ошибка дешифрования:', error);
      throw error;
    }
  }

  async hashMessage(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(message));
    return this.uint8ArrayToHex(new Uint8Array(hash));
  }

  private uint8ArrayToBase64(arr: Uint8Array): string {
    let binary = '';
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export const encryptionService = EncryptionService.getInstance();
