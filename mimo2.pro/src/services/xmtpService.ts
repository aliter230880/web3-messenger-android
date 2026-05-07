// XMTP Service - E2E encrypted messaging via XMTP protocol
// Based on CONTEXT.md architecture

import { ethers } from 'ethers';

export interface XmtpMessage {
  id: string;
  content: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
  contentType: string;
}

export interface XmtpConversation {
  peerAddress: string;
  topic: string;
  createdAt: number;
}

class XmtpService {
  private client: any = null;
  private isInitialized = false;
  private messageListeners: Map<string, (message: XmtpMessage) => void> = new Map();

  // Initialize XMTP client with signer
  async initialize(signer: ethers.Signer): Promise<void> {
    try {
      // In production: use @xmtp/xmtp-js
      // const xmtp = await Client.create(signer, { env: 'production', skipContactPublishing: true });
      // this.client = xmtp;
      
      // For demo: simulate initialization
      console.log('XMTP: Initializing with signer...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const address = await signer.getAddress();
      console.log('XMTP: Initialized for address', address);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('XMTP initialization failed:', error);
      throw error;
    }
  }

  // Check if XMTP is ready
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Check if address can receive XMTP messages
  async canMessage(address: string): Promise<boolean> {
    // In production: await this.client.canMessage(address)
    // For demo: always return true
    return ethers.utils.isAddress(address);
  }

  // Get or create conversation with peer
  async getConversation(peerAddress: string): Promise<XmtpConversation> {
    if (!this.isInitialized) {
      throw new Error('XMTP not initialized');
    }

    // In production:
    // const conversation = await this.client.conversations.newConversation(peerAddress);
    
    return {
      peerAddress,
      topic: `/xmtp/0/${peerAddress}/proto`,
      createdAt: Date.now(),
    };
  }

  // Send message
  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.isInitialized) {
      throw new Error('XMTP not initialized');
    }

    // In production:
    // const conversation = await this.client.conversations.newConversation(peerAddress);
    // const sent = await conversation.send(content);

    const message: XmtpMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      senderAddress: await this.getSignerAddress(),
      recipientAddress: peerAddress,
      timestamp: Date.now(),
      contentType: 'text',
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return message;
  }

  // Get messages from conversation
  async getMessages(_peerAddress: string, _limit: number = 50): Promise<XmtpMessage[]> {
    if (!this.isInitialized) {
      return [];
    }

    // In production:
    // const conversation = await this.client.conversations.newConversation(peerAddress);
    // const messages = await conversation.messages({ limit });
    
    // For demo: return empty array (messages come from local store)
    return [];
  }

  // Subscribe to all messages
  subscribeToAllMessages(callback: (message: XmtpMessage) => void): () => void {
    const listenerId = `listener_${Date.now()}`;
    this.messageListeners.set(listenerId, callback);

    // In production:
    // const stream = await this.client.conversations.streamAllMessages();
    // for await (const message of stream) {
    //   callback(transformMessage(message));
    // }

    // Return unsubscribe function
    return () => {
      this.messageListeners.delete(listenerId);
    };
  }

  // Subscribe to conversation messages
  async subscribeToConversation(
    _peerAddress: string,
    _callback: (message: XmtpMessage) => void
  ): Promise<() => void> {
    // In production:
    // const conversation = await this.client.conversations.newConversation(peerAddress);
    // const stream = await conversation.streamMessages();
    // for await (const message of stream) {
    //   callback(transformMessage(message));
    // }

    return () => {};
  }

  // Get signer address (helper)
  private async getSignerAddress(): Promise<string> {
    // This would use the actual signer in production
    return '0x0000000000000000000000000000000000000000';
  }

  // List all conversations
  async listConversations(): Promise<XmtpConversation[]> {
    if (!this.isInitialized) {
      return [];
    }

    // In production:
    // const conversations = await this.client.conversations.list();
    // return conversations.map(c => ({ peerAddress: c.peerAddress, topic: c.topic }));

    return [];
  }

  // Disconnect and cleanup
  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
    this.messageListeners.clear();
  }

  // Get initialization status
  getStatus(): { initialized: boolean; ready: boolean } {
    return {
      initialized: this.isInitialized,
      ready: this.isReady(),
    };
  }
}

export const xmtpService = new XmtpService();
