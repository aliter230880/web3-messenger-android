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

const WC_INIT_TIMEOUT_MS = 20_000;
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
//  DEEP LINK + SESSION RECOVERY STRATEGY (v2):
//
//  Problem: After user approves in MetaMask and returns to the app,
//  wcProvider.connect() doesn't resolve because the relay WebSocket
//  disconnected while the app was backgrounded.
//
//  Fix: Three-layer session detection:
//    1. wcProvider.connect() promise — resolves normally on desktop/fast mobile
//    2. wcProvider.on('connect', ...) event — fires from SDK internals
//    3. Visibility handler: after relay reconnect, poll wcProvider.session
//       and force-resolve the waiting promise
//
//  Manual fallback: "I confirmed" button in WalletModal calls
//  tryGetAccounts() → connectFromExistingSession() bypassing connect() entirely.
//
//  Deep link strategy:
//    Capacitor (APK): window.open(url, '_system') → Android Intent → no WebView reset
//    Mobile browser:  window.open(url, '_blank')
//    Desktop:         QR code only (custom schemes silently fail)
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private _aborted = false;
  private _sessionResolve: (() => void) | null = null;

  public onDisplayUri: ((uri: string) => void) | null = null;

  // ─── Platform detection ───────────────────────────────────────────────────
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
  openDeepLink(uri: string, wallet: 'metamask' | 'trust' | 'walletconnect'): boolean {
    const encoded = encodeURIComponent(uri);

    let url: string;
    if (wallet === 'metamask') {
      url = `metamask://wc?uri=${encoded}`;
    } else if (wallet === 'trust') {
      url = `trust://wc?uri=${encoded}`;
    } else {
      url = uri;
    }

    try {
      if (this.isCapacitor()) {
        // '_system' → Android Intent resolver → opens MetaMask WITHOUT resetting WebView
        const w = (window as any).open(url, '_system');
        if (w !== null) return true;
        return false;
      } else {
        const w = window.open(url, '_blank', 'noreferrer noopener');
        if (w) return true;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
        return true;
      }
    } catch {
      return false;
    }
  }

  // ─── Reconnect relay WebSocket (call after returning from wallet app) ──────
  async reconnectRelay(): Promise<void> {
    if (!this.wcProvider) return;
    try {
      const core =
        (this.wcProvider as any)?.signer?.client?.core ||
        (this.wcProvider as any)?.core;
      const relayer = core?.relayer;
      if (!relayer) return;

      if (typeof relayer.restartTransport === 'function') {
        await relayer.restartTransport();
      } else if (
        typeof relayer.transportClose === 'function' &&
        typeof relayer.transportOpen === 'function'
      ) {
        try { await relayer.transportClose(); } catch (_) {}
        await relayer.transportOpen();
      } else if (typeof relayer.connect === 'function') {
        await relayer.connect();
      }
    } catch (e) {
      console.warn('[WC] reconnectRelay:', e);
    }
  }

  // ─── Try to get accounts from an existing WC session ─────────────────────
  // Called after user manually confirms: checks if MetaMask already approved
  async tryGetAccounts(): Promise<string[]> {
    if (!this.wcProvider) return [];
    try {
      const accounts = await this.wcProvider.request({
        method: 'eth_accounts',
      });
      return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  // ─── Force-resolve the pending connect() promise ──────────────────────────
  // Called externally when session detection succeeds (e.g. user pressed "I confirmed")
  forceResolveSession(): boolean {
    if (this._sessionResolve) {
      this._sessionResolve();
      this._sessionResolve = null;
      return true;
    }
    return false;
  }

  // ─── Build WalletConnection from an already-established WC session ────────
  // Use when connect() didn't resolve but session actually exists in provider
  async connectFromExistingSession(
    wallet: 'metamask' | 'trust' | 'walletconnect'
  ): Promise<WalletConnection> {
    if (!this.wcProvider) throw new Error('Нет активной WalletConnect сессии');

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

  // ─── MetaMask ─────────────────────────────────────────────────────────────
  async connectMetaMask(): Promise<WalletConnection> {
    if (!this.isCapacitor() && !this.isMobile() && this.hasMetaMask()) {
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

        const isRetryable =
          msg.includes('Failed to publish') ||
          msg.includes('No internet connection') ||
          msg.includes('WebSocket') ||
          msg.includes('relay') ||
          msg.includes('tag:undefined') ||
          msg.includes('не отвечает');

        if (!isRetryable || attempt >= WC_MAX_RETRIES || this._aborted) {
          throw err;
        }

        console.warn(`[WC] Attempt ${attempt} failed: ${msg}. Retrying…`);
        await this._sleep(attempt * 1500);
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
              `WalletConnect не отвечает (${attempt > 1 ? 'повтор ' + attempt + ': ' : ''}${WC_INIT_TIMEOUT_MS / 1000} сек). Проверьте интернет.`
            )
          ),
        WC_INIT_TIMEOUT_MS
      )
    );

    this.wcProvider = await Promise.race([initPromise, initTimeout]);

    // display_uri fires once when the pairing URI is ready
    this.wcProvider.on('display_uri', (uri: string) => {
      try { this.onDisplayUri?.(uri); } catch (_) {}
    });

    // ── Three-layer session detection ──────────────────────────────────────
    // Layer 2: listen for 'connect' event which fires from SDK internals
    // (including after relay reconnects and delivers pending approval)
    const sessionPromise = new Promise<void>((resolve, reject) => {
      this._sessionResolve = resolve;

      let done = false;
      const doResolve = () => {
        if (done) return;
        done = true;
        this._sessionResolve = null;
        resolve();
      };
      const doReject = (e: Error) => {
        if (done) return;
        done = true;
        this._sessionResolve = null;
        reject(e);
      };

      // Layer 1: the primary connect() promise
      this.wcProvider.connect().then(doResolve).catch(doReject);

      // Layer 2a: SDK 'connect' event — fires independently of promise
      this.wcProvider.on('connect', () => doResolve());

      // Layer 2b: session_update means approved session arrived
      this.wcProvider.on('session_update', () => {
        if (this.wcProvider?.session) doResolve();
      });

      // Timeout (5 minutes)
      setTimeout(
        () =>
          doReject(
            new Error(
              'Сессия не установлена за 5 минут. Откройте кошелёк и подтвердите подключение, затем нажмите «Я подтвердил».'
            )
          ),
        WC_SESSION_TIMEOUT_MS
      );
    });

    // Layer 3: visibility handler — when user returns from MetaMask,
    // reconnect relay then check wcProvider.session directly
    this._removeVisibilityHandler();
    const handler = async () => {
      if (document.hidden || !this.wcProvider) return;
      try {
        await this.reconnectRelay();
        // Give the relay 2 seconds to deliver pending session_approve
        await this._sleep(2000);
        if (this.wcProvider?.session && this._sessionResolve) {
          this._sessionResolve();
          this._sessionResolve = null;
        }
      } catch (_) {}
    };
    this._visibilityHandler = handler;
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);

    try {
      await sessionPromise;
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
      (window as any).open(
        `https://wallet.aliterra.space/?from=web3gram&return=${returnUrl}`,
        '_system'
      );
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
    this._sessionResolve = null;
    this._cleanupAliTerraListener();
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    this._aborted = true;
    this._sessionResolve = null;
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
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name && (db.name.includes('WALLET_CONNECT') || db.name.includes('wc@2'))) {
          indexedDB.deleteDatabase(db.name);
        }
      }
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
