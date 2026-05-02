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
  (import.meta as any).env?.VITE_APP_URL || 'https://chat.aliterra.space';

export type WalletType = 'metamask' | 'walletconnect' | 'trust';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

// 5 minutes — enough for: init(3s) + modal open + switch to wallet app +
// navigate to scanner + approve + return to APK.
const WC_TIMEOUT_MS = 5 * 60 * 1000;

// ────────────────────────────────────────────────────────────────────────────
//
//  Wallet connection strategy
//  ==========================
//
//  MetaMask / Trust Wallet  →  WalletConnect QR modal (showQrModal: true).
//    The WC modal shows:
//      • A QR code the user scans from the wallet's built-in scanner.
//      • "Open MetaMask" / "Open Trust Wallet" deep-link buttons managed
//        by the WC library itself (correct platform-specific scheme).
//    This is the only reliable approach for Capacitor WebViews.
//    Custom deep links via window.location.href / window.open('_system')
//    break on Capacitor because '_system' is Cordova-only, and custom
//    scheme navigation either kills the WebView or opens a browser.
//
//  AliTerra Wallet  →  opens wallet.aliterra.space externally.
//    wallet.aliterra.space has a built-in QR scanner (html5-qrcode).
//    After tapping this button the user:
//      1. Comes back to Web3Gram and taps "WalletConnect QR".
//      2. Scans the displayed QR from wallet.aliterra.space's scanner.
//    (Full WC wallet-side SDK is needed on wallet.aliterra.space for this
//    to establish a session — see openInWalletBrowser() notes.)
//
// ────────────────────────────────────────────────────────────────────────────

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

  // Opens wallet.aliterra.space in a new window/tab.
  // The user can then use its QR scanner to scan the WC QR shown in Web3Gram.
  openAliTerraWallet(): void {
    const url = 'https://wallet.aliterra.space';
    const w = window.open(url, '_blank');
    if (!w) window.location.href = url;
  }

  // ─── MetaMask ─────────────────────────────────────────────────────────────
  // Desktop: MetaMask browser extension.
  // Mobile/Capacitor: WC QR modal (the modal's built-in buttons handle deep links
  // to MetaMask on both Android and iOS correctly).

  async connectMetaMask(): Promise<WalletConnection> {
    // Desktop with extension
    if (!this.isCapacitor() && this.hasMetaMask()) {
      const win = window as any;
      const provider = new ethers.providers.Web3Provider(win.ethereum, 'any');
      await provider.send('eth_requestAccounts', []);
      await this._switchToPolygon(provider);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      this.activeWalletType = 'metamask';
      return { provider, signer, address, walletType: 'metamask' };
    }
    // Mobile/no-extension: fall through to WC QR
    return this.connectWalletConnect();
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────
  async connectTrust(): Promise<WalletConnection> {
    return this.connectWalletConnect();
  }

  // ─── WalletConnect QR modal ───────────────────────────────────────────────
  // Works for ALL wallets that support WalletConnect v2 scanning
  // (MetaMask, Trust, Rainbow, Zerion, Coinbase Wallet, …)

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
        // Show MetaMask and Trust Wallet as recommended options in the modal
        explorerRecommendedWalletIds: [
          // MetaMask
          'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          // Trust Wallet
          '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
        ],
        explorerExcludedWalletIds: 'ALL' as any,
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
          () => reject(new Error('Превышено время ожидания. Попробуйте ещё раз.')),
          WC_TIMEOUT_MS
        )
      ),
    ]);

    const provider = new ethers.providers.Web3Provider(
      this.wcProvider as any,
      'any'
    );
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

  // ─── Disconnect / Cancel ──────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    await this._cleanupWC();
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
