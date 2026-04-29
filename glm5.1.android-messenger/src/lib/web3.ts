import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balance);

  const networkNames: Record<string, string> = {
    '1': 'Ethereum',
    '137': 'Polygon',
    '56': 'BSC',
    '42161': 'Arbitrum',
    '10': 'Optimism',
    '8453': 'Base',
    '11155111': 'Sepolia',
    '80001': 'Mumbai',
  };

  const networkName = networkNames[network.chainId.toString()] || `Chain ${network.chainId}`;

  return {
    address,
    balance: parseFloat(balanceEth).toFixed(4),
    chainId: Number(network.chainId),
    networkName,
  };
}

export async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) throw new Error('No wallet');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function generateAvatarColor(address: string): string {
  const colors = [
    '#2AABEE', '#E26249', '#E7A10F', '#3DA34D',
    '#7F63B8', '#956FE4', '#AB6AC8', '#C03D33',
    '#5288C1', '#6C7C8C', '#48A8B5', '#29B6A8',
    '#F07C7C', '#3D9BEB', '#52A8C4', '#1E96C8',
  ];
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.replace(/\.eth|\.crypto|\.dao|\.xyz/g, '').split(/[\s._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function generateUsername(address: string): string {
  return `@user_${address.slice(2, 8).toLowerCase()}`;
}
