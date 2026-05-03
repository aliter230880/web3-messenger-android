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

// Init timeout — if relay doesn't respond, give up fast
const WC_INIT_TIMEOUT_MS = 15_000;
// Session approval timeout — 5 minutes
const WC_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export type WalletType = 'metamask' | 'walletconnect' | 'trust' | 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  walletType: WalletType;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Core fix:
//  We NEVER use window.location.href for deep links — that navigates the
//  Capacitor WebView away from the app, destroying the WC connect() promise.
//
//  Instead: always fire onDisplayUri with the WC URI, and let the modal
//  show a QR code + "Open in MetaMask" button that uses window.open('_blank').
//  window.open with _blank triggers the Android intent without page navigation.
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;

  /**
   * Called as soon as WalletConnect generates a pairing URI.
   * WalletModal sets this before calling connect(); the service fires it with
   * the URI. Modal shows QR + deep-link buttons.
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

  // ─── Open wallet deep-link WITHOUT navigating the page ────────────────────
  //   window.open('_blank') triggers Android intent on Capacitor WebView and
  //   keeps the current page (and WC session) alive.
  openDeepLink(uri: string, wallet: 'metamask' | 'trust' | 'walletconnect') {
    const encoded = encodeURIComponent(uri);
    let deepLinkUrl: string;

    if (wallet === 'metamask') {
      deepLinkUrl = `metamask://wc?uri=${encoded}`;
    } else if (wallet === 'trust') {
      deepLinkUrl = `trust://wc?uri=${encoded}`;
    } else {
      // Generic WalletConnect universal link (opens any installed wallet)
      deepLinkUrl = `wc:${uri.split('wc:')[1] || ''}`;
    }

    // Use window.open with _blank — does NOT navigate the current page
    // On Android this triggers the intent system → opens the wallet app
    const opened = window.open(deepLinkUrl, '_blank');
    if (!opened) {
      // Fallback: create a hidden link and click it
      const a = document.createElement('a');
      a.href = deepLinkUrl;
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // ─── MetaMask ─────────────────────────────────────────────────────────────

  async connectMetaMask(): Promise<WalletConnection> {
    // Browser with MetaMask extension — use it directly
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
    // No extension (mobile browser or Capacitor) — use WalletConnect
    return this._connectWC('metamask');
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────

  async connectTrust(): Promise<WalletConnection> {
    return this._connectWC('trust');
  }

  // ─── WalletConnect (generic) ──────────────────────────────────────────────

  async connectWalletConnect(): Promise<WalletConnection> {
    return this._connectWC('walletconnect');
  }

  // ─── Unified WC connect ───────────────────────────────────────────────────
  //
  //  Critical design rules:
  //  1. ALWAYS fire onDisplayUri — never use window.location.href for deep links
  //  2. EthereumProvider.init() with 15s timeout
  //  3. Register display_uri BEFORE calling connect()
  //  4. Add visibilitychange relay-reconnect for Capacitor background/foreground

  private async _connectWC(
    wallet: 'metamask' | 'trust' | 'walletconnect'
  ): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    // ── Step 1: init() with timeout ──────────────────────────────────────────
    const initPromise = EthereumProvider.init({
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

    const initTimeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'WalletConnect не отвечает (15 сек). Проверьте интернет и попробуйте снова.'
            )
          ),
        WC_INIT_TIMEOUT_MS
      )
    );

    this.wcProvider = await Promise.race([initPromise, initTimeout]);

    // ── Step 2: register display_uri BEFORE calling connect() ────────────────
    //   KEY FIX: we never navigate away — always fire onDisplayUri.
    //   Modal shows QR + optional "Open in MetaMask/Trust" buttons.
    this.wcProvider.on('display_uri', (uri: string) => {
      // Always deliver URI to modal for QR display
      try {
        this.onDisplayUri?.(uri);
      } catch (e) {
        console.warn('[WC] onDisplayUri error:', e);
      }
    });

    // ── Step 3: reconnect relay when app returns from background (Capacitor) ──
    //   When user switches to MetaMask and back, WebSocket may have closed.
    //   WC has built-in reconnect, but a manual nudge helps.
    if (this.isCapacitor()) {
      this._removeVisibilityHandler();
      const handler = () => {
        if (document.hidden || !this.wcProvider) return;
        try {
          const relayer = this.wcProvider?.signer?.client?.core?.relayer;
          if (relayer && !relayer.connected) {
            relayer.restartTransport?.();
            relayer.transportOpen?.();
          }
        } catch (_) {}
      };
      this._visibilityHandler = handler;
      document.addEventListener('visibilitychange', handler);
      // Also listen for focus (more reliable than visibilitychange on Android)
      window.addEventListener('focus', handler);
    }

    // ── Step 4: connect() waits for wallet session approval ──────────────────
    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Сессия не установлена за 5 минут. Откройте кошелёк, подтвердите подключение и вернитесь в приложение.'
                )
              ),
            WC_SESSION_TIMEOUT_MS
          )
        ),
      ]);
    } finally {
      this._removeVisibilityHandler();
      this.onDisplayUri = null;
    }

    const provider = new ethers.providers.Web3Provider(
      this.wcProvider as any,
      'any'
    );
    await this._switchToPolygon(provider);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.activeWalletType = wallet;

    this.wcProvider.on('disconnect', () => {
      this.wcProvider = null;
      this.activeWalletType = null;
    });

    return { provider, signer, address, walletType: 'walletconnect' };
  }

  // ─── AliTerra Wallet ──────────────────────────────────────────────────────

  openAliTerraWallet(onAddress: (address: string) => void): () => void {
    this._cleanupAliTerraListener();

    const walletUrl = 'https://wallet.aliterra.space/';

    if (this.isCapacitor()) {
      // Capacitor: navigate to AliTerra wallet with return URL param
      const returnUrl = encodeURIComponent(
        window.location.origin + window.location.pathname + '?w3g_from=aliterra'
      );
      window.location.href = `${walletUrl}?from=web3gram&return=${returnUrl}`;
      return () => {};
    }

    // Browser: open popup, listen for postMessage
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
    const w = window.open(
      url,
      'aliterra_wallet',
      'width=440,height=680,noopener=false'
    );
    if (!w) window.open(url, '_blank');

    return () => this._cleanupAliTerraListener();
  }

  // Read-only connection (AliTerra address-only)
  createReadOnlyConnection(address: string): WalletConnection {
    return {
      provider: null,
      signer: null,
      address,
      walletType: 'aliterra',
      readOnly: true,
    };
  }

  // ─── Disconnect / Cancel ──────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this._cleanupAliTerraListener();
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    this._cleanupAliTerraListener();
    this._removeVisibilityHandler();
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

  private _removeVisibilityHandler(): void {
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      window.removeEventListener('focus', this._visibilityHandler);
      this._visibilityHandler = null;
    }
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
