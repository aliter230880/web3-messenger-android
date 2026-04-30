# 📦 Руководство по Деплою Web3 Messenger

## 🎯 Что Деплоить на Polygon Mainnet

### Текущие Контракты (Уже Задеплоены):

| Контракт | Адрес | Статус | Использовать? |
|----------|-------|--------|---------------|
| **Identity** | `0xcFcA16C8c38a83a71936395039757DcFF6040c1E` | ✅ Активен | ✅ Да (или V2) |
| **MessageStorage** | `0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb` | ✅ Активен | ⚠️ Опционально (для хэшей) |
| **KeyEscrow** | `0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53` | ✅ Активен | ✅ Да |
| **SocialWalletRegistry** | `0xC2c66A1eBe0484c8a91c4849680Bcd77ada4E036` | ✅ Активен | ❌ Нет (не интегрирован) |

### Новые Контракты (Нужно Задеплоить):

| Контракт | Назначение | Приоритет |
|----------|------------|-----------|
| **HybridMessenger** | Хэши сообщений для XMTP | 🔴 Высокий |
| **IdentityV2** | Улучшенные профили | 🟡 Средний |

---

## 🚀 Пошаговый Деплой

### Шаг 1: Подготовка

```bash
# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env

# Редактирование .env
# - Добавить PRIVATE_KEY
# - Добавить POLYGONSCAN_API_KEY
```

### Шаг 2: Тестирование (Local)

```bash
# Запуск локальных тестов
npx hardhat run scripts/test-contracts.js --network hardhat
```

### Шаг 3: Деплой на Testnet (Polygon Amoy)

```bash
# Деплой
npx hardhat run scripts/deploy-hybrid.js --network polygonAmoy

# Верификация
npx hardhat run scripts/verify-contracts.js --network polygonAmoy
```

### Шаг 4: Деплой на Mainnet (Polygon)

```bash
# Деплой
npx hardhat run scripts/deploy-hybrid.js --network polygon

# Верификация
npx hardhat run scripts/verify-contracts.js --network polygon
```

---

## 💰 Стоимость Деплоя

### Polygon Mainnet (актуальные цены):

| Контракт | Gas | Стоимость (MATIC) | Стоимость (USD) |
|----------|-----|-------------------|-----------------|
| HybridMessenger | ~800,000 | ~0.028 | ~$0.02 |
| IdentityV2 | ~1,200,000 | ~0.042 | ~$0.03 |
| **Итого** | ~2,000,000 | ~0.07 | **~$0.05** |

### Polygon Amoy Testnet:
- **Бесплатно** (тестовые MATIC)

---

## 🔧 Конфигурация Приложения

После деплоя обновите адреса в приложении:

```typescript
// src/services/contractService.ts
export const CONTRACT_ADDRESSES = {
  Identity: '0xcFcA16C8c38a83a71936395039757DcFF6040c1E', // или V2
  MessageStorage: '0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb',
  HybridMessenger: '0x...', // Новый адрес после деплоя
  KeyEscrow: '0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53',
};
```

---

## ✅ Чеклист Перед Деплоем

- [ ] Контракты протестированы локально
- [ ] Деплой на testnet успешен
- [ ] Верификация на PolygonScan прошла
- [ ] Адреса обновлены в приложении
- [ ] Приложение протестировано с новыми контрактами
- [ ] Private Key не закоммичен в git
- [ ] Есть резервная копия ключей

---

## 🔐 Безопасность

### Рекомендации:

1. **Private Key:**
   - Никогда не коммитьте в git
   - Используйте отдельный ключ для деплоя
   - Храните основную сумму на холодном кошельке

2. **Контракты:**
   - Верифицируйте исходный код на PolygonScan
   - Проведите аудит перед mainnet деплоем
   - Используйте proxy для upgradeable контрактов

3. **Access Control:**
   - Owner должен быть multisig для production
   - Ограничьте права администратора

---

## 📊 Мониторинг

### После деплоя:

1. **Добавить в PolygonScan:**
   - https://polygonscan.com/address/0x...

2. **Настроить алерты:**
   - Крупные транзакции
   - Ошибки в контрактах
   - Подозрительная активность

3. **Метрики:**
   - Количество пользователей
   - Количество сообщений
   - Gas расходы

---

## 🆘 Troubleshooting

### Ошибка: "insufficient funds"
- Проверьте баланс MATIC на адресе деплоера
- Для mainnet нужно ~0.1 MATIC для безопасности

### Ошибка: "nonce too low"
- Подождите подтверждения предыдущей транзакции
- Или увеличьте nonce вручную

### Ошибка: "contract creation code storage out of gas"
- Увеличьте gas limit в hardhat.config.js
- Оптимизируйте контракт

---

## 📞 Поддержка

При проблемах:
1. Проверьте логи деплоя
2. Проверьте транзакции на PolygonScan
3. Убедитесь что RPC работает
4. Проверьте баланс и nonce

---

**Удачного деплоя! 🚀**
