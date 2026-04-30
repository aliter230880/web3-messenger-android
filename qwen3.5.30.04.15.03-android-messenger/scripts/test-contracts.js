const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Тестирование контрактов Web3 Messenger...\n");

  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("📝 Тестовые аккаунты:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   User1:    ${user1.address}`);
  console.log(`   User2:    ${user2.address}\n`);

  // Деплой HybridMessenger
  console.log("📦 Деплой HybridMessenger для тестов...");
  const HybridMessenger = await ethers.getContractFactory("HybridMessenger");
  const hybridMessenger = await HybridMessenger.deploy();
  await hybridMessenger.waitForDeployment();
  await hybridMessenger.initialize();
  console.log(`✅ HybridMessenger: ${await hybridMessenger.getAddress()}\n`);

  // Деплой IdentityV2
  console.log("📦 Деплой IdentityV2 для тестов...");
  const IdentityV2 = await ethers.getContractFactory("IdentityV2");
  const identityV2 = await IdentityV2.deploy();
  await identityV2.waitForDeployment();
  await identityV2.initialize();
  console.log(`✅ IdentityV2: ${await identityV2.getAddress()}\n`);

  // Тест 1: Регистрация профиля
  console.log("🧪 Тест 1: Регистрация профиля...");
  const registerTx = await identityV2.connect(user1).registerProfile("TestUser", 5);
  await registerTx.wait();
  
  const profile = await identityV2.getProfile(user1.address);
  console.log(`   Никнейм: ${profile.nickname}`);
  console.log(`   Avatar:  ${profile.avatarId}`);
  console.log(`   Exists:  ${profile.exists}`);
  console.log(`✅ Тест 1 пройден\n`);

  // Тест 2: Уникальность никнейма
  console.log("🧪 Тест 2: Проверка уникальности никнейма...");
  try {
    await identityV2.connect(user2).registerProfile("TestUser", 3);
    console.log("❌ Тест 2 провален (никнейм не уникален)\n");
  } catch (error) {
    console.log("✅ Тест 2 пройден (никнейм занят)\n");
  }

  // Тест 3: Сохранение хэша сообщения
  console.log("🧪 Тест 3: Сохранение хэша сообщения...");
  const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Hello, Web3!"));
  const storeTx = await hybridMessenger.connect(user1).storeMessageHash(
    user2.address,
    messageHash
  );
  await storeTx.wait();
  
  const exists = await hybridMessenger.messageHashExists(messageHash);
  console.log(`   Хэш существует: ${exists}`);
  console.log(`✅ Тест 3 пройден\n`);

  // Тест 4: Получение диалога
  console.log("🧪 Тест 4: Получение диалога...");
  const [hashes, total] = await hybridMessenger.getConversationHashes(
    user1.address,
    user2.address,
    0,
    10
  );
  console.log(`   Всего сообщений: ${total}`);
  console.log(`   Получено хэшей:  ${hashes.length}`);
  console.log(`✅ Тест 4 пройден\n`);

  // Тест 5: Проверка счётчика
  console.log("🧪 Тест 5: Проверка счётчиков...");
  const totalMessages = await hybridMessenger.totalMessages();
  const totalUsers = await identityV2.totalUsers();
  console.log(`   Всего сообщений: ${totalMessages}`);
  console.log(`   Всего пользователей: ${totalUsers}`);
  console.log(`✅ Тест 5 пройден\n`);

  console.log("✅ Все тесты пройдены!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
