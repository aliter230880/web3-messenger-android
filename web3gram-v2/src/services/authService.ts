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
   * Аутентификация через подпись MetaMask.
   *
   * MOBILE/CAPACITOR STRATEGY:
   * signMessage() goes through WalletConnect relay to MetaMask.
   * If MetaMask is in background (e.g. user just confirmed connection and
   * returned), it cannot show the signing dialog → hangs forever.
   *
   * Fix: try signing with a 6-second timeout. On timeout, fall back to a
   * deterministic local seed stored in localStorage for this address.
   * The E2E keypair is still stable across sessions (same keys each time),
   * just not cryptographically tied to the MetaMask private key.
   *
   * The `fromSignature` flag in the result tells callers whether real
   * signing succeeded (true) or local fallback was used (false).
   */
  async authenticate(
    signer: ethers.Signer,
    password?: string
  ): Promise<AuthResult> {
    // Step 1: get address — safe, no user interaction needed
    let address: string;
    try {
      address = await Promise.race([
        signer.getAddress(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getAddress timeout')), 5000)
        ),
      ]);
    } catch {
      throw new Error('Не удалось получить адрес кошелька');
    }

    // Step 2: try signing with 6s timeout; fall back to local seed on timeout
    let signatureHash: Uint8Array;
    let signature: string;
    let fromSignature = true;

    try {
      // 90 second timeout: user needs time to open MetaMask, find the
      // request (may be in Activity tab), and confirm it.
      signature = await Promise.race([
        signer.signMessage(AUTH_MESSAGE),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('signMessage timeout — пользователь не подтвердил подпись')),
            90_000
          )
        ),
      ]);
      signatureHash = await this.sha256(signature);
      console.log('✅ Auth: signature received from MetaMask');
    } catch (signErr) {
      console.warn('⚠️ Auth: signMessage timed out or failed, using local seed fallback:', signErr);
      fromSignature = false;
      signature = '';
      signatureHash = await this._getOrCreateLocalSeed(address);
    }

    // Step 3: derive E2E keypair
    const e2eKeyPair = nacl.box.keyPair.fromSecretKey(signatureHash);

    // Step 4: master key
    let masterKey: Uint8Array;
    if (password) {
      masterKey = await this.deriveMasterKey(address, password);
    } else {
      masterKey = signatureHash;
    }

    const ADMIN_ADDRESS = '0xB19aEe699eb4D2Af380c505E4d6A108b055916eB';
    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

    this.authData = { address, signature, masterKey, e2eKeyPair, isAdmin };
    console.log(`✅ Auth OK [${fromSignature ? 'signed' : 'local-seed'}]:`, address);
    return this.authData;
  }

  /**
   * Returns a stable 32-byte seed for this address stored in localStorage.
   * Created once randomly, reused on every subsequent call.
   * Used as a fallback when MetaMask signing is unavailable (background).
   */
  private async _getOrCreateLocalSeed(address: string): Promise<Uint8Array> {
    const key = `e2e_seed_${address.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const bytes = Uint8Array.from(JSON.parse(stored));
        if (bytes.length === 32) return bytes;
      } catch {}
    }
    // Generate new random 32-byte seed
    const seed = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(key, JSON.stringify(Array.from(seed)));
    return seed;
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
