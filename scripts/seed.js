import { importOfficialSchedule } from './import_excel_schedule.js';
import { closeDatabase } from '../src/database/db.js';

async function main() {
  try {
    importOfficialSchedule();
    closeDatabase();
  } catch (err) {
    console.error('Seed import error:', err);
    process.exit(1);
  }
}

main();
