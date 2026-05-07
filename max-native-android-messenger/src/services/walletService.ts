/**
 * WalletService - подключение кошельков через WalletConnect v2
 * 
 * Deep Link стратегия:
 * - Android: intent:// links (самый надёжный способ)
 * - iOS: universal links
 * - Fallback: wc:// scheme
 */

import { ethers } from 'ethers';

const POLYGON_CHAIN_ID = 137;
const WC_PROJECT_ID = '2de1d724533083c2ed68197548dead4e';

export type WalletType = 'metamask' | 'trust' | 'walletconnect' | 'aliterra';

export interface WalletConnection {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  walletType: WalletType;
}

class WalletService {
  private wcProvider: any = null;
  private onConnectCallback: ((conn: WalletConnection) => void) | null = null;

  // ─── Платформа ──────────────────────────────────────────────────────────
  isCapacitor(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  hasInjectedProvider(): boolean {
    return !!(window as any).ethereum;
  }

  // ─── Deep Links ─────────────────────────────────────────────────────────
  openWalletWithUri(wcUri: string, wallet: 'metamask' | 'trust'): void {
    const encoded = encodeURIComponent(wcUri);
    
    console.log(`[WalletService] Opening ${wallet} with WC URI`);
    
    if (this.isAndroid()) {
      // Android: используем intent:// для гарантированного открытия
      let intentUrl: string;
      if (wallet === 'metamask') {
        // Intent для MetaMask Android
        intentUrl = `intent://wc?uri=${encoded}#Intent;package=io.metamask;scheme=metamask;end`;
      } else {
        // Intent для Trust Wallet Android  
        intentUrl = `intent://wc?uri=${encoded}#Intent;package=com.wallet.crypto.trustapp;scheme=trust;end`;
      }
      
      console.log('[WalletService] Android intent:', intentUrl.slice(0, 80));
      window.location.href = intentUrl;
      
    } else if (this.isIOS()) {
      // iOS: используем universal links
      let url: string;
      if (wallet === 'metamask') {
        url = `https://metamask.app.link/wc?uri=${encoded}`;
      } else {
        url = `https://link.trustwallet.com/wc?uri=${encoded}`;
      }
      
      console.log('[WalletService] iOS universal link:', url.slice(0, 80));
      window.location.href = url;
      
    } else {
      // Desktop/other: открываем wc:// напрямую (для QR сканирования)
      const wcUrl = `wc:${wcUri.replace('wc:', '')}`;
      console.log('[WalletService] WC URL:', wcUrl.slice(0, 80));
      window.open(wcUrl, '_blank');
    }
  }

  // ─── WalletConnect v2 ───────────────────────────────────────────────────
  async initWalletConnect(
    onUri: (uri: string) => void, 
    onConnect: (conn: WalletConnection) => void
  ): Promise<void> {
    await this.cleanup();
    this.onConnectCallback = onConnect;
    
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    
    this.wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [POLYGON_CHAIN_ID],
      showQrModal: false,
      optionalChains: [1, 137] as any,
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    // URI готов
    this.wcProvider.on('display_uri', (uri: string) => {
      console.log('[WalletService] WC URI ready');
      onUri(uri);
    });

    // Подключились
    this.wcProvider.on('connect', async () => {
      console.log('[WalletService] WC connected event');
      await this.handleConnect();
    });

    // session_update тоже означает успешное подключение
    this.wcProvider.on('session_update', async () => {
      console.log('[WalletService] WC session_update event');
      if (this.wcProvider?.session) {
        await this.handleConnect();
      }
    });

    // Запускаем connect (не ждём - события придут)
    this.wcProvider.connect().catch((e: any) => {
      console.log('[WalletService] Connect error (expected if user uses deep link):', e?.message);
    });
  }

  private async handleConnect(): Promise<void> {
    try {
      const conn = await this.buildConnection();
      if (conn && this.onConnectCallback) {
        this.onConnectCallback(conn);
        this.onConnectCallback = null;
      }
    } catch (e) {
      console.error('[WalletService] handleConnect error:', e);
    }
  }

  private async buildConnection(): Promise<WalletConnection | null> {
    if (!this.wcProvider) return null;
    
    try {
      const provider = new ethers.providers.Web3Provider(this.wcProvider, 'any');
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      return { provider, signer, address, walletType: 'walletconnect' };
    } catch (e) {
      console.error('[WalletService] buildConnection error:', e);
      return null;
    }
  }

  // ─── Проверить сессию (кнопка "Я подтвердил") ───────────────────────────
  async checkSession(): Promise<WalletConnection | null> {
    if (!this.wcProvider) {
      console.log('[WalletService] No wcProvider');
      return null;
    }

    // Пробуем переподключить relay
    try {
      const core = this.wcProvider?.signer?.client?.core || this.wcProvider?.core;
      if (core?.relayer?.restartTransport) {
        console.log('[WalletService] Restarting relay transport');
        await core.relayer.restartTransport();
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.warn('[WalletService] Relay restart failed:', e);
    }

    // Проверяем сессию
    if (this.wcProvider.session) {
      console.log('[WalletService] Session found');
      return this.buildConnection();
    }

    // Пробуем получить accounts напрямую
    try {
      const accounts = await this.wcProvider.request({ method: 'eth_accounts' });
      if (accounts?.length > 0) {
        console.log('[WalletService] Got accounts:', accounts[0]);
        return this.buildConnection();
      }
    } catch (e) {
      console.warn('[WalletService] eth_accounts failed:', e);
    }

    console.log('[WalletService] No session found');
    return null;
  }

  // ─── Injected provider (MetaMask browser) ───────────────────────────────
  async connectInjected(): Promise<WalletConnection> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('Кошелёк не найден');
    
    const provider = new ethers.providers.Web3Provider(ethereum, 'any');
    await provider.send('eth_requestAccounts', []);
    
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x89' }]);
    } catch (e: any) {
      if (e.code === 4902) {
        await provider.send('wallet_addEthereumChain', [{
          chainId: '0x89',
          chainName: 'Polygon',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com'],
        }]);
      }
    }
    
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    return { provider, signer, address, walletType: 'metamask' };
  }

  // ─── AliTerra ───────────────────────────────────────────────────────────
  createAliTerraConnection(address: string): WalletConnection {
    return { provider: null, signer: null, address, walletType: 'aliterra' };
  }

  openAliTerraWallet(): void {
    const callbackUrl = encodeURIComponent(window.location.href);
    const url = `https://wallet.aliterra.space/?callback=${callbackUrl}&action=connect`;
    
    if (this.isCapacitor()) {
      (window as any).open(url, '_system');
    } else {
      window.open(url, 'aliterra', 'width=450,height=700');
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────
  async cleanup(): Promise<void> {
    this.onConnectCallback = null;
    if (this.wcProvider) {
      try {
        await this.wcProvider.disconnect();
      } catch {}
      this.wcProvider = null;
    }
  }
}

export const walletService = new WalletService();
