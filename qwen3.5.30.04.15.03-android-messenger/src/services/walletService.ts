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

// Init timeout — if WC relay doesn't respond in 12s, give up
const WC_INIT_TIMEOUT_MS = 12_000;
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
//  Стратегия подключения
//
//  Capacitor Android:
//    1. EthereumProvider.init() — с таймаутом 12 сек
//    2. На display_uri:
//       MetaMask → window.location.href = 'metamask://wc?uri=...'
//       Trust    → window.location.href = 'trust://wc?uri=...'
//    3. Пользователь подтверждает в кошельке → возвращается в приложение
//
//  Браузер:
//    MetaMask extension → window.ethereum
//    Иначе → WC QR через onDisplayUri callback
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;

  /**
   * Browser-mode QR display hook.
   * WalletModal sets this before calling connect(); the service fires it with
   * the WalletConnect URI so the modal can render a QR code.
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
  //  Key fix: EthereumProvider.init() may hang if WC relay WebSocket is slow.
  //  We race it against a 12-second timeout so the user sees an error instead
  //  of an infinite spinner.
  //
  //  display_uri fires as soon as WC generates a pairing URI (right after
  //  .connect() is called, before the wallet approves). We handle it
  //  immediately without waiting for session approval.

  private async _connectWC(
    wallet: 'metamask' | 'trust' | 'walletconnect'
  ): Promise<WalletConnection> {
    await this._cleanupWC();

    const { EthereumProvider } = await import(
      '@walletconnect/ethereum-provider'
    );

    // ── Step 1: init with timeout ────────────────────────────────────────────
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
        () => reject(new Error('WalletConnect не отвечает (12 сек). Проверьте интернет-соединение и попробуйте ещё раз.')),
        WC_INIT_TIMEOUT_MS
      )
    );

    this.wcProvider = await Promise.race([initPromise, initTimeout]);

    // ── Step 2: register display_uri BEFORE calling connect() ────────────────
    //   This is critical — the event fires synchronously after connect() starts
    //   and must be registered beforehand.
    let deepLinkFired = false;

    this.wcProvider.on('display_uri', (uri: string) => {
      if (deepLinkFired) return;
      deepLinkFired = true;

      const encoded = encodeURIComponent(uri);

      if (this.isCapacitor()) {
        // Capacitor: fire deep-link → Android intercepts → opens wallet app
        if (wallet === 'metamask') {
          window.location.href = `metamask://wc?uri=${encoded}`;
        } else if (wallet === 'trust') {
          window.location.href = `trust://wc?uri=${encoded}`;
        } else {
          // Generic WC: try MetaMask, fall back to universal link
          window.location.href = `metamask://wc?uri=${encoded}`;
        }
      } else {
        // Browser: pass URI to WalletModal for QR display
        this.onDisplayUri?.(uri);
      }
    });

    // Reconnect relay when user returns from wallet app (Capacitor)
    const _onVisibilityChange = () => {
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
    document.addEventListener('visibilitychange', _onVisibilityChange);

    // ── Step 3: connect() — waits for wallet approval ────────────────────────
    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Время ожидания истекло. Откройте кошелёк и подтвердите подключение, затем попробуйте ещё раз.')),
            WC_SESSION_TIMEOUT_MS
          )
        ),
      ]);
    } finally {
      document.removeEventListener('visibilitychange', _onVisibilityChange);
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
