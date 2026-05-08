// WalletConnect service - working version based on CONTEXT.mimo.md
// Uses ethers v6 + simple ethereum provider approach

import { ethers } from 'ethers';

const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC = 'https://polygon-rpc.com';

export interface WalletConnection {
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
  signer: ethers.Signer;
  address: string;
  walletType: string;
}

class WalletService {
  private signClient: any = null;
  private wcUri: string | null = null;
  private _sessionResolve: (() => void) | null = null;
  private aborted = false;

  onDisplayUri: ((uri: string) => void) | null = null;

  // Platform detection
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  isCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).Capacitor !== 'undefined';
  }

  hasMetaMask(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).ethereum !== 'undefined';
  }

  // Open URL handling for Capacitor vs browser
  openUrl(url: string): void {
    if (this.isCapacitor()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  }

  // Connect MetaMask (desktop extension or mobile)
  async connectMetaMask(): Promise<WalletConnection | null> {
    console.log('[Wallet] Connecting MetaMask...');

    // Desktop with extension
    if (this.hasMetaMask() && !this.isMobile()) {
      try {
        const ethereum = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(ethereum, 'any');

        await provider.send('eth_requestAccounts', []);
        await this.switchToPolygon(provider);

        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        console.log('[Wallet] MetaMask connected:', address);
        return { provider, signer, address, walletType: 'metamask' };
      } catch (err: any) {
        console.error('[Wallet] MetaMask desktop error:', err.message);
        throw err;
      }
    }

    // Mobile - try simple connection first
    if (this.hasMetaMask()) {
      return this.connectSimple();
    }

    // Fallback to WalletConnect
    return this.connectViaWalletConnect('metamask');
  }

  // Connect Trust Wallet
  async connectTrustWallet(): Promise<WalletConnection | null> {
    console.log('[Wallet] Connecting Trust Wallet...');
    if (this.hasMetaMask()) {
      return this.connectSimple();
    }
    return this.connectViaWalletConnect('trustwallet');
  }

  // Universal WalletConnect connection using SignClient
  async connectViaWalletConnect(
    walletType: string = 'walletconnect'
  ): Promise<WalletConnection | null> {
    console.log('[Wallet] Connecting via WalletConnect...');
    this.aborted = false;

    // Try up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await this._connectWCOnce(walletType, attempt);
        if (result) return result;
      } catch (err: any) {
        console.error(
          `[Wallet] WC attempt ${attempt} failed:`,
          err.message
        );
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          this.clearWCStorage();
        }
      }
    }

    throw new Error('WalletConnect connection failed after 3 attempts');
  }

  private async _connectWCOnce(
    walletType: string,
    attempt: number
  ): Promise<WalletConnection | null> {
    if (this.aborted) return null;

    // Dynamic import of SignClient
    let SignClient: any;
    try {
      const wc = await import('@walletconnect/sign-client');
      SignClient = wc.SignClient;
    } catch (err) {
      console.error('[Wallet] Failed to import SignClient');
      throw new Error('WalletConnect library not available');
    }

    // Initialize SignClient
    console.log(`[Wallet] WC init (attempt ${attempt})...`);
    this.signClient = await SignClient.init({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: 'Web3Gram',
        description: 'Secure Web3 Messenger',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://chat.aliterra.space',
        icons: ['https://chat.aliterra.space/icon.png'],
      },
    });

    // Connect
    const connectResult = await this.signClient.connect({
      requiredNamespaces: {
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
          ],
          chains: ['eip155:137'],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    const uri = connectResult.uri;
    const approval = connectResult.approval;

    if (!uri) {
      throw new Error('No WalletConnect URI generated');
    }

    this.wcUri = uri;
    console.log('[Wallet] WC URI generated');

    // Notify UI about URI
    if (this.onDisplayUri) {
      this.onDisplayUri(uri);
    }

    // Open deep link on mobile
    if (this.isMobile()) {
      this.openWalletDeepLink(uri, walletType);
    }

    // Wait for approval with timeout (5 minutes)
    const timeoutMs = 300000;

    // Session detection with multiple layers
    const sessionPromise = new Promise<any>((resolve, reject) => {
      this._sessionResolve = () => resolve(null);

      // Layer 1: approval promise
      approval().then(resolve).catch((err: any) => {
        console.error('[Wallet] Approval error:', err);
        // Don't reject immediately, try other layers
      });

      // Layer 2: session_update event
      this.signClient.on('session_update', () => {
        console.log('[Wallet] Session update event');
        resolve(null);
      });

      // Layer 3: connect event
      this.signClient.on('connect', () => {
        console.log('[Wallet] Connect event');
        resolve(null);
      });

      // Timeout
      setTimeout(
        () => reject(new Error('Session not established in 5 minutes')),
        timeoutMs
      );
    });

    await sessionPromise;

    if (this.aborted) return null;

    // Get session
    const sessionKey = this.signClient.session.keys[0];
    const session = this.signClient.session.get(sessionKey);

    if (!session) {
      throw new Error('No session found');
    }

    const accounts = session.namespaces?.eip155?.accounts || [];
    const address = accounts[0]?.split(':')?.[2];

    if (!address) {
      throw new Error('No address in session');
    }

    console.log('[Wallet] WC connected:', address);

    // Create provider from Polygon RPC
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);

    return {
      provider,
      signer: null as any,
      address,
      walletType,
    };
  }

  // Open wallet deep link
  openWalletDeepLink(uri: string, walletType: string): void {
    const encoded = encodeURIComponent(uri);
    let url: string;

    switch (walletType) {
      case 'metamask':
        url = `metamask://wc?uri=${encoded}`;
        break;
      case 'trustwallet':
        url = `trust://wc?uri=${encoded}`;
        break;
      default:
        url = `wc:${uri}`;
        break;
    }

    console.log('[Wallet] Opening deep link:', url.substring(0, 50) + '...');
    this.openUrl(url);
  }

  // Force resolve session (for manual bypass)
  forceResolveSession(): void {
    if (this._sessionResolve) {
      console.log('[Wallet] Force resolving session');
      this._sessionResolve();
      this._sessionResolve = null;
    }
  }

  // Switch to Polygon network
  private async switchToPolygon(
    provider: ethers.BrowserProvider
  ): Promise<void> {
    const network = await provider.getNetwork();
    if (network.chainId === BigInt(POLYGON_CHAIN_ID)) return;

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: '0x89' },
      ]);
    } catch (err: any) {
      if (err.code === 4902) {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: '0x89',
            chainName: 'Polygon',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18,
            },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com'],
          },
        ]);
      }
    }
  }

  // Simple connection (when inside wallet browser)
  async connectSimple(): Promise<WalletConnection | null> {
    if (typeof window === 'undefined') return null;

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error(
        'No wallet found. Open this page in MetaMask or Trust Wallet browser.'
      );
    }

    try {
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const address = accounts[0];

      // Switch to Polygon
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x89',
                chainName: 'Polygon',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://polygon-rpc.com'],
              },
            ],
          });
        }
      }

      const provider = new ethers.BrowserProvider(ethereum, 'any');
      const signer = await provider.getSigner();

      const walletType = ethereum.isMetaMask ? 'metamask' : 'trustwallet';

      console.log('[Wallet] Simple connect:', address);
      return { provider, signer, address, walletType };
    } catch (err: any) {
      console.error('[Wallet] Simple connect error:', err.message);
      throw err;
    }
  }

  // AliTerra wallet (read-only)
  connectAliTerra(): void {
    this.openUrl('https://wallet.aliterra.space/?from=web3gram');
  }

  // Disconnect
  disconnect(): void {
    console.log('[Wallet] Disconnecting...');
    this.aborted = true;
    this.signClient = null;
    this.wcUri = null;
    this._sessionResolve = null;
    this.clearWCStorage();
  }

  // Clear WalletConnect storage
  private clearWCStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('wc@2') || key.startsWith('WALLET_CONNECT'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      if (window.indexedDB) {
        const dbNames = ['WALLET_CONNECT', 'wc@2'];
        dbNames.forEach((name) => {
          try {
            window.indexedDB.deleteDatabase(name);
          } catch {}
        });
      }
    } catch (err) {
      console.error('[Wallet] Error clearing WC storage:', err);
    }
  }

  // Get WC URI for QR code display
  getWcUri(): string | null {
    return this.wcUri;
  }
}

export const walletService = new WalletService();
