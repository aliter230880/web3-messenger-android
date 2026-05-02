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

// Real domain for WalletConnect metadata — wallets reject "https://localhost"
// chat.aliterra.space runs on Nginx (no auto-deploy from GH),
// so we use GitHub Pages which always reflects the repo state immediately.
const APP_URL =
  (import.meta as any).env?.VITE_APP_URL ||
  'https://chat.aliterra.space';

// /app/ landing page lives on GitHub Pages (200 OK, verified)
const APP_PAGES_URL = 'https://aliter230880.github.io/web3-messenger';

export type WalletType = 'metamask' | 'walletconnect' | 'trust';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

// Open the dApp inside each wallet's built-in DApp browser.
// Inside their browser window.ethereum is injected natively.
//
// MetaMask: metamask.app.link/dapp/<host> — universal link, opens DApp browser.
// Trust Wallet: Android Intent URI with scheme=trust — fires an Android Intent
//   directly to com.wallet.crypto.trustapp, bypassing the system browser entirely.
//   The browser_fallback_url opens trustwallet.com if app not installed.
export const WALLET_BROWSER_URLS: Record<string, string> = {
  metamask: `https://metamask.app.link/dapp/chat.aliterra.space`,
  trust: [
    'intent://browser_enable',
    '?url=https%3A%2F%2Fchat.aliterra.space',
    '#Intent',
    ';scheme=trust',
    ';package=com.wallet.crypto.trustapp',
    ';S.browser_fallback_url=https%3A%2F%2Ftrustwalletapp.com',
    ';end',
  ].join(''),
};

const WC_TIMEOUT_MS = 30_000;

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

  async connectMetaMask(): Promise<WalletConnection> {
    // In Capacitor there is no window.ethereum — WalletConnect QR is the
    // correct way to connect MetaMask Mobile (user scans QR from MetaMask).
    if (this.isCapacitor() || !this.hasMetaMask()) {
      return this.connectWalletConnect();
    }

    // Desktop: use browser extension
    const win = window as any;
    const provider = new ethers.providers.Web3Provider(win.ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    await this._switchToPolygon(provider);

    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = 'metamask';
    return { provider, signer, address, walletType: 'metamask' };
  }

  // ─── WalletConnect QR modal ───────────────────────────────────────────────
  //
  // This works for ALL mobile wallets (MetaMask Mobile, Trust, etc.):
  //  1. QR modal opens inside the WebView
  //  2. User opens their wallet app → Scanner → scans the QR code
  //  3. Wallet app establishes the WC session
  //  4. Provider resolves, app is connected
  //
  // KEY FIX: metadata.url must be a real HTTPS domain, not "https://localhost".
  // Wallets silently reject sessions originating from localhost.

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
        themeMode: 'dark',
        explorerRecommendedWalletIds: [
          // MetaMask
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          // Trust Wallet
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        ],
      },
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger on Polygon',
        // Must be a real domain — wallets reject localhost
        url: APP_URL,
        icons: [`${APP_URL}/favicon.ico`],
      },
    });

    // Timeout prevents infinite hang if user closes modal / connection fails
    await Promise.race([
      this.wcProvider.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: закройте и попробуйте ещё раз')), WC_TIMEOUT_MS)
      ),
    ]);

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

  // Trust Wallet also uses WalletConnect QR in mobile context
  async connectTrust(): Promise<WalletConnection> {
    return this.connectWalletConnect();
  }

  // ─── Open wallet's built-in browser ──────────────────────────────────────
  //
  // Opens the dApp URL in MetaMask / Trust Wallet's built-in browser.
  // Inside their browser window.ethereum is injected, so normal connection works.

  openInWalletBrowser(wallet: 'metamask' | 'trust'): void {
    const url = WALLET_BROWSER_URLS[wallet];
    if (!url) return;
    // Android Intent URIs must use location.href — window.open won't fire the Intent.
    // For https:// universal links, window.open is fine (opens external browser/app).
    if (url.startsWith('intent://')) {
      window.location.href = url;
      return;
    }
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url;
  }

  // ─── Disconnect ───────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

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
