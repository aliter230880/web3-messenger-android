// walletService.ts — исправленная версия
// ИСПРАВЛЕНИЯ:
//   1. EthereumProvider вместо SignClient — аккаунты кэшируются локально, нет лишних relay round-trips
//   2. 3-слойное восстановление сессии (connect promise + SDK events + visibilitychange)
//   3. Retry до 3x при сетевых ошибках + clearWCStorage между попытками
//   4. openDeepLink: window.open(_system) в Capacitor — не перезагружает WebView

import { ethers } from 'ethers';

const POLYGON_CHAIN_ID = 137;
const POLYGON_PARAMS = {
  chainId: '0x89',
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};
const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';
const APP_URL = 'https://chat.aliterra.space';
const WC_INIT_TIMEOUT_MS = 20_000;
const WC_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const WC_MAX_RETRIES = 3;

export interface WalletConnection {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  walletType: string;
  readOnly?: boolean;
}

type DisplayUriCallback = (uri: string) => void;

class WalletService {
  private wcProvider: any = null;
  private _sessionResolve: (() => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private _aborted = false;

  public onDisplayUri: DisplayUriCallback | null = null;

  // ── Определение платформы ──────────────────────────────────────────────────
  isCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  hasMetaMask(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).ethereum?.isMetaMask);
  }

  // ── Deep link ─────────────────────────────────────────────────────────────
  // Capacitor: '_system' → Android Intent — НЕ перезагружает WebView
  // Browser: '_blank' → custom scheme
  openDeepLink(uri: string, wallet: 'metamask' | 'trust' | 'walletconnect'): boolean {
    const encoded = encodeURIComponent(uri);
    let url: string;
    if (wallet === 'metamask') url = `metamask://wc?uri=${encoded}`;
    else if (wallet === 'trust') url = `trust://wc?uri=${encoded}`;
    else url = uri;
    try {
      if (this.isCapacitor()) {
        (window as any).open(url, '_system');
      } else {
        window.open(url, '_blank', 'noreferrer noopener');
      }
      return true;
    } catch {
      return false;
    }
  }

  openWalletApp(wallet: 'metamask' | 'trust'): void {
    const url = wallet === 'metamask' ? 'metamask://' : 'trust://';
    if (this.isCapacitor()) (window as any).open(url, '_system');
    else window.open(url, '_blank', 'noreferrer noopener');
  }

  // ── Reconnect relay после возврата из кошелька ────────────────────────────
  async reconnectRelay(): Promise<void> {
    if (!this.wcProvider) return;
    try {
      await Promise.race([this._doReconnect(), new Promise<void>(r => setTimeout(r, 5000))]);
    } catch (_) {}
  }

  private async _doReconnect(): Promise<void> {
    const core = (this.wcProvider as any)?.signer?.client?.core || (this.wcProvider as any)?.core;
    const relayer = core?.relayer;
    if (!relayer) return;
    if (typeof relayer.restartTransport === 'function') await relayer.restartTransport();
    else if (typeof relayer.transportClose === 'function') {
      try { await relayer.transportClose(); } catch (_) {}
      await relayer.transportOpen?.();
    } else if (typeof relayer.connect === 'function') await relayer.connect();
  }

  // ── Получить аккаунты из существующей WC сессии ──────────────────────────
  async tryGetAccounts(): Promise<string[]> {
    if (!this.wcProvider) return [];
    // Сначала читаем из session объекта — мгновенно, без RPC
    try {
      const ns = (this.wcProvider as any)?.session?.namespaces;
      if (ns) {
        const all: string[] = [];
        for (const key of Object.keys(ns)) {
          for (const a of ns[key]?.accounts || []) {
            const parts = a.split(':');
            const addr = parts[parts.length - 1];
            if (addr?.startsWith('0x')) all.push(addr);
          }
        }
        if (all.length) return [...new Set(all)];
      }
    } catch (_) {}
    try {
      const direct = (this.wcProvider as any)?.accounts;
      if (Array.isArray(direct) && direct.length) return direct.filter(Boolean);
    } catch (_) {}
    // Fallback: eth_accounts RPC
    try {
      const accounts = await Promise.race([
        this.wcProvider.request({ method: 'eth_accounts' }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    } catch { return []; }
  }

  forceResolveSession(): boolean {
    if (this._sessionResolve) {
      this._sessionResolve();
      this._sessionResolve = null;
      return true;
    }
    return false;
  }

  // ── Подключение из существующей WC сессии (без нового connect()) ──────────
  async connectFromExistingSession(wallet: string): Promise<WalletConnection> {
    if (!this.wcProvider) throw new Error('Нет активной WalletConnect сессии');
    const accounts = await this.tryGetAccounts();
    if (!accounts.length) throw new Error('Адрес кошелька не найден в сессии');
    const address = accounts[0];
    const provider = new ethers.providers.Web3Provider(this.wcProvider as any, 'any');
    await Promise.race([
      this._switchToPolygon(provider).catch((e: Error) => console.warn('[WC] switch skipped:', e.message)),
      new Promise<void>(r => setTimeout(r, 8000)),
    ]);
    const signer = provider.getSigner();
    return { provider, signer, address, walletType: wallet };
  }

  // ── MetaMask ───────────────────────────────────────────────────────────────
  async connectMetaMask(): Promise<WalletConnection> {
    if (!this.isCapacitor() && !this.isMobile() && this.hasMetaMask()) {
      const eth = (window as any).ethereum;
      const provider = new ethers.providers.Web3Provider(eth, 'any');
      await provider.send('eth_requestAccounts', []);
      await this._switchToPolygon(provider);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
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

  // ── WalletConnect ──────────────────────────────────────────────────────────
  private async _connectWC(wallet: string): Promise<WalletConnection> {
    this._aborted = false;
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= WC_MAX_RETRIES; attempt++) {
      if (this._aborted) break;
      try {
        return await this._connectWCOnce(wallet, attempt);
      } catch (err: any) {
        lastErr = err;
        const msg: string = err?.message || '';
        const retryable = msg.includes('Failed to publish') || msg.includes('WebSocket')
          || msg.includes('relay') || msg.includes('tag:undefined')
          || msg.includes('не отвечает') || msg.includes('No internet');
        if (!retryable || attempt >= WC_MAX_RETRIES || this._aborted) throw err;
        console.warn(`[WC] attempt ${attempt} failed, retrying…`);
        await this._sleep(attempt * 1500);
        await this._clearWCStorage();
      }
    }
    throw lastErr || new Error('Не удалось подключиться к WalletConnect');
  }

  private async _connectWCOnce(wallet: string, attempt: number): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    const initPromise = EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false,
      metadata: {
        name: 'Web3Gram',
        description: 'Secure Web3 Messenger on Polygon',
        url: APP_URL,
        icons: [`${APP_URL}/favicon.ico`],
      },
    });

    this.wcProvider = await Promise.race([
      initPromise,
      new Promise<never>((_, rej) => setTimeout(() => rej(
        new Error(`WalletConnect не отвечает (${attempt > 1 ? 'попытка ' + attempt + ': ' : ''}${WC_INIT_TIMEOUT_MS / 1000}с). Проверьте интернет.`)
      ), WC_INIT_TIMEOUT_MS)),
    ]);

    // display_uri — как только pairing URI готов
    this.wcProvider.on('display_uri', (uri: string) => {
      try { this.onDisplayUri?.(uri); } catch (_) {}
    });

    // ── 3-слойное ожидание подтверждения ──────────────────────────────────
    const sessionPromise = new Promise<void>((resolve, reject) => {
      this._sessionResolve = resolve;
      let done = false;
      const ok = () => { if (done) return; done = true; this._sessionResolve = null; resolve(); };
      const fail = (e: Error) => { if (done) return; done = true; this._sessionResolve = null; reject(e); };

      // Слой 1: connect() promise
      this.wcProvider.connect().then(ok).catch(fail);
      // Слой 2а: SDK connect event
      this.wcProvider.on('connect', () => ok());
      // Слой 2б: session_update event
      this.wcProvider.on('session_update', () => { if (this.wcProvider?.session) ok(); });
      // Таймаут 5 минут
      setTimeout(() => fail(new Error('Сессия не установлена за 5 минут. Нажмите «Я подтвердил».')), WC_SESSION_TIMEOUT_MS);
    });

    // Слой 3: visibilitychange → reconnect relay → check session
    this._removeVisibilityHandler();
    const handler = async () => {
      if (document.hidden || !this.wcProvider) return;
      try {
        await this.reconnectRelay();
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

    const provider = new ethers.providers.Web3Provider(this.wcProvider as any, 'any');
    await this._switchToPolygon(provider);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    this.wcProvider.on('disconnect', () => { this.wcProvider = null; });

    return { provider, signer, address, walletType: wallet };
  }

  // ── AliTerra (read-only) ──────────────────────────────────────────────────
  createReadOnlyConnection(address: string): WalletConnection {
    return { provider: null, signer: null, address, walletType: 'aliterra', readOnly: true };
  }

  openAliTerraWallet(onAddress: (address: string) => void): () => void {
    if (this.isCapacitor()) {
      const returnUrl = encodeURIComponent(window.location.origin + '?w3g_from=aliterra');
      (window as any).open(`https://wallet.aliterra.space/?from=web3gram&return=${returnUrl}`, '_system');
      return () => {};
    }
    const listener = (ev: MessageEvent) => {
      if (ev.data?.type === 'WEB3GRAM_ADDRESS' && ev.data?.address?.startsWith('0x')) {
        window.removeEventListener('message', listener);
        onAddress(ev.data.address);
      }
    };
    window.addEventListener('message', listener);
    const w = window.open('https://wallet.aliterra.space/?from=web3gram', 'aliterra_wallet', 'width=440,height=680,noopener=false');
    if (!w) window.open('https://wallet.aliterra.space/?from=web3gram', '_blank');
    return () => window.removeEventListener('message', listener);
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  async disconnect(): Promise<void> {
    this._aborted = true;
    this._sessionResolve = null;
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
  }

  async cancelConnect(): Promise<void> {
    this._aborted = true;
    this._sessionResolve = null;
    this._removeVisibilityHandler();
    await this._cleanupWC();
    this.onDisplayUri = null;
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  private _sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private async _clearWCStorage(): Promise<void> {
    try {
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name && (db.name.includes('WALLET_CONNECT') || db.name.includes('wc@2'))) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wc@2') || k.startsWith('WALLET_CONNECT'))) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
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
      try { await this.wcProvider.disconnect(); } catch (_) {}
      this.wcProvider = null;
    }
  }

  private async _switchToPolygon(provider: ethers.providers.Web3Provider, maxRetries = 4): Promise<void> {
    let lastErr: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const net = await provider.getNetwork();
        if (net.chainId === POLYGON_CHAIN_ID) return;
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }]);
          return;
        } catch (err: any) {
          if (err.code === 4902 || err?.data?.originalError?.code === 4902) {
            await provider.send('wallet_addEthereumChain', [POLYGON_PARAMS]);
            return;
          }
          throw new Error('Переключитесь на Polygon Mainnet в кошельке');
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('noNetwork') || msg.includes('NETWORK_ERROR') || msg.includes('could not detect network')) {
          lastErr = err;
          await this._sleep(1500 * (i + 1));
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error('Не удалось определить сеть');
  }
}

export const walletService = new WalletService();
