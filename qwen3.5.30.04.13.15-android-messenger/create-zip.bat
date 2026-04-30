@echo off
echo 🚀 Web3 Messenger - Создание ZIP для APK
echo =========================================
echo.

REM Проверка что dist существует
if not exist "dist" (
    echo ❌ Папка dist/ не найдена!
    echo 📦 Запускаю сборку...
    call npm run build
)

REM Переход в dist
cd dist

REM Создание ZIP через PowerShell
echo 📦 Создание ZIP архива...
powershell -Command "Compress-Archive -Path * -DestinationPath ..\web3-messenger-app.zip -Force"

REM Возврат назад
cd ..

echo.
echo ✅ Готово!
echo.
echo 📂 Файл: web3-messenger-app.zip
dir web3-messenger-app.zip
echo.
echo 🌐 Загрузите в:
echo    https://www.webintoapp.com/maker
echo.
echo 📱 Или задеплойте на:
echo    https://vercel.com/
echo    https://app.netlify.com/drop
echo.
pause
