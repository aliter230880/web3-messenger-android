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
export type WalletBrowserTarget = 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: WalletType;
}

// WC connection timeout in ms — 90 s gives enough time for user to approve.
const WC_CONNECT_TIMEOUT = 90_000;

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

  // ─── Open AliTerra wallet in browser (instant, no WC needed) ──────────────
  openInWalletBrowser(_target: WalletBrowserTarget): void {
    const url = 'https://wallet.aliterra.space';
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url;
  }

  // ─── MetaMask ─────────────────────────────────────────────────────────────
  // Capacitor (APK): WalletConnect deep-link via MetaMask universal link.
  //   window.open(url, '_system') fires Android Intent ACTION_VIEW which opens
  //   MetaMask via App-Links WITHOUT navigating the Capacitor WebView — the
  //   React app stays alive, the WC session promise keeps running.
  // Desktop: MetaMask browser extension.

  async connectMetaMask(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileWC('metamask');
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
  // Capacitor: WalletConnect deep-link via Trust universal link.
  // Desktop: WC QR modal.

  async connectTrust(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileWC('trust');
    }
    return this.connectWalletConnect();
  }

  // ─── WalletConnect QR (cross-device / desktop) ────────────────────────────
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
          WC_CONNECT_TIMEOUT
        )
      ),
    ]);

    return this._finishWC();
  }

  async disconnect(): Promise<void> {
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  // Cancel an in-progress connect — exposed for modal "Cancel" button.
  async cancelConnect(): Promise<void> {
    await this._cleanupWC();
  }

  // ─── Mobile WalletConnect deep-link ───────────────────────────────────────
  //
  // How it works (Capacitor + Android):
  //  1. EthereumProvider.init() creates a WC session on the relay.
  //  2. 'display_uri' fires with the wc: URI.
  //  3. We build an HTTPS universal link (metamask.app.link / link.trustwallet.com)
  //     and call window.open(url, '_system').
  //  4. Capacitor's BridgeWebViewClient sees '_system' and calls
  //     startActivity(Intent.ACTION_VIEW, url).
  //  5. Android resolves the App-Link → opens MetaMask / Trust Wallet.
  //  6. The wallet shows a "Connect to Web3Gram" screen.
  //  7. User approves → wallet sends WC session approval to the relay.
  //  8. wcProvider.connect() promise resolves in the STILL-RUNNING React app.
  //  9. APK shows "Connected" with the wallet address.
  //
  // The WebView is NEVER navigated away — only an Intent is fired externally.

  private async _connectMobileWC(
    wallet: 'metamask' | 'trust'
  ): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false, // we handle deep-link ourselves
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger on Polygon',
        url: APP_URL,
        icons: [`${APP_URL}/favicon.ico`],
      },
    });

    let deepLinkFired = false;

    this.wcProvider.on('display_uri', (uri: string) => {
      if (deepLinkFired) return; // fire only once
      deepLinkFired = true;

      const encoded = encodeURIComponent(uri);
      const universalLink =
        wallet === 'metamask'
          ? `https://metamask.app.link/wc?uri=${encoded}`
          : `https://link.trustwallet.com/wc?uri=${encoded}`;

      // '_system' = Capacitor fires Intent.ACTION_VIEW (App-Links aware).
      // This opens MetaMask/Trust WITHOUT navigating the WebView.
      const opened = window.open(universalLink, '_system');

      if (!opened) {
        // Fallback: anchor-click approach (also doesn't navigate current page)
        const a = document.createElement('a');
        a.href = universalLink;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 500);
      }
    });

    await Promise.race([
      this.wcProvider.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Время ожидания истекло. Откройте кошелёк и подтвердите подключение, затем попробуйте снова.')),
          WC_CONNECT_TIMEOUT
        )
      ),
    ]);

    return this._finishWC();
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async _finishWC(): Promise<WalletConnection> {
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
