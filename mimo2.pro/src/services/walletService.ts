// Wallet Service - РЕАЛЬНАЯ интеграция с кошельками
// Based on CONTEXT.md from web3-messenger-android

import { ethers } from 'ethers';

// Constants
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC_URL = 'https://polygon-rpc.com';
const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';

// Smart Contracts
const LOGIN_FACTORY_ADDRESS = '0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8';
const LOGIN_FACTORY_ABI = [
  'function createLogin(string memory provider, string memory socialId, string memory username) external returns (address)',
  'function getLogin(address user) external view returns (string memory provider, string memory socialId, string memory username, address wallet)',
];

export interface WalletConnection {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
  walletType: string;
}

// Event emitter for QR URI
type DisplayUriCallback = (uri: string) => void;
let displayUriCallback: DisplayUriCallback | null = null;

class WalletService {
  private wcProvider: any = null;
  private wcSignClient: any = null;
  private sessionTopic: string | null = null;

  // Set callback for when WalletConnect URI is ready
  set onDisplayUri(callback: DisplayUriCallback | null) {
    displayUriCallback = callback;
  }

  // Platform detection
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isCapacitor(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  hasMetaMask(): boolean {
    const eth = (window as any).ethereum;
    if (!eth) return false;
    // Check if it's MetaMask specifically
    return eth.isMetaMask === true;
  }

  // Open URL - respects Capacitor environment
  openUrl(url: string): void {
    if (this.isCapacitor()) {
      // In Capacitor/APK, use system intent to avoid WebView reload
      window.open(url, '_system');
    } else {
      // In regular browser
      window.open(url, '_blank');
    }
  }

  // Connect via MetaMask (desktop extension or mobile deep link)
  async connectMetaMask(): Promise<WalletConnection> {
    // Check if MetaMask extension is available
    if (this.hasMetaMask() && !this.isMobile()) {
      // Desktop: use browser extension directly
      const ethereum = (window as any).ethereum;
      
      try {
        // Request accounts
        await ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.providers.Web3Provider(ethereum, 'any');
        
        // Switch to Polygon
        await this.switchToPolygon(provider);
        
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        return { provider, signer, address, walletType: 'metamask' };
      } catch (error: any) {
        throw new Error(error.message || 'Failed to connect MetaMask');
      }
    }

    // Mobile or no extension: use WalletConnect with MetaMask deep link
    return this.connectWalletConnect('metamask');
  }

  // Connect via Trust Wallet
  async connectTrust(): Promise<WalletConnection> {
    return this.connectWalletConnect('trustwallet');
  }

  // Universal WalletConnect connection
  async connectWalletConnect(walletType?: string): Promise<WalletConnection> {
    try {
      // Dynamically import WalletConnect
      const { SignClient } = await import('@walletconnect/sign-client');
      
      // Initialize SignClient
      this.wcSignClient = await SignClient.init({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: 'Web3Gram',
          description: 'Secure Web3 Messenger',
          url: 'https://chat.aliterra.space',
          icons: ['https://chat.aliterra.space/icon.png'],
        },
      });

      // Create session
      const { uri, approval } = await this.wcSignClient.connect({
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
            ],
            chains: ['eip155:' + POLYGON_CHAIN_ID],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      });

      // If URI is available, open wallet
      if (uri) {
        // Generate QR code data
        if (displayUriCallback) {
          displayUriCallback(uri);
        }

        // Open wallet deep link on mobile
        if (this.isMobile()) {
          this.openWalletDeepLink(uri, walletType || 'walletconnect');
        }
      }

      // Wait for approval (user confirms in wallet)
      const session = await Promise.race([
        approval(),
        this.timeout(300000), // 5 minute timeout
      ]);

      if (!session) {
        throw new Error('Connection timeout - please try again');
      }

      this.sessionTopic = session.topic;

      // Get accounts from session
      const accounts = session.namespaces.eip155.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in session');
      }

      // Parse address from account (format: "eip155:137:0x...")
      const account = accounts[0];
      const address = account.split(':').pop() || '';

      // Create provider using WalletConnect
      const provider = this.createWCProvider();
      
      // Switch to Polygon
      await this.switchToPolygon(provider);

      const signer = provider.getSigner();

      return { provider, signer, address, walletType: walletType || 'walletconnect' };
    } catch (error: any) {
      console.error('WalletConnect error:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }

  // Open wallet app via deep link
  private openWalletDeepLink(uri: string, walletType: string): void {
    const encoded = encodeURIComponent(uri);
    let deepLink: string;

    switch (walletType) {
      case 'metamask':
        // MetaMask mobile deep link
        deepLink = `metamask://wc?uri=${encoded}`;
        break;
      case 'trustwallet':
        // Trust Wallet deep link
        deepLink = `trust://wc?uri=${encoded}`;
        break;
      default:
        // Generic WalletConnect URI (works with many wallets)
        deepLink = `wc:${uri}`;
    }

    console.log('Opening deep link:', deepLink);
    this.openUrl(deepLink);
  }

  // Create provider for WalletConnect session
  private createWCProvider(): ethers.providers.Web3Provider {
    // Create a custom provider that sends requests through WalletConnect
    const wcProvider = {
      request: async (request: { method: string; params?: any[] }) => {
        if (!this.wcSignClient || !this.sessionTopic) {
          throw new Error('WalletConnect not connected');
        }

        const result = await this.wcSignClient.request({
          topic: this.sessionTopic,
          chainId: 'eip155:' + POLYGON_CHAIN_ID,
          request,
        });

        return result;
      },
    };

    // Wrap in Web3Provider
    return new ethers.providers.Web3Provider(wcProvider as any, 'any');
  }

  // Switch network to Polygon
  async switchToPolygon(provider: ethers.providers.Web3Provider): Promise<void> {
    try {
      const network = await provider.getNetwork();
      if (network.chainId === POLYGON_CHAIN_ID) return;

      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }]);
    } catch (error: any) {
      if (error.code === 4902) {
        // Polygon not added, add it
        await provider.send('wallet_addEthereumChain', [{
          chainId: '0x89',
          chainName: 'Polygon Mainnet',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com', 'https://polygon-mainnet.g.alchemy.com/v2/demo'],
          blockExplorerUrls: ['https://polygonscan.com'],
        }]);
      } else {
        // Non-critical error, might work anyway
        console.warn('Network switch error:', error);
      }
    }
  }

  // Timeout helper
  private timeout(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.wcSignClient && this.sessionTopic) {
      try {
        await this.wcSignClient.disconnect({
          topic: this.sessionTopic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }
    this.wcProvider = null;
    this.wcSignClient = null;
    this.sessionTopic = null;
  }
}

export const walletService = new WalletService();
