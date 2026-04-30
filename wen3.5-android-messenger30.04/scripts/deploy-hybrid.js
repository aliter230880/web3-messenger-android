const hre = require("hardhat");

async function main() {
  console.log("🚀 Деплой гибридных контрактов для Web3 Messenger...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Деплойер:", deployer.address);

  const network = hre.network.name;
  console.log("🌐 Сеть:", network);

  // Деплой HybridMessenger
  console.log("\n📦 Деплой HybridMessenger...");
  const HybridMessenger = await hre.ethers.getContractFactory("HybridMessenger");
  const hybridMessenger = await HybridMessenger.deploy();
  await hybridMessenger.waitForDeployment();
  const hybridMessengerAddress = await hybridMessenger.getAddress();
  console.log("✅ HybridMessenger:", hybridMessengerAddress);

  // Инициализация
  console.log("🔄 Инициализация HybridMessenger...");
  await hybridMessenger.initialize();
  console.log("✅ HybridMessenger инициализирован");

  // Деплой IdentityV2
  console.log("\n📦 Деплой IdentityV2...");
  const IdentityV2 = await hre.ethers.getContractFactory("IdentityV2");
  const identityV2 = await IdentityV2.deploy();
  await identityV2.waitForDeployment();
  const identityV2Address = await identityV2.getAddress();
  console.log("✅ IdentityV2:", identityV2Address);

  // Инициализация
  console.log("🔄 Инициализация IdentityV2...");
  await identityV2.initialize();
  console.log("✅ IdentityV2 инициализирован");

  // Вывод адресов
  console.log("\n" + "=".repeat(60));
  console.log("📋 АДРЕСА КОНТРАКТОВ");
  console.log("=".repeat(60));
  console.log(`HybridMessenger:  ${hybridMessengerAddress}`);
  console.log(`IdentityV2:       ${identityV2Address}`);
  console.log("=".repeat(60));

  // Сохранение в файл
  const fs = require("fs");
  const path = require("path");
  
  const deploymentInfo = {
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HybridMessenger: hybridMessengerAddress,
      IdentityV2: identityV2Address,
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${network}-hybrid.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Адреса сохранены в: ${filePath}`);

  // Верификация (если не localhost)
  if (network !== "localhost" && network !== "hardhat") {
    console.log("\n⏳ Ожидание для верификации...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      console.log("\n🔍 Верификация HybridMessenger...");
      await hre.run("verify:verify", {
        address: hybridMessengerAddress,
        constructorArguments: [],
      });
      console.log("✅ HybridMessenger верифицирован");
    } catch (error) {
      console.log("⚠️ HybridMessenger уже верифицирован или ошибка:", error.message);
    }

    try {
      console.log("\n🔍 Верификация IdentityV2...");
      await hre.run("verify:verify", {
        address: identityV2Address,
        constructorArguments: [],
      });
      console.log("✅ IdentityV2 верифицирован");
    } catch (error) {
      console.log("⚠️ IdentityV2 уже верифицирован или ошибка:", error.message);
    }
  }

  console.log("\n✅ Деплой завершён!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
