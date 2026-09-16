import express from 'express';
import { groupsRepo } from '../../database/groups.repo.js';
import { lessonsRepo } from '../../database/lessons.repo.js';
import { teachersRepo } from '../../database/teachers.repo.js';
import { subjectsRepo } from '../../database/subjects.repo.js';
import { usersRepo } from '../../database/users.repo.js';
import { scheduleService } from '../../services/schedule.service.js';
import { getTodayInfo, getTomorrowInfo } from '../../utils/date.util.js';
import { DAYS_LIST } from '../../config/constants.js';
import { config } from '../../config/index.js';

export const publicRouter = express.Router();

/**
 * GET /api/config
 */
publicRouter.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      schoolName: 'MAKTAB',
      timezone: config.TZ,
      defaultSendTime: config.DEFAULT_SEND_TIME,
      webAppUrl: config.WEB_APP_URL
    }
  });
});

/**
 * GET /api/auth/me
 */
publicRouter.get('/auth/me', (req, res) => {
  let savedGroupId = null;
  let savedGroupName = null;

  if (req.telegramUser?.id) {
    const user = usersRepo.getUserByTelegramId(req.telegramUser.id);
    if (user) {
      savedGroupId = user.selected_group_id;
      savedGroupName = user.selected_group_name;
    }
  }

  res.json({
    success: true,
    data: {
      user: req.telegramUser,
      isAdmin: req.isAdmin || false,
      selectedGroupId: savedGroupId,
      selectedGroupName: savedGroupName
    }
  });
});

/**
 * GET /api/classes
 */
publicRouter.get('/classes', (req, res) => {
  try {
    const classes = groupsRepo.getAllGroupsWithStats();
    res.json({
      success: true,
      data: classes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/classes/:id
 */
publicRouter.get('/classes/:id', (req, res) => {
  try {
    const classItem = groupsRepo.getGroupById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Sinf topilmadi' });
    }
    res.json({ success: true, data: classItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/classes/:id/schedule
 */
publicRouter.get('/classes/:id/schedule', (req, res) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const classItem = groupsRepo.getGroupById(groupId);
    if (!classItem) {
      return res.status(404).json({ success: false, error: 'Sinf topilmadi' });
    }

    const todayInfo = getTodayInfo();
    const tomorrowInfo = getTomorrowInfo();

    const todayLessons = lessonsRepo.getLessonsByDay(todayInfo.dayOfWeek, groupId);
    const tomorrowLessons = lessonsRepo.getLessonsByDay(tomorrowInfo.dayOfWeek, groupId);
    const weeklyLessons = lessonsRepo.getWeeklyLessons(groupId);

    // Group weekly by day (1..6)
    const weekByDay = DAYS_LIST.map(day => ({
      dayOfWeek: day.id,
      dayName: day.name,
      lessons: weeklyLessons.filter(l => l.day_of_week === day.id)
    }));

    res.json({
      success: true,
      data: {
        class: classItem,
        today: {
          info: todayInfo,
          lessons: todayLessons
        },
        tomorrow: {
          info: tomorrowInfo,
          lessons: tomorrowLessons
        },
        week: weekByDay
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedule/today
 */
publicRouter.get('/schedule/today', (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const schedule = scheduleService.getTodaySchedule(classId);
    res.json({
      success: true,
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedule/current (Hozirgi dars)
 */
publicRouter.get('/schedule/current', (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const current = scheduleService.getCurrentLesson(classId);
    res.json({
      success: true,
      data: current
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedule/tomorrow
 */
publicRouter.get('/schedule/tomorrow', (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const schedule = scheduleService.getTomorrowSchedule(classId);
    res.json({
      success: true,
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedule/week
 */
publicRouter.get('/schedule/week', (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId, 10) : null;
    const weeklyLessons = lessonsRepo.getWeeklyLessons(classId);

    const weekByDay = DAYS_LIST.map(day => ({
      dayOfWeek: day.id,
      dayName: day.name,
      lessons: weeklyLessons.filter(l => l.day_of_week === day.id)
    }));

    res.json({
      success: true,
      data: {
        classId,
        days: weekByDay
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/teachers
 */
publicRouter.get('/teachers', (req, res) => {
  try {
    const teachers = teachersRepo.getAllTeachers();
    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/teachers/:id/schedule
 */
publicRouter.get('/teachers/:id/schedule', (req, res) => {
  try {
    const teacher = teachersRepo.getTeacherById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'O‘qituvchi topilmadi' });
    }

    const teacherFullName = `${teacher.last_name} ${teacher.first_name}`.trim();
    const lessons = teachersRepo.getTeacherSchedule(teacherFullName);

    // Group by day of week
    const weekByDay = DAYS_LIST.map(day => ({
      dayOfWeek: day.id,
      dayName: day.name,
      lessons: lessons.filter(l => l.day_of_week === day.id)
    }));

    res.json({
      success: true,
      data: {
        teacher,
        lessons,
        week: weekByDay
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subjects
 */
publicRouter.get('/subjects', (req, res) => {
  try {
    const subjects = subjectsRepo.getAllSubjects();
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/user/preference
 */
publicRouter.post('/user/preference', (req, res) => {
  try {
    const { classId, telegramId } = req.body;
    const targetTelegramId = req.telegramUser?.id || telegramId;

    if (!targetTelegramId) {
      return res.status(400).json({ success: false, error: 'Telegram ID talab qilinadi' });
    }

    const updatedUser = usersRepo.setSelectedGroup(targetTelegramId, classId);
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/profile
 */
publicRouter.get('/user/profile', (req, res) => {
  try {
    const telegramId = req.telegramUser?.id || req.query.telegramId;
    if (!telegramId) {
      return res.json({
        success: true,
        data: {
          user: null,
          selectedGroup: null
        }
      });
    }

    const user = usersRepo.getUserByTelegramId(telegramId);
    res.json({
      success: true,
      data: {
        user: req.telegramUser || user,
        selectedGroup: user ? { id: user.selected_group_id, name: user.selected_group_name } : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
