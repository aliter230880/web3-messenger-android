import { ethers } from 'ethers';
import nacl from 'tweetnacl';

/**
 * AuthService — derives a stable E2E keypair for this wallet address.
 *
 * Strategy (no signature required):
 * - First connection: generates a random 32-byte seed, stores it in localStorage keyed by address.
 * - Subsequent connections: loads the stored seed — no wallet popup at all.
 * - The seed is deterministic per device+address, so E2E keys are stable across sessions.
 *
 * Note: XMTP already provides protocol-level E2E encryption. Our custom layer (v1: prefix)
 * is extra. Tying it to a MetaMask signature was causing 1 unnecessary popup per connection.
 */

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

const ADMIN_ADDRESS = '0xB19aEe699eb4D2Af380c505E4d6A108b055916eB';

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
   * Authenticate: derives E2E keypair from a cached local seed.
   * No wallet signature required — seed is stored in localStorage per address.
   */
  async authenticate(signer: ethers.Signer): Promise<AuthResult> {
    const address = await signer.getAddress();
    const seed = this._getOrCreateSeed(address);
    const e2eKeyPair = nacl.box.keyPair.fromSecretKey(seed);

    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

    this.authData = {
      address,
      signature: '',
      masterKey: seed,
      e2eKeyPair,
      isAdmin,
    };

    console.log('✅ Auth OK [local-seed]:', address);
    return this.authData;
  }

  /** Returns a stable 32-byte seed from localStorage, creating one on first call. */
  private _getOrCreateSeed(address: string): Uint8Array {
    const key = `e2e_seed_${address.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const bytes = Uint8Array.from(JSON.parse(stored));
        if (bytes.length === 32) return bytes;
      } catch {}
    }
    const seed = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(key, JSON.stringify(Array.from(seed)));
    return seed;
  }

  isAuthenticated(): boolean { return this.authData !== null; }
  getAuthData(): AuthResult | null { return this.authData; }
  getAddress(): string | null { return this.authData?.address || null; }
  getE2EKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } | null {
    return this.authData?.e2eKeyPair || null;
  }
  getPublicKeyHex(): string | null {
    if (!this.authData?.e2eKeyPair.publicKey) return null;
    return ethers.utils.hexlify(this.authData.e2eKeyPair.publicKey);
  }
  isAdmin(): boolean { return this.authData?.isAdmin || false; }
  logout(): void { this.authData = null; }

  async getAddressKey(peerAddress: string): Promise<Uint8Array> {
    const myAddress = this.authData?.address;
    if (!myAddress) throw new Error('Не аутентифицирован');
    const sorted = [myAddress.toLowerCase(), peerAddress.toLowerCase()].sort().join(':web3m:');
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(sorted));
    return new Uint8Array(hash);
  }
}

export const authService = AuthService.getInstance();
