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
//  Strategy summary
//  ────────────────
//  MetaMask (Capacitor)  → window.location.href = 'metamask://wc?uri=...'
//    Capacitor's BridgeWebViewClient.shouldOverrideUrlLoading intercepts the
//    custom scheme, calls bridge.launchIntent() → Android opens MetaMask via
//    Intent(ACTION_VIEW). Returns `true` → WebView does NOT navigate,
//    React state is fully preserved. WC session completes when user approves
//    and returns (WC relay buffers the approval while APK is in background).
//
//  Trust Wallet (Capacitor) → window.location.href = 'trust://wc?uri=...'
//    Same mechanism, different scheme.
//
//  AliTerra Wallet → opens wallet.aliterra.space?from=web3gram in new window.
//    wallet.aliterra.space sends the user's address back via postMessage
//    (requires the one-line snippet described in connectAliTerraWallet docs).
//    Falls back to manual paste if postMessage unavailable (Capacitor/Chrome).
// ─────────────────────────────────────────────────────────────────────────────

class WalletService {
  private wcProvider: any = null;
  private activeWalletType: WalletType | null = null;
  // Resolve callback for AliTerra postMessage flow
  private _aliTerraResolve: ((address: string) => void) | null = null;
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
    // Desktop: use browser extension if available
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
    // Mobile/Capacitor: direct app deep link
    return this._connectMobileDeepLink('metamask');
  }

  // ─── Trust Wallet ─────────────────────────────────────────────────────────

  async connectTrust(): Promise<WalletConnection> {
    if (this.isCapacitor()) {
      return this._connectMobileDeepLink('trust');
    }
    return this.connectWalletConnect();
  }

  // ─── Mobile direct deep link (no WC modal) ───────────────────────────────
  //
  //  1. Init EthereumProvider with showQrModal: false
  //  2. On display_uri → fire metamask:// or trust:// deep link via
  //     window.location.href (Capacitor intercepts → Intent → app opens)
  //  3. Await wcProvider.connect() with 5-min timeout
  //  4. visibilitychange listener prods the WC relay on return

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
      showQrModal: false, // we handle the deep link ourselves
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

      if (wallet === 'metamask') {
        // Capacitor: shouldOverrideUrlLoading → bridge.launchIntent() → MetaMask
        window.location.href = `metamask://wc?uri=${encoded}`;
      } else {
        // Trust Wallet scheme
        window.location.href = `trust://wc?uri=${encoded}`;
      }
    });

    // When the user returns to the APK after approving in the wallet,
    // prod the WC relay to replay buffered events.
    const _reconnectOnReturn = () => {
      if (!document.hidden) {
        try {
          this.wcProvider
            ?.signer?.client?.core?.relayer?.restartTransport?.();
        } catch (_) {}
      }
    };
    document.addEventListener('visibilitychange', _reconnectOnReturn);

    try {
      await Promise.race([
        this.wcProvider.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Время ожидания 5 мин истекло — попробуйте ещё раз'
                )
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
  //  Opens wallet.aliterra.space?from=web3gram in a popup/tab and waits for
  //  the user's address to arrive via window.postMessage.
  //
  //  For this to work automatically, add this one snippet to wallet.aliterra.space
  //  (anywhere before </body>):
  //
  //  ┌─────────────────────────────────────────────────────────────────┐
  //  │  <script>                                                        │
  //  │  (function(){                                                    │
  //  │    if(!new URLSearchParams(location.search).has('from')) return; │
  //  │    var t=setInterval(function(){                                 │
  //  │      var a=window.wallet&&window.wallet.signer               │
  //  │          ?window.wallet.signer._address||                       │
  //  │            (window.wallet.provider&&                            │
  //  │             window.wallet.provider.selectedAddress):null;       │
  //  │      if(!a&&window.ethereum)a=ethereum.selectedAddress;         │
  //  │      if(a){clearInterval(t);                                    │
  //  │        (window.opener||window.parent)                           │
  //  │          .postMessage({type:'WEB3GRAM_ADDRESS',address:a},'*'); │
  //  │      }                                                          │
  //  │    },600);                                                      │
  //  │    setTimeout(function(){clearInterval(t);},120000);            │
  //  │  })();                                                          │
  //  │  </script>                                                      │
  //  └─────────────────────────────────────────────────────────────────┘
  //
  //  In Capacitor (Chrome process ≠ WebView), postMessage is unavailable.
  //  The WalletModal shows a "paste address" fallback in that case.

  openAliTerraWallet(
    onAddress: (address: string) => void
  ): () => void {
    // Clean up previous listener
    this._cleanupAliTerraListener();

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

    // Open the site
    const url = 'https://wallet.aliterra.space/?from=web3gram';
    const w = window.open(url, 'aliterra_wallet', 'width=440,height=680,noopener=false');
    if (!w) {
      // Popup blocked — open in same tab on Capacitor
      window.open(url, '_blank');
    }

    // Return cancel function
    return () => this._cleanupAliTerraListener();
  }

  // Read-only connection — address only, no signer (AliTerra)
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
    this._aliTerraResolve = null;
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
