// Messenger Service - работа с HybridMessenger контрактом
// Контракт: 0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5

import { ethers } from 'ethers';

const MESSENGER_ADDRESS = '0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5';

const MESSENGER_ABI = [
  'function sendMessage(address to, string memory content) external returns (uint256)',
  'function getMessages(address peer) external view returns (tuple(uint256 id, address from, address to, string content, uint256 timestamp, bool exists)[])',
  'function getMessagesPaginated(address peer, uint256 offset, uint256 limit) external view returns (tuple(uint256 id, address from, address to, string content, uint256 timestamp, bool exists)[])',
  'function addContact(address contact, string memory name) external',
  'function getContacts() external view returns (address[])',
  'function getMessageCount(address peer) external view returns (uint256)',
  'event MessageSent(uint256 indexed id, address indexed from, address indexed to, string content, uint256 timestamp)',
  'event ContactAdded(address indexed user, address indexed contact, string name)',
];

export interface ChainMessage {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  exists: boolean;
}

class MessengerService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
    this.contract = new ethers.Contract(MESSENGER_ADDRESS, MESSENGER_ABI, this.provider);
  }

  // Отправка сообщения on-chain (требуется gas)
  async sendMessage(signer: ethers.Signer, to: string, content: string): Promise<{ id: number; tx: string }> {
    const contract = this.contract.connect(signer);
    const tx = await (contract as any).sendMessage(to, content);
    const receipt = await tx.wait();
    
    // Получаем ID сообщения из события
    const event = receipt.events?.find((e: any) => e.event === 'MessageSent');
    const id = event?.args?.id?.toNumber() || 0;
    
    return { id, tx: receipt.transactionHash };
  }

  // Получение сообщений (бесплатно)
  async getMessages(userAddress: string, peerAddress: string): Promise<ChainMessage[]> {
    try {
      // Хэш диалога
      const messages = await this.contract.getMessages(peerAddress);
      
      return messages
        .filter((m: any) => m.exists)
        .map((m: any) => ({
          id: m.id.toNumber(),
          from: m.from,
          to: m.to,
          content: m.content,
          timestamp: m.timestamp.toNumber(),
          exists: m.exists,
        }))
        .filter((m: ChainMessage) => 
          (m.from.toLowerCase() === userAddress.toLowerCase() && m.to.toLowerCase() === peerAddress.toLowerCase()) ||
          (m.from.toLowerCase() === peerAddress.toLowerCase() && m.to.toLowerCase() === userAddress.toLowerCase())
        );
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  // Получение сообщений с пагинацией (бесплатно)
  async getMessagesPaginated(
    userAddress: string,
    peerAddress: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<ChainMessage[]> {
    try {
      const messages = await this.contract.getMessagesPaginated(peerAddress, offset, limit);
      
      return messages
        .filter((m: any) => m.exists)
        .map((m: any) => ({
          id: m.id.toNumber(),
          from: m.from,
          to: m.to,
          content: m.content,
          timestamp: m.timestamp.toNumber(),
          exists: m.exists,
        }));
    } catch (error) {
      console.error('Error getting messages paginated:', error);
      return [];
    }
  }

  // Получение количества сообщений (бесплатно)
  async getMessageCount(peerAddress: string): Promise<number> {
    try {
      const count = await this.contract.getMessageCount(peerAddress);
      return count.toNumber();
    } catch (error) {
      return 0;
    }
  }

  // Добавление контакта (требуется gas)
  async addContact(signer: ethers.Signer, contactAddress: string, name: string): Promise<string> {
    const contract = this.contract.connect(signer);
    const tx = await (contract as any).addContact(contactAddress, name);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // Получение контактов (бесплатно)
  async getContacts(userAddress: string): Promise<string[]> {
    try {
      // Для этого нужен signer, поэтому возвращаем пустой массив
      // В реальном приложении нужно вызывать с signer
      return [];
    } catch (error) {
      return [];
    }
  }
}

export const messengerService = new MessengerService();
