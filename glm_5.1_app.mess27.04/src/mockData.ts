import { Chat, Message } from './types';

const now = Date.now();

const makeMsg = (id: string, text: string, isMe: boolean, minutesAgo: number, senderId: string): Message => ({
  id,
  text,
  senderId,
  timestamp: now - minutesAgo * 60000,
  isMe,
  status: isMe ? 'read' : 'delivered',
});

export const myUserId = 'me';

export const initialChats: Chat[] = [
  {
    id: '1',
    user: {
      id: 'saved',
      name: 'Избранное',
      avatar: 'https://cdn-icons-png.flaticon.com/512/3138/3138345.png',
      status: 'online',
      bio: 'Ваши закладки и заметки',
    },
    messages: [
      makeMsg('s1', 'Ссылка на проект: https://github.com/example', true, 120, 'me'),
      makeMsg('s2', 'Пароль от Wi-Fi: SuperSecret123', true, 60, 'me'),
    ],
    unreadCount: 0,
    isPinned: true,
    lastActivity: now - 60 * 60000,
  },
  {
    id: '2',
    user: {
      id: 'alice',
      name: 'Алиса',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&backgroundColor=b6e3f4',
      status: 'online',
      bio: 'Fullstack разработчик 💻',
      lastSeen: now - 1000,
    },
    messages: [
      makeMsg('a1', 'Привет! Как дела с проектом?', false, 45, 'alice'),
      makeMsg('a2', 'Привет! Всё отлично, почти закончил', true, 44, 'me'),
      makeMsg('a3', 'Круто! Когда сможешь показать демо?', false, 43, 'alice'),
      makeMsg('a4', 'Может завтра в 15:00?', true, 42, 'me'),
      makeMsg('a5', 'Отлично, договорились! 👍', false, 41, 'alice'),
      makeMsg('a6', 'Кстати, посмотри новый дизайн', false, 6, 'alice'),
      makeMsg('a7', 'Выгрузил в Figma, ссылка в описании канала', false, 5, 'alice'),
    ],
    unreadCount: 2,
    lastActivity: now - 5 * 60000,
  },
  {
    id: '3',
    user: {
      id: 'bob',
      name: 'Максим',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=c0aede',
      status: 'offline',
      bio: 'Web3 энтузиаст 🚀',
      lastSeen: now - 1800000,
    },
    messages: [
      makeMsg('b1', 'Ты видел новый токен? $ALTB', false, 120, 'bob'),
      makeMsg('b2', 'Да, выглядит интересно', true, 119, 'me'),
      makeMsg('b3', 'Купил немного на пресейле', false, 118, 'bob'),
      makeMsg('b4', 'Будь осторожен с пресейлами 🤔', true, 117, 'me'),
    ],
    unreadCount: 0,
    lastActivity: now - 117 * 60000,
  },
  {
    id: '4',
    user: {
      id: 'crypto-group',
      name: '💻 Crypto Chat',
      avatar: 'https://api.dicebear.com/7.x/identicons/svg?seed=crypto&backgroundColor=ffd1dc',
      status: 'online',
      bio: 'Группа для обсуждения крипто-новостей',
    },
    messages: [
      makeMsg('c1', 'BTC обновил максимум! 🚀🚀🚀', false, 15, 'u1'),
      makeMsg('c2', 'Ethereum тоже растёт!', false, 14, 'u2'),
      makeMsg('c3', 'Когда соланы?', false, 13, 'u3'),
      makeMsg('c4', 'Solana уже +20% за сегодня', false, 12, 'u4'),
      makeMsg('c5', 'Ребят, аккуратно, может быть коррекция', true, 11, 'me'),
    ],
    unreadCount: 4,
    lastActivity: now - 11 * 60000,
  },
  {
    id: '5',
    user: {
      id: 'dasha',
      name: 'Дарья',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dasha&backgroundColor=ffd5dc',
      status: 'online',
      bio: 'UI/UX дизайнер ✨',
      lastSeen: now - 5000,
    },
    messages: [
      makeMsg('d1', 'Макеты готовы!', false, 30, 'dasha'),
      makeMsg('d2', 'Ого, выглядит потрясающе! 🤩', true, 29, 'me'),
      makeMsg('d3', 'Спасибо! Стараюсь 😊', false, 28, 'dasha'),
    ],
    unreadCount: 0,
    lastActivity: now - 28 * 60000,
  },
  {
    id: '6',
    user: {
      id: 'telegram',
      name: 'Telegram',
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/512px-Telegram_logo.svg.png',
      status: 'online',
      bio: 'Официальный аккаунт Telegram',
    },
    messages: [
      makeMsg('t1', 'Добро пожаловать в Aliterra Messenger!', false, 1440, 'telegram'),
      makeMsg('t2', 'Здесь вы можете общаться с друзьями и коллегами', false, 1439, 'telegram'),
      makeMsg('t3', 'Попробуйте отправить сообщение в любой чат', false, 1438, 'telegram'),
    ],
    unreadCount: 0,
    lastActivity: now - 1438 * 60000,
  },
];

// Bot responses for simulating real-time messaging
export const botResponses: Record<string, string[]> = {
  alice: [
    'Хорошо, поняла! 👍',
    'Интересная мысль, давай обсудим',
    'Я как раз работаю над этим',
    'Отправлю файлы через 10 минут',
    'Согласна! ✅',
    'А когда дедлайн?',
    'Ок, сделаю!',
    'Давай созвонимся позже',
    'Круто выглядит! 🎉',
    'Нужно добавить ещё анимации',
  ],
  bob: [
    'Понял, спасибо!',
    'А ты investing в этот проект?',
    'Смотри, график пошёл вверх 📈',
    'Стейкинг запустили, будешь?',
    'Ладно, подумаю 🤔',
    'WAGMI 🚀',
    'Токеномика выглядит устойчиво',
    'Купил ещё, DCA стратегия',
  ],
  dasha: [
    'Конечно, сейчас поправлю! ✨',
    'Как тебе шрифты?',
    'Figma файл обновила',
    'Давай сделаем gradient вместо solid',
    'Пользователи в восторге от нового UI',
    'Добавила micro-interactions 💫',
    'Палитру подобрала новую',
  ],
  'crypto-group': [
    'HODL! 💎🙌',
    'To the moon! 🚀',
    'Купил на дипе',
    'Когда TGE?',
    'Alpha leak 🔥',
    'Ребят, FUD не нужен',
    'Смотри на объёмы, растём!',
  ],
  telegram: [
    'Спасибо за ваше сообщение!',
    'Ваш аккаунт подтверждён ✅',
    'Новые функции доступны в настройках',
    'Обновление успешно установлено',
  ],
};
