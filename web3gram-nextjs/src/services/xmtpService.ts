// XMTP Service - E2E messaging with timeout, retry and skipContactPublishing

export interface XmtpMessage {
  id: string;
  content: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
}

class XmtpService {
  private client: any = null;
  private isInitialized = false;
  private initAttempts = 0;
  private maxAttempts = 3;

  // Initialize with timeout and retry
  async initialize(signer: any): Promise<boolean> {
    if (this.isInitialized && this.client) {
      return true;
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      console.log(`[XMTP] Init attempt ${attempt}/${this.maxAttempts}`);
      try {
        const success = await this.tryInit(signer);
        if (success) {
          this.initAttempts = 0;
          return true;
        }
      } catch (error: any) {
        console.error(`[XMTP] Attempt ${attempt} failed:`, error.message);
        if (attempt < this.maxAttempts) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }

    console.error('[XMTP] All attempts failed');
    return false;
  }

  // Single init attempt with timeout
  private async tryInit(signer: any): Promise<boolean> {
    let Client: any;
    try {
      const xmtp = await import('@xmtp/xmtp-js');
      Client = xmtp.Client;
    } catch {
      console.error('[XMTP] Library not available');
      return false;
    }

    console.log('[XMTP] Creating client...');

    // Timeout 8 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('XMTP timeout')), 8000)
    );

    try {
      // Fast path with skipContactPublishing
      this.client = await Promise.race([
        Client.create(signer, {
          env: 'production',
          skipContactPublishing: true,
        }),
        timeoutPromise,
      ]);

      this.isInitialized = true;
      console.log('[XMTP] Connected! Address:', this.client.address);
      return true;
    } catch (fastError: any) {
      console.log('[XMTP] Fast path failed:', fastError.message);

      // Full path for new users
      try {
        this.client = await Promise.race([
          Client.create(signer, { env: 'production' }),
          timeoutPromise,
        ]);

        this.isInitialized = true;
        console.log('[XMTP] Connected (full path)! Address:', this.client.address);
        return true;
      } catch (fullError: any) {
        console.error('[XMTP] Full path also failed:', fullError.message);
        this.client = null;
        this.isInitialized = false;
        return false;
      }
    }
  }

  // Check if ready
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Send message
  async sendMessage(
    peerAddress: string,
    content: string
  ): Promise<XmtpMessage> {
    if (!this.client) {
      throw new Error('XMTP not initialized - message not sent');
    }

    console.log('[XMTP] Sending to', peerAddress);
    const conversation = await this.client.conversations.newConversation(
      peerAddress
    );
    const sent = await conversation.send(content);

    return {
      id: sent.id,
      content: sent.content,
      senderAddress: this.client.address,
      recipientAddress: peerAddress,
      timestamp: sent.sent.getTime(),
    };
  }

  // Get messages
  async getMessages(
    peerAddress: string,
    limit: number = 50
  ): Promise<XmtpMessage[]> {
    if (!this.client) return [];

    try {
      const conversation =
        await this.client.conversations.newConversation(peerAddress);
      const messages = await conversation.messages({ limit });

      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        recipientAddress: msg.recipientAddress || peerAddress,
        timestamp: msg.sent.getTime(),
      }));
    } catch {
      return [];
    }
  }

  // Stream all messages
  async streamAllMessages(
    callback: (msg: XmtpMessage) => void
  ): Promise<() => void> {
    if (!this.client) throw new Error('XMTP not initialized');

    const stream = await this.client.conversations.streamAllMessages();

    (async () => {
      try {
        for await (const msg of stream) {
          callback({
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            recipientAddress: msg.recipientAddress || '',
            timestamp: msg.sent.getTime(),
          });
        }
      } catch (error) {
        console.error('[XMTP] Stream error:', error);
      }
    })();

    return () => {};
  }

  // Check if address can receive XMTP
  async canMessage(address: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      return await this.client.canMessage(address);
    } catch {
      return false;
    }
  }

  // Disconnect
  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
    this.initAttempts = 0;
  }

  // Get address
  getAddress(): string | null {
    return this.client?.address || null;
  }
}

export const xmtpService = new XmtpService();
