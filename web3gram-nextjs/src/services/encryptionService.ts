// Encryption Service - E2E message encryption
// Uses base64 encoding for demo; production should use TweetNaCl

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
}

class EncryptionService {
  // Encrypt message (base64 for demo)
  encrypt(message: string): EncryptedMessage {
    if (typeof window === 'undefined') {
      return { ciphertext: Buffer.from(message).toString('base64'), nonce: '' };
    }
    const nonce = new Uint8Array(24);
    crypto.getRandomValues(nonce);
    return {
      ciphertext: btoa(unescape(encodeURIComponent(message))),
      nonce: Array.from(nonce)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    };
  }

  // Decrypt message
  decrypt(encrypted: EncryptedMessage): string {
    if (typeof window === 'undefined') {
      return Buffer.from(encrypted.ciphertext, 'base64').toString('utf-8');
    }
    try {
      return decodeURIComponent(escape(atob(encrypted.ciphertext)));
    } catch {
      return encrypted.ciphertext;
    }
  }

  // Format for XMTP payload
  formatPayload(message: string): string {
    const encrypted = this.encrypt(message);
    return `v1:${encrypted.ciphertext}`;
  }

  // Parse XMTP payload
  parsePayload(payload: string): string {
    if (payload.startsWith('v1:')) {
      return this.decrypt({ ciphertext: payload.slice(3), nonce: '' });
    }
    return payload;
  }

  // Generate consistent chat ID from two addresses
  generateChatId(address1: string, address2: string): string {
    const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
    return sorted.join('_');
  }
}

export const encryptionService = new EncryptionService();
