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
  '2de1d724533083c2ed68197548dead4e';

const APP_URL =
  (import.meta as any).env?.VITE_APP_URL ||
  'https://chat.aliterra.space';

export type WalletType = 'metamask' | 'walletconnect' | 'trust';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

// How long to wait for WalletConnect session establishment.
// Mobile deep-link flow: user must switch to wallet app and approve — give 3 min.
const WC_TIMEOUT_MS = 180_000;

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;

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
  //
  // Desktop: use browser extension (window.ethereum).
  // Capacitor/mobile: use WalletConnect deep-link to MetaMask app.

  async connectMetaMask(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileWallet('metamask');
    }

    if (!this.hasMetaMask()) {
      return this.connectWalletConnect();
    }

    const win = window as any;
    const provider = new ethers.providers.Web3Provider(win.ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = 'metamask';
    return { provider, signer, address, walletType: 'metamask' };
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────

  async connectTrust(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileWallet('trust');
    }
    return this.connectWalletConnect();
  }

  // ─── Mobile WalletConnect deep-link ───────────────────────────────────────
  //
  // For Capacitor APK: generates a WalletConnect URI and fires it as a
  // custom-scheme Intent to the wallet app.  The wallet shows an "Approve"
  // screen.  After the user approves, the WC relay delivers the session back
  // to the WebView, which is still alive in the background.
  //
  //   metamask://wc?uri=<encoded>  →  MetaMask
  //   trust://wc?uri=<encoded>     →  Trust Wallet
  //
  // Capacitor's BridgeWebViewClient.shouldOverrideUrlLoading() intercepts
  // custom schemes, fires startActivity(Intent), and returns true — so the
  // WebView does NOT navigate away.  The WC Promise stays alive.

  private async _connectMobileWallet(
    wallet: 'metamask' | 'trust'
  ): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false,
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger on Polygon',
        url: APP_URL,
        icons: [`${APP_URL}/favicon.ico`],
      },
    });

    this.wcProvider.on('display_uri', (uri: string) => {
      const encoded = encodeURIComponent(uri);
      const deepLink =
        wallet === 'metamask'
          ? `metamask://wc?uri=${encoded}`
          : `trust://wc?uri=${encoded}`;
      // In Capacitor this fires an Android Intent — the WebView stays mounted.
      window.location.href = deepLink;
    });

    await Promise.race([
      this.wcProvider.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Тайм-аут. Откройте кошелёк и попробуйте снова.')),
          WC_TIMEOUT_MS
        )
      ),
    ]);

    return this._finalizeWC();
  }

  // ─── WalletConnect QR modal (web / cross-device) ──────────────────────────
  //
  // Shows a QR code inside the WebView.  Works best on desktop or when the
  // user wants to scan from a different device.

  async connectWalletConnect(): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
        explorerRecommendedWalletIds: [
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        ],
      },
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger on Polygon',
        url: APP_URL,
        icons: [`${APP_URL}/favicon.ico`],
      },
    });

    await Promise.race([
      this.wcProvider.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Тайм-аут: закройте и попробуйте ещё раз')),
          WC_TIMEOUT_MS
        )
      ),
    ]);

    return this._finalizeWC();
  }

  // ─── Disconnect ───────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async _finalizeWC(): Promise<WalletConnection> {
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

  private async _cleanupWC(): Promise<void> {
    if (this.wcProvider) {
      try { await this.wcProvider.disconnect(); } catch (_) {}
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
