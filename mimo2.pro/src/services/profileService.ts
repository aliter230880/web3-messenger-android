// Profile Service - On-chain профили через LoginFactory
import { ethers } from 'ethers';

// LoginFactory ABI (упрощённый)
const LOGIN_FACTORY_ABI = [
  'function createLogin(string memory provider, string memory socialId, string memory username) external returns (address)',
  'function getLogin(address user) external view returns (string memory provider, string memory socialId, string memory username, address wallet)',
  'function hasLogin(address user) external view returns (bool)',
  'function updateUsername(address user, string memory username) external',
  'event LoginCreated(address indexed user, string provider, string socialId, address wallet, string username)',
  'event UsernameUpdated(address indexed user, string username)',
];

// Контракты Polygon
const LOGIN_FACTORY_ADDRESS = '0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8';

export interface UserProfile {
  address: string;
  username: string;
  provider: string;
  socialId: string;
  wallet: string;
  exists: boolean;
}

class ProfileService {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  // Инициализация с RPC (только чтение)
  initReadOnly() {
    if (!this.provider) {
      this.provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
      this.contract = new ethers.Contract(LOGIN_FACTORY_ADDRESS, LOGIN_FACTORY_ABI, this.provider);
    }
  }

  // Инициализация с signer (для записи)
  initWithSigner(signer: ethers.Signer) {
    this.signer = signer;
    this.provider = signer.provider as ethers.providers.JsonRpcProvider;
    this.contract = new ethers.Contract(LOGIN_FACTORY_ADDRESS, LOGIN_FACTORY_ABI, signer);
  }

  // Проверка есть ли профиль (бесплатно - только чтение)
  async hasProfile(address: string): Promise<boolean> {
    this.initReadOnly();
    try {
      return await this.contract!.hasLogin(address);
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  }

  // Получение профиля (бесплатно - только чтение)
  async getProfile(address: string): Promise<UserProfile | null> {
    this.initReadOnly();
    try {
      const [provider, socialId, username, wallet] = await this.contract!.getLogin(address);
      
      if (!provider && !username) {
        return null;
      }

      return {
        address,
        username: username || '',
        provider: provider || '',
        socialId: socialId || '',
        wallet: wallet || address,
        exists: true,
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  // Создание профиля (требуется gas)
  async createProfile(username: string, provider: string = 'wallet', socialId: string = ''): Promise<string | null> {
    if (!this.signer) {
      throw new Error('Signer required for creating profile');
    }

    try {
      const address = await this.signer.getAddress();
      
      // Проверяем есть ли уже профиль
      const exists = await this.hasProfile(address);
      if (exists) {
        console.log('Profile already exists');
        return null;
      }

      // Создаём логин
      const contract = new ethers.Contract(LOGIN_FACTORY_ADDRESS, LOGIN_FACTORY_ABI, this.signer);
      const tx = await contract.createLogin(provider, socialId || address, username);
      
      console.log('Creating profile, tx:', tx.hash);
      const receipt = await tx.wait();
      console.log('Profile created, receipt:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (error: any) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  // Обновление имени (требуется gas)
  async updateUsername(username: string): Promise<string | null> {
    if (!this.signer) {
      throw new Error('Signer required for updating profile');
    }

    try {
      const address = await this.signer.getAddress();
      const contract = new ethers.Contract(LOGIN_FACTORY_ADDRESS, LOGIN_FACTORY_ABI, this.signer);
      
      const tx = await contract.updateUsername(address, username);
      console.log('Updating username, tx:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Username updated, receipt:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (error: any) {
      console.error('Error updating username:', error);
      throw error;
    }
  }

  // Оценка газа для создания профиля
  async estimateCreateGas(username: string): Promise<string> {
    if (!this.signer) return '0';
    
    try {
      const address = await this.signer.getAddress();
      const contract = new ethers.Contract(LOGIN_FACTORY_ADDRESS, LOGIN_FACTORY_ABI, this.signer);
      
      const gasEstimate = await contract.estimateGas.createLogin('wallet', address, username);
      const gasPrice = await this.provider!.getGasPrice();
      
      const cost = gasEstimate.mul(gasPrice);
      return ethers.utils.formatEther(cost);
    } catch (error) {
      console.error('Error estimating gas:', error);
      return '~0.001 MATIC';
    }
  }

  // Подписка на события создания профиля
  async onCreateProfile(callback: (user: string, username: string) => void): Promise<() => void> {
    this.initReadOnly();
    
    const filter = this.contract!.filters.LoginCreated();
    
    const handler = (user: string, _provider: string, _socialId: string, _wallet: string, username: string) => {
      callback(user, username);
    };
    
    this.contract!.on(filter, handler);
    
    return () => {
      this.contract!.off(filter, handler);
    };
  }
}

export const profileService = new ProfileService();
