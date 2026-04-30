const hre = require("hardhat");

async function main() {
  console.log("🔍 Верификация контрактов Web3 Messenger...\n");

  // Адреса контрактов (заменить на актуальные)
  const contracts = [
    {
      name: "HybridMessenger",
      address: "0x...", // Вставить адрес после деплоя
    },
    {
      name: "IdentityV2",
      address: "0x...", // Вставить адрес после деплоя
    },
    {
      name: "KeyEscrow",
      address: "0x20AFA1D1d8c25ecCe66fe8c1729a33F2d82BBA53", // Существующий
    },
    {
      name: "Identity",
      address: "0xcFcA16C8c38a83a71936395039757DcFF6040c1E", // Существующий
    },
    {
      name: "MessageStorage",
      address: "0xA07B784e6e1Ca3CA00084448a0b4957005C5ACEb", // Существующий
    },
  ];

  const network = hre.network.name;
  console.log(`🌐 Сеть: ${network}\n`);

  for (const contract of contracts) {
    console.log(`📦 Верификация ${contract.name}...`);
    console.log(`   Адрес: ${contract.address}`);

    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [],
      });
      console.log(`✅ ${contract.name} верифицирован\n`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`ℹ️ ${contract.name} уже верифицирован\n`);
      } else {
        console.log(`❌ Ошибка верификации ${contract.name}: ${error.message}\n`);
      }
    }
  }

  console.log("✅ Верификация завершена!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
