import type { Chat, Message } from '../types';

const demoAddresses = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
  '0x1234567890abcdef1234567890abcdef12345678',
  '0xdead000000000000000000000000000000000001',
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
];

const demoNames = [
  'Алексей Волков',
  'Мария Петрова',
  'Web3 Разработка',
  'Криптоканал',
  'Поддержка AliTerra',
];

const demoMessages: string[] = [
  'Привет! Как дела?',
  'Отправил транзакцию, проверь',
  'Новый контракт задеплоен 🚀',
  'Завтра созвон в 15:00',
  'Обновление протокола вышло',
  'Готов к тестированию?',
  'Проверь новый UI',
  'Подключил кошелёк без проблем',
  'E2E шифрование работает',
  'Газ сейчас низкий, можно отправлять',
];

const autoReplies: string[] = [
  'Ок, принято! 👍',
  'Сейчас посмотрю',
  'Интересно, расскажи подробнее',
  'Хорошо, подожди минутку',
  'Проверил, всё работает',
  'Отлично! 🎉',
  'Буду через 5 минут',
  'Спасибо за информацию',
  'Разберусь и отвечу',
  'Да, согласен',
];

export function getDemoChats(): Chat[] {
  return demoAddresses.map((addr, i) => {
    const name = demoNames[i];
    const shortAddr = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    const lastMsgTime = new Date(Date.now() - Math.random() * 86400000 * 3);
    return {
      id: addr.toLowerCase(),
      type: 'private' as const,
      name,
      avatar: name.charAt(0).toUpperCase(),
      participants: [{
        id: addr,
        name: shortAddr,
        walletAddress: addr,
        isOnline: Math.random() > 0.5,
      }],
      unreadCount: Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0,
      isPinned: i === 0,
      isMuted: i === 3,
      createdAt: new Date(Date.now() - 86400000 * 30),
      updatedAt: lastMsgTime,
      lastMessage: {
        id: `demo-msg-${i}`,
        chatId: addr.toLowerCase(),
        senderId: i % 2 === 0 ? addr : 'current',
        content: demoMessages[i % demoMessages.length],
        timestamp: lastMsgTime,
        status: 'delivered' as const,
        type: 'text' as const,
      },
    };
  });
}

export function getDemoMessages(chatId: string): Message[] {
  const msgs: Message[] = [];
  const count = 8 + Math.floor(Math.random() * 12);
  const baseTime = Date.now() - 86400000 * 2;

  for (let i = 0; i < count; i++) {
    const isMine = Math.random() > 0.5;
    msgs.push({
      id: `demo-${chatId}-${i}`,
      chatId,
      senderId: isMine ? 'current' : chatId,
      content: demoMessages[i % demoMessages.length],
      timestamp: new Date(baseTime + i * 300000 + Math.random() * 60000),
      status: isMine ? 'read' : 'delivered',
      type: 'text',
    });
  }

  return msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function getAutoReply(): string {
  return autoReplies[Math.floor(Math.random() * autoReplies.length)];
}
