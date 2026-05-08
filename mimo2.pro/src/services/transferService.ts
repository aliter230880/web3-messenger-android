// Transfer Service - переводы крипты
import { ethers } from 'ethers';

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

class TransferService {
  // Отправка MATIC
  async sendMatic(
    signer: ethers.Signer,
    to: string,
    amount: string
  ): Promise<TransferResult> {
    const from = await signer.getAddress();
    
    // Конвертируем сумму
    const value = ethers.utils.parseEther(amount);
    
    // Отправляем транзакцию
    const tx = await signer.sendTransaction({
      to,
      value,
    });

    return {
      txHash: tx.hash,
      from,
      to,
      amount,
      token: 'MATIC',
      status: 'pending',
      timestamp: Date.now(),
    };
  }

  // Ожидание подтверждения
  async waitForConfirmation(
    provider: ethers.providers.Provider,
    txHash: string
  ): Promise<boolean> {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch {
      return false;
    }
  }

  // Получение баланса MATIC
  async getBalance(
    provider: ethers.providers.Provider,
    address: string
  ): Promise<string> {
    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch {
      return '0';
    }
  }

  // Форматирование адреса для отображения
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Проверка валидности адреса
  isValidAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }

  // Получение ссылки на Polygonscan
  getExplorerLink(txHash: string): string {
    return `https://polygonscan.com/tx/${txHash}`;
  }
}

export const transferService = new TransferService();
