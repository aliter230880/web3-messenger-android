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

// 5 minutes: MetaMask app open + user approves + return to APK
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
//  DEEP LINK STRATEGY (Capacitor Android)
//  ──────────────────────────────────────
//  MetaMask / Trust:
//    window.location.href = `intent://wc?uri=...#Intent;scheme=metamask;package=io.metamask;end`
//    Android Intent URL — WebViewClient intercepts, fires startActivity(), WebView stays intact.
//    S.browser_fallback_url directs user to Play Store if app not installed.
//
//  AliTerra Wallet (Capacitor):
//    Navigate WebView → wallet.aliterra.space/?from=web3gram&return=ENCODED_APP_ORIGIN
//    After unlock: _notifyWeb3Gram() redirects back → APP_ORIGIN?w3g_addr=0x...
//    App.tsx on mount detects ?w3g_addr and calls connectAliTerra().
//
//  AliTerra Wallet (Browser/Desktop):
//    window.open() popup + window.postMessage listener.
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  private _aliTerraListener: ((ev: MessageEvent) => void) | null = null;

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
    return this._connectMobileDeepLink('metamask');
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────

  async connectTrust(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileDeepLink('trust');
    }
    return this.connectWalletConnect();
  }

  // ─── Mobile deep link via Android Intent URL ─────────────────────────────
  //
  //  Uses `intent://wc?uri=...#Intent;scheme=<wallet>;package=<pkg>;end` format.
  //  Android WebViewClient intercepts intent:// → fires startActivity() without
  //  navigating the WebView → React state fully preserved.
  //  WC relay buffers the approval; visibilitychange listener reconnects relay.

  private async _connectMobileDeepLink(
    wallet: 'metamask' | 'trust'
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
      const playFallback = encodeURIComponent(
        wallet === 'metamask'
          ? 'https://play.google.com/store/apps/details?id=io.metamask'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
      );

      if (wallet === 'metamask') {
        // Android Intent URL — opens MetaMask without navigating WebView
        window.location.href =
          `intent://wc?uri=${encoded}` +
          `#Intent;scheme=metamask;package=io.metamask;` +
          `S.browser_fallback_url=${playFallback};end`;
      } else {
        window.location.href =
          `intent://wc?uri=${encoded}` +
          `#Intent;scheme=trust;package=com.wallet.crypto.trustapp;` +
          `S.browser_fallback_url=${playFallback};end`;
      }
    });

    // On return from wallet app → prod WC relay to replay buffered approval
    const _reconnectOnReturn = () => {
      if (document.hidden || !this.wcProvider) return;
      try {
        const relayer = this.wcProvider?.signer?.client?.core?.relayer;
        if (relayer) {
          // Try both known API shapes for WC v2.x
          relayer.restartTransport?.();
          relayer.transportOpen?.();
          relayer.provider?.connection?.open?.();
        }
      } catch (_) {}
    };
    document.addEventListener('visibilitychange', _reconnectOnReturn);

    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Время ожидания 5 мин истекло — попробуйте ещё раз')
              ),
            WC_TIMEOUT_MS
          )
        ),
      ]);
    } finally {
      document.removeEventListener('visibilitychange', _reconnectOnReturn);
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

  // ─── WalletConnect QR modal (fallback / desktop) ──────────────────────────

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

  // ─── AliTerra Wallet ──────────────────────────────────────────────────────
  //
  //  CAPACITOR mode (Android WebView):
  //    Navigates the WebView to wallet.aliterra.space/?from=web3gram&return=ORIGIN
  //    After unlock, wallet.aliterra.space calls _notifyWeb3Gram() which redirects
  //    back to ORIGIN?w3g_addr=0x... → App.tsx detects and calls connectAliTerra().
  //    onAddress callback is NOT used in this flow (App.tsx handles it instead).
  //
  //  BROWSER mode (desktop / in-browser):
  //    Opens wallet.aliterra.space in a popup.
  //    wallet.aliterra.space sends postMessage {type:'WEB3GRAM_ADDRESS', address}.
  //    onAddress(addr) is called immediately.

  openAliTerraWallet(
    onAddress: (address: string) => void
  ): () => void {
    this._cleanupAliTerraListener();

    const walletUrl = 'https://wallet.aliterra.space/';

    if (this.isCapacitor()) {
      // Navigate WebView — return URL carries back the address
      const returnUrl = encodeURIComponent(
        window.location.origin + window.location.pathname
      );
      window.location.href = `${walletUrl}?from=web3gram&return=${returnUrl}`;
      return () => {};
    }

    // Browser: popup + postMessage
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
    if (!w) {
      window.open(url, '_blank');
    }

    return () => this._cleanupAliTerraListener();
  }

  // Read-only connection — address only, no signer (AliTerra / restored session)
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
    await this._cleanupWC();
    this.activeWalletType = null;
  }

  async cancelConnect(): Promise<void> {
    this._cleanupAliTerraListener();
    await this._cleanupWC();
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
