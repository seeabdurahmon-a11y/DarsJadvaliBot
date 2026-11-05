import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/bot.sqlite');
console.log('=== GROUPS IN DATABASE ===');
const groups = db.prepare('SELECT * FROM groups').all();
console.log(JSON.stringify(groups, null, 2));

console.log('=== LESSONS PER GROUP ===');
const counts = db.prepare(`
  SELECT g.id, g.name, g.telegram_chat_id, g.send_time, COUNT(l.id) as lesson_count
  FROM groups g
  LEFT JOIN lessons l ON g.id = l.group_id
  GROUP BY g.id
`).all();
console.log(JSON.stringify(counts, null, 2));

const lessons11D = db.prepare(`
  SELECT l.day_of_week, l.start_time, l.end_time, l.subject, l.teacher, l.room, g.name as group_name
  FROM lessons l
  JOIN groups g ON l.group_id = g.id
  WHERE g.name LIKE '%11%D%' OR g.name LIKE '%11-D%'
  ORDER BY l.day_of_week, l.start_time
`).all();
console.log('=== 11-D LESSONS (' + lessons11D.length + ' ta) ===');
console.log(JSON.stringify(lessons11D, null, 2));
