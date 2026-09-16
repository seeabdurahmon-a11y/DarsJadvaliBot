import express from 'express';
import { requireAdminMiddleware } from '../middlewares/telegramAuth.js';
import { groupsRepo } from '../../database/groups.repo.js';
import { lessonsRepo } from '../../database/lessons.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { subjectsRepo } from '../../database/subjects.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { settingsRepo } from '../../database/settings.repo.js';
import { adminService } from '../../services/admin.service.js';
import { templateUtil } from '../../utils/template.util.js';
import { getTodayInfo } from '../../utils/date.util.js';

export const adminRouter = express.Router();

// Apply requireAdminMiddleware to all routes in adminRouter
adminRouter.use(requireAdminMiddleware);

/**
 * GET /api/admin/stats
 */
adminRouter.get('/stats', (req, res) => {
  try {
    const stats = adminService.getStats();
    const teachersCount = teachersRepo.getTeachersCount();
    const subjectsCount = subjectsRepo.getSubjectsCount();

    res.json({
      success: true,
      data: {
        ...stats,
        teachersCount,
        subjectsCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * CLASSES CRUD
 */
adminRouter.post('/classes', (req, res) => {
  try {
    const { name, send_time, telegram_chat_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Sinf nomi kiritilishi shart' });
    }

    const newClass = groupsRepo.addGroup({
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
 * TEACHERS CRUD
 */
adminRouter.post('/teachers', (req, res) => {
  try {
    const { first_name, last_name, subject, phone } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Ism va familiya kiritilishi shart' });
    }

    const teacher = teachersRepo.addTeacher({ first_name, last_name, subject, phone });
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
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Fan nomi kiritilishi shart' });
    }

    const subject = subjectsRepo.addSubject({ name, emoji, code });
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
 * LESSONS CRUD
 */
adminRouter.get('/lessons', (req, res) => {
  try {
    const groupId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const lessons = lessonsRepo.getAllLessons(groupId);
    res.json({ success: true, data: lessons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/lessons', (req, res) => {
  try {
    const { group_id, day_of_week, start_time, end_time, subject, teacher, room, date } = req.body;

    if (!group_id || day_of_week === undefined || !start_time || !end_time || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Sinf, hafta kuni, boshlanish/tugash vaqti va fan majburiy'
      });
    }

    const lesson = lessonsRepo.addLesson({
      group_id: parseInt(group_id, 10),
      day_of_week: parseInt(day_of_week, 10),
      start_time,
      end_time,
      subject,
      teacher,
      room,
      date
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
 * MESSAGE TEMPLATE
 */
adminRouter.get('/template', (req, res) => {
  try {
    const template = templateUtil.getTemplate();
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template', (req, res) => {
  try {
    const { header, footer, body } = req.body;
    const validation = templateUtil.validateTemplate({ header, footer, body });

    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors.join(', ') });
    }

    const saved = templateUtil.saveTemplate({ header, footer, body });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template/reset', (req, res) => {
  try {
    const def = templateUtil.resetTemplate();
    res.json({ success: true, data: def });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/template/preview', (req, res) => {
  try {
    const { header, footer, body, classId } = req.body;
    const preview = templateUtil.generatePreview({ header, footer, body }, classId);
    res.json({ success: true, data: { preview } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * BROADCAST / SEND NOW
 */
adminRouter.post('/send-now', async (req, res) => {
  try {
    const { classId } = req.body;
    const bot = req.app.get('telegramBot');

    if (!bot) {
      return res.status(500).json({ success: false, error: 'Telegram Bot instansiyasi topilmadi' });
    }

    let result;
    if (classId && classId !== 'all') {
      const classItem = groupsRepo.getGroupById(classId);
      if (!classItem) {
        return res.status(404).json({ success: false, error: 'Sinf topilmadi' });
      }
      result = await adminService.sendScheduleToGroup(bot, classItem);
    } else {
      result = await adminService.sendScheduleToAllGroups(bot);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * SEND TIME
 */
adminRouter.post('/send-time', (req, res) => {
  try {
    const { send_time, classId } = req.body;
    if (!send_time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(send_time.trim())) {
      return res.status(400).json({ success: false, error: 'Noto‘g‘ri vaqt formati (HH:mm bo‘lishi kerak)' });
    }

    if (classId && classId !== 'all') {
      groupsRepo.setGroupSendTime(classId, send_time.trim());
    } else {
      settingsRepo.setSetting('default_send_time', send_time.trim());
    }

    res.json({ success: true, message: `Yuborish vaqti ${send_time.trim()} ga muvaffaqiyatli o‘zgartirildi` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
