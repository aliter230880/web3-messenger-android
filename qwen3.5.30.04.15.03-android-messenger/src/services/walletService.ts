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

const WC_TIMEOUT_MS = 5 * 60 * 1000;

export type WalletType = 'metamask' | 'walletconnect' | 'trust' | 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  walletType: WalletType;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Connection strategy
//  ───────────────────
//  Capacitor Android:
//    MetaMask  → window.location.href = 'metamask://wc?uri=...'
//                Capacitor BridgeWebViewClient.shouldOverrideUrlLoading
//                intercepts custom scheme → bridge.launchIntent(ACTION_VIEW)
//                Android opens MetaMask, WebView stays intact.
//    Trust     → same with 'trust://wc?uri=...'
//    AliTerra  → navigate WebView to wallet.aliterra.space?from=web3gram&return=ORIGIN
//                After unlock, wallet redirects back: ORIGIN?w3g_addr=0x...
//                App.tsx detects and calls connectAliTerra().
//
//  Browser (desktop / web app):
//    MetaMask extension present → window.ethereum
//    No extension              → WC session, URI exposed via onDisplayUri callback
//                                WalletModal renders QR + app-link buttons.
//    Trust / WalletConnect     → same QR flow
//    AliTerra                  → window.open popup + postMessage
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;

  /**
   * Browser-mode QR display hook.
   * WalletModal sets this before calling connect(); the service fires it with
   * the WalletConnect URI so the modal can render a QR code without needing
   * the @walletconnect/modal package.
   */
  public onDisplayUri: ((uri: string) => void) | null = null;

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
    // Desktop browser with MetaMask extension
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
    return this._connectWC('metamask');
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────

  async connectTrust(): Promise<WalletConnection> {
    return this._connectWC('trust');
  }

  // ─── WalletConnect (any) ──────────────────────────────────────────────────

  async connectWalletConnect(): Promise<WalletConnection> {
    return this._connectWC('walletconnect');
  }

  // ─── Unified WC connect ───────────────────────────────────────────────────
  //
  //  Capacitor path: fires metamask:// or trust:// deep link via
  //  window.location.href — intercepted by BridgeWebViewClient → Intent →
  //  wallet app opens, WebView state preserved. Returns on visibilitychange.
  //
  //  Browser path: calls this.onDisplayUri(uri) so WalletModal can show the
  //  WC URI as a QR code + "Open in app" buttons without any extra packages.

  private async _connectWC(
    wallet: 'metamask' | 'trust' | 'walletconnect'
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

    let deepLinkFired = false;

    this.wcProvider.on('display_uri', (uri: string) => {
      if (deepLinkFired) return;
      deepLinkFired = true;

      const encoded = encodeURIComponent(uri);

      if (this.isCapacitor()) {
        // Capacitor: custom scheme → BridgeWebViewClient → Intent → wallet app
        if (wallet === 'metamask') {
          window.location.href = `metamask://wc?uri=${encoded}`;
        } else if (wallet === 'trust') {
          window.location.href = `trust://wc?uri=${encoded}`;
        } else {
          // Generic WC: try MetaMask as default
          window.location.href = `metamask://wc?uri=${encoded}`;
        }
      } else {
        // Browser: hand URI to WalletModal for QR / link display
        this.onDisplayUri?.(uri);
      }
    });

    // Prod WC relay after returning from wallet app (Capacitor)
    const _reconnectOnReturn = () => {
      if (document.hidden || !this.wcProvider) return;
      try {
        const core = this.wcProvider?.signer?.client?.core;
        if (core?.relayer) {
          core.relayer.restartTransport?.();
          core.relayer.transportOpen?.();
          core.relayer.provider?.connection?.open?.();
        }
      } catch (_) {}
    };
    document.addEventListener('visibilitychange', _reconnectOnReturn);

    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Время ожидания 5 мин истекло — попробуйте ещё раз')),
            WC_TIMEOUT_MS
          )
        ),
      ]);
    } finally {
      document.removeEventListener('visibilitychange', _reconnectOnReturn);
      this.onDisplayUri = null;
    }

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

  // ─── AliTerra Wallet ──────────────────────────────────────────────────────
  //
  //  Capacitor: navigate WebView to wallet.aliterra.space (allowed via
  //  allowNavigation config). After unlock, wallet redirects to
  //  ORIGIN?w3g_addr=0x... → App.tsx detects and calls connectAliTerra().
  //
  //  Browser: window.open popup + postMessage {type:'WEB3GRAM_ADDRESS'}.

  openAliTerraWallet(onAddress: (address: string) => void): () => void {
    this._cleanupAliTerraListener();

    const walletUrl = 'https://wallet.aliterra.space/';

    if (this.isCapacitor()) {
      const returnUrl = encodeURIComponent(
        window.location.origin + window.location.pathname
      );
      window.location.href = `${walletUrl}?from=web3gram&return=${returnUrl}`;
      return () => {};
    }

    const listener = (ev: MessageEvent) => {
      if (
        ev.data?.type === 'WEB3GRAM_ADDRESS' &&
        typeof ev.data?.address === 'string' &&
        ev.data.address.startsWith('0x')
      ) {
        this._cleanupAliTerraListener();
        onAddress(ev.data.address);
      }
    };

    this._aliTerraListener = listener;
    window.addEventListener('message', listener);

    const url = `${walletUrl}?from=web3gram`;
    const w = window.open(url, 'aliterra_wallet', 'width=440,height=680,noopener=false');
    if (!w) window.open(url, '_blank');

    return () => this._cleanupAliTerraListener();
  }

  // Read-only connection (AliTerra / restored session)
  createReadOnlyConnection(address: string): WalletConnection {
    return { provider: null, signer: null, address, walletType: 'aliterra', readOnly: true };
  }

  // ─── Disconnect / Cancel ──────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this._cleanupAliTerraListener();
    await this._cleanupWC();
    this.onDisplayUri = null;
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    this._cleanupAliTerraListener();
    await this._cleanupWC();
    this.onDisplayUri = null;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private _cleanupAliTerraListener(): void {
    if (this._aliTerraListener) {
      window.removeEventListener('message', this._aliTerraListener);
      this._aliTerraListener = null;
    }
  }

  private async _cleanupWC(): Promise<void> {
    if (this.wcProvider) {
      try { await this.wcProvider.disconnect(); } catch (_) {}
      this.wcProvider = null;
    }
  }

  private async _switchToPolygon(provider: ethers.providers.Web3Provider): Promise<void> {
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
