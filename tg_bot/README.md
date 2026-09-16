# 🤖 DarsJadvaliBot — Maktab Dars Jadvali Telegram Boti

Ushbu papkada **DarsJadvaliBot** ning to‘liq mustaqil, avtonom va 24/7 ishlaydigan Telegram bot qismi ajratilgan.

---

## 📁 Papka Tuzilishi

```text
tg_bot/
├── src/
│   ├── index.js              # Botning asosiy kirish nuqtasi va 24/7 retry boshqaruvi
│   ├── bot/
│   │   ├── bot.js            # Grammy Bot instansiyasi va sozlamalari
│   │   ├── handlers/         # Bot komandalari va xabarlar ishlovchilari
│   │   ├── keyboards/        # Tugmalar va menyular
│   │   └── middlewares/      # Avtorizatsiya va xatoliklar filtri
│   ├── config/               # Konfiguratsiya va doimiy parametrlar
│   ├── database/             # SQLite ma'lumotlar bazasi va repozitoriylar
│   ├── scheduler/            # Har tong (06:00) avtomatik dars jadvali jo'natuvchi cron
│   ├── services/             # Biznes mantiq (jadval, admin autentifikatsiya)
│   └── utils/                # Yordamchi vositalar (logger, sana, formatlovchi)
├── data/
│   ├── bot.sqlite            # SQLite ma'lumotlar bazasi fayli
│   └── excel_dump.json       # Boshlang'ich dars jadvali andozasi
├── logs/                     # Ishlash va xatoliklar loglari
├── .env                      # Sozlamalar va Maxfiy kalitlar (BOT_TOKEN, ADMIN_IDS)
├── .env.example              # Namuna sozlamalar
├── ecosystem.config.cjs      # PM2 24/7 rejim konfiguratsiyasi
├── package.json              # Loyiha kutubxonalari
├── start-bot.bat             # 1-klikda ishga tushirish (PM2)
├── start-bot-background.vbs  # Orqa fonda ko'rinmas ishga tushirish
├── stop-bot.bat              # Botni to'xtatish
└── index.js                  # Asosiy chaqiruvchi fayl
```

---

## ⚙️ Sozlash (.env)

`.env` faylida quyidagi ma'lumotlarni tekshiring:

```env
# Telegram Bot Token
BOT_TOKEN=8679664923:AAFN21f2NwA4v6C5JtweWQHpB6SzX_VP4JI

# Bot Adminining Telegram ID si
ADMIN_IDS=6105913215

# Admin panel kirish paroli
ADMIN_PASSWORD=admin123

# Vaqt mintaqasi
TZ=Asia/Tashkent

# Har kuni ertalab guruhlarga jadval yuboriladigan vaqt
DEFAULT_SEND_TIME=06:00

# SQLite bazasi joylashuvi
DB_PATH=./data/bot.sqlite
```

---

## 🚀 Ishga Tushirish

### 1. Oddiy konsol rejimida:
```bash
npm start
```

### 2. 24/7 Doimiy Ishlash (PM2):
- `start-bot.bat` fayliga bosing yoki:
```bash
npm run pm2:start
```

### 3. Bot holati va loglarini ko'rish:
```bash
npm run pm2:status
npm run pm2:logs
```

### 4. Botni to'xtatish:
```bash
npm run pm2:stop
```
