#!/bin/bash

echo "🚀 Web3 Messenger - Создание ZIP для APK"
echo "========================================="
echo ""

# Проверка что dist существует
if [ ! -d "dist" ]; then
    echo "❌ Папка dist/ не найдена!"
    echo "📦 Запускаю сборку..."
    npm run build
fi

# Переход в dist
cd dist

# Создание ZIP
echo "📦 Создание ZIP архива..."
zip -r ../web3-messenger-app.zip .

# Возврат назад
cd ..

echo ""
echo "✅ Готово!"
echo ""
echo "📂 Файл: web3-messenger-app.zip"
echo "📊 Размер: $(du -h web3-messenger-app.zip | cut -f1)"
echo ""
echo "🌐 Загрузите в:"
echo "   https://www.webintoapp.com/maker"
echo ""
echo "📱 Или задеплойте на:"
echo "   https://vercel.com/"
echo "   https://app.netlify.com/drop"
echo ""
