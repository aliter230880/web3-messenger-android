# 📱 Web3 Messenger - Сборка APK

## 🎯 БЫСТРАЯ ИНСТРУКЦИЯ (5 минут)

### Шаг 1: Откройте Терминал

**Windows:** 
- Нажмите `Win + R`
- Введите `cmd`
- Нажмите Enter

**Mac:**
- Откройте Terminal (Cmd + Space → "Terminal")

**Linux:**
- Ctrl + Alt + T

### Шаг 2: Перейдите в Папку Проекта

```bash
cd путь/к/проекту
```

**Как узнать путь:**
- Откройте папку с проектом
- Скопируйте путь из адресной строки
- Вставьте в терминал после `cd `

### Шаг 3: Запустите Сборку

```bash
npm run build
```

**Дождитесь:** `✓ built in X.XXs`

### Шаг 4: Создайте ZIP Архив

**Windows:**
1. Откройте папку `dist` в проводнике
2. Выделите все файлы (Ctrl + A)
3. Правая кнопка → Отправить → Сжатая ZIP-папка
4. Назовите: `web3-messenger.zip`

**Mac:**
```bash
cd dist
zip -r ../web3-messenger.zip .
```

**Linux:**
```bash
zip -r web3-messenger.zip dist/*
```

### Шаг 5: Загрузите в Онлайн-Конвертер

**Рекомендую:** https://www.webintoapp.com/maker

1. **Откройте:** https://www.webintoapp.com/maker
2. **Выберите:** "HTML5 / Local Files"
3. **Загрузите:** `web3-messenger.zip`
4. **Название:** `Web3 Messenger`
5. **Package:** `space.aliterra.messenger`
6. **Version:** `1.0`
7. **Нажмите:** "MAKE APP"
8. **Подождите:** 2-3 минуты
9. **Скачайте:** APK файл

### Шаг 6: Установите на Телефон

1. **Передайте APK** на телефон (USB/Drive/Telegram)
2. **Откройте** файловый менеджер
3. **Нажмите** на APK файл
4. **Установите** (разрешите из неизвестных источников)

---

## 📁 Структура ZIP Архива

```
web3-messenger.zip
└── index.html          (главный файл)
└── assets/             (стили и скрипты)
    ├── index-XXXXX.js
    └── style-XXXXX.css
```

**Важно:** `index.html` должен быть в корне ZIP!

---

## 🌐 Альтернатива: Деплой на Хостинг

Если онлайн-конвертер не работает:

### **Vercel (Бесплатно, 2 минуты):**

1. **Откройте:** https://vercel.com/
2. **Войдите** через GitHub
3. **Import Project** → Выберите репозиторий
4. **Root Directory:** оставьте пустым
5. **Deploy** → Готово!
6. **Получите URL:** `https://your-app.vercel.app`
7. **Используйте URL** в онлайн-конвертере

### **Netlify (Бесплатно, 2 минуты):**

1. **Откройте:** https://app.netlify.com/drop
2. **Перетащите** папку `dist` в окно
3. **Получите URL:** `https://random-name.netlify.app`
4. **Используйте URL** в онлайн-конвертере

### **GitHub Pages (Бесплатно):**

1. **Запушьте** проект на GitHub
2. **Settings → Pages**
3. **Source:** main branch → /dist
4. **Получите URL:** `https://username.github.io/repo`
5. **Используйте URL** в онлайн-конвертере

---

## ⚙️ Настройки для Онлайн-Конвертера

### **WebIntoApp:**

```
App Name: Web3 Messenger
Package: space.aliterra.messenger
Version: 1.0
Version Code: 1

✓ Enable JavaScript
✓ Enable DOM Storage
✓ Enable File Upload
✓ Enable Camera
✓ Enable Microphone
✓ Enable Geolocation
Mixed Content: Allow All
User Agent: Mozilla/5.0 (Linux; Android 10)
```

### **AppsGeyser:**

```
Template: Website
URL: https://your-app.vercel.app
App Name: Web3 Messenger
Icon: Загрузите logo.png
```

---

## 🎨 Иконка Приложения

**Скачайте готовую:**
```
https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava%20(1).png
```

**Или используйте emoji:** 💬

**Требования:**
- Размер: 512x512 px (минимум 192x192)
- Формат: PNG
- Фон: Прозрачный или #3390ec

---

## 📊 Размер Файлов

| Файл | Размер |
|------|--------|
| **dist/index.html** | ~1.3 MB |
| **dist/assets/** | ~400 KB (gzip) |
| **web3-messenger.zip** | ~500 KB |
| **Готовый APK** | ~5-10 MB |

---

## ✅ Чеклист

- [ ] `npm run build` выполнен успешно
- [ ] Папка `dist/` существует
- [ ] ZIP архив создан
- [ ] `index.html` в корне ZIP
- [ ] Загружено в онлайн-конвертер
- [ ] APK скачан
- [ ] APK установлен на телефон
- [ ] Приложение запускается

---

## 🆘 Troubleshooting

### **Ошибка: "index.html not found"**

Убедитесь что `index.html` в корне ZIP, а не в папке!

**Правильно:**
```
web3-messenger.zip
├── index.html
└── assets/
```

**Неправильно:**
```
web3-messenger.zip
└── dist/
    ├── index.html
    └── assets/
```

### **Ошибка: "Build failed"**

```bash
# Очистите кэш
npm cache clean --force

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install

# Попробуйте снова
npm run build
```

### **Онлайн-конвертер не принимает ZIP**

Используйте деплой на Vercel:
1. https://vercel.com/
2. Import GitHub репозиторий
3. Используйте полученный URL

---

## 📞 Поддержка

Если что-то не работает:
1. Проверьте консоль (`F12` в браузере)
2. Скопируйте ошибку
3. Отправьте мне - помогу!

---

**Удачи! 🚀**
