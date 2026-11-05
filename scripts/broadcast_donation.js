import dotenv from 'dotenv';
dotenv.config();

import { Bot } from 'grammy';
import { usersRepo } from '../src/database/users.repo.js';
import { getDatabase, closeDatabase } from '../src/database/db.js';

// Asosiy production bot token (@JadvaliBot)
const PROD_TOKEN = '8679664923:AAFN21f2NwA4v6C5JtweWQHpB6SzX_VP4JI';
const BOT_TOKEN = process.env.BOT_TOKEN_PROD || PROD_TOKEN;

const bot = new Bot(BOT_TOKEN);

export const DONATION_MESSAGE = 
`🙏 <b>Hurmatli 32-maktab o‘quvchilari, ota-onalari va ustozlari!</b>\n\n` +
`Bizning <b>@JadvaliBot</b> loyihamiz sizga har kuni erta tongda dars jadvalini, bayram/ta'tillar xabarini va eslatmalarni bepul hamda qulay tarzda yetkazib bermoqda. 📱\n\n` +
`⚡️ <b>Muhim e'lon:</b>\n` +
`Botimiz doimiy, 24/7 rejimida to‘xtab qolmasdan ishlashi uchun har oy oz miqdorda server xarajati (oyiga taxminan 35 000 — 40 000 so‘m) talab etiladi.\n\n` +
`Loyihamiz to‘xtab qolmasligi va barcha uchun doimo faol bo‘lishi uchun ozgina bo‘lsa ham (1 000, 2 000 yoki 5 000 so‘m) hissa qo‘shishni istasangiz, quyidagi kartaga ixtiyoriy homiylik yuborishingiz mumkin:\n\n` +
`💳 <b>Karta raqami:</b>\n` +
`<code>5614 6812 7542 3402</code>\n` +
`👤 <b>Karta egasi:</b> A. Q.\n` +
`📌 <i>(Karta raqami ustiga bir marta bossangiz, avtomatik nusxalanadi)</i>\n\n` +
`Har bir kichik yordamingiz maktabimiz boti uzluksiz ishlashiga xizmat qiladi.\n` +
`E’tiboringiz va qo‘llab-quvvatlaganingiz uchun barchangizga katta rahmat! ❤️`;

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isTest = args.includes('--test'); // faqat adminga
  const isSendAll = args.includes('--all') || args.includes('--send');

  console.log('====================================================');
  console.log('📢 HOMIYLIK VA SERVER UCHUN XABAR YUBORISH TIZIMI');
  console.log('====================================================\n');
  console.log('📄 Xabar matni:');
  console.log('----------------------------------------------------');
  console.log(DONATION_MESSAGE.replace(/<[^>]+>/g, ''));
  console.log('----------------------------------------------------\n');

  getDatabase();
  const allUsers = usersRepo.getAllUsers();
  // Filter out anonymous bots or excluded user IDs
  const EXCLUDED_IDS = ['1087968824', '8398361381', '7433152984'];
  const validUsers = allUsers.filter(u => u.telegram_id && !EXCLUDED_IDS.includes(String(u.telegram_id)));

  console.log(`👥 Jami ro‘yxatdan o‘tgan foydalanuvchilar: ${validUsers.length} ta\n`);

  if (!isTest && !isSendAll) {
    console.log('ℹ️ Hozircha xabar yuborilmadi (PREVIEW rejimi).');
    console.log('👉 Tanlang:');
    console.log('   node scripts/broadcast_donation.js --test  (Faqat adminga sinov tariqasida yuborish)');
    console.log('   node scripts/broadcast_donation.js --all   (Barcha foydalanuvchilarga yuborish)');
    closeDatabase();
    return;
  }

  if (isTest) {
    const adminId = '6105913215'; // Abdurrohman
    console.log(`🚀 SINOV REJIMI: Xabar faqat adminga (ID: ${adminId}) yuborilmoqda...`);
    try {
      await bot.api.sendMessage(adminId, DONATION_MESSAGE, { parse_mode: 'HTML' });
      console.log('✅ Sinov xabari adminga muvaffaqiyatli yetkazildi!');
      console.log('Telegramingizni tekshiring. Agar ma\'qul kelsa, --all orqali barchaga yuborishingiz mumkin.');
    } catch (err) {
      console.error('❌ Adminga yuborishda xatolik:', err.message);
    }
    closeDatabase();
    return;
  }

  if (isSendAll) {
    console.log(`🚀 BARCHAGA YUBORISH BOSHLANDI (${validUsers.length} ta foydalanuvchi)...`);
    let sentCount = 0;
    let failCount = 0;

    for (const user of validUsers) {
      try {
        await bot.api.sendMessage(user.telegram_id, DONATION_MESSAGE, { parse_mode: 'HTML' });
        sentCount++;
        console.log(`  [${sentCount}/${validUsers.length}] ✅ Yuborildi: ${user.telegram_id} (${user.first_name || user.username || 'Foydalanuvchi'})`);
        // Telegram flood limitiga tushmaslik uchun 50ms kechikish
        await new Promise(r => setTimeout(r, 60));
      } catch (sendErr) {
        failCount++;
        console.warn(`  [!] ⚠️ Yuborilmadi: ${user.telegram_id} — ${sendErr.message}`);
      }
    }

    console.log('\n====================================================');
    console.log(`🎉 YAKUNLANDI!`);
    console.log(`✅ Yetib bordi: ${sentCount} ta`);
    console.log(`❌ Yetib bormadi (bloklaganlar): ${failCount} ta`);
    console.log('====================================================');
    closeDatabase();
  }
}

main().catch(err => {
  console.error('Kutilmagan xatolik:', err);
  closeDatabase();
});
