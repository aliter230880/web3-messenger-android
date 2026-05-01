import { ethers } from 'ethers';

const POLYGON_CHAIN_ID = 137;
const POLYGON_PARAMS = {
  chainId: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

const WC_PROJECT_ID =
  (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID ||
  '2f05ae7f1116030fde2d36508f472bfb';

export type WalletType = 'metamask' | 'walletconnect';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  }

  hasMetaMask(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).ethereum);
  }

  async connectMetaMask(): Promise<WalletConnection> {
    const win = window as any;

    if (!win.ethereum) {
      const dappUrl = encodeURIComponent(
        `${window.location.host}${window.location.pathname}`
      );
      window.open(`https://metamask.app.link/dapp/${dappUrl}`, '_blank');
      throw new Error('Откройте это приложение в браузере MetaMask');
    }

    const provider = new ethers.providers.Web3Provider(win.ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = 'metamask';
    return { provider, signer, address, walletType: 'metamask' };
  }

  async connectWalletConnect(): Promise<WalletConnection> {
    const { default: EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    if (this.wcProvider) {
      try {
        await this.wcProvider.disconnect();
      } catch (_) {}
      this.wcProvider = null;
    }

    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'light',
        explorerRecommendedWalletIds: [
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        ],
      },
      metadata: {
        name: 'Web3 Messenger',
        description: 'Децентрализованный мессенджер на Polygon',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    await this.wcProvider.connect();

    const provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = 'walletconnect';

    this.wcProvider.on('disconnect', () => {
      this.wcProvider = null;
      this.activeWalletType = null;
    });

    return { provider, signer, address, walletType: 'walletconnect' };
  }

  async disconnect(): Promise<void> {
    if (this.wcProvider && this.activeWalletType === 'walletconnect') {
      try {
        await this.wcProvider.disconnect();
      } catch (_) {}
      this.wcProvider = null;
    }
    this.activeWalletType = null;
  }

  private async _switchToPolygon(
    provider: ethers.providers.Web3Provider
  ): Promise<void> {
    const network = await provider.getNetwork();
    if (network.chainId === POLYGON_CHAIN_ID) return;

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: '0x89' },
      ]);
    } catch (err: any) {
      if (err.code === 4902 || err?.data?.originalError?.code === 4902) {
        await provider.send('wallet_addEthereumChain', [POLYGON_PARAMS]);
      } else {
        throw new Error('Переключитесь на Polygon Mainnet в кошельке');
      }
    }
  }
}

export const walletService = new WalletService();
