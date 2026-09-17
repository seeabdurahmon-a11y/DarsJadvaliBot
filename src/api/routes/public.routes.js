import express from 'express';
import { schoolsRepo } from '../../database/schools.repo.js';
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
  const school = req.school || schoolsRepo.getSchoolById(req.schoolId || 1) || { name: 'MAKTAB', code: 'M-01' };
  res.json({
    success: true,
    data: {
      schoolName: school.name,
      schoolCode: school.code,
      schoolId: school.id,
      timezone: config.TZ,
      defaultSendTime: school.default_send_time || config.DEFAULT_SEND_TIME,
      webAppUrl: config.WEB_APP_URL
    }
  });
});

/**
 * GET /api/schools
 * List all active schools with basic stats
 */
publicRouter.get('/schools', (req, res) => {
  try {
    const schools = schoolsRepo.getAllSchoolsWithStats();
    res.json({
      success: true,
      data: schools.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        region: s.region,
        groupsCount: s.groups_count,
        teachersCount: s.teachers_count,
        lessonsCount: s.lessons_count
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schools/:code
 * Get school by code (e.g. /api/schools/M-01 or /api/schools/1)
 */
publicRouter.get('/schools/:code', (req, res) => {
  try {
    const school = schoolsRepo.getSchoolByCode(req.params.code);
    if (!school) {
      return res.status(404).json({ success: false, error: 'Maktab topilmadi' });
    }
    const groups = groupsRepo.getAllGroups(true, school.id);
    res.json({
      success: true,
      data: {
        id: school.id,
        code: school.code,
        name: school.name,
        region: school.region,
        defaultSendTime: school.default_send_time,
        groupsCount: groups.length,
        groups
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/schools/login
 * Web site school admin login with code & password
 */
publicRouter.post('/schools/login', (req, res) => {
  try {
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ success: false, error: 'Maktab kodi va paroli kiritilishi shart' });
    }

    const school = schoolsRepo.getSchoolByCode(code);
    if (!school) {
      return res.status(404).json({ success: false, error: `"${code}" kodli maktab topilmadi` });
    }

    const isValid = schoolsRepo.verifyPassword(school.id, password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Parol noto‘g‘ri' });
    }

    res.json({
      success: true,
      message: 'Muvaffaqiyatli tizimga kirildi',
      token: `${school.code}:${password}`,
      school: {
        id: school.id,
        code: school.code,
        name: school.name,
        region: school.region,
        defaultSendTime: school.default_send_time
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/schools/register
 * Register a new school via Web site
 */
publicRouter.post('/schools/register', (req, res) => {
  try {
    const { code, name, region, admin_password, default_send_time } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Maktab nomi kiritilishi shart' });
    }

    const newSchool = schoolsRepo.addSchool({
      code: code ? code.trim() : null,
      name: name.trim(),
      region: region || '',
      admin_password: admin_password || 'admin123',
      default_send_time: default_send_time || '06:00'
    });

    res.json({
      success: true,
      message: `Yangi maktab muvaffaqiyatli yaratildi! Maktab kodi: ${newSchool.code}`,
      school: newSchool,
      token: `${newSchool.code}:${newSchool.admin_password}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
publicRouter.get('/auth/me', (req, res) => {
  let savedGroupId = null;
  let savedGroupName = null;
  let savedSchoolId = req.schoolId || 1;
  let savedSchoolName = req.school ? req.school.name : '1-maktab';
  let savedSchoolCode = req.school ? req.school.code : 'M-01';

  if (req.telegramUser?.id) {
    const user = usersRepo.getUserByTelegramId(req.telegramUser.id);
    if (user) {
      savedGroupId = user.selected_group_id;
      savedGroupName = user.selected_group_name;
      if (user.selected_school_id) {
        savedSchoolId = user.selected_school_id;
        savedSchoolName = user.selected_school_name;
        savedSchoolCode = user.selected_school_code;
      }
    }
  }

  res.json({
    success: true,
    data: {
      user: req.telegramUser,
      isAdmin: req.isAdmin || false,
      isSchoolAdmin: req.isSchoolAdmin || false,
      selectedSchoolId: savedSchoolId,
      selectedSchoolName: savedSchoolName,
      selectedSchoolCode: savedSchoolCode,
      selectedGroupId: savedGroupId,
      selectedGroupName: savedGroupName
    }
  });
});

/**
 * POST /api/user/preference
 */
publicRouter.post('/user/preference', (req, res) => {
  try {
    const { telegramId, classId, schoolId, schoolCode } = req.body;
    if (!telegramId) {
      return res.status(400).json({ success: false, error: 'telegramId kiritilishi shart' });
    }
    let targetSchoolId = schoolId;
    if (schoolCode) {
      const sch = schoolsRepo.getSchoolByCode(schoolCode);
      if (sch) targetSchoolId = sch.id;
    }
    const updated = usersRepo.upsertUser(telegramId, {
      selected_group_id: classId ? parseInt(classId, 10) : null,
      selected_school_id: targetSchoolId ? parseInt(targetSchoolId, 10) : null
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/classes
 */
publicRouter.get('/classes', (req, res) => {
  try {
    let targetSchoolId = req.schoolId;
    if (req.query.schoolCode) {
      const sch = schoolsRepo.getSchoolByCode(req.query.schoolCode);
      if (sch) targetSchoolId = sch.id;
    } else if (req.query.schoolId) {
      targetSchoolId = Number(req.query.schoolId);
    }

    const classes = groupsRepo.getAllGroupsWithStats(targetSchoolId);
    res.json({
      success: true,
      schoolId: targetSchoolId,
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

    // Group weekly by day
    const weeklyByDay = {};
    DAYS_LIST.forEach(d => {
      weeklyByDay[d.id] = {
        day: d,
        lessons: weeklyLessons.filter(l => l.day_of_week === d.id)
      };
    });

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
        weekly: weeklyByDay
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedule/now
 */
publicRouter.get('/schedule/now', (req, res) => {
  try {
    const groupId = req.query.groupId ? parseInt(req.query.groupId, 10) : null;
    const result = scheduleService.getCurrentLesson(groupId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/teachers
 */
publicRouter.get('/teachers', (req, res) => {
  try {
    let targetSchoolId = req.schoolId;
    if (req.query.schoolCode) {
      const sch = schoolsRepo.getSchoolByCode(req.query.schoolCode);
      if (sch) targetSchoolId = sch.id;
    } else if (req.query.schoolId) {
      targetSchoolId = Number(req.query.schoolId);
    }
    const teachers = teachersRepo.getAllTeachers(targetSchoolId);
    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/subjects
 */
publicRouter.get('/subjects', (req, res) => {
  try {
    let targetSchoolId = req.schoolId;
    if (req.query.schoolCode) {
      const sch = schoolsRepo.getSchoolByCode(req.query.schoolCode);
      if (sch) targetSchoolId = sch.id;
    } else if (req.query.schoolId) {
      targetSchoolId = Number(req.query.schoolId);
    }
    const subjects = subjectsRepo.getAllSubjects(targetSchoolId);
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
