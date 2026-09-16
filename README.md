# 🏫 MAKTAB — Telegram Bot & Telegram Mini App (Web App)

> **Maktab o‘quvchilari, ota-onalar, o‘qituvchilar va maktab ma'muriyati** uchun yaratilgan yaxlit elektron dars jadvali tizimi.
> Ushbu loyiha o‘z ichiga **Telegram Bot**, har kuni belgilangan vaqtda (**06:00 Asia/Tashkent**) guruhlarga avtomatik yuboruvchi **Scheduler**, hamda Telegram ichida ochiladigan zamonaviy **Telegram Mini App (Web App)** ni jamlagan.

---

## 🚀 Asosiy Imkoniyatlar

### 📱 1. Telegram Mini App (Web App)
- 🌐 **Telegram ichida 1 bosish bilan ochilish**: Bot menyusidagi `🌐 Dars jadvalini ochish` tugmasi yoki chat menyusi orqali ochiladi.
- 📱 **Mobil-birinchi (Mobile-First) zamonaviy dizayn**: 320px dan katta barcha telefonlarda va Desktop Telegramda toza, qulay va tez ishlaydi.
- 🎨 **Mavzu moslashuvchanligi (Dark / Light)**: Telegram mijozining qorong‘u yoki yorug‘ rejimiga avtomatik moslashadi.
- 🏫 **Sinfni tanlash va eslab qolish**: Foydalanuvchi bir marta o‘z sinfini tanlaydi (masalan `7-A sinf`), keyingi safar ilova ochilganda to‘g‘ridan-to‘g‘ri shu sinf jadvali chiqadi.
- 📅 **Bugungi va Ertangi darslar**: Har bir dars alohida chiroyli kartada (dars tartib raqami, boshlanish/tugash vaqti, fan emojisi, o‘qituvchi ismi, xona raqami).
- 📚 **Haftalik jadval**: Dushanbadan Shanbagacha bo‘lgan to‘liq haftalik darslar ro‘yxati va kunlik tablar.
- 👨‍🏫 **O‘qituvchilar jadvali**: O‘qituvchini tanlab, uning barcha sinflardagi kunlik va haftalik darslarini ko‘rish.
- ⚙️ **Profil bo‘limi**: Foydalanuvchi ma'lumotlari, tanlangan sinfni o‘zgartirish, rejimni almashtirish.
- 👑 **Mini App Admin Paneli** (Faqat Telegram Adminlar uchun):
  - 📊 **Real-vaqtli statistika**: Sinflar, o‘qituvchilar, fanlar, darslar va foydalanuvchilar soni.
  - 🏫 **Sinflar boshqaruvi**: Yangi sinf qo‘shish, tahrirlash, o‘chirish.
  - 👨‍🏫 **O‘qituvchilar boshqaruvi**: Yangi o‘qituvchi kiritish (ism, familiya, fan, telefon), tahrirlash, o‘chirish.
  - 📚 **Fanlar katalogi**: Maktab fanlari va ularning emojilarini boshqarish.
  - 📅 **Dars jadvali konstruktori**: Sinf, hafta kuni, vaqt, fan, o‘qituvchi va xonani tanlab dars qo‘shish yoki o‘chirish.
  - 📩 **Xabar shabloni**: Guruhlarga yuboriladigan xabar dizaynini tahrirlash, live preview (ko‘rib chiqish) va qayta tiklash.
  - ⏰ **Avtomatik yuborish vaqti**: Har bir sinf yoki barcha sinflar uchun jo‘natish vaqtini sozlash.
  - 📤 **Hozir yuborish (Instant Broadcast)**: Bugungi dars jadvalini tanlangan sinfga yoki barcha sinflarga darhol yuborish.

---

### 🤖 2. Telegram Bot & Avtomatlashtirish
- ⏰ **Avtomatik Yuboruvchi (Scheduler)**: Har kuni `06:00 Asia/Tashkent` da tegishli Telegram sinf guruhlariga dars jadvalini avtomatik yuboradi.
- 🛡 **Takroriy Yuborishdan 100% Himoya**: `sent_schedules` jadvali orqali bir kunda bitta guruhga jadval takroran yuborilishi butunlay oldi olingan.
- 🔐 **Ikki Bosqichli Admin Himoyasi**: Telegram ID tekshiruvi + PBKDF2 xavfsiz heshlangan parol (`admin123`).
- ⚡ **Yagona Node.js Jarayoni**: Bot + REST API + Mini App yagona jarayonda, yuqori tezlikda ishlovchi SQLite (`node:sqlite`) bilan ishlaydi.

---

## 📂 Loyiha Tuzilishi

```
madad-talim/
├── data/                         # SQLite ma'lumotlar bazasi (.sqlite)
├── logs/                         # Log fayllari (app.log, error.log)
├── scripts/
│   └── seed.js                   # Namuna sinflar, fanlar, o'qituvchilar va jadvallarni yuklash
├── src/
│   ├── config/                   # Konfiguratsiya (.env, constants)
│   ├── database/                 # SQLite repositoriyalari (groups, teachers, subjects, lessons, users, settings)
│   ├── api/                      # Web Server & REST API
│   │   ├── server.js             # Express app & static fayllar xizmati (PORT: 3000)
│   │   ├── middlewares/          # Telegram initData HMAC validatsiyasi va Admin tekshiruvi
│   │   └── routes/               # Public va Admin REST API marshrutlari
│   ├── bot/                      # GrammY Telegram Bot yadrosi va handlerlar
│   ├── services/                 # Jadval shakllantirish va admin xizmatlari
│   ├── scheduler/                # Cron avtomatik yuboruvchi
│   ├── utils/                    # Tashkent vaqti, formatlash va logger
│   └── index.js                  # Asosiy yagona start fayli
├── web/                          # Telegram Mini App Frontend
│   ├── index.html                # Asosiy SPA interfeysi
│   ├── css/
│   │   └── style.css             # Zamonaviy maktab dizayn tizimi, responsive & dark mode
│   └── js/
│       ├── telegram.js           # Telegram WebApp SDK ulanishi, haptics, theme sync
│       ├── api.js                # Backend REST API mijozi
│       ├── schedule.js           # Bugun, ertaga, hafta va o'qituvchi jadvali rendereri
│       ├── admin.js              # Mini App Admin paneli boshqaruvi
│       └── app.js                # SPA router, sinf tanlash mantiqi va toastlar
├── tests/                        # 46 ta avtomatlashtirilgan unit & integratsiya testlari
├── .env.example                  # Namuna sozlamalar
├── .env                          # Haqiqiy maxfiy sozlamalar (Gitga qo'shilmaydi)
└── package.json                  # Node.js dependencylari
```

---

## 🛠 O‘rnatish va Ishga Tushirish

### 1. Paketlarni o‘rnatish
```bash
npm install
```

### 2. `.env` faylini sozlash
Loyiha ildizidagi `.env` faylida quyidagi sozlamalar mavjud:

```env
# BotFather bergan token
BOT_TOKEN=8679664923:AAFN21f2NwA4v6C5JtweWQHpB6SzX_VP4JI

# Sizning Telegram raqamli ID ingiz (haqiqiy admin ID)
ADMIN_IDS=6105913215

# Admin panel paroli
ADMIN_PASSWORD=admin123

# Vaqt mintaqasi
TZ=Asia/Tashkent

# Standart yuborish vaqti
DEFAULT_SEND_TIME=06:00

# SQLite baza fayli
DB_PATH=./data/bot.sqlite

# Web Server porti (Mini App & API)
PORT=3000

# Telegram Web App HTTPS URL (Mini App manzili)
WEB_APP_URL=
```

> [!NOTE]
> **`.env.example` dagi `ADMIN_IDS=123456789,987654321` nima?**
> `.env.example` fayli — bu faqat **namuna (shablon)** bo‘lib, undagi `123456789` kabi raqamlar shunchaki misol tariqasida yozilgan.
> Haqiqiy admin sizning `.env` faylingizdagi `ADMIN_IDS=6105913215` hisoblanadi.

---

### 3. Namuna maktab ma'lumotlarini yuklash
```bash
npm run seed
```

### 4. Bot va Mini App Web Serverni ishga tushirish
```bash
npm start
```

Ishga tushgach:
- 🌐 Mini App Web Server: `http://localhost:3000`
- 🤖 Telegram Bot: [@JadvaliBot](https://t.me/JadvaliBot)

---

## 🌐 Telegram Mini App (Web App) ni BotFather orqali Ulash

Telegram ichida Mini App ochilishi uchun Telegram HTTPS URL talab qiladi.

### A) Local Test qilish usuli (ngrok yoki Cloudflare Tunnel orqali):
1. Bepul **ngrok** yoki **localtunnel** orqali 3000-portni tashqariga chiqaring:
   ```bash
   npx localtunnel --port 3000
   # yoki
   ngrok http 3000
   ```
2. Olingan HTTPS manzilni (masalan `https://maktab-app.loca.lt`) `.env` faylidagi `WEB_APP_URL=` ga yozing:
   ```env
   WEB_APP_URL=https://maktab-app.loca.lt
   ```
3. Botni qayta ishga tushiring (`npm start`).

### B) Telegram BotFather orqali Web App Menu Button sozlash:
1. Telegramda **[@BotFather](https://t.me/BotFather)** ga kiring.
2. `/mybots` buyrug‘ini yuboring va botingizni tanlang (`@JadvaliBot`).
3. **Bot Settings** → **Menu Button** → **Configure menu button** ni bosing.
4. Mini App URL manzilingizni kiriting: `https://sizning-sayt.uz`
5. Tugma nomini kiriting: `Dars jadvali 📱`

Endi botingizga kirgan har bir foydalanuvchida chap pastda `Dars jadvali 📱` tugmasi va menyuda `🌐 Dars jadvalini ochish` chiqadi!

---

## 🧪 Avtomatlashtirilgan Testlar

Loyihada **46 ta to‘liq unit va integratsiya testlari** mavjud:
```bash
npm test
```

Test qamrovi:
- 🔑 Admin paroli va PBKDF2 sessiya xavfsizligi (9 ta test)
- 🌐 REST API barcha endpointlari va Admin 403 himoyasi (8 ta test)
- 🔒 Telegram WebApp `initData` HMAC-SHA256 validatsiyasi (4 ta test)
- 👨‍🏫 O‘qituvchilar CRUD va dars qidiruv testi (4 ta test)
- 📚 Fanlar CRUD va emoji mapping (3 ta test)
- 🏫 Sinflar, darslar, foydalanuvchilar va sozlamalar bazasi (4 ta test)
- 🕒 O‘zbekiston vaqti (`Asia/Tashkent`) va hafta kunlari (3 ta test)
- 📩 Xabar shabloni dinamik rendereri (7 ta test)
- 📊 Formatter va xabarlar dizayni (4 ta test)

---

## 🌐 VPS Serverga Joylashtirish (24/7 Uzluksiz Ishlash)

```bash
# PM2 orqali bot va web serverni birgalikda ishga tushirish:
pm2 start src/index.js --name "maktab-bot-app"

# Server qayta yoqilganda avtomatik ishga tushishi uchun:
pm2 startup
pm2 save
```

---

Maktab ta'limi — kelajak poydevori! 🔔
