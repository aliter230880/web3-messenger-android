import { ethers } from 'ethers';
import nacl from 'tweetnacl';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ====================== CONTRACT CONFIG ======================
export const DEFAULT_MESSAGE_CONTRACT = '0x2B6f4E28A9694B76c7AbA1B3B2c56DDB00000001';
export const POLYGON_RPC = 'https://polygon-rpc.com';
export const POLYGON_CHAIN_ID = 137;

export const NEW_MESSAGE_ABI = [
  "function sendMessage(address recipient, string calldata encryptedText) external",
  "function getMessages(address peer) external view returns (tuple(address sender, address recipient, string text, uint256 timestamp)[])",
  "function getMessageCount(address peer) external view returns (uint256)",
  "event MessageSent(address indexed sender, address indexed recipient, string text, uint256 timestamp)"
];

export const IDENTITY_ABI = [
  "function register(string calldata username) external",
  "function getProfile(address user) external view returns (string username, uint256 registeredAt)",
  "function getAddressByUsername(string calldata username) external view returns (address)",
  "function hasProfile(address user) external view returns (bool)"
];

// ====================== STORAGE HELPERS ======================
export function getAccountData(addr: string): any {
  try {
    const raw = localStorage.getItem('w3m_account_' + addr.toLowerCase());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setAccountData(addr: string, data: any) {
  localStorage.setItem('w3m_account_' + addr.toLowerCase(), JSON.stringify(data));
}

export function getContactsData(userAddr: string): any[] {
  try {
    const raw = localStorage.getItem('w3m_contacts_' + userAddr.toLowerCase());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setContactsData(userAddr: string, contacts: any[]) {
  localStorage.setItem('w3m_contacts_' + userAddr.toLowerCase(), JSON.stringify(contacts));
}

export function getPeerAvatarId(addr: string): number | null {
  try {
    const raw = localStorage.getItem('w3m_peer_avatar_' + addr.toLowerCase());
    return raw !== null ? parseInt(raw) : null;
  } catch { return null; }
}

export function getCachedMessages(userAddr: string, peerAddr: string): any[] {
  try {
    const key = 'w3m_msgs_' + [userAddr, peerAddr].map(a => a.toLowerCase()).sort().join('_');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setCachedMessages(userAddr: string, peerAddr: string, msgs: any[]) {
  const key = 'w3m_msgs_' + [userAddr, peerAddr].map(a => a.toLowerCase()).sort().join('_');
  localStorage.setItem(key, JSON.stringify(msgs));
}

// ====================== ADDRESS UTILS ======================
export function shortAddr(addr: string): string {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ====================== AVATAR COLORS ======================
const AVATAR_PALETTE: [string, string][] = [
  ['#6366f1', '#4f46e5'],
  ['#22c55e', '#16a34a'],
  ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'],
  ['#06b6d4', '#0891b2'],
  ['#8b5cf6', '#7c3aed'],
  ['#14b8a6', '#0d9488'],
  ['#f97316', '#ea580c'],
  ['#64748b', '#475569'],
  ['#a855f7', '#9333ea'],
  ['#10b981', '#059669'],
  ['#ec4899', '#db2777'],
  ['#f43f5e', '#e11d48'],
  ['#d946ef', '#c026d3'],
  ['#0ea5e9', '#0284c7'],
];

export function getAvatarGradient(addr: string): [string, string] {
  let hash = 0;
  const s = (addr || '').toLowerCase();
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// ====================== TIME FORMATTERS ======================
export function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatChatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ====================== CRYPTO ======================
export async function deriveMasterKey(password: string, addr: string): Promise<Uint8Array> {
  const salt = 'w3m-master-' + (addr || '').toLowerCase();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const keyBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return new Uint8Array(keyBits);
}

export async function deriveKeyHash(password: string, addr: string): Promise<string> {
  const key = await deriveMasterKey(password, addr);
  return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAddressKey(userAddr: string, peerAddr: string): Promise<Uint8Array> {
  const sorted = [userAddr.toLowerCase(), peerAddr.toLowerCase()].sort().join(':web3m:');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sorted));
  return new Uint8Array(hash);
}

export async function encryptMessage(
  text: string,
  userAddr: string,
  peerAddr: string,
  e2eKeyPair?: nacl.BoxKeyPair | null
): Promise<string> {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msg = new TextEncoder().encode(text);
  const addrKey = await getAddressKey(userAddr, peerAddr);
  const box = nacl.secretbox(msg, nonce, addrKey);

  if (e2eKeyPair) {
    const combined = new Uint8Array(1 + 32 + nonce.length + box.length);
    combined[0] = 0x01;
    combined.set(e2eKeyPair.publicKey, 1);
    combined.set(nonce, 33);
    combined.set(box, 33 + nonce.length);
    return btoa(String.fromCharCode(...Array.from(combined)));
  }

  const combined = new Uint8Array(nonce.length + box.length);
  combined.set(nonce);
  combined.set(box, nonce.length);
  return btoa(String.fromCharCode(...Array.from(combined)));
}

export async function decryptMessage(
  encBase64: string,
  userAddr: string,
  peerAddr: string,
  e2eKeyPair?: nacl.BoxKeyPair | null
): Promise<string | null> {
  try {
    const data = atob(encBase64);
    const combined = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) combined[i] = data.charCodeAt(i);

    let nonce: Uint8Array, box: Uint8Array;
    let embeddedPubKey: Uint8Array | null = null;

    if (combined.length > 33 + nacl.secretbox.nonceLength &&
      (combined[0] === 0x01 || combined[0] === 0x02)) {
      embeddedPubKey = combined.slice(1, 33);
      nonce = combined.slice(33, 33 + nacl.secretbox.nonceLength);
      box = combined.slice(33 + nacl.secretbox.nonceLength);
    } else {
      nonce = combined.slice(0, nacl.secretbox.nonceLength);
      box = combined.slice(nacl.secretbox.nonceLength);
    }

    if (e2eKeyPair && embeddedPubKey) {
      const dhShared = nacl.box.before(embeddedPubKey, e2eKeyPair.secretKey);
      const dec = nacl.secretbox.open(box, nonce, dhShared);
      if (dec) return new TextDecoder().decode(dec);
    }

    const addrKey = await getAddressKey(userAddr, peerAddr);
    const decAddr = nacl.secretbox.open(box, nonce, addrKey);
    if (decAddr) return new TextDecoder().decode(decAddr);

    return null;
  } catch { return null; }
}

// ====================== WALLET CONNECTION ======================
export async function connectMetaMask(): Promise<{
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  address: string;
} | null> {
  if (typeof window.ethereum === 'undefined') return null;
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    try {
      const network = await provider.getNetwork();
      if (network.chainId !== POLYGON_CHAIN_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }],
        });
      }
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com'],
          }],
        });
      }
    }

    return { provider, signer, address };
  } catch { return null; }
}

// ====================== E2E KEY PAIR ======================
export async function deriveE2EKeyPair(signer: ethers.Signer): Promise<nacl.BoxKeyPair | null> {
  try {
    const sig = await signer.signMessage('Web3Messenger-E2E-KeyPair-v1');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sig));
    const secretKey = new Uint8Array(hash);
    return nacl.box.keyPair.fromSecretKey(secretKey);
  } catch { return null; }
}
