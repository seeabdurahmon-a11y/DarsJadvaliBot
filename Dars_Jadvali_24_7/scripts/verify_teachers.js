import { getDatabase } from '../src/database/db.js';
import { scheduleService } from '../src/services/schedule.service.js';

const db = getDatabase();

const teachers = ['Xayitova D', 'Imomnazarova G', 'Tursunova N', 'Azizbekova M', 'Mamadaliyeva D'];

for (const t of teachers) {
  console.log(`\n================= TEACHER: ${t} =================`);
  const weekly = scheduleService.getTeacherWeeklySchedule(t, 1);
  console.log(weekly.formattedText);
}
