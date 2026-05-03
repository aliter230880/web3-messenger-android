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

const WC_INIT_TIMEOUT_MS = 15_000;
const WC_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const WC_MAX_RETRIES = 3;

export type WalletType = 'metamask' | 'walletconnect' | 'trust' | 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  walletType: WalletType;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Design:
//
//  1. Always fire onDisplayUri — modal shows QR on ALL platforms.
//  2. On Capacitor: ALSO trigger deep link via window.location.href so the
//     wallet app opens automatically (confirmed working by user — redirect DID
//     happen; the old crash was connect() not resolving, not the redirect).
//  3. Retry up to 3 times on "Failed to publish" relay errors.
//  4. Reconnect relay on visibilitychange + focus after returning from wallet.
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private _aborted = false;

  /** Set this before calling connect() — fires when WC URI is ready. */
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

  // ─── Open wallet app via deep link ────────────────────────────────────────
  //   Use window.location.href on Capacitor (confirmed by user that MetaMask
  //   DID open). On browser use window.open(_blank).
  openDeepLink(uri: string, wallet: 'metamask' | 'trust' | 'walletconnect') {
    const encoded = encodeURIComponent(uri);
    const url =
      wallet === 'metamask' ? `metamask://wc?uri=${encoded}`
      : wallet === 'trust'  ? `trust://wc?uri=${encoded}`
      : uri;                  // generic WC URI

    if (this.isCapacitor()) {
      // On Android Capacitor — location.href fires shouldOverrideUrlLoading
      // which Android routes to the wallet app WITHOUT reloading the WebView
      window.location.href = url;
    } else {
      const opened = window.open(url, '_blank');
      if (!opened) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  }

  // ─── MetaMask ─────────────────────────────────────────────────────────────

  async connectMetaMask(): Promise<WalletConnection> {
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

  async connectTrust(): Promise<WalletConnection> {
    return this._connectWC('trust');
  }

  async connectWalletConnect(): Promise<WalletConnection> {
    return this._connectWC('walletconnect');
  }

  // ─── Core WC connect with retry ───────────────────────────────────────────

  private async _connectWC(
    wallet: 'metamask' | 'trust' | 'walletconnect'
  ): Promise<WalletConnection> {
    this._aborted = false;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= WC_MAX_RETRIES; attempt++) {
      if (this._aborted) break;

      try {
        return await this._connectWCOnce(wallet, attempt);
      } catch (err: any) {
        lastError = err;
        const msg: string = err?.message || '';

        // Retry transient relay errors (publish failures, relay disconnects)
        const isRetryable =
          msg.includes('Failed to publish') ||
          msg.includes('No internet connection') ||
          msg.includes('WebSocket') ||
          msg.includes('relay') ||
          msg.includes('timeout') ||
          msg.includes('tag:undefined');

        if (!isRetryable || attempt >= WC_MAX_RETRIES || this._aborted) {
          throw err;
        }

        console.warn(`[WC] Attempt ${attempt} failed: ${msg}. Retrying…`);
        await this._sleep(attempt * 1500); // 1.5s, 3s between retries
        // Clear WC storage so next attempt starts fresh
        await this._clearWCStorage();
      }
    }

    throw lastError || new Error('Не удалось подключиться к WalletConnect');
  }

  private async _connectWCOnce(
    wallet: 'metamask' | 'trust' | 'walletconnect',
    attempt: number
  ): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    // ── Init ─────────────────────────────────────────────────────────────────
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
        () => reject(new Error(`WalletConnect не отвечает (${attempt > 1 ? 'повтор ' + attempt + ': ' : ''}15 сек). Проверьте интернет.`)),
        WC_INIT_TIMEOUT_MS
      )
    );

    this.wcProvider = await Promise.race([initPromise, initTimeout]);

    // ── Register display_uri BEFORE connect() ─────────────────────────────
    let deepLinkFired = false;
    this.wcProvider.on('display_uri', (uri: string) => {
      // 1. Always show QR (all platforms)
      try {
        this.onDisplayUri?.(uri);
      } catch (_) {}

      // 2. On Capacitor: ALSO auto-open wallet app via location.href
      //    (user confirmed this redirects correctly on their device)
      if (this.isCapacitor() && !deepLinkFired) {
        deepLinkFired = true;
        setTimeout(() => {
          if (!this._aborted) {
            this.openDeepLink(uri, wallet);
          }
        }, 300); // small delay so QR screen renders first
      }
    });

    // ── Reconnect relay when returning from wallet app ────────────────────
    this._removeVisibilityHandler();
    if (this.isCapacitor()) {
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
      window.addEventListener('focus', handler);
    }

    // ── Connect (waits for wallet approval) ───────────────────────────────
    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Сессия не установлена за 5 минут. Откройте кошелёк, подтвердите и вернитесь.')),
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

    if (this.isCapacitor()) {
      const returnUrl = encodeURIComponent(
        window.location.origin + window.location.pathname + '?w3g_from=aliterra'
      );
      window.location.href = `https://wallet.aliterra.space/?from=web3gram&return=${returnUrl}`;
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

    const url = 'https://wallet.aliterra.space/?from=web3gram';
    const w = window.open(url, 'aliterra_wallet', 'width=440,height=680,noopener=false');
    if (!w) window.open(url, '_blank');

    return () => this._cleanupAliTerraListener();
  }

  createReadOnlyConnection(address: string): WalletConnection {
    return { provider: null, signer: null, address, walletType: 'aliterra', readOnly: true };
  }

  // ─── Disconnect / Cancel ──────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this._aborted = true;
    this._cleanupAliTerraListener();
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    this._aborted = true;
    this._cleanupAliTerraListener();
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private _sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async _clearWCStorage(): Promise<void> {
    try {
      // Clear WalletConnect IndexedDB entries so next attempt is fresh
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name && (db.name.includes('WALLET_CONNECT') || db.name.includes('wc@2'))) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      // Clear localStorage WC keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wc@2') || k.startsWith('WALLET_CONNECT'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }

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
