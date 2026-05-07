// Encryption Service - E2E шифрование сообщений
// На основе CONTEXT.md - TweetNaCl для шифрования

// Simple encryption/decryption utilities for demo
// In production, this would use TweetNaCl for proper E2E encryption

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
}

class EncryptionService {
  private keyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null = null;

  // Generate key pair for user
  async generateKeyPair(): Promise<void> {
    // In production: use TweetNaCl
    // const keyPair = nacl.box.keyPair();
    
    // For demo: generate mock keys
    const mockPublicKey = new Uint8Array(32);
    const mockSecretKey = new Uint8Array(32);
    crypto.getRandomValues(mockPublicKey);
    crypto.getRandomValues(mockSecretKey);
    
    this.keyPair = { publicKey: mockPublicKey, secretKey: mockSecretKey };
  }

  // Get public key (for sharing)
  getPublicKey(): string {
    if (!this.keyPair) {
      throw new Error('Key pair not generated');
    }
    return Buffer.from(this.keyPair.publicKey).toString('base64');
  }

  // Encrypt message
  encrypt(message: string, recipientPublicKey: string): EncryptedMessage {
    // In production: use TweetNaCl box
    // const nonce = nacl.randomBytes(24);
    // const encrypted = nacl.box(
    //   new Uint8Array(Buffer.from(message)),
    //   nonce,
    //   new Uint8Array(Buffer.from(recipientPublicKey, 'base64')),
    //   this.keyPair.secretKey
    // );

    // For demo: base64 encode (not real encryption!)
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    return {
      ciphertext: btoa(message),
      nonce: Buffer.from(nonce).toString('base64'),
    };
  }

  // Decrypt message
  decrypt(encrypted: EncryptedMessage, senderPublicKey: string): string {
    // In production: use TweetNaCl box.open
    // const decrypted = nacl.box.open(
    //   new Uint8Array(Buffer.from(encrypted.ciphertext, 'base64')),
    //   new Uint8Array(Buffer.from(encrypted.nonce, 'base64')),
    //   new Uint8Array(Buffer.from(senderPublicKey, 'base64')),
    //   this.keyPair.secretKey
    // );

    // For demo: base64 decode
    try {
      return atob(encrypted.ciphertext);
    } catch {
      return encrypted.ciphertext;
    }
  }

  // Generate XMTP-style payload
  formatXmtpPayload(message: string): string {
    const encrypted = this.encrypt(message, '');
    return `v1:${encrypted.ciphertext}`;
  }

  // Parse XMTP-style payload
  parseXmtpPayload(payload: string): string {
    if (payload.startsWith('v1:')) {
      return this.decrypt({ ciphertext: payload.slice(3), nonce: '' }, '');
    }
    return payload;
  }

  // Hash address for chat ID
  generateChatId(address1: string, address2: string): string {
    // Sort addresses and concatenate for consistent chat ID
    const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
    return sorted.join('_');
  }
}

export const encryptionService = new EncryptionService();
