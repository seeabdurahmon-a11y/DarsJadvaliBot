import { Api } from './api.js';
import { Icons } from './icons.js';

export const ScheduleView = {
  activeDayTab: 'today', // 'today' | 'tomorrow'
  activeWeekDay: 1, // 1=Dush..6=Shanba

  async renderDaily(container, currentClassId, mode = 'today') {
    this.activeDayTab = mode;
    container.innerHTML = `<div class="state-box"><div class="skeleton" style="height:120px;margin-bottom:12px;"></div><div class="skeleton" style="height:60px;"></div></div>`;

    try {
      if (!currentClassId) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">${Icons.school}</div>
            <div class="state-title">Hali sinf tanlanmagan</div>
            <div class="state-desc">Dars jadvalini ko‘rish uchun yuqoridagi "Sinfni tanlash" tugmasini bosing.</div>
            <button class="class-selector-btn" onclick="window.App.openClassModal()">${Icons.school} Sinfni tanlash</button>
          </div>
        `;
        return;
      }

      const scheduleData = mode === 'today'
        ? await Api.getTodaySchedule(currentClassId)
        : await Api.getTomorrowSchedule(currentClassId);

      const info = mode === 'today' ? scheduleData.today : scheduleData.tomorrow;
      const lessons = scheduleData.lessons || [];

      // Hozirgi darsni va tanaffusni aniqlash (faqat bugun uchun)
      let currentLesson = null;
      let nextLesson = null;
      let pastLessons = [];
      let nowTimeStr = null;

      if (mode === 'today') {
        try {
          const now = new Date();
          nowTimeStr = new Intl.DateTimeFormat('uz-UZ', {
            timeZone: 'Asia/Tashkent',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(now);

          lessons.forEach(l => {
            if (l.start_time && l.end_time) {
              if (nowTimeStr >= l.start_time && nowTimeStr <= l.end_time) {
                currentLesson = l;
              } else if (nowTimeStr < l.start_time && !nextLesson) {
                nextLesson = l;
              } else if (nowTimeStr > l.end_time) {
                pastLessons.push(l);
              }
            }
          });
        } catch (e) {
          console.warn('Time format error:', e);
        }
      }

      let html = `
        <div class="schedule-info-banner">
          <div>
            <div class="schedule-date-title">${mode === 'today' ? 'BUGUN' : 'ERTAGA'}</div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">${info.formattedDate || ''} ${nowTimeStr ? `• ${nowTimeStr}` : ''}</div>
          </div>
          <div class="schedule-class-name" onclick="window.App.openClassModal()" style="cursor:pointer;" title="Sinfni o'zgartirish">
            ${scheduleData.formattedText ? (scheduleData.groupName || 'Sinf') : 'Sinf'} ▾
          </div>
        </div>
      `;

      // Agar ta'til bo'lsa
      if (scheduleData.isVacation) {
        const vInfo = scheduleData.vacation || {};
        html += `
          <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border:1.5px solid #f59e0b;border-radius:14px;padding:16px;margin-bottom:14px;color:#92400e;box-shadow:0 4px 12px rgba(245,158,11,0.15);">
            <div style="font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px;">
              🏖️ Maktab Ta'tilda! (${vInfo.title || "Ta'til"})
            </div>
            <div style="font-size:13px;font-weight:600;margin-top:6px;line-height:1.4;">
              Hurmatli o‘quvchilar va ota-onalar! Hozirda maktabda ta'til davri davom etmoqda.
            </div>
            ${vInfo.startDate && vInfo.endDate ? `
              <div style="margin-top:8px;font-size:12px;background:rgba(255,255,255,0.7);padding:6px 10px;border-radius:8px;display:inline-block;font-weight:700;">
                📅 Muddat: <b>${vInfo.startDate} — ${vInfo.endDate}</b>
              </div>
            ` : ''}
            <div style="margin-top:10px;font-size:12px;font-weight:700;color:#78350f;">
              🎉 Maroqli hordiq tilaymiz!
            </div>
          </div>
        `;
        container.innerHTML = html;
        return;
      }

      // Hozirgi dars holati banneri va eslatma
      if (mode === 'today' && lessons.length > 0) {
        if (currentLesson) {
          const lHue = [...String(currentLesson.subject || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
          html += `
            <div class="current-lesson-hero" style="border-left:6px solid hsl(${lHue} 80% 50%);">
              <div class="hero-top-row">
                <span class="live-pulse-dot"></span>
                <span class="hero-tag">HOZIRGI DARS</span>
                <span class="hero-time">${Icons.clock} ${currentLesson.start_time} — ${currentLesson.end_time}</span>
              </div>
              <div class="hero-subject">${currentLesson.subject}</div>
              <div class="hero-meta">
                ${currentLesson.teacher ? `<span>${currentLesson.teacher}</span>` : ''}
                ${currentLesson.room ? `<span class="mono">· ${currentLesson.room}-xona</span>` : ''}
                ${nextLesson ? `<span style="margin-left:auto;opacity:0.9;">Keyingi: ${nextLesson.subject} (${nextLesson.start_time})</span>` : '<span style="margin-left:auto;opacity:0.9;">Oxirgi dars</span>'}
              </div>
            </div>
          `;
        } else if (nextLesson) {
          // Vaqt farqini hisoblash
          let diffMin = null;
          if (nowTimeStr && nextLesson.start_time) {
            const [nowH, nowM] = nowTimeStr.split(':').map(Number);
            const [nxtH, nxtM] = nextLesson.start_time.split(':').map(Number);
            diffMin = (nxtH * 60 + nxtM) - (nowH * 60 + nowM);
          }

          if (diffMin !== null && diffMin <= 5 && diffMin >= 0) {
            html += `
              <div class="next ring">
                🔔 <b>${diffMin} daqiqadan so‘ng:</b> ${nextLesson.subject} ${nextLesson.room ? `(${nextLesson.room}-xona)` : ''}ga boring!
              </div>
            `;
          } else {
            html += `
              <div class="next">
                <span>Keyingi dars: <b>${nextLesson.subject}</b></span>
                <span class="chip mono">${nextLesson.start_time}</span>
                ${nextLesson.room ? `<span class="mono">· ${nextLesson.room}-xona</span>` : ''}
              </div>
            `;
          }
        } else if (pastLessons.length === lessons.length) {
          html += `
            <div class="next">
              Bugungi barcha darslar yakunlandi. Maroqli hordiq!
            </div>
          `;
        }
      }

      if (lessons.length === 0) {
        html += `
          <div class="state-box">
            <div class="state-icon">${Icons.calendar}</div>
            <div class="state-title">${mode === 'today' ? 'Bugun' : 'Ertaga'} darslar mavjud emas</div>
            <div class="state-desc">Ushbu kunga jadval kiritilmagan yoki dam olish kuni.</div>
          </div>
        `;
      } else {
        html += `<div class="lessons-list">`;
        lessons.forEach((lesson, index) => {
          const isThisCurrent = currentLesson && lesson.id === currentLesson.id;
          const isNext = !currentLesson && nextLesson && lesson.id === nextLesson.id;
          const hue = [...String(lesson.subject || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

          html += `
            <div class="lesson-card ${isThisCurrent ? 'is-current' : ''} ${isNext ? 'is-next' : ''}" style="--h:${hue};">
              <div class="lesson-index-badge ${isThisCurrent ? 'is-current-badge' : ''}">${lesson.lesson_number || index + 1}</div>
              <div class="lesson-body">
                <div class="lesson-subject-name">
                  <span>${lesson.subject}</span>
                  ${isThisCurrent ? '<span class="active-now-tag" style="background:var(--cobalt);color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;margin-left:6px;font-weight:700;">HOZIR</span>' : ''}
                  ${isNext ? '<span class="next-up-tag" style="background:var(--lemon);color:#111;padding:2px 8px;border-radius:99px;font-size:10px;margin-left:6px;font-weight:700;">KEYINGI</span>' : ''}
                </div>
                <div class="lesson-meta-row">
                  ${lesson.teacher ? `
                    <div class="lesson-meta-item">
                      <span class="icon-inline">${Icons.teacher}</span>
                      <span>${lesson.teacher}</span>
                    </div>
                  ` : ''}
                  ${lesson.room ? `
                    <div class="lesson-meta-item">
                      <span class="icon-inline">${Icons.room}</span>
                      <span class="mono">${lesson.room}-xona</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              <div class="chip mono">${lesson.start_time || ''}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-title">Jadvalni yuklashda xatolik</div>
          <div class="state-desc">${err.message}</div>
          <button class="class-selector-btn" onclick="window.App.refreshCurrentView()">Qayta urinish</button>
        </div>
      `;
    }
  },

  async renderWeek(container, currentClassId) {
    container.innerHTML = `<div class="state-box"><div class="skeleton" style="height:160px;"></div></div>`;

    try {
      if (!currentClassId) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">${Icons.school}</div>
            <div class="state-title">Hali sinf tanlanmagan</div>
            <div class="state-desc">Haftalik jadvalni ko‘rish uchun sinfingizni tanlang.</div>
            <button class="class-selector-btn" onclick="window.App.openClassModal()">Sinfni tanlash</button>
          </div>
        `;
        return;
      }

      const weekData = await Api.getWeekSchedule(currentClassId);
      const days = weekData.days || [];

      let html = `
        <div class="section-header">
          <div class="section-title">Haftalik Dars Jadvali</div>
        </div>
        <div class="tab-pills" id="week-day-pills">
      `;

      days.forEach(d => {
        const activeClass = d.dayOfWeek === this.activeWeekDay ? 'active' : '';
        html += `
          <button class="tab-pill ${activeClass}" onclick="window.ScheduleView.selectWeekDay(${d.dayOfWeek})">
            ${d.dayName} (${d.lessons.length})
          </button>
        `;
      });

      html += `</div><div id="week-day-content">`;

      const selectedDay = days.find(d => d.dayOfWeek === this.activeWeekDay) || days[0];
      if (selectedDay) {
        html += this.renderDayLessonsHtml(selectedDay);
      }

      html += `</div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-title">Haftalik jadvalni yuklashda xatolik</div>
          <div class="state-desc">${err.message}</div>
          <button class="class-selector-btn" onclick="window.App.refreshCurrentView()">Qayta urinish</button>
        </div>
      `;
    }
  },

  selectWeekDay(dayOfWeek) {
    this.activeWeekDay = dayOfWeek;
    const pills = document.querySelectorAll('#week-day-pills .tab-pill');
    pills.forEach((p, idx) => {
      p.classList.toggle('active', idx + 1 === dayOfWeek);
    });

    const contentDiv = document.getElementById('week-day-content');
    if (contentDiv && window.App?.currentClassId) {
      this.renderWeek(document.getElementById('week-view-container'), window.App.currentClassId);
    }
  },

  renderDayLessonsHtml(dayObj) {
    if (!dayObj.lessons || dayObj.lessons.length === 0) {
      return `
        <div class="state-box">
          <div class="state-icon">${Icons.calendar}</div>
          <div class="state-title">${dayObj.dayName} kunida darslar yo‘q</div>
          <div class="state-desc">Ushbu kunga dars jadvali kiritilmagan.</div>
        </div>
      `;
    }

    let html = `<div class="lessons-list">`;
    dayObj.lessons.forEach((lesson, index) => {
      const hue = [...String(lesson.subject || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
      html += `
        <div class="lesson-card" style="--h:${hue};">
          <div class="lesson-index-badge">${lesson.lesson_number || index + 1}</div>
          <div class="lesson-body">
            <div class="lesson-subject-name">
              <span>${lesson.subject}</span>
            </div>
            <div class="lesson-meta-row">
              ${lesson.teacher ? `
                <div class="lesson-meta-item">
                  <span class="icon-inline">${Icons.teacher}</span>
                  <span>${lesson.teacher}</span>
                </div>
              ` : ''}
              ${lesson.room ? `
                <div class="lesson-meta-item">
                  <span class="icon-inline">${Icons.room}</span>
                  <span class="mono">${lesson.room}-xona</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="chip mono">${lesson.start_time || ''}</div>
        </div>
      `;
    });
    html += `</div>`;
    return html;
  },

  async renderTeacherSchedule(container) {
    container.innerHTML = `<div class="state-box"><div class="skeleton" style="height:120px;"></div></div>`;

    try {
      const teachers = await Api.getTeachers();

      if (teachers.length === 0) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">${Icons.teacher}</div>
            <div class="state-title">O‘qituvchilar mavjud emas</div>
            <div class="state-desc">Tizimga hali o‘qituvchilar ro‘yxati kiritilmagan.</div>
          </div>
        `;
        return;
      }

      let html = `
        <div class="section-header">
          <div class="section-title">O‘qituvchi Dars Jadvali</div>
        </div>
        <div class="teacher-select-box">
          <select class="custom-select" id="teacher-picker-select" onchange="window.ScheduleView.onTeacherSelected(this.value)">
            <option value="">-- O‘qituvchini tanlang --</option>
            ${teachers.map(t => `<option value="${t.id}">${t.last_name} ${t.first_name} (${t.subject || 'O‘qituvchi'})</option>`).join('')}
          </select>
        </div>
        <div id="teacher-schedule-results">
          <div class="state-box">
            <div class="state-title">O‘qituvchini tanlang</div>
            <div class="state-desc">Yuqoridagi ro‘yxatdan o‘qituvchini tanlab, uning dars jadvalini ko‘ring.</div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-title">Xatolik yuz berdi</div>
          <div class="state-desc">${err.message}</div>
        </div>
      `;
    }
  },

  async onTeacherSelected(teacherId) {
    const resultsContainer = document.getElementById('teacher-schedule-results');
    if (!resultsContainer) return;

    if (!teacherId) {
      resultsContainer.innerHTML = `
        <div class="state-box">
          <div class="state-title">O‘qituvchini tanlang</div>
          <div class="state-desc">Yuqoridagi ro‘yxatdan o‘qituvchini tanlab, uning dars jadvalini ko‘ring.</div>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = `<div class="state-box"><div class="skeleton" style="height:120px;"></div></div>`;

    try {
      const data = await Api.getTeacherSchedule(teacherId);
      const teacher = data.teacher;
      const week = data.week || [];

      let html = `
        <div class="teacher-card-badge">
          <div class="teacher-avatar">${(teacher.first_name || 'U')[0]}</div>
          <div class="teacher-info">
            <h3>${teacher.last_name} ${teacher.first_name}</h3>
            <p>Fan: ${teacher.subject || 'Fan biriktirilmagan'}</p>
            ${teacher.phone ? `<p>Tel: ${teacher.phone}</p>` : ''}
          </div>
        </div>
      `;

      let totalLessons = 0;
      week.forEach(day => {
        if (day.lessons && day.lessons.length > 0) {
          totalLessons += day.lessons.length;
          html += `
            <div class="week-day-group">
              <div class="week-day-header">
                <span>${day.dayName}</span>
                <span class="lesson-room-pill">${day.lessons.length} ta dars</span>
              </div>
              <div class="week-day-lessons">
          `;

          day.lessons.forEach(l => {
            const hue = [...String(l.subject || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
            html += `
              <div class="week-mini-lesson" style="background:hsl(${hue} 85% 92%);border-left:4px solid hsl(${hue} 80% 45%);border-radius:10px;padding:8px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <span class="mono" style="font-weight:700;font-size:12px;color:var(--text-main);">${l.start_time}</span>
                  <span style="background:rgba(0,0,0,0.06);padding:2px 8px;border-radius:6px;font-weight:700;margin:0 4px;font-size:12px;">${l.group_name || 'Sinf'}</span>
                  <strong style="color:var(--text-main);">${l.subject}</strong>
                </div>
                ${l.room ? `<span class="chip mono" style="font-size:11px;">${l.room}-xona</span>` : ''}
              </div>
            `;
          });

          html += `</div></div>`;
        }
      });

      if (totalLessons === 0) {
        html += `
          <div class="state-box">
            <div class="state-icon">${Icons.calendar}</div>
            <div class="state-title">Darslar topilmadi</div>
            <div class="state-desc">Ushbu o‘qituvchiga hozircha darslar biriktirilmagan.</div>
          </div>
        `;
      }

      resultsContainer.innerHTML = html;
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="state-box">
          <div class="state-title">Xatolik</div>
          <div class="state-desc">${err.message}</div>
        </div>
      `;
    }
  }
};
