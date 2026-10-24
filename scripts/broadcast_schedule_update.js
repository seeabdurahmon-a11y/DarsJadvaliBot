import dotenv from 'dotenv';
dotenv.config();

import { Bot, InlineKeyboard } from 'grammy';
import { usersRepo } from '../src/database/users.repo.js';
import { getDatabase, closeDatabase } from '../src/database/db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi!');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

export const ANNOUNCEMENT_TEXT = 
`🔔 <b>DIQQAT: MAKTAB DARS JADVALI YANGILANDI!</b> 📅\n\n` +
`Hurmatli ustozlar, o‘quvchilar va ota-onalar!\n\n` +
`Maktabimizda <b>yangi dars jadvali (19.10.2026 holatiga ko‘ra)</b> tizimga to‘liq yuklandi va amaliyotga tatbiq etildi.\n\n` +
`✨ <b>Asosiy o‘zgarishlar:</b>\n` +
`• Barcha 40 ta sinf (1-A dan 11-G gacha) dars jadvallari yangilandi.\n` +
`• Ayrim fanlar va dars soatlari o‘zaro optimallashtirildi.\n` +
`• O‘qituvchilar dars vaqtlari qayta muvofiqlashtirildi.\n\n` +
`📌 <i>O‘zingizning sinfingiz yoki dars jadvalingizni quyidagi tugma orqali tekshirib olishingiz mumkin.</i>`;

export const ANNOUNCEMENT_KEYBOARD = new InlineKeyboard()
  .text('📅 Mening sinfim jadvali', 'user_my_class_menu')
  .row()
  .text('🔄 Maktab / Sinfni almashtirish', 'user_reset_profile_prompt');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isTest = args.includes('--test'); // faqat adminlarga
  const isSendAll = args.includes('--all') || args.includes('--send');

  console.log('==================================================');
  console.log('📢 DARS JADVALI YANGILANISHI BILDIRISHNOMASI');
  console.log('==================================================');
  console.log('\n📄 Xabar matni (HTML preview):\n');
  console.log(ANNOUNCEMENT_TEXT);
  console.log('\n🔘 Tugmalar: [📅 Mening sinfim jadvali] [🔄 Maktab / Sinfni almashtirish]\n');

  const allUsers = usersRepo.getAllUsers();
  const validUsers = allUsers.filter(u => u.telegram_id && String(u.telegram_id) !== '1087968824');

  console.log(`👥 Jami ro‘yxatdan o‘tgan foydalanuvchilar: ${validUsers.length} ta`);
  validUsers.forEach((u, i) => {
    console.log(`  ${i + 1}. ID: ${u.telegram_id} | Ismi: ${u.first_name || u.username || 'Noma\'lum'} | Roli: ${u.role || 'O‘quvchi'}`);
  });

  if (isDryRun || (!isTest && !isSendAll)) {
    console.log('\nℹ️ Bu faqat PREVIEW (ko‘rik) rejimi. Xabar yuborilmadi.');
    console.log('👉 Yuborish uchun:');
    console.log('   node scripts/broadcast_schedule_update.js --test  (faqat adminga sinov tariqasida)');
    console.log('   node scripts/broadcast_schedule_update.js --all   (barchaga yuborish)');
    closeDatabase();
    return;
  }

  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim());
  const recipients = isTest 
    ? validUsers.filter(u => adminIds.includes(String(u.telegram_id)))
    : validUsers;

  console.log(`\n🚀 ${recipients.length} ta foydalanuvchiga yuborilmoqda...`);

  let sent = 0;
  let failed = 0;

  for (const u of recipients) {
    try {
      await bot.api.sendMessage(u.telegram_id, ANNOUNCEMENT_TEXT, {
        parse_mode: 'HTML',
        reply_markup: ANNOUNCEMENT_KEYBOARD
      });
      sent++;
      console.log(`✅ [${sent}/${recipients.length}] Yuborildi: ${u.first_name || u.username} (${u.telegram_id})`);
      await new Promise(r => setTimeout(r, 60));
    } catch (err) {
      failed++;
      console.error(`❌ [Xato] ${u.first_name || u.username} (${u.telegram_id}):`, err.message);
    }
  }

  console.log(`\n🎉 Natija: Jami: ${recipients.length}, Yuborildi: ${sent}, Xato: ${failed}`);
  closeDatabase();
}

if (process.argv[1]?.endsWith('broadcast_schedule_update.js')) {
  main().catch(err => {
    console.error('Fatal error:', err);
    closeDatabase();
    process.exit(1);
  });
}
