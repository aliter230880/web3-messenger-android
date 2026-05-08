// Identity Service - работа с IdentityV2 контрактом
// Контракт: 0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC

import { ethers } from 'ethers';

const IDENTITY_ADDRESS = '0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC';

const IDENTITY_ABI = [
  'function createIdentity(string memory nickname) external',
  'function getIdentity(address user) external view returns (string memory nickname, uint256 createdAt, bool exists)',
  'function hasIdentity(address user) external view returns (bool)',
  'function updateNickname(string memory newNickname) external',
  'function transferIdentity(address newOwner) external',
  'event IdentityCreated(address indexed user, string nickname, uint256 timestamp)',
  'event NicknameUpdated(address indexed user, string newNickname)',
];

export interface Identity {
  nickname: string;
  createdAt: number;
  exists: boolean;
}

class IdentityService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
    this.contract = new ethers.Contract(IDENTITY_ADDRESS, IDENTITY_ABI, this.provider);
  }

  // Проверка есть ли идентичность (бесплатно)
  async hasIdentity(address: string): Promise<boolean> {
    try {
      return await this.contract.hasIdentity(address);
    } catch (error) {
      console.error('Error checking identity:', error);
      return false;
    }
  }

  // Получение идентичности (бесплатно)
  async getIdentity(address: string): Promise<Identity | null> {
    try {
      const [nickname, createdAt, exists] = await this.contract.getIdentity(address);
      
      if (!exists) return null;

      return {
        nickname,
        createdAt: createdAt.toNumber(),
        exists,
      };
    } catch (error) {
      console.error('Error getting identity:', error);
      return null;
    }
  }

  // Создание идентичности (требуется gas)
  async createIdentity(signer: ethers.Signer, nickname: string): Promise<string> {
    const contract = this.contract.connect(signer);
    const tx = await (contract as any).createIdentity(nickname);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // Обновление никнейма (требуется gas)
  async updateNickname(signer: ethers.Signer, newNickname: string): Promise<string> {
    const contract = this.contract.connect(signer);
    const tx = await (contract as any).updateNickname(newNickname);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }
}

export const identityService = new IdentityService();
