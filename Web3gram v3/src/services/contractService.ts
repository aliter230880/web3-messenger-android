import { ethers } from 'ethers';
import type { Signer } from 'ethers';

export const CONTRACT_ADDRESSES = {
  Identity: '0xcFcA16C8c38a83a71936395039757DcFF6040c1E',
  IdentityV2: '0xd7cCe5816429616d92F7B2e8eAeFf20ef2B534FC',
  MessageStorage: '0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb',
  KeyEscrow: '0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53',
  SocialWalletRegistry: '0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036',
  HybridMessenger: '0x67bbFc557D23e2dCEde220d3A9Adce505FB01bF5',
  LoginFactory: '0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8',
} as const;

const IDENTITY_ABI = [
  'function registerProfile(string nickname, uint256 avatarId) external',
  'function updateProfile(string nickname, uint256 avatarId) external',
  'function getProfile(address user) external view returns (string nickname, uint256 avatarId, bool exists)',
  'function profileExists(address user) external view returns (bool)',
  'function getAddressByNickname(string nickname) external view returns (address)',
];

const MESSAGE_STORAGE_ABI = [
  'function sendMessage(address recipient, string text) external',
  'function getConversation(address userA, address userB, uint256 startIndex, uint256 count) view returns (tuple(address sender, address recipient, string text, uint256 timestamp)[], uint256)',
  'function messageCount(address a, address b) view returns (uint256)',
  'event MessageSent(address indexed sender, address indexed recipient, uint256 timestamp)',
  'event ChatDiscovered(address indexed user, address indexed peer)',
];

const LOGIN_FACTORY_ABI = [
  'function getAddress(address admin, bytes calldata data) external view returns (address)',
  'function isRegistered(address account) external view returns (bool)',
  'function getAccountsOfSigner(address signer) external view returns (address[])',
  'function createAccount(address admin, bytes calldata data) external returns (address)',
  'function getAccounts(uint256 start, uint256 end) external view returns (address[])',
  'function getAllAccounts() external view returns (address[])',
  'function entrypoint() external view returns (address)',
  'event AccountCreated(address indexed account, address indexed accountAdmin, bytes data)',
];

export interface LoginResult {
  signerAddress: string;
  smartWalletAddress: string;
  alreadyRegistered: boolean;
}

export class ContractService {
  private signer: Signer | null = null;
  private provider: ethers.providers.Provider | null = null;
  private static instance: ContractService;

  private identityV2Contract: ethers.Contract | null = null;
  private messageStorageContract: ethers.Contract | null = null;
  private loginFactoryContract: ethers.Contract | null = null;

  private constructor() {}

  static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  initialize(provider: ethers.providers.Provider, signer: Signer): void {
    this.provider = provider;
    this.signer = signer;

    this.identityV2Contract = new ethers.Contract(
      CONTRACT_ADDRESSES.IdentityV2,
      IDENTITY_ABI,
      signer
    );

    this.messageStorageContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MessageStorage,
      MESSAGE_STORAGE_ABI,
      signer
    );

    this.loginFactoryContract = new ethers.Contract(
      CONTRACT_ADDRESSES.LoginFactory,
      LOGIN_FACTORY_ABI,
      signer
    );

    console.log('✅ Контракты инициализированы');
  }

  async loginWithFactory(signerAddress: string): Promise<LoginResult> {
    if (!this.loginFactoryContract) {
      throw new Error('LoginFactory не инициализирован');
    }

    const cacheKey = `smart_wallet_${signerAddress.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Смарт-кошелёк из кэша:', cached);
      return { signerAddress, smartWalletAddress: cached, alreadyRegistered: true };
    }

    const factory = this.loginFactoryContract;
    const EMPTY_DATA = '0x';

    let smartWalletAddress: string;
    try {
      smartWalletAddress = await factory.getAddress(signerAddress, EMPTY_DATA);
    } catch (err: any) {
      console.warn('⚠️ LoginFactory.getAddress failed:', err.message);
      localStorage.setItem(cacheKey, signerAddress);
      return { signerAddress, smartWalletAddress: signerAddress, alreadyRegistered: true };
    }

    let alreadyRegistered = false;
    try {
      alreadyRegistered = await factory.isRegistered(smartWalletAddress);
    } catch (err: any) {
      console.warn('⚠️ LoginFactory.isRegistered failed:', err.message);
    }

    if (alreadyRegistered) {
      console.log('✅ Смарт-кошелёк уже зарегистрирован:', smartWalletAddress);
      localStorage.setItem(cacheKey, smartWalletAddress);
      return { signerAddress, smartWalletAddress, alreadyRegistered: true };
    }

    console.log('🔨 Создаём смарт-кошелёк на Polygon…');
    try {
      const tx = await factory.createAccount(signerAddress, EMPTY_DATA);
      const receipt = await tx.wait();
      console.log('✅ Смарт-кошелёк создан:', smartWalletAddress, 'tx:', receipt.transactionHash);
      localStorage.setItem(cacheKey, smartWalletAddress);
    } catch (err: any) {
      console.warn('⚠️ createAccount error:', err.message);
      localStorage.setItem(cacheKey, smartWalletAddress);
    }

    return { signerAddress, smartWalletAddress, alreadyRegistered: false };
  }

  async registerProfile(nickname: string, avatarId: number): Promise<string> {
    if (!this.identityV2Contract) {
      throw new Error('Контракты не инициализированы');
    }

    const tx = await this.identityV2Contract.registerProfile(nickname, avatarId);
    const receipt = await tx.wait();
    console.log('✅ Профиль зарегистрирован:', receipt.transactionHash);
    return receipt.transactionHash;
  }

  async getProfile(address: string): Promise<{ nickname: string; avatarId: number; exists: boolean }> {
    if (!this.identityV2Contract) {
      return { nickname: '', avatarId: 0, exists: false };
    }

    try {
      const profile = await this.identityV2Contract.getProfile(address);
      return {
        nickname: profile[0],
        avatarId: profile[1].toNumber(),
        exists: profile[2],
      };
    } catch (error) {
      return { nickname: '', avatarId: 0, exists: false };
    }
  }

  async discoverChatPeers(myAddress: string): Promise<string[]> {
    if (!this.messageStorageContract || !this.provider) return [];

    const SCAN_BLOCKS_BACK = 50_000;
    const BATCH_SIZE = 10_000;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - SCAN_BLOCKS_BACK);
      const contract = this.messageStorageContract;
      const peers = new Set<string>();
      const myLower = myAddress.toLowerCase();

      for (let from = fromBlock; from < currentBlock; from += BATCH_SIZE) {
        const to = Math.min(from + BATCH_SIZE - 1, currentBlock);

        try {
          const sentFilter = contract.filters.MessageSent(myAddress, null);
          const recvFilter = contract.filters.MessageSent(null, myAddress);

          const [sentEvents, recvEvents] = await Promise.all([
            contract.queryFilter(sentFilter, from, to),
            contract.queryFilter(recvFilter, from, to),
          ]);

          sentEvents.forEach((e: any) => {
            try { peers.add(e.args.recipient.toLowerCase()); } catch (_) {}
          });
          recvEvents.forEach((e: any) => {
            try { peers.add(e.args.sender.toLowerCase()); } catch (_) {}
          });
        } catch (_) {}
      }

      peers.delete(myLower);
      const result = Array.from(peers);
      console.log(`🔍 discoverChatPeers: найдено ${result.length} собеседников`);
      return result;
    } catch (e) {
      console.error('❌ discoverChatPeers:', e);
      return [];
    }
  }
}

export const contractService = ContractService.getInstance();
