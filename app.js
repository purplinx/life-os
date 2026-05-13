// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'life_tracker_v1';

let state = {
  currentView: 'dashboard',
  goals: [],
  habits: [],
  moods: [],
  journal: [],
};

// ── Persistence ────────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed, currentView: 'dashboard' };
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
}

function saveState() {
  const { currentView, ...data } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearAllData() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { currentView: 'dashboard', goals: [], habits: [], moods: [], journal: [] };
  renderMain();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getHabitStreak(habit) {
  let streak = 0;
  const d = new Date();
  let skippedToday = false;
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (habit.completions && habit.completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (!skippedToday && key === today()) {
        skippedToday = true;
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const MOOD_EMOJIS = ['😞', '😕', '😐', '😊', '😄'];
const MOOD_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#34d399'];

function moodEmoji(level) {
  return MOOD_EMOJIS[Math.min(Math.max((level || 3) - 1, 0), 4)];
}

function moodColor(level) {
  return MOOD_COLORS[Math.min(Math.max((level || 3) - 1, 0), 4)];
}

const CAT_CLASS = {
  health: 'cat-health', career: 'cat-career', personal: 'cat-personal',
  finance: 'cat-finance', learning: 'cat-learning', other: 'cat-other',
};

const HABIT_COLORS = {
  purple: '#7c6af5', green: '#4ade80', blue: '#60a5fa', red: '#f87171',
  yellow: '#fbbf24', teal: '#2dd4bf', pink: '#f472b6', orange: '#fb923c',
};

function habColor(color) {
  return HABIT_COLORS[color] || '#7c6af5';
}

// ── Navigation ─────────────────────────────────────────────────────────────
function navigate(view) {
  state.currentView = view;
  journalView = null;
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });
  renderMain();
}

// ── Main Render ────────────────────────────────────────────────────────────
function renderMain() {
  const main = document.getElementById('main-content');
  const view = state.currentView;
  if (view === 'dashboard') renderDashboard(main);
  else if (view === 'goals')   renderGoals(main);
  else if (view === 'habits')  renderHabits(main);
  else if (view === 'mood')    renderMood(main);
  else if (view === 'journal') renderJournal(main);
  main.classList.remove('fade-in');
  void main.offsetWidth;
  main.classList.add('fade-in');
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function renderDashboard(el) {
  const t = today();
  const activeGoals    = state.goals.filter(g => g.status === 'active').length;
  const completedGoals = state.goals.filter(g => g.status === 'completed').length;
  const doneHabits     = state.habits.filter(h => h.completions && h.completions[t]).length;
  const totalHabits    = state.habits.length;
  const todayMood      = state.moods.find(m => m.date === t);
  const totalStreak    = state.habits.reduce((s, h) => s + getHabitStreak(h), 0);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Good ${getTimeOfDay()} 👋</h1>
        <p class="page-subtitle">${formatDate(t)}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">◎</div>
        <div class="stat-value" style="color:var(--accent)">${activeGoals}</div>
        <div class="stat-label">Active Goals</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✓</div>
        <div class="stat-value" style="color:var(--green)">${doneHabits}<span style="font-size:16px;font-weight:500;color:var(--text-muted)">/${totalHabits}</span></div>
        <div class="stat-label">Habits Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-value" style="color:var(--yellow)">${totalStreak}</div>
        <div class="stat-label">Total Streak Days</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">◈</div>
        <div class="stat-value" style="color:var(--teal)">${completedGoals}</div>
        <div class="stat-label">Goals Completed</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Today's Habits</div>
        ${totalHabits === 0
          ? `<p style="font-size:13px;color:var(--text-muted)">No habits yet. <a href="#" onclick="navigate('habits');return false;" style="color:var(--accent)">Add one →</a></p>`
          : state.habits.map(h => {
              const done = !!(h.completions && h.completions[t]);
              const color = habColor(h.color);
              return `<div class="today-habit">
                <div class="check-circle" style="background:${done ? color : 'var(--bg-input)'};border:2px solid ${done ? color : 'var(--border)'}">
                  ${done ? '✓' : ''}
                </div>
                <span style="${done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${esc(h.name)}</span>
              </div>`;
            }).join('')
        }
      </div>

      <div class="card">
        <div class="card-title">Today's Mood</div>
        ${todayMood
          ? `<div style="text-align:center;padding:8px 0">
               <div style="font-size:52px;line-height:1">${moodEmoji(todayMood.mood)}</div>
               <div style="font-size:13px;color:var(--text-dim);margin-top:10px;font-style:italic">${todayMood.note ? esc(todayMood.note) : 'No note added'}</div>
               <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px">
                 <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Energy</span>
                 <div class="energy-bar">
                   ${[1,2,3,4,5].map(i => `<div class="energy-dot${i <= todayMood.energy ? ' filled' : ''}"></div>`).join('')}
                 </div>
               </div>
             </div>`
          : `<p style="font-size:13px;color:var(--text-muted)">No mood logged yet. <a href="#" onclick="navigate('mood');return false;" style="color:var(--accent)">Log now →</a></p>`
        }
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Active Goals</div>
        ${state.goals.filter(g => g.status === 'active').length === 0
          ? `<p style="font-size:13px;color:var(--text-muted)">No active goals. <a href="#" onclick="navigate('goals');return false;" style="color:var(--accent)">Add one →</a></p>`
          : state.goals.filter(g => g.status === 'active').slice(0, 5).map(g => `
              <div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                  <span style="font-size:13px;font-weight:600">${esc(g.title)}</span>
                  <span style="font-size:12px;font-weight:700;color:var(--accent)">${g.progress}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${g.progress}%"></div>
                </div>
                ${g.targetDate ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px">Due ${formatDateShort(g.targetDate)}</div>` : ''}
              </div>
            `).join('')
        }
      </div>

      <div class="card">
        <div class="card-title">Recent Journal</div>
        ${state.journal.length === 0
          ? `<p style="font-size:13px;color:var(--text-muted)">No entries yet. <a href="#" onclick="navigate('journal');return false;" style="color:var(--accent)">Write something →</a></p>`
          : state.journal.slice(0, 3).map(j => `
              <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">
                <div style="font-size:13px;font-weight:600">${esc(j.title || 'Untitled')}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">${formatDateShort(j.date)}</div>
                <div style="font-size:12px;color:var(--text-dim);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(j.content)}</div>
              </div>
            `).join('')
        }
      </div>
    </div>
  `;
}

// ── Goals ──────────────────────────────────────────────────────────────────
let goalsFilter = 'all';

function renderGoals(el) {
  const cats = ['all', 'health', 'career', 'personal', 'finance', 'learning', 'other'];
  const filtered = goalsFilter === 'all'
    ? state.goals
    : state.goals.filter(g => g.category === goalsFilter);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Goals</h1>
        <p class="page-subtitle">${state.goals.length} total · ${state.goals.filter(g => g.status === 'completed').length} completed</p>
      </div>
      <button class="btn btn-primary" onclick="openGoalModal()">+ New Goal</button>
    </div>

    <div class="filter-tabs">
      ${cats.map(c => `
        <button class="filter-tab${goalsFilter === c ? ' active' : ''}" onclick="setGoalsFilter('${c}')">
          ${c.charAt(0).toUpperCase() + c.slice(1)}
        </button>
      `).join('')}
    </div>

    ${filtered.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">◎</div>
           <div class="empty-text">No goals here yet</div>
           <div class="empty-sub">Set a goal and start tracking your progress</div>
           <button class="btn btn-primary" onclick="openGoalModal()">+ Add Goal</button>
         </div>`
      : `<div class="goals-grid">${filtered.map(renderGoalCard).join('')}</div>`
    }
  `;
}

function setGoalsFilter(cat) {
  goalsFilter = cat;
  renderMain();
}

function renderGoalCard(g) {
  const dl = daysUntil(g.targetDate);
  const daysStr = g.targetDate
    ? (dl < 0
        ? `<span style="color:var(--red)">⚠ ${Math.abs(dl)}d overdue</span>`
        : dl === 0
          ? `<span style="color:var(--yellow)">Due today</span>`
          : `<span>${dl}d left</span>`)
    : '';

  return `
    <div class="goal-card">
      <div class="goal-header">
        <span class="chip ${CAT_CLASS[g.category] || 'cat-other'}">${esc(g.category)}</span>
        <span class="chip ${g.status === 'completed' ? 'status-completed' : g.status === 'paused' ? 'status-paused' : 'status-active'}">${g.status}</span>
      </div>
      <div class="goal-title">${esc(g.title)}</div>
      ${g.description ? `<div class="goal-desc">${esc(g.description)}</div>` : ''}
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Progress</span>
          <span style="font-size:13px;font-weight:700;color:var(--accent)">${g.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${g.progress}%"></div>
        </div>
      </div>
      <div class="goal-meta">
        ${g.targetDate ? `<span>📅 ${formatDateShort(g.targetDate)}</span>` : ''}
        ${daysStr}
      </div>
      <div class="goal-actions">
        <button class="btn btn-sm btn-ghost" onclick="openGoalModal('${g.id}')">Edit</button>
        ${g.status !== 'completed'
          ? `<button class="btn btn-sm" style="background:var(--green-dim);color:var(--green);border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:12px;padding:6px 12px;border-radius:var(--radius-sm)" onclick="completeGoal('${g.id}')">✓ Done</button>`
          : ''}
        <button class="btn-icon" onclick="deleteGoal('${g.id}')" title="Delete">✕</button>
      </div>
    </div>
  `;
}

function openGoalModal(id) {
  const goal = id ? state.goals.find(g => g.id === id) : null;
  const isEdit = !!goal;

  showModal(`
    <h2 class="modal-title">${isEdit ? 'Edit Goal' : 'New Goal'}</h2>
    <form id="goal-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input class="form-input" name="title" required placeholder="What do you want to achieve?" value="${esc(goal?.title || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" name="description" placeholder="Add more details..." style="min-height:70px">${esc(goal?.description || '')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" name="category">
            ${['health','career','personal','finance','learning','other'].map(c =>
              `<option value="${c}" ${(goal?.category || 'personal') === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            ${['active','paused','completed'].map(s =>
              `<option value="${s}" ${(goal?.status || 'active') === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Target Date</label>
        <input class="form-input" type="date" name="targetDate" value="${goal?.targetDate || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Progress — <span id="prog-display">${goal?.progress || 0}%</span></label>
        <input class="form-range" type="range" name="progress" min="0" max="100"
          value="${goal?.progress || 0}"
          oninput="document.getElementById('prog-display').textContent=this.value+'%'">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Goal'}</button>
      </div>
    </form>
  `);

  document.getElementById('goal-form').onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.progress = parseInt(data.progress) || 0;
    if (isEdit) {
      Object.assign(goal, data);
    } else {
      state.goals.unshift({ id: uid(), createdAt: today(), ...data });
    }
    saveState();
    closeModal();
    renderMain();
  };
}

function completeGoal(id) {
  const g = state.goals.find(g => g.id === id);
  if (g) { g.status = 'completed'; g.progress = 100; saveState(); renderMain(); }
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderMain();
}

// ── Habits ─────────────────────────────────────────────────────────────────
function renderHabits(el) {
  const t = today();
  const days = last7Days();

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Habits</h1>
        <p class="page-subtitle">Build consistency through daily tracking</p>
      </div>
      <button class="btn btn-primary" onclick="openHabitModal()">+ New Habit</button>
    </div>

    ${state.habits.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">✓</div>
           <div class="empty-text">No habits yet</div>
           <div class="empty-sub">Small daily actions lead to big results</div>
           <button class="btn btn-primary" onclick="openHabitModal()">+ Add Habit</button>
         </div>`
      : `
        <div class="card" style="margin-bottom:18px">
          <div style="display:flex;align-items:center;margin-bottom:14px">
            <div class="card-title" style="margin-bottom:0;flex:1">7-Day Overview</div>
            <div style="display:flex;gap:16px">
              ${days.map(d => `
                <div style="font-size:11px;color:var(--text-muted);width:14px;text-align:center">
                  ${new Date(d + 'T00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
                </div>
              `).join('')}
            </div>
          </div>
          ${state.habits.map(h => {
            const color = habColor(h.color);
            const streak = getHabitStreak(h);
            return `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div class="habit-color" style="background:${color}"></div>
                <div style="flex:1;font-size:13px;font-weight:500">${esc(h.name)}</div>
                ${streak > 0 ? `<span style="font-size:11px;color:var(--yellow);font-weight:700">🔥${streak}</span>` : ''}
                <div style="display:flex;gap:4px">
                  ${days.map(d => {
                    const done = !!(h.completions && h.completions[d]);
                    return `<div style="width:14px;height:14px;border-radius:3px;background:${done ? color : 'var(--bg-input)'};opacity:${done ? 1 : 0.35}"></div>`;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="card-title">Today — ${formatDate(t)}</div>
        ${state.habits.map(h => {
          const done = !!(h.completions && h.completions[t]);
          const streak = getHabitStreak(h);
          const color = habColor(h.color);
          return `
            <div class="habit-item" onclick="toggleHabit('${h.id}')">
              <div class="habit-check" style="background:${done ? color : 'transparent'};border-color:${done ? color : 'var(--border)'}">
                ${done ? '✓' : ''}
              </div>
              <div class="habit-color" style="background:${color}"></div>
              <div class="habit-name" style="${done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${esc(h.name)}</div>
              ${streak > 0 ? `<div class="habit-streak">🔥 ${streak}</div>` : ''}
              <button class="btn-icon" onclick="event.stopPropagation();deleteHabit('${h.id}')" title="Delete">✕</button>
            </div>
          `;
        }).join('')}
      `
    }
  `;
}

function toggleHabit(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  if (!habit.completions) habit.completions = {};
  const t = today();
  if (habit.completions[t]) {
    delete habit.completions[t];
  } else {
    habit.completions[t] = true;
  }
  saveState();
  renderMain();
}

function openHabitModal() {
  const colors = Object.keys(HABIT_COLORS);
  showModal(`
    <h2 class="modal-title">New Habit</h2>
    <form id="habit-form">
      <div class="form-group">
        <label class="form-label">Habit Name *</label>
        <input class="form-input" name="name" required placeholder="e.g. Morning meditation, Read 20 pages">
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div id="color-picker" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          ${colors.map((c, i) => `
            <div class="color-swatch"
              data-color="${c}"
              onclick="selectHabitColor(this,'${c}')"
              style="width:26px;height:26px;border-radius:50%;background:${habColor(c)};cursor:pointer;border:3px solid ${i === 0 ? 'white' : 'transparent'};transition:border-color 0.15s ease">
            </div>
          `).join('')}
        </div>
        <input type="hidden" name="color" id="habit-color-val" value="${colors[0]}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Habit</button>
      </div>
    </form>
  `);

  document.getElementById('habit-form').onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.color = document.getElementById('habit-color-val').value;
    state.habits.push({ id: uid(), completions: {}, name: data.name, color: data.color });
    saveState();
    closeModal();
    renderMain();
  };
}

function selectHabitColor(el, color) {
  document.querySelectorAll('#color-picker .color-swatch').forEach(s => s.style.borderColor = 'transparent');
  el.style.borderColor = 'white';
  document.getElementById('habit-color-val').value = color;
}

function deleteHabit(id) {
  if (!confirm('Delete this habit and all its history?')) return;
  state.habits = state.habits.filter(h => h.id !== id);
  saveState();
  renderMain();
}

// ── Mood ───────────────────────────────────────────────────────────────────
function renderMood(el) {
  const t = today();
  const todayMood = state.moods.find(m => m.date === t);
  const days = last7Days();

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Mood Tracker</h1>
        <p class="page-subtitle">Check in with yourself daily</p>
      </div>
    </div>

    ${!todayMood
      ? `<div class="card" style="margin-bottom:22px">
           <div class="card-title">How are you feeling today?</div>
           <form id="mood-form">
             <div class="form-group">
               <label class="form-label">Mood</label>
               <div class="mood-selector">
                 ${MOOD_EMOJIS.map((em, i) => `
                   <span class="mood-option${i === 2 ? ' selected' : ''}"
                     data-value="${i + 1}"
                     onclick="selectMood(${i + 1})">${em}</span>
                 `).join('')}
               </div>
               <input type="hidden" name="mood" id="mood-val" value="3">
             </div>
             <div class="form-group">
               <label class="form-label">Energy Level — <span id="energy-display">3</span> / 5</label>
               <input class="form-range" type="range" name="energy" min="1" max="5" value="3"
                 oninput="document.getElementById('energy-display').textContent=this.value">
             </div>
             <div class="form-group">
               <label class="form-label">Note (optional)</label>
               <input class="form-input" name="note" placeholder="What's on your mind?">
             </div>
             <button type="submit" class="btn btn-primary" style="width:100%">Log Mood</button>
           </form>
         </div>`
      : `<div class="card" style="margin-bottom:22px">
           <div style="display:flex;align-items:center;gap:16px">
             <div style="font-size:56px;line-height:1">${moodEmoji(todayMood.mood)}</div>
             <div style="flex:1">
               <div style="font-size:15px;font-weight:700;margin-bottom:3px">Today logged!</div>
               <div style="font-size:13px;color:var(--text-dim)">Mood: ${todayMood.mood}/5 · Energy: ${todayMood.energy}/5</div>
               ${todayMood.note ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px;font-style:italic">"${esc(todayMood.note)}"</div>` : ''}
             </div>
             <button class="btn btn-ghost btn-sm" onclick="deleteTodayMood()">Re-log</button>
           </div>
         </div>`
    }

    ${state.moods.length > 0 ? `
      <div class="card" style="margin-bottom:18px">
        <div class="card-title">7-Day Mood Trend</div>
        <div class="mood-chart">
          ${days.map(d => {
            const m = state.moods.find(x => x.date === d);
            const level = m ? m.mood : 0;
            const pct = level ? (level / 5) * 100 : 0;
            const color = level ? moodColor(level) : 'var(--bg-input)';
            const label = new Date(d + 'T00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1);
            return `
              <div class="mood-bar-wrap" title="${formatDateShort(d)}${m ? ': ' + moodEmoji(m.mood) : ''}">
                <div class="mood-bar-inner">
                  <div class="mood-bar" style="height:${Math.max(pct, level ? 8 : 0)}%;background:${color}"></div>
                </div>
                <div class="mood-bar-date">${label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card-title">History</div>
      ${state.moods.map(m => `
        <div class="mood-entry">
          <div class="mood-emoji">${moodEmoji(m.mood)}</div>
          <div class="mood-info">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px">
              <span style="font-size:14px;font-weight:600">Mood ${m.mood}/5</span>
              <div class="energy-bar">
                ${[1,2,3,4,5].map(i => `<div class="energy-dot${i <= m.energy ? ' filled' : ''}"></div>`).join('')}
                <span style="font-size:11px;color:var(--text-muted);margin-left:2px">energy</span>
              </div>
            </div>
            <div class="mood-date">${formatDate(m.date)}</div>
            ${m.note ? `<div class="mood-note">"${esc(m.note)}"</div>` : ''}
          </div>
          <button class="btn-icon" onclick="deleteMood('${m.date}')">✕</button>
        </div>
      `).join('')}
    ` : `
      <div class="empty-state">
        <div class="empty-icon">◑</div>
        <div class="empty-text">No mood history yet</div>
        <div class="empty-sub">Start logging daily and watch your trends appear</div>
      </div>
    `}
  `;

  if (!todayMood) {
    document.getElementById('mood-form').onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      state.moods.unshift({
        date: t,
        mood: parseInt(data.mood) || 3,
        energy: parseInt(data.energy) || 3,
        note: data.note || '',
      });
      saveState();
      renderMain();
    };
  }
}

function selectMood(val) {
  document.querySelectorAll('.mood-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.value) === val);
  });
  const inp = document.getElementById('mood-val');
  if (inp) inp.value = val;
}

function deleteMood(date) {
  state.moods = state.moods.filter(m => m.date !== date);
  saveState();
  renderMain();
}

function deleteTodayMood() {
  deleteMood(today());
}

// ── Journal ────────────────────────────────────────────────────────────────
let journalView = null;

function renderJournal(el) {
  if (journalView) {
    const entry = state.journal.find(j => j.id === journalView);
    if (entry) { renderJournalEntry(el, entry); return; }
    journalView = null;
  }

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Journal</h1>
        <p class="page-subtitle">${state.journal.length} ${state.journal.length === 1 ? 'entry' : 'entries'}</p>
      </div>
      <button class="btn btn-primary" onclick="openJournalModal()">+ New Entry</button>
    </div>

    ${state.journal.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">≡</div>
           <div class="empty-text">No journal entries yet</div>
           <div class="empty-sub">Capture your thoughts, reflections, and wins</div>
           <button class="btn btn-primary" onclick="openJournalModal()">+ Write Entry</button>
         </div>`
      : state.journal.map(j => `
          <div class="journal-item" onclick="viewJournalEntry('${j.id}')">
            <div class="journal-item-header">
              <div class="journal-item-title">${esc(j.title || 'Untitled')}</div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                <div class="journal-item-date">${formatDateShort(j.date)}</div>
                <button class="btn-icon" onclick="event.stopPropagation();deleteJournalEntry('${j.id}')" title="Delete">✕</button>
              </div>
            </div>
            <div class="journal-item-preview">${esc(j.content)}</div>
          </div>
        `).join('')
    }
  `;
}

function renderJournalEntry(el, entry) {
  el.innerHTML = `
    <div class="page-header">
      <button class="btn btn-ghost btn-sm" onclick="journalView=null;renderMain()">← Back</button>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="openJournalModal('${entry.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJournalEntry('${entry.id}')">Delete</button>
      </div>
    </div>
    <div class="card">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;font-weight:600;letter-spacing:0.5px">${formatDate(entry.date)}</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:18px;letter-spacing:-0.3px">${esc(entry.title || 'Untitled')}</h2>
      <div class="journal-full">${esc(entry.content)}</div>
    </div>
  `;
}

function viewJournalEntry(id) {
  journalView = id;
  renderMain();
}

function openJournalModal(id) {
  const entry = id ? state.journal.find(j => j.id === id) : null;
  const isEdit = !!entry;

  showModal(`
    <h2 class="modal-title">${isEdit ? 'Edit Entry' : 'New Journal Entry'}</h2>
    <form id="journal-form">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input class="form-input" name="title" placeholder="Give this entry a title..." value="${esc(entry?.title || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" name="date" value="${entry?.date || today()}">
      </div>
      <div class="form-group">
        <label class="form-label">Content *</label>
        <textarea class="form-textarea" name="content" required placeholder="What's on your mind?" style="min-height:160px">${esc(entry?.content || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Entry'}</button>
      </div>
    </form>
  `);

  document.getElementById('journal-form').onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (isEdit) {
      Object.assign(entry, data);
    } else {
      state.journal.unshift({ id: uid(), ...data });
    }
    saveState();
    closeModal();
    renderMain();
  };
}

function deleteJournalEntry(id) {
  if (!confirm('Delete this journal entry?')) return;
  state.journal = state.journal.filter(j => j.id !== id);
  if (journalView === id) journalView = null;
  saveState();
  renderMain();
}

// ── Modal ──────────────────────────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Nav wiring ─────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(a.dataset.view);
  });
});

// ── Boot ───────────────────────────────────────────────────────────────────
loadState();
renderMain();
