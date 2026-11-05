import { scheduleService } from '../src/services/schedule.service.js';
import { groupsRepo } from '../src/database/groups.repo.js';

const group = groupsRepo.getGroupByChatId('-1003129974505');
console.log('Group found for VOID chatId:', group);

const schedule = scheduleService.getTodaySchedule(group.id);
console.log('=== TODAY SCHEDULE FOR VOID (11-D SINF) ===');
console.log(schedule.formattedText);
