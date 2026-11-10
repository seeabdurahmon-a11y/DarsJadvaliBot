import express from 'express';
import { requireAdminMiddleware } from '../middlewares/telegramAuth.js';
import { schoolsRepo } from '../../database/schools.repo.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { lessonsRepo } from '../../database/lessons.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { subjectsRepo } from '../../database/subjects.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { settingsRepo } from '../../database/settings.repo.js';
import { adminService } from '../../services/admin.service.js';
import { vacationService } from '../../services/vacation.service.js';
import { templateUtil } from '../../utils/template.util.js';
import { getTodayInfo } from '../../utils/date.util.js';

export const adminRouter = express.Router();

// Apply requireAdminMiddleware to all routes in adminRouter
adminRouter.use(requireAdminMiddleware);

function getEffectiveSchoolId(req) {
  if (req.body?.school_id) return Number(req.body.school_id);
  if (req.query?.schoolId) return Number(req.query.schoolId);
  if (req.query?.schoolCode) {
    const s = schoolsRepo.getSchoolByCode(req.query.schoolCode);
    if (s) return s.id;
  }
  return req.schoolId || 1;
}

/**
 * GET /api/admin/stats
 */
adminRouter.get('/stats', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const school = schoolsRepo.getSchoolById(schoolId);
    const groups = groupsRepo.getAllGroupsWithStats(schoolId);
    const teachersCount = teachersRepo.getTeachersCount(schoolId);
    const subjectsCount = subjectsRepo.getSubjectsCount(schoolId);
    const lessonsCount = lessonsRepo.getLessonsCount(schoolId);
    const usersCount = usersRepo.getUsersCount(schoolId);

    res.json({
      success: true,
      data: {
        school,
        classesCount: groups.length,
        groupsCount: groups.length,
        lessonsCount,
        teachersCount,
        subjectsCount,
        usersCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Barcha foydalanuvchilar ro'yxati va ularning Telegram ID lari
 */
adminRouter.get('/users', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const users = usersRepo.getAllUsersWithDetails(schoolId);
    res.json({
      success: true,
      data: {
        total: users.length,
        users
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * TEMPLATE MANAGEMENT
 */
adminRouter.get('/template', (req, res) => {
  try {
    const template = templateUtil.getTemplate();
    const isCustom = templateUtil.isCustom();
    const defaults = templateUtil.getDefaults();
    res.json({ success: true, data: { ...template, isCustom, defaults } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template/preview', (req, res) => {
  try {
    const { header, lesson_format, footer, show_teacher, show_room } = req.body;
    const sampleGroup = { name: '10-A sinf' };
    const sampleDateInfo = getTodayInfo();
    const sampleLessons = [
      { lesson_number: 1, start_time: '08:00', end_time: '08:45', subject: 'Matematika', teacher: 'Aliyev A.', room: '204' },
      { lesson_number: 2, start_time: '08:50', end_time: '09:35', subject: 'Ona tili', teacher: 'Karimova N.', room: '102' }
    ];

    const preview = templateUtil.formatCustomSchedule(
      { header, lesson_format, footer, show_teacher, show_room },
      sampleGroup,
      sampleLessons,
      sampleDateInfo
    );

    res.json({ success: true, data: { preview } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template', (req, res) => {
  try {
    const { header, lesson_format, footer, show_teacher, show_room } = req.body;
    const saved = templateUtil.saveTemplate({ header, lesson_format, footer, show_teacher, show_room });
    res.json({ success: true, data: saved, message: 'Shablon muvaffaqiyatli saqlandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template/reset', (req, res) => {
  try {
    const defaults = templateUtil.resetTemplate();
    res.json({ success: true, data: defaults, message: 'Shablon standart holatga qaytarildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * CLASSES CRUD (Scoped to school)
 */
adminRouter.post('/classes', (req, res) => {
  try {
    const { name, send_time, telegram_chat_id } = req.body;
    const schoolId = getEffectiveSchoolId(req);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Sinf nomi kiritilishi shart' });
    }

    const newClass = groupsRepo.addGroup({
      school_id: schoolId,
      name: name.trim(),
      send_time: send_time || undefined,
      telegram_chat_id: telegram_chat_id || undefined
    });

    res.json({ success: true, data: newClass });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/classes/:id', (req, res) => {
  try {
    const { name, send_time, is_active } = req.body;
    const updated = groupsRepo.updateGroup(req.params.id, { name, send_time, is_active });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Sinf topilmadi' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/classes/:id', (req, res) => {
  try {
    groupsRepo.deleteGroup(req.params.id);
    res.json({ success: true, message: 'Sinf muvaffaqiyatli o‘chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * TEACHERS CRUD (Scoped to school)
 */
adminRouter.post('/teachers', (req, res) => {
  try {
    const { first_name, last_name, subject, phone } = req.body;
    const schoolId = getEffectiveSchoolId(req);

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Ism va familiya kiritilishi shart' });
    }

    const teacher = teachersRepo.addTeacher({ school_id: schoolId, first_name, last_name, subject, phone });
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/teachers/:id', (req, res) => {
  try {
    const { first_name, last_name, subject, phone } = req.body;
    const updated = teachersRepo.updateTeacher(req.params.id, { first_name, last_name, subject, phone });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'O‘qituvchi topilmadi' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/teachers/:id', (req, res) => {
  try {
    teachersRepo.deleteTeacher(req.params.id);
    res.json({ success: true, message: 'O‘qituvchi muvaffaqiyatli o‘chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * SUBJECTS CRUD
 */
adminRouter.post('/subjects', (req, res) => {
  try {
    const { name, emoji, code } = req.body;
    const schoolId = getEffectiveSchoolId(req);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Fan nomi kiritilishi shart' });
    }

    const subject = subjectsRepo.addSubject({ school_id: schoolId, name, emoji, code });
    res.json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/subjects/:id', (req, res) => {
  try {
    subjectsRepo.deleteSubject(req.params.id);
    res.json({ success: true, message: 'Fan muvaffaqiyatli o‘chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * LESSONS CRUD (Add / Edit / Delete)
 */
adminRouter.post('/lessons', (req, res) => {
  try {
    const { group_id, day_of_week, start_time, end_time, subject, teacher, room, date } = req.body;
    const schoolId = getEffectiveSchoolId(req);

    if (!group_id || !day_of_week || !start_time || !end_time || !subject) {
      return res.status(400).json({ success: false, error: 'Majburiy maydonlar to‘ldirilmagan' });
    }

    const lesson = lessonsRepo.addLesson({
      school_id: schoolId,
      group_id: Number(group_id),
      day_of_week: Number(day_of_week),
      start_time,
      end_time,
      subject,
      teacher: teacher || null,
      room: room || null,
      date: date || null
    });

    res.json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/lessons/:id', (req, res) => {
  try {
    const updated = lessonsRepo.updateLesson(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dars topilmadi' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/lessons/:id', (req, res) => {
  try {
    lessonsRepo.deleteLesson(req.params.id);
    res.json({ success: true, message: 'Dars muvaffaqiyatli o‘chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * BULK TIMETABLE IMPORT (Sayt orqali to'liq jadvalni 1 zumda yuklash)
 */
adminRouter.post('/import-timetable', (req, res) => {
  try {
    const { classes } = req.body;
    const schoolId = getEffectiveSchoolId(req);

    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ success: false, error: 'Sinflar ma’lumotlari massiv shaklida bo‘lishi kerak' });
    }

    let insertedClasses = 0;
    let insertedLessons = 0;

    for (const cls of classes) {
      if (!cls.name) continue;
      const group = groupsRepo.addGroup({
        school_id: schoolId,
        name: cls.name.trim(),
        send_time: cls.send_time || '06:00'
      });
      insertedClasses++;

      if (Array.isArray(cls.lessons)) {
        for (const l of cls.lessons) {
          if (!l.subject || !l.day_of_week || !l.start_time || !l.end_time) continue;
          lessonsRepo.addLesson({
            school_id: schoolId,
            group_id: group.id,
            day_of_week: Number(l.day_of_week),
            start_time: l.start_time,
            end_time: l.end_time,
            subject: l.subject,
            teacher: l.teacher || null,
            room: l.room || null
          });
          insertedLessons++;
        }
      }
    }

    const existingGroups = groupsRepo.getAllGroups(true, schoolId);
    const importedNormNames = new Set(classes.map(c => groupsRepo.normalizeClassName(c.name)));
    const missingClasses = existingGroups
      .filter(g => !importedNormNames.has(groupsRepo.normalizeClassName(g.name)))
      .map(g => g.name);

    res.json({
      success: true,
      message: `Muvaffaqiyatli import qilindi: ${insertedClasses} ta sinf, ${insertedLessons} ta dars${missingClasses.length ? ` (⚠️ ${missingClasses.length} ta sinf yangi faylda yo‘q: ${missingClasses.join(', ')})` : ''}`,
      insertedClasses,
      insertedLessons,
      missingClasses
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/conflicts
 * Returns all active teacher clashes/conflicts in the school
 */
adminRouter.get('/conflicts', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const conflicts = lessonsRepo.detectTeacherConflicts(schoolId);
    res.json({
      success: true,
      count: conflicts.length,
      conflicts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/check-conflicts
 * Checks proposed lessons for clashes before saving
 */
adminRouter.post('/check-conflicts', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { classId, lessons } = req.body;

    if (!Array.isArray(lessons)) {
      return res.status(400).json({ success: false, error: 'Darslar massivi yuborilishi kerak' });
    }

    // Get all other lessons in school except this class
    const allWeekly = lessonsRepo.getWeeklyLessons(null, schoolId);
    const otherLessons = classId ? allWeekly.filter(l => Number(l.group_id) !== Number(classId)) : allWeekly;
    const combined = [...otherLessons, ...lessons.map(l => ({ ...l, group_id: classId, school_id: schoolId }))];

    const conflicts = lessonsRepo.detectTeacherConflicts(schoolId, combined);
    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      count: conflicts.length,
      conflicts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/save-class-timetable
 * Saves complete weekly schedule for a single class with conflict checking
 */
adminRouter.post('/save-class-timetable', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { classId, lessons, force } = req.body;

    if (!classId) {
      return res.status(400).json({ success: false, error: 'Sinf tanlanmagan' });
    }

    const group = groupsRepo.getGroupById(classId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Sinf topilmadi' });
    }

    const validLessons = (Array.isArray(lessons) ? lessons : []).filter(l => l.subject && l.day_of_week && l.start_time && l.end_time);

    // Conflict detection
    if (!force) {
      const allWeekly = lessonsRepo.getWeeklyLessons(null, schoolId);
      const otherLessons = allWeekly.filter(l => Number(l.group_id) !== Number(classId));
      const combined = [...otherLessons, ...validLessons.map(l => ({ ...l, group_id: classId, group_name: group.name, school_id: schoolId }))];
      const conflicts = lessonsRepo.detectTeacherConflicts(schoolId, combined);

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          hasConflicts: true,
          count: conflicts.length,
          conflicts,
          error: `Diqqat: ${conflicts.length} ta ustozda dars to‘qnashuvi aniqlandi!`
        });
      }
    }

    // Delete existing lessons for this group
    lessonsRepo.deleteLessonsByGroupId(classId);

    // Insert all new lessons
    let inserted = 0;
    for (const l of validLessons) {
      lessonsRepo.addLesson({
        school_id: schoolId,
        group_id: Number(classId),
        day_of_week: Number(l.day_of_week),
        start_time: l.start_time,
        end_time: l.end_time,
        subject: l.subject,
        teacher: l.teacher || null,
        room: l.room || null
      });
      inserted++;
    }

    res.json({
      success: true,
      message: `${group.name} sinfining ${inserted} ta darsi muvaffaqiyatli saqlandi!`,
      inserted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/swap-lessons
 * Swaps two lessons in database and validates conflicts
 */
adminRouter.post('/swap-lessons', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { idA, idB } = req.body;

    if (!idA || !idB) {
      return res.status(400).json({ success: false, error: 'Ikkala dars ID si kiritilishi shart' });
    }

    const result = lessonsRepo.swapLessons(idA, idB);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Darslar topilmadi' });
    }

    const conflicts = lessonsRepo.detectTeacherConflicts(schoolId);
    res.json({
      success: true,
      message: 'Darslar o‘rni muvaffaqiyatli almashtirildi!',
      data: result,
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/bulk-save-timetable
 * Saves multiple classes' timetables at once
 */
adminRouter.post('/bulk-save-timetable', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { classes, force } = req.body;

    if (!Array.isArray(classes)) {
      return res.status(400).json({ success: false, error: 'Sinflar ro‘yxati yuborilishi shart' });
    }

    // Prepare all proposed lessons across school
    const proposedAll = [];
    for (const c of classes) {
      if (!c.classId || !Array.isArray(c.lessons)) continue;
      for (const l of c.lessons) {
        if (!l.subject || !l.day_of_week || !l.start_time || !l.end_time) continue;
        proposedAll.push({
          group_id: Number(c.classId),
          group_name: c.className || `Sinf #${c.classId}`,
          school_id: schoolId,
          day_of_week: Number(l.day_of_week),
          start_time: l.start_time,
          end_time: l.end_time,
          subject: l.subject,
          teacher: l.teacher || null,
          room: l.room || null
        });
      }
    }

    if (!force) {
      const conflicts = lessonsRepo.detectTeacherConflicts(schoolId, proposedAll);
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          hasConflicts: true,
          count: conflicts.length,
          conflicts,
          error: `Diqqat: ${conflicts.length} ta ustozda dars to‘qnashuvi aniqlandi!`
        });
      }
    }

    let savedClassesCount = 0;
    let totalLessonsCount = 0;

    for (const c of classes) {
      if (!c.classId || !Array.isArray(c.lessons)) continue;
      lessonsRepo.deleteLessonsByGroupId(c.classId);
      for (const l of c.lessons) {
        if (!l.subject || !l.day_of_week || !l.start_time || !l.end_time) continue;
        lessonsRepo.addLesson({
          school_id: schoolId,
          group_id: Number(c.classId),
          day_of_week: Number(l.day_of_week),
          start_time: l.start_time,
          end_time: l.end_time,
          subject: l.subject,
          teacher: l.teacher || null,
          room: l.room || null
        });
        totalLessonsCount++;
      }
      savedClassesCount++;
    }

    res.json({
      success: true,
      message: `Jami ${savedClassesCount} ta sinf va ${totalLessonsCount} ta dars muvaffaqiyatli saqlandi!`,
      savedClassesCount,
      totalLessonsCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/vacation
 * Save or toggle school vacation settings
 */
adminRouter.post('/vacation', (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { isActive, startDate, endDate, title, message } = req.body;

    const updated = vacationService.setVacation(schoolId, {
      isActive,
      startDate,
      endDate,
      title,
      message
    });

    res.json({
      success: true,
      message: 'Ta‘til sozlamalari muvaffaqiyatli saqlandi!',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/substitute-lesson
 * Quick lesson substitution (changing subject, teacher, room for a lesson)
 */
adminRouter.post('/substitute-lesson', async (req, res) => {
  try {
    const schoolId = getEffectiveSchoolId(req);
    const { lessonId, subject, teacher, room, notifyGroup } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'Dars ID si ko‘rsatilishi shart' });
    }

    const currentLesson = lessonsRepo.getLessonById(lessonId);
    if (!currentLesson) {
      return res.status(404).json({ success: false, error: 'Dars topilmadi' });
    }

    const updated = lessonsRepo.updateLesson(lessonId, {
      subject: subject || currentLesson.subject,
      teacher: typeof teacher !== 'undefined' ? teacher : currentLesson.teacher,
      room: typeof room !== 'undefined' ? room : currentLesson.room
    });

    // Agar Telegram guruhiga bildirishnoma yuborish so'ralsa
    let notificationSent = false;
    if (notifyGroup) {
      const group = groupsRepo.getGroupById(currentLesson.group_id);
      if (group && group.telegram_chat_id && req.app.get('bot')) {
        const bot = req.app.get('bot');
        const alertText = `⚡ <b>DIQQAT: Dars jadvalida o‘zgarish!</b>\n\n` +
          `👥 <b>Sinf:</b> <b>${group.name}</b>\n` +
          `⏰ <b>Dars vaqti:</b> <code>${updated.start_time} — ${updated.end_time}</code>\n` +
          `📚 <b>Yangi fan:</b> <b>${updated.subject}</b>\n` +
          (updated.teacher ? `👨‍🏫 <b>O‘qituvchi:</b> ${updated.teacher}\n` : '') +
          (updated.room ? `🚪 <b>Xona:</b> ${updated.room}-xona\n` : '') +
          `\n<i>O‘quvchilar va ustozlar diqqatiga yetkaziladi.</i>`;

        try {
          await bot.api.sendMessage(group.telegram_chat_id, alertText, { parse_mode: 'HTML' });
          notificationSent = true;
        } catch (e) {
          console.warn('Guruhga o‘zgarish bildirishnomasini yuborishda xatolik:', e.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Dars muvaffaqiyatli almashtirildi!',
      notificationSent,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ========================================================
 * SUPER ADMIN: MAKTABLAR VA AKKAUNTLAR BOSHQARUVI
 * ========================================================
 */

/**
 * GET /api/admin/schools
 * Barcha maktablar ro'yxati va ularning parollari (faqat adminlar uchun)
 */
adminRouter.get('/schools', (req, res) => {
  try {
    const schools = schoolsRepo.getAllSchoolsWithStats();
    res.json({
      success: true,
      data: schools.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        region: s.region,
        admin_name: s.admin_name,
        admin_email: s.admin_email,
        admin_password: s.admin_password,
        default_send_time: s.default_send_time,
        is_active: s.is_active,
        groups_count: s.groups_count || 0,
        teachers_count: s.teachers_count || 0,
        lessons_count: s.lessons_count || 0,
        users_count: s.users_count || 0,
        created_at: s.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/schools
 * Yangi maktab akkauntini yaratish
 */
adminRouter.post('/schools', (req, res) => {
  try {
    const { name, code, admin_name, admin_email, region, admin_password, default_send_time } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Maktab nomini kiritish shart' });
    }

    if (admin_email && admin_email.trim()) {
      const existing = schoolsRepo.getSchoolByEmail(admin_email.trim());
      if (existing) {
        return res.status(400).json({ success: false, error: `Ushbu email (${admin_email}) allaqachon boshqa maktabga bog‘langan` });
      }
    }

    const created = schoolsRepo.addSchool({
      name: name.trim(),
      code: code ? code.trim() : '',
      admin_name: admin_name ? admin_name.trim() : 'Zavuch / Admin',
      admin_email: admin_email ? admin_email.trim() : '',
      region: region ? region.trim() : '',
      admin_password: admin_password ? admin_password.trim() : 'darsjadvoli0751',
      default_send_time: default_send_time ? default_send_time.trim() : '06:00'
    });

    res.json({
      success: true,
      message: `Yangi maktab (${created.name} - ${created.code}) muvaffaqiyatli yaratildi!`,
      data: created
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/schools/:id/password
 * Maktab parolini o'zgartirish
 */
adminRouter.put('/schools/:id/password', (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Yangi parol kamida 4 ta belgidan iborat bo‘lishi kerak' });
    }

    const school = schoolsRepo.getSchoolById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: 'Maktab topilmadi' });
    }

    const updated = schoolsRepo.updatePassword(schoolId, password.trim());

    res.json({
      success: true,
      message: `"${updated.name}" maktabi paroli muvaffaqiyatli yangilandi!`,
      data: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        admin_password: updated.admin_password
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/schools/:id
 * Maktabni o'chirish
 */
adminRouter.delete('/schools/:id', (req, res) => {
  try {
    const schoolId = Number(req.params.id);
    if (schoolId === 1) {
      return res.status(400).json({ success: false, error: 'Asosiy maktabni (ID: 1) o‘chirib bo‘lmaydi!' });
    }

    const school = schoolsRepo.getSchoolById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: 'Maktab topilmadi' });
    }

    schoolsRepo.deleteSchool(schoolId);

    res.json({
      success: true,
      message: `"${school.name}" maktabi muvaffaqiyatli o‘chirildi!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
