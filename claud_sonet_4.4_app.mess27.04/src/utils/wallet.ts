import { ethers } from 'ethers';

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
}

export async function connectWallet(): Promise<{
  address: string;
  network: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
} | null> {
  const provider = getProvider();
  if (!provider) {
    throw new Error('MetaMask не найден. Установите MetaMask или используйте демо-режим.');
  }

  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  const networkNames: Record<string, string> = {
    '1': 'Ethereum Mainnet',
    '5': 'Goerli Testnet',
    '11155111': 'Sepolia Testnet',
    '137': 'Polygon',
    '80001': 'Mumbai Testnet',
    '56': 'BNB Chain',
    '42161': 'Arbitrum One',
    '10': 'Optimism',
    '8453': 'Base',
  };

  const networkName = networkNames[network.chainId.toString()] || `Chain ${network.chainId}`;

  return { address, network: networkName, provider, signer };
}

export async function getEnsName(address: string): Promise<string | null> {
  try {
    const provider = getProvider();
    if (!provider) return null;
    const ens = await provider.lookupAddress(address);
    return ens;
  } catch {
    return null;
  }
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatAddressOrEns(address: string, ens?: string | null, chars = 4): string {
  if (ens) return ens;
  return formatAddress(address, chars);
}

export function generateAvatar(seed: string): string {
  // Generate a deterministic color from address
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function getInitials(name: string | undefined, address: string): string {
  if (name) {
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

// Simple symmetric encryption for demo (in production use Signal protocol or XMTP)
export function encryptMessage(content: string, key: string): string {
  try {
    // XOR-based simple encryption for demo
    const keyBytes = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
    const contentBytes = new TextEncoder().encode(content);
    const encrypted = contentBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    return btoa(String.fromCharCode(...encrypted));
  } catch {
    return content;
  }
}

export function decryptMessage(encrypted: string, key: string): string {
  try {
    const keyBytes = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
    const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const decrypted = encryptedBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    return new TextDecoder().decode(decrypted);
  } catch {
    return encrypted;
  }
}

export function getSharedKey(address1: string, address2: string): string {
  // Deterministic shared key for demo (in production use DH key exchange)
  const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
  return ethers.keccak256(ethers.toUtf8Bytes(sorted.join(''))).slice(2, 34);
}
