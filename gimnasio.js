/* ================================================
   DATA LAYER — localStorage
   ================================================ */
const STORAGE_KEY = 'gymtracker_v2';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let appData = loadData();
// appData.days     = { "YYYY-MM-DD": true/false }
// appData.routines = [ { id, name, group: [], exercises: [{name, sets, reps, weight, unit}] } ]
if (!appData.days)     appData.days     = {};
if (!appData.routines) appData.routines = [];

/* ================================================
   CALENDAR
   ================================================ */
let calYear, calMonth;

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function initCal() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCal();
}

function renderCal() {
  const grid    = document.getElementById('cal-grid');
  const heading = document.getElementById('cal-month');
  heading.textContent = MONTHS_ES[calMonth] + ' ' + calYear;

  grid.innerHTML = '';

  const now   = new Date();
  const today = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  // First day of month (Mon=0 ... Sun=6)
  const firstDate = new Date(calYear, calMonth, 1);
  let startDow = firstDate.getDay(); // Sun=0
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key     = toKey(calYear, calMonth, d);
    const dayDate = new Date(calYear, calMonth, d);
    const isTodayDay = key === today;
    const isPast  = dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFuture= dayDate > new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;
    el.dataset.key = key;

    if (isTodayDay) el.classList.add('today');
    if (isFuture)   el.classList.add('future');

    const val = appData.days[key];
    if (val === true) {
      el.classList.add('gym-yes');
    } else if (val === false || (isPast && val === undefined)) {
      el.classList.add('gym-no');
      if (val === undefined && isPast) appData.days[key] = false;
    }

    if (!isFuture) {
      el.addEventListener('click', () => toggleDay(key));
    }
    grid.appendChild(el);
  }
  saveData(appData);
  updateAlerts();
  updateStreak();
}

function toggleDay(key) {
  const today = new Date();
  const d = new Date(key);
  if (d > today) return;
  appData.days[key] = appData.days[key] !== true;
  saveData(appData);
  renderCal();
}

function toKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

document.getElementById('cal-prev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCal();
});
document.getElementById('cal-next').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCal();
});

/* ================================================
   ALERTS
   ================================================ */
function updateAlerts() {
  const today = new Date();
  today.setHours(0,0,0,0);

  let missed = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (appData.days[key] === false || (appData.days[key] === undefined && d <= today)) {
      missed++;
    } else {
      break;
    }
  }

  const a4 = document.getElementById('alert-4');
  const a6 = document.getElementById('alert-6');
  a4.classList.remove('show');
  a6.classList.remove('show');

  if (missed >= 6) {
    a6.classList.add('show');
  } else if (missed >= 4) {
    a4.classList.add('show');
  }
}

const MEDALS = [
  { label: '🥉 Bronce',   days: 7,   cls: 'bronze'  },
  { label: '🥉 Bronce+',  days: 15,  cls: 'bronze'  },
  { label: '🥈 Plata',    days: 30,  cls: 'silver'  },
  { label: '🥈 Plata+',   days: 60,  cls: 'silver'  },
  { label: '🥇 Oro',      days: 100, cls: 'gold'    },
  { label: '🥇 Oro+',     days: 180, cls: 'gold'    },
  { label: '💎 Diamante', days: 270, cls: 'diamond' },
  { label: '🏆 Leyenda',  days: 365, cls: 'diamond' },
];

function updateStreak() {
  const today = new Date();
  today.setHours(0,0,0,0);

  // Day streak calculation:
  // We check from today backwards. If today is not marked, we allow a 1-day gap 
  // (so the streak doesn't break at 00:01 AM).
  let dayStreak = 0;
  for (let i = 0; i < 2000; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (appData.days[key] === true) { 
      dayStreak++; 
    } else {
      if (i === 0) continue; // Skip today if empty, check yesterday
      else break; // Broken
    }
  }

  document.getElementById('streak-days').textContent        = dayStreak;
  document.getElementById('header-streak-val').textContent  = dayStreak;

  // Render medals
  const medalsRow = document.getElementById('medals-row');
  medalsRow.innerHTML = '';
  MEDALS.forEach(m => {
    const earned = dayStreak >= m.days;
    const chip = document.createElement('div');
    chip.className = `medal-chip ${m.cls}${earned ? '' : ' inactive'}`;
    chip.innerHTML = `<span class="icon">${m.label.split(' ')[0]}</span><span>${m.label.split(' ').slice(1).join(' ')}<br><small style="font-size:.6rem;font-weight:400;">${m.days} días</small></span>`;
    chip.title = earned ? `¡Conseguida a los ${m.days} días!` : `Consíguela a los ${m.days} días`;
    medalsRow.appendChild(chip);
  });

  // Progress bar to next medal
  const nextMedal = MEDALS.find(m => dayStreak < m.days);
  const progWrap  = document.getElementById('progress-wrap');
  if (nextMedal) {
    const prevMedal = [...MEDALS].reverse().find(m => dayStreak >= m.days);
    const from = prevMedal ? prevMedal.days : 0;
    const to   = nextMedal.days;
    const pct  = Math.round(((dayStreak - from) / (to - from)) * 100);
    document.getElementById('progress-label-text').textContent = `Próximo: ${nextMedal.label}`;
    document.getElementById('progress-label-val').textContent  = `${dayStreak} / ${to} días`;
    document.getElementById('progress-fill').style.width = pct + '%';
    progWrap.style.display = '';
  } else {
    document.getElementById('progress-label-text').textContent = '¡Nivel máximo alcanzado! 🏆';
    document.getElementById('progress-label-val').textContent  = dayStreak + ' días';
    document.getElementById('progress-fill').style.width = '100%';
  }
}

/* ================================================
   ROUTINES
   ================================================ */
let editingRoutineId = null;

const GROUP_COLORS = {
  'Pecho':    { bg:'#fde8e6', color:'#b83225' },
  'Espalda':  { bg:'#e6f0ff', color:'#2a5bbf' },
  'Pierna':   { bg:'#e8f5e9', color:'#2e7d32' },
  'Hombros':  { bg:'#fff3e0', color:'#bf6d00' },
  'Bíceps':   { bg:'#f3e5f5', color:'#7b1fa2' },
  'Tríceps':  { bg:'#e8eaf6', color:'#3949ab' },
  'Abdomen':  { bg:'#e0f7fa', color:'#00797a' },
  'Full Body':{ bg:'#fff8e1', color:'#c9920a' },
  'Cardio':   { bg:'#fce4ec', color:'#ad1457' },
};

function renderRoutines() {
  const list = document.getElementById('routine-list');
  list.innerHTML = '';
  if (appData.routines.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="icon">📋</div>
      <div style="font-size:.9rem;font-weight:600;color:var(--text-mid);margin-bottom:4px;">Sin rutinas todavía</div>
      <div>Crea tu primera rutina con ejercicios, series y repeticiones.</div>
    </div>`;
    return;
  }
  appData.routines.forEach(r => {
    const groups = Array.isArray(r.group) ? r.group : (r.group ? [r.group] : []);
    const groupTags = groups.map(g => {
      const gc = GROUP_COLORS[g] || {};
      return `<span class="routine-group-tag" style="background:${gc.bg};color:${gc.color};">${g}</span>`;
    }).join(' ');
    const item = document.createElement('div');
    item.className = 'routine-item';
    item.innerHTML = `
      <div class="routine-item-header" onclick="toggleRoutine('${r.id}')">
        <div class="routine-name">
          <span>💪</span>
          <span class="routine-name-text">${escHtml(r.name)}</span>
          ${groupTags}
          <span class="routine-tag">${r.exercises.length} ejerc.</span>
        </div>
        <div class="routine-actions">
          <button class="btn-icon play" title="Iniciar rutina" onclick="event.stopPropagation();startSession('${r.id}')">▶️</button>
          <button class="btn-icon" title="Editar" onclick="event.stopPropagation();editRoutine('${r.id}')">✏️</button>
          <button class="btn-icon danger" title="Eliminar" onclick="event.stopPropagation();deleteRoutine('${r.id}')">🗑️</button>
        </div>
      </div>
      <div class="exercise-list" id="exlist-${r.id}">
        ${r.exercises.length > 0 ? `
        <table class="exercise-table">
          <thead><tr>
            <th>#</th><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Peso</th>
          </tr></thead>
          <tbody>
            ${r.exercises.map((e,i) => `
            <tr>
              <td><span class="ex-num">${i+1}</span></td>
              <td style="font-weight:500;">${escHtml(e.name)}</td>
              <td><span class="ex-badge"><span>${e.sets}</span>&nbsp;×</span></td>
              <td><span class="ex-badge"><span>${e.reps}</span>&nbsp;reps</span></td>
              <td>${e.weight ? `<span class="ex-badge kg"><span>${e.weight}</span>&nbsp;${e.unit || 'kg'}</span>` : '<span style="color:var(--text-soft);font-size:.72rem;">—</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div style="font-size:.78rem;color:var(--text-soft);padding:4px 0;">Sin ejercicios añadidos.</div>'}
        <button class="routine-start-btn" onclick="startSession('${r.id}')">▶ Iniciar esta rutina</button>
      </div>`;
    list.appendChild(item);
  });
}

function toggleRoutine(id) {
  document.getElementById('exlist-' + id).classList.toggle('open');
}

// ---- MUSCLE TAG SELECTION ----
let selectedGroup = '';

function initMuscleTags() {
  document.querySelectorAll('.muscle-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      // Update hidden input with comma separated values for convenience if needed, 
      // but saveRoutine will query the DOM directly now.
    });
  });
}

function setActiveMuscleTags(groups) {
  const groupArr = Array.isArray(groups) ? groups : (groups ? [groups] : []);
  document.querySelectorAll('.muscle-tag-btn').forEach(b => {
    b.classList.toggle('active', groupArr.includes(b.dataset.tag));
  });
}

// ---- OPEN / CLOSE MODAL ----
function openRoutineModal(name = '', exercises = [], id = null, group = '') {
  editingRoutineId = id;
  document.getElementById('modal-title').textContent = id ? 'Editar rutina' : 'Nueva rutina';
  document.getElementById('routine-name-input').value = name;
  document.getElementById('exercise-fields').innerHTML = '';
  exFieldCount = 0;
  setActiveMuscleTags(group);
  exercises.forEach(e => addExerciseField(e.name, e.sets, e.reps, e.weight || '', e.unit || 'kg'));
  if (exercises.length === 0) addExerciseField();
  document.getElementById('modal-overlay').classList.add('show');
  setTimeout(() => document.getElementById('routine-name-input').focus(), 100);
}

function closeRoutineModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  editingRoutineId = null;
}

// ---- ADD EXERCISE FIELD ----
let exFieldCount = 0;

function addExerciseField(name = '', sets = 3, reps = 12, weight = '', unit = 'kg') {
  exFieldCount++;
  const idx  = exFieldCount;
  const wrap = document.getElementById('exercise-fields');
  const row  = document.createElement('div');
  row.className = 'exercise-field-row';
  row.innerHTML = `
    <button type="button" class="remove-ex-btn" onclick="this.closest('.exercise-field-row').remove(); updateExNumbers();" title="Quitar">✕</button>
    <div class="field-group">
      <label><span class="field-ex-num">${idx}</span>Ejercicio</label>
      <input type="text" class="ex-name-inp" placeholder="Ej: Press de banca" value="${escHtml(name)}" maxlength="60" oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '')"/>
    </div>
    <div class="field-row-nums">
      <div class="field-group">
        <label>Series</label>
        <input type="number" class="ex-sets-inp" min="1" max="20" value="${sets}"/>
      </div>
      <div class="field-group">
        <label>Reps</label>
        <input type="number" class="ex-reps-inp" min="1" max="999" value="${reps}"/>
      </div>
      <div class="field-group" style="flex: 1.5;">
        <label>Peso</label>
        <div style="display: flex; gap: 4px;">
          <input type="number" class="ex-weight-inp" min="0" max="999" step="0.5" placeholder="—" value="${weight}" oninput="this.value = this.value.replace(/[^0-9.]/g, '')"/>
          <select class="ex-unit-sel" style="width: 65px; padding: 9px 4px;">
            <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="lb" ${unit === 'lb' ? 'selected' : ''}>lb</option>
          </select>
        </div>
      </div>
    </div>`;
  wrap.appendChild(row);
  updateExNumbers();
}

function updateExNumbers() {
  document.querySelectorAll('#exercise-fields .exercise-field-row').forEach((row, i) => {
    const num = row.querySelector('.field-ex-num');
    if (num) num.textContent = i + 1;
  });
}

// ---- SAVE ROUTINE ----
function saveRoutine() {
  const name = document.getElementById('routine-name-input').value.trim();
  if (!name) {
    const inp = document.getElementById('routine-name-input');
    inp.focus();
    inp.style.borderColor = 'var(--red)';
    setTimeout(() => inp.style.borderColor = '', 1500);
    return;
  }
  const groupElements = document.querySelectorAll('.muscle-tag-btn.active');
  const group = Array.from(groupElements).map(el => el.dataset.tag);
  const rows  = document.querySelectorAll('#exercise-fields .exercise-field-row');
  const exercises = [];
  rows.forEach(r => {
    const n = r.querySelector('.ex-name-inp').value.trim();
    const s = parseInt(r.querySelector('.ex-sets-inp').value) || 3;
    const p = parseInt(r.querySelector('.ex-reps-inp').value) || 12;
    const w = parseFloat(r.querySelector('.ex-weight-inp').value) || 0;
    const u = r.querySelector('.ex-unit-sel').value;
    if (n) exercises.push({ name: n, sets: s, reps: p, weight: w || '', unit: u });
  });

  if (exercises.length === 0) {
    alert('Añade al menos un ejercicio a la rutina.');
    return;
  }

  if (editingRoutineId) {
    const idx = appData.routines.findIndex(r => r.id === editingRoutineId);
    if (idx > -1) appData.routines[idx] = { id: editingRoutineId, name, group, exercises };
  } else {
    appData.routines.push({ id: 'r' + Date.now(), name, group, exercises });
  }
  saveData(appData);
  closeRoutineModal();
  renderRoutines();
}

function editRoutine(id) {
  const r = appData.routines.find(r => r.id === id);
  if (r) openRoutineModal(r.name, r.exercises, r.id, r.group || '');
}

function deleteRoutine(id) {
  if (!confirm('¿Seguro que quieres eliminar esta rutina? No se puede deshacer.')) return;
  appData.routines = appData.routines.filter(r => r.id !== id);
  saveData(appData);
  renderRoutines();
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeRoutineModal();
});

/* ================================================
   SESSION (WORKOUT MODE)
   ================================================ */
let sessionTimer   = null;
let sessionSeconds = 0;
let sessionRoutine = null;
let sessionDoneMap = {};

function startSession(id) {
  const r = appData.routines.find(r => r.id === id);
  if (!r) return;
  sessionRoutine = r;
  sessionDoneMap = {};
  sessionSeconds = 0;
  document.getElementById('session-title').textContent = r.name;
  renderSessionBody();
  updateSessionProgress();
  document.getElementById('session-overlay').classList.add('show');
  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    sessionSeconds++;
    const m = String(Math.floor(sessionSeconds/60)).padStart(2,'0');
    const s = String(sessionSeconds%60).padStart(2,'0');
    document.getElementById('session-timer').textContent = m + ':' + s;
  }, 1000);
}

function renderSessionBody() {
  const body = document.getElementById('session-body');
  body.innerHTML = '';
  sessionRoutine.exercises.forEach((ex, ei) => {
    const card = document.createElement('div');
    card.className = 'session-ex-card';
    const setRows = Array.from({length: ex.sets}, (_,si) => {
      const key  = `${ei}-${si}`;
      const done = !!sessionDoneMap[key];
      return `<div class="session-set-row${done?' done':''}" onclick="toggleSessionSet('${ei}','${si}',this)">
        <div class="set-num">${si+1}</div>
        <div class="set-info">${ex.reps} reps${ex.weight ? ' · ' + ex.weight + ' ' + (ex.unit || 'kg') : ''}</div>
        <div class="set-check">${done ? '✅' : '⬜'}</div>
      </div>`;
    }).join('');
    card.innerHTML = `
      <div class="session-ex-name">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:.7rem;font-weight:700;">${ei+1}</span>
        ${escHtml(ex.name)}
      </div>
      <div class="session-sets">${setRows}</div>`;
    body.appendChild(card);
  });
}

function toggleSessionSet(ei, si, el) {
  const key = `${ei}-${si}`;
  sessionDoneMap[key] = !sessionDoneMap[key];
  el.classList.toggle('done', !!sessionDoneMap[key]);
  el.querySelector('.set-check').textContent = sessionDoneMap[key] ? '✅' : '⬜';
  updateSessionProgress();
}

function updateSessionProgress() {
  if (!sessionRoutine) return;
  const total = sessionRoutine.exercises.reduce((a,e) => a + e.sets, 0);
  const done  = Object.values(sessionDoneMap).filter(Boolean).length;
  document.getElementById('session-progress').textContent = `${done} / ${total} series completadas`;
}

function closeSession() {
  if (!confirm('¿Salir del entrenamiento? El progreso se perderá.')) return;
  clearInterval(sessionTimer);
  sessionTimer = null;
  document.getElementById('session-overlay').classList.remove('show');
}

function finishSession() {
  clearInterval(sessionTimer);
  sessionTimer = null;
  const total = sessionRoutine.exercises.reduce((a,e) => a + e.sets, 0);
  const done  = Object.values(sessionDoneMap).filter(Boolean).length;
  const m = String(Math.floor(sessionSeconds/60)).padStart(2,'0');
  const s = String(sessionSeconds%60).padStart(2,'0');
  document.getElementById('session-overlay').classList.remove('show');
  // Auto-mark today as gym day
  const today = new Date();
  const key = toKey(today.getFullYear(), today.getMonth(), today.getDate());
  appData.days[key] = true;
  saveData(appData);
  renderCal();
  alert(`🎉 ¡Entrenamiento completado!\n⏱ Tiempo: ${m}:${s}\n✅ Series: ${done} / ${total}\n\n¡Hoy se ha marcado como día de gimnasio!`);
}

/* ================================================
   HELPER
   ================================================ */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ================================================
   INIT
   ================================================ */
initMuscleTags();
initCal();
renderRoutines();
