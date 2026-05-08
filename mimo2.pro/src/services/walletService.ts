// Wallet Service - ПРАВИЛЬНАЯ реализация с EthereumProvider
import { ethers } from 'ethers';

const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';
const POLYGON_CHAIN_ID = 137;

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: string;
}

class WalletService {
  private wcProvider: any = null;
  private sessionTopic: string | null = null;
  private onDisplayUri: ((uri: string) => void) | null = null;
  private forceResolve: (() => void) | null = null;
  private aborted = false;

  // Установить callback для QR URI
  setDisplayUriCallback(callback: (uri: string) => void) {
    this.onDisplayUri = callback;
  }

  // Платформа
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  // Открыть URL
  openUrl(url: string): void {
    if (this.isCapacitor()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  }

  // Подключение через window.ethereum (MetaMask extension / Trust Wallet Browser)
  async connectDirect(): Promise<WalletConnection> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('No wallet found');

    // Запрашиваем аккаунты
    await ethereum.request({ method: 'eth_requestAccounts' });

    // Переключаемся на Polygon
    await this.switchToPolygon(ethereum);

    const provider = new ethers.providers.Web3Provider(ethereum, 'any');
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    return {
      provider,
      signer,
      address,
      walletType: ethereum.isMetaMask ? 'metamask' : 'trustwallet',
    };
  }

  // Подключение через WalletConnect (EthereumProvider - быстрее!)
  async connectWalletConnect(walletType: string): Promise<WalletConnection> {
    this.aborted = false;

    // Динамический импорт EthereumProvider (не SignClient!)
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    // Инициализируем - аккаунты кэшируются локально
    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false, // Своя модалка
      metadata: {
        name: 'Web3Gram',
        description: 'Secure Web3 Messenger',
        url: window.location.origin,
        icons: ['https://chat.aliterra.space/icon.png'],
      },
    });

    // Слушаем URI для QR/deep link
    this.wcProvider.on('display_uri', (uri: string) => {
      if (this.onDisplayUri) this.onDisplayUri(uri);
      // Открываем deep link на mobile
      if (this.isMobile()) {
        this.openDeepLink(uri, walletType);
      }
    });

    // 3 слоя ожидания сессии (из CONTEXT.md)
    const sessionPromise = new Promise<void>((resolve, reject) => {
      this.forceResolve = resolve;

      // Слой 1: connect() promise
      this.wcProvider.connect().then(() => resolve()).catch(reject);

      // Слой 2a: SDK 'connect' event
      this.wcProvider.on('connect', () => resolve());

      // Слой 2b: session_update event
      this.wcProvider.on('session_update', () => {
        if (this.wcProvider.session) resolve();
      });

      // Таймаут: 5 минут
      setTimeout(() => reject(new Error('Timeout')), 300000);
    });

    // Слой 3: visibilitychange handler (возврат из MetaMask)
    const handleVisibility = async () => {
      if (!document.hidden && this.wcProvider) {
        await this.reconnectRelay();
        await new Promise(r => setTimeout(r, 2000));
        if (this.wcProvider.session && this.forceResolve) {
          this.forceResolve();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    try {
      await sessionPromise;
    } finally {
      document.removeEventListener('visibilitychange', handleVisibility);
    }

    // Получаем аккаунты из сессии (кэшированы локально!)
    const accounts = this.wcProvider.accounts;
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts in session');
    }

    const address = accounts[0];
    this.sessionTopic = this.wcProvider.session?.topic;

    // Создаём provider
    const provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');

    return {
      provider,
      signer: provider.getSigner(),
      address,
      walletType,
    };
  }

  // Deep link для mobile
  private openDeepLink(uri: string, walletType: string): void {
    const encoded = encodeURIComponent(uri);
    let url: string;

    switch (walletType) {
      case 'metamask':
        url = `metamask://wc?uri=${encoded}`;
        break;
      case 'trustwallet':
        url = `trust://wc?uri=${encoded}`;
        break;
      default:
        url = `wc:${uri}`;
    }

    this.openUrl(url);
  }

  // Переподключение relay после возврата из кошелька
  private async reconnectRelay(): Promise<void> {
    if (!this.wcProvider) return;

    try {
      const relayer = this.wcProvider.signer?.client?.relayer;
      if (relayer?.restartTransport) {
        await relayer.restartTransport();
      } else if (relayer?.transportClose && relayer?.transportOpen) {
        await relayer.transportClose();
        await relayer.transportOpen();
      }
    } catch (e) {
      console.warn('Relay reconnect failed:', e);
    }
  }

  // Переключение на Polygon
  private async switchToPolygon(ethereum: any): Promise<void> {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com'],
          }],
        });
      }
    }
  }

  // Очистка WC состояния (для retry)
  async clearWCStorage(): Promise<void> {
    try {
      // Удаляем IndexedDB
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name?.includes('WALLET_CONNECT') || db.name?.includes('wc@2')) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Удаляем localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('wc@2') || key?.startsWith('WALLET_CONNECT')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Clear WC storage failed:', e);
    }
  }

  // Force resolve session (для кнопки "Я подтвердил")
  forceResolveSession(): void {
    if (this.forceResolve) {
      this.forceResolve();
    }
  }

  // Отключение
  async disconnect(): Promise<void> {
    this.aborted = true;

    if (this.wcProvider) {
      try {
        if (this.sessionTopic) {
          await this.wcProvider.disconnect();
        }
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
      this.wcProvider = null;
      this.sessionTopic = null;
    }
  }
}

export const walletService = new WalletService();
