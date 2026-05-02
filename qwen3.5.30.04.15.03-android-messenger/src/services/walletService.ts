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

// The DApp URL that opens inside wallet browsers.
// wallet.aliterra.space — the user's own AliTerra Wallet interface.
const DAPP_WALLET_URL = 'wallet.aliterra.space';

export type WalletType = 'metamask' | 'walletconnect' | 'trust';
export type WalletBrowserTarget = 'metamask' | 'trust' | 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

// ─── Wallet DApp browser URLs ──────────────────────────────────────────────
//
// MetaMask universal link: opens MetaMask, then loads DAPP_WALLET_URL inside
// MetaMask's built-in DApp browser.  window.ethereum is injected there.
//
// Trust Wallet: Android Intent URI → fires com.wallet.crypto.trustapp directly,
// bypasses system browser, opens Trust's DApp browser.
//
// Aliterra: direct HTTPS link to the custom wallet interface.

export const WALLET_BROWSER_URLS: Record<WalletBrowserTarget, string> = {
  metamask: `https://metamask.app.link/dapp/${DAPP_WALLET_URL}`,
  trust: [
    'intent://browser_enable',
    `?url=https%3A%2F%2F${DAPP_WALLET_URL}`,
    '#Intent',
    ';scheme=trust',
    ';package=com.wallet.crypto.trustapp',
    `;S.browser_fallback_url=https%3A%2F%2F${DAPP_WALLET_URL}`,
    ';end',
  ].join(''),
  aliterra: `https://${DAPP_WALLET_URL}`,
};

// WalletConnect session timeout — 30 s is enough to show a QR and connect.
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

  // ─── Open wallet's built-in browser (instant, non-blocking) ───────────────
  //
  // This does NOT create a WalletConnect session in the APK.
  // The user lands inside the wallet's DApp browser where window.ethereum is
  // already injected, so wallet connection happens natively on that page.
  //
  // Trust Wallet: Android Intent URI must use window.location.href so Capacitor's
  // shouldOverrideUrlLoading intercepts it and fires the Intent without navigating.
  // MetaMask / Aliterra: window.open / window.location.href both work.

  openInWalletBrowser(target: WalletBrowserTarget): void {
    const url = WALLET_BROWSER_URLS[target];
    if (!url) return;
    if (url.startsWith('intent://')) {
      // Capacitor intercepts custom schemes via shouldOverrideUrlLoading,
      // fires the Android Intent, and does NOT navigate the WebView away.
      window.location.href = url;
      return;
    }
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url;
  }

  // ─── MetaMask extension (desktop only) ────────────────────────────────────

  async connectMetaMask(): Promise<WalletConnection> {
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

  // ─── WalletConnect QR modal ───────────────────────────────────────────────
  //
  // Shows a QR code.  Best used for cross-device scanning:
  //   desktop APK/web ← QR ← phone wallet.
  // On mobile, the WC modal also shows wallet app deep-link buttons.

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
          () => reject(new Error('Время вышло. Попробуйте ещё раз.')),
          WC_TIMEOUT_MS
        )
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

  async connectTrust(): Promise<WalletConnection> {
    return this.connectWalletConnect();
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
