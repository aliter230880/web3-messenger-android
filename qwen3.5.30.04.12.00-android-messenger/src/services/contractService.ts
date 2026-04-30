import { ethers } from 'ethers';
import type { Signer } from 'ethers';

// Адреса смарт-контрактов (Polygon Mainnet, chainId: 137)
export const CONTRACT_ADDRESSES = {
  // Существующие контракты
  Identity: '0xcFcA16C8c38a83a71936395039757DcFF6040c1E',
  IdentityV2: '0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC', // Новый
  MessageStorage: '0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb',
  KeyEscrow: '0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53',
  SocialWalletRegistry: '0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036',
  
  // Новые гибридные контракты
  HybridMessenger: '0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5', // Новый
} as const;

// ABI контрактов (минимальные для работы)
const IDENTITY_ABI = [
  'function registerProfile(string nickname, uint256 avatarId) external',
  'function updateProfile(string nickname, uint256 avatarId) external',
  'function getProfile(address user) external view returns (string nickname, uint256 avatarId, bool exists)',
  'function profileExists(address user) external view returns (bool)',
  'function getAddressByNickname(string nickname) external view returns (address)',
  'event ProfileRegistered(address indexed user, string nickname, uint256 avatarId)',
  'event ProfileUpdated(address indexed user, string oldNickname, string newNickname, uint256 avatarId)',
];

const HYBRID_MESSENGER_ABI = [
  'function storeMessageHash(address recipient, bytes32 messageHash) external',
  'function getConversationHashes(address userA, address userB, uint256 startIndex, uint256 count) external view returns (bytes32[], uint256)',
  'function messageHashExists(bytes32 messageHash) external view returns (bool)',
  'function getConversationCount(address userA, address userB) external view returns (uint256)',
  'function totalMessages() external view returns (uint256)',
  'event MessageHashStored(bytes32 indexed hash, address indexed sender, address indexed recipient, uint256 timestamp)',
  'event ConversationCreated(address indexed userA, address indexed userB, bytes32 conversationKey)',
];

const MESSAGE_STORAGE_ABI = [
  'function storeMessageHash(address recipient, bytes32 messageHash, uint256 timestamp) external',
  'function getMessageHashes(address userA, address userB, uint256 startIndex, uint256 count) external view returns (bytes32[], uint256)',
  'function messageHashCount(address a, address b) external view returns (uint256)',
  'event MessageHashStored(address indexed sender, address indexed recipient, bytes32 messageHash, uint256 timestamp)',
];

const KEY_ESCROW_ABI = [
  'function depositKey(bytes encryptedKey) external',
  'function getKey(address user) external view returns (bytes)',
  'function getAdminPublicKey() external view returns (bytes)',
  'function setAdminPublicKey(bytes pubKey) external',
  'function getUserCount() external view returns (uint256)',
  'function getUsers(uint256 start, uint256 count) external view returns (address[])',
  'function isRegistered(address user) external view returns (bool)',
  'event KeyDeposited(address indexed user, uint256 timestamp)',
];

export class ContractService {
  private signer: Signer | null = null;
  private provider: ethers.providers.Provider | null = null;
  private static instance: ContractService;

  private identityContract: ethers.Contract | null = null;
  private identityV2Contract: ethers.Contract | null = null;
  private messageStorageContract: ethers.Contract | null = null;
  private keyEscrowContract: ethers.Contract | null = null;
  private hybridMessengerContract: ethers.Contract | null = null;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Инициализация сервиса
   */
  initialize(provider: ethers.providers.Provider, signer: Signer): void {
    this.provider = provider;
    this.signer = signer;

    // Инициализация контрактов
    this.identityContract = new ethers.Contract(
      CONTRACT_ADDRESSES.Identity,
      IDENTITY_ABI,
      signer
    );

    // IdentityV2 (новый)
    this.identityV2Contract = new ethers.Contract(
      CONTRACT_ADDRESSES.IdentityV2,
      IDENTITY_ABI,
      signer
    );

    // HybridMessenger (новый)
    this.hybridMessengerContract = new ethers.Contract(
      CONTRACT_ADDRESSES.HybridMessenger,
      HYBRID_MESSENGER_ABI,
      signer
    );

    this.messageStorageContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MessageStorage,
      MESSAGE_STORAGE_ABI,
      signer
    );

    this.keyEscrowContract = new ethers.Contract(
      CONTRACT_ADDRESSES.KeyEscrow,
      KEY_ESCROW_ABI,
      signer
    );

    console.log('✅ Контракты инициализированы');
    console.log('   IdentityV2:', CONTRACT_ADDRESSES.IdentityV2);
    console.log('   HybridMessenger:', CONTRACT_ADDRESSES.HybridMessenger);
  }

  /**
   * Регистрация профиля (IdentityV2)
   */
  async registerProfile(nickname: string, avatarId: number): Promise<string> {
    if (!this.identityV2Contract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      // AvatarId 0-23 для совместимости с приложением
      const tx = await this.identityV2Contract.registerProfile(nickname, avatarId);
      const receipt = await tx.wait();
      
      console.log('✅ Профиль зарегистрирован:', receipt.transactionHash);
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Ошибка регистрации профиля:', error);
      throw error;
    }
  }

  /**
   * Обновление профиля (IdentityV2)
   */
  async updateProfile(nickname: string, avatarId: number): Promise<string> {
    if (!this.identityV2Contract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const tx = await this.identityV2Contract.updateProfile(nickname, avatarId);
      const receipt = await tx.wait();
      
      console.log('✅ Профиль обновлён:', receipt.transactionHash);
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Ошибка обновления профиля:', error);
      throw error;
    }
  }

  /**
   * Поиск адреса по никнейму (IdentityV2)
   */
  async getAddressByNickname(nickname: string): Promise<string> {
    if (!this.identityV2Contract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const address = await this.identityV2Contract.getAddressByNickname(nickname);
      return address;
    } catch (error) {
      console.error('❌ Ошибка поиска по никнейму:', error);
      return ethers.constants.AddressZero;
    }
  }

  /**
   * Получение профиля пользователя
   */
  async getProfile(address: string): Promise<{ nickname: string; avatarId: number; exists: boolean }> {
    if (!this.identityContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const profile = await this.identityContract.getProfile(address);
      return {
        nickname: profile[0],
        avatarId: profile[1].toNumber(),
        exists: profile[2],
      };
    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      return { nickname: '', avatarId: 0, exists: false };
    }
  }

  /**
   * Проверка существования профиля
   */
  async profileExists(address: string): Promise<boolean> {
    if (!this.identityContract) {
      return false;
    }

    try {
      return await this.identityContract.profileExists(address);
    } catch (error) {
      console.error('❌ Ошибка проверки профиля:', error);
      return false;
    }
  }

  /**
   * Сохранение хэша сообщения (HybridMessenger для XMTP)
   */
  async storeMessageHash(recipient: string, messageHash: string): Promise<string> {
    if (!this.hybridMessengerContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const tx = await this.hybridMessengerContract.storeMessageHash(
        recipient,
        messageHash
      );
      const receipt = await tx.wait();
      
      console.log('✅ Хэш сообщения сохранён (HybridMessenger):', receipt.transactionHash);
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Ошибка сохранения хэша:', error);
      throw error;
    }
  }

  /**
   * Получение хэшей сообщений (HybridMessenger)
   */
  async getConversationHashes(
    userA: string,
    userB: string,
    startIndex: number = 0,
    count: number = 50
  ): Promise<{ hashes: string[]; total: number }> {
    if (!this.hybridMessengerContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const result = await this.hybridMessengerContract.getConversationHashes(
        userA,
        userB,
        startIndex,
        count
      );
      
      return {
        hashes: result[0],
        total: result[1].toNumber(),
      };
    } catch (error) {
      console.error('❌ Ошибка получения хэшей:', error);
      return { hashes: [], total: 0 };
    }
  }

  /**
   * Проверка существования хэша (HybridMessenger)
   */
  async messageHashExists(messageHash: string): Promise<boolean> {
    if (!this.hybridMessengerContract) {
      return false;
    }

    try {
      return await this.hybridMessengerContract.messageHashExists(messageHash);
    } catch (error) {
      console.error('❌ Ошибка проверки хэша:', error);
      return false;
    }
  }

  /**
   * Получение хэшей сообщений
   */
  async getMessageHashes(
    userA: string,
    userB: string,
    startIndex: number = 0,
    count: number = 50
  ): Promise<{ hashes: string[]; total: number }> {
    if (!this.messageStorageContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const result = await this.messageStorageContract.getMessageHashes(
        userA,
        userB,
        startIndex,
        count
      );
      
      return {
        hashes: result[0],
        total: result[1].toNumber(),
      };
    } catch (error) {
      console.error('❌ Ошибка получения хэшей:', error);
      return { hashes: [], total: 0 };
    }
  }

  /**
   * Деплой ключа в KeyEscrow
   */
  async depositKey(encryptedKey: Uint8Array): Promise<string> {
    if (!this.keyEscrowContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const tx = await this.keyEscrowContract.depositKey(encryptedKey);
      const receipt = await tx.wait();
      
      console.log('✅ Ключ задеплоен в escrow:', receipt.transactionHash);
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Ошибка деплоя ключа:', error);
      throw error;
    }
  }

  /**
   * Проверка зарегистрирован ли ключ в escrow
   */
  async isKeyRegistered(address: string): Promise<boolean> {
    if (!this.keyEscrowContract) {
      return false;
    }

    try {
      return await this.keyEscrowContract.isRegistered(address);
    } catch (error) {
      console.error('❌ Ошибка проверки ключа:', error);
      return false;
    }
  }

  /**
   * Получение публичного ключа админа
   */
  async getAdminPublicKey(): Promise<string> {
    if (!this.keyEscrowContract) {
      throw new Error('Контракты не инициализированы');
    }

    try {
      const pubKey = await this.keyEscrowContract.getAdminPublicKey();
      return pubKey;
    } catch (error) {
      console.error('❌ Ошибка получения ключа админа:', error);
      throw error;
    }
  }

  /**
   * Получение адреса кошелька
   */
  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer не инициализирован');
    }
    return await this.signer.getAddress();
  }

  /**
   * Проверка сети (должен быть Polygon Mainnet, chainId 137)
   */
  async checkNetwork(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      const network = await this.provider.getNetwork();
      return network.chainId === 137; // Polygon Mainnet
    } catch (error) {
      console.error('❌ Ошибка проверки сети:', error);
      return false;
    }
  }
}

// Экспорт singleton instance
export const contractService = ContractService.getInstance();
