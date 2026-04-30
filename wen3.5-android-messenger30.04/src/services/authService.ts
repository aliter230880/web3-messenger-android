import { ethers } from 'ethers';
import nacl from 'tweetnacl';

/**
 * Аутентификация в стиле Web3 Messenger v15
 * 
 * Уровень 1: Пароль + MasterKey (PBKDF2)
 * Уровень 2: E2E KeyPair (от подписи MetaMask)
 * Уровень 3: Admin Escrow KeyPair (для админа)
 */

const AUTH_MESSAGE = 'Web3Messenger-E2E-KeyPair-v1';

export interface AuthResult {
  address: string;
  signature: string;
  masterKey: Uint8Array;
  e2eKeyPair: {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  };
  isAdmin: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private authData: AuthResult | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Аутентификация через подпись MetaMask
   */
  async authenticate(
    signer: ethers.Signer,
    password?: string
  ): Promise<AuthResult> {
    try {
      // Получение адреса
      const address = await signer.getAddress();
      
      // Подпись сообщения для E2E ключей
      const signature = await signer.signMessage(AUTH_MESSAGE);
      
      // Генерация E2E KeyPair из подписи
      const signatureHash = await this.sha256(signature);
      const e2eKeyPair = nacl.box.keyPair.fromSecretKey(signatureHash);
      
      // Генерация MasterKey из пароля (если предоставлен)
      let masterKey: Uint8Array;
      if (password) {
        masterKey = await this.deriveMasterKey(address, password);
      } else {
        // Если пароля нет, используем signature hash как master key
        masterKey = signatureHash;
      }

      // Проверка на админа
      const ADMIN_ADDRESS = '0xB19aEe699eb4D2Af380c505E4d6A108b055916eB';
      const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

      this.authData = {
        address,
        signature,
        masterKey,
        e2eKeyPair,
        isAdmin,
      };

      console.log('✅ Аутентификация успешна:', address);
      return this.authData;
    } catch (error) {
      console.error('❌ Ошибка аутентификации:', error);
      throw error;
    }
  }

  /**
   * Проверка аутентификации
   */
  isAuthenticated(): boolean {
    return this.authData !== null;
  }

  /**
   * Получение данных аутентификации
   */
  getAuthData(): AuthResult | null {
    return this.authData;
  }

  /**
   * Получение адреса
   */
  getAddress(): string | null {
    return this.authData?.address || null;
  }

  /**
   * Получение E2E ключей
   */
  getE2EKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } | null {
    return this.authData?.e2eKeyPair || null;
  }

  /**
   * Получение публичного ключа в hex
   */
  getPublicKeyHex(): string | null {
    if (!this.authData?.e2eKeyPair.publicKey) {
      return null;
    }
    return ethers.utils.hexlify(this.authData.e2eKeyPair.publicKey);
  }

  /**
   * Проверка является ли пользователь админом
   */
  isAdmin(): boolean {
    return this.authData?.isAdmin || false;
  }

  /**
   * Выход
   */
  logout(): void {
    this.authData = null;
    console.log('🔓 Выход выполнен');
  }

  /**
   * Derive MasterKey из пароля (PBKDF2)
   */
  private async deriveMasterKey(address: string, password: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const salt = encoder.encode(address.toLowerCase());
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    return new Uint8Array(derivedBits);
  }

  /**
   * SHA-256 хэширование
   */
  private async sha256(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return new Uint8Array(hash);
  }

  /**
   * Генерация Address Key для E2E шифрования (v15)
   * SHA-256([addr1, addr2].sort().join(':web3m:'))
   */
  async getAddressKey(peerAddress: string): Promise<Uint8Array> {
    const myAddress = this.authData?.address;
    if (!myAddress) {
      throw new Error('Не аутентифицирован');
    }

    const sorted = [myAddress.toLowerCase(), peerAddress.toLowerCase()].sort().join(':web3m:');
    return await this.sha256(sorted);
  }
}

// Экспорт singleton instance
export const authService = AuthService.getInstance();
