import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/bot.sqlite');

// 1. 11-D sinfni topish
const class11D = db.prepare("SELECT * FROM groups WHERE name LIKE '%11%D%' OR name LIKE '%11-D%' LIMIT 1").get();
console.log('11-D Class:', class11D);

if (class11D) {
  // 2. VOID guruhini o'chirish (chunki u faqat bo'sh chat_id sifatida qo'shilgan)
  db.prepare("DELETE FROM groups WHERE telegram_chat_id = '-1003129974505' AND id != ?").run(class11D.id);
  
  // 3. 11-D sinfga VOID chat_id sini biriktirish
  db.prepare("UPDATE groups SET telegram_chat_id = '-1003129974505', is_active = 1 WHERE id = ?").run(class11D.id);

  console.log('✅ VOID guruhiga 11-D sinf dars jadvali muvaffaqiyatli biriktirildi!');
}

const updatedGroup = db.prepare("SELECT * FROM groups WHERE telegram_chat_id = '-1003129974505'").get();
console.log('Yangilangan guruh holati:', updatedGroup);

const lessonCount = db.prepare("SELECT count(*) as total FROM lessons WHERE group_id = ?").get(updatedGroup.id);
console.log(`Ushbu guruhga tegishli darslar soni: ${lessonCount.total} ta`);
