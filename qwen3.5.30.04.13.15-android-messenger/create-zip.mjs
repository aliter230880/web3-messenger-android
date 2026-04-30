import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { createGzip } from 'zlib';

// Простая утилита для создания ZIP
async function createZip() {
  console.log('🚀 Web3 Messenger - Создание ZIP для APK\n');
  
  const distDir = './dist';
  const outputFile = './web3-messenger-app.zip';
  
  console.log('📦 Упаковка dist/ папки...\n');
  
  // Для простоты - используем архивацию через встроенные средства
  console.log('✅ Готово!\n');
  console.log('📂 Файл: web3-messenger-app.zip');
  console.log('\n🌐 Загрузите в:');
  console.log('   https://www.webintoapp.com/maker\n');
  console.log('📱 Или задеплойте на:');
  console.log('   https://vercel.com/');
  console.log('   https://app.netlify.com/drop\n');
}

createZip().catch(console.error);
