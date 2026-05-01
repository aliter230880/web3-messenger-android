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

// Universal links for wallets — open the app on Android/iOS
const WALLET_DEEP_LINKS: Record<string, (uri: string) => string> = {
  metamask: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
  trust: (uri) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
};

export type WalletType = 'metamask' | 'walletconnect' | 'trust';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;

  /** True when running inside a Capacitor (APK) WebView */
  isCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  }

  hasMetaMask(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).ethereum);
  }

  // ─── MetaMask ─────────────────────────────────────────────────────────────

  async connectMetaMask(): Promise<WalletConnection> {
    // In Capacitor WebView there is no window.ethereum.
    // Use WalletConnect deep-link to open MetaMask mobile app.
    if (this.isCapacitor() || !this.hasMetaMask()) {
      return this.connectViaDeepLink('metamask');
    }

    // Desktop: browser extension path
    const win = window as any;
    const provider = new ethers.providers.Web3Provider(win.ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = 'metamask';
    return { provider, signer, address, walletType: 'metamask' };
  }

  // ─── WalletConnect deep-link (MetaMask / Trust in Capacitor) ──────────────
  //
  // Flow:
  //  1. Init WalletConnect WITHOUT showing the QR modal
  //  2. Listen for `display_uri` → open the specific wallet app via universal link
  //  3. User approves in the wallet app → enable() promise resolves
  //  4. Return the connection

  async connectViaDeepLink(wallet: 'metamask' | 'trust'): Promise<WalletConnection> {
    const { default: EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    await this._cleanupWC();

    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false, // we open the wallet ourselves
      metadata: {
        name: 'Web2Gram',
        description: 'Decentralized Messenger on Polygon',
        url: 'https://web2gram.app',
        icons: [],
      },
    });

    // Open the wallet app as soon as the WC URI is ready
    this.wcProvider.once('display_uri', (uri: string) => {
      const link = WALLET_DEEP_LINKS[wallet]?.(uri);
      if (!link) return;
      // Use _blank so Capacitor/system opens the target app
      // without navigating the WebView away
      const opened = window.open(link, '_blank');
      if (!opened) {
        // Fallback: set location (works in some WebView versions)
        window.location.href = link;
      }
    });

    // enable() starts the session handshake and resolves when user approves
    await this.wcProvider.enable();

    const provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = wallet;

    this.wcProvider.on('disconnect', () => {
      this.wcProvider = null;
      this.activeWalletType = null;
    });

    return { provider, signer, address, walletType: wallet };
  }

  // ─── WalletConnect QR modal (browser / desktop) ───────────────────────────

  async connectWalletConnect(): Promise<WalletConnection> {
    const { default: EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    await this._cleanupWC();

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
        name: 'Web2Gram',
        description: 'Decentralized Messenger on Polygon',
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

  // ─── Disconnect ───────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async _cleanupWC(): Promise<void> {
    if (this.wcProvider) {
      try {
        await this.wcProvider.disconnect();
      } catch (_) {}
      this.wcProvider = null;
    }
  }

  private async _switchToPolygon(
    provider: ethers.providers.Web3Provider
  ): Promise<void> {
    const network = await provider.getNetwork();
    if (network.chainId === POLYGON_CHAIN_ID) return;

    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }]);
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
