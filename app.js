const STORAGE_KEY = 'gymLog';

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

let entries = loadEntries();

// ---------- Tabs ----------

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'progressTab') renderProgress();
  });
});

// ---------- Add entry form ----------

const entryForm = document.getElementById('entryForm');
const typeButtons = document.querySelectorAll('.type-btn');
const activityTypeInput = document.getElementById('activityType');
const cardioFields = document.querySelector('.cardio-fields');
const strengthFields = document.querySelector('.strength-fields');

document.getElementById('date').value = new Date().toISOString().slice(0, 10);

typeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    typeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activityTypeInput.value = btn.dataset.type;
    const isCardio = btn.dataset.type === 'cardio';
    cardioFields.style.display = isCardio ? 'flex' : 'none';
    strengthFields.style.display = isCardio ? 'none' : 'flex';
  });
});

function buildEntryFromForm() {
  const type = activityTypeInput.value;
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: document.getElementById('date').value,
    type,
    exercise: document.getElementById('exercise').value.trim(),
    notes: document.getElementById('notes').value.trim(),
  };
  if (type === 'cardio') {
    entry.duration = Number(document.getElementById('duration').value) || 0;
  } else {
    entry.sets = Number(document.getElementById('sets').value) || 0;
    entry.reps = Number(document.getElementById('reps').value) || 0;
    entry.weight = Number(document.getElementById('weight').value) || 0;
  }
  return entry;
}

entryForm.addEventListener('submit', e => {
  e.preventDefault();
  entries.push(buildEntryFromForm());
  saveEntries(entries);
  entryForm.reset();
  document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('duration').value = 60;
  document.getElementById('sets').value = 3;
  document.getElementById('reps').value = 10;
  renderAll();
});

document.getElementById('quickLogBtn').addEventListener('click', () => {
  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toISOString().slice(0, 10),
    type: 'cardio',
    exercise: 'Stairmaster',
    duration: 60,
    notes: '',
  });
  saveEntries(entries);
  renderAll();
});

// ---------- Stats ----------

function renderStats() {
  const uniqueDates = new Set(entries.map(e => e.date));
  document.getElementById('statTotalSessions').textContent = uniqueDates.size;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const thisWeekDates = new Set(
    entries
      .filter(e => new Date(e.date) >= weekAgo && new Date(e.date) <= now)
      .map(e => e.date)
  );
  document.getElementById('statThisWeek').textContent = thisWeekDates.size;

  const uniqueExercises = new Set(entries.map(e => e.exercise));
  document.getElementById('statExercises').textContent = uniqueExercises.size;
}

// ---------- History ----------

function renderHistory() {
  const list = document.getElementById('historyList');
  const emptyMsg = document.getElementById('emptyHistory');
  list.innerHTML = '';

  if (entries.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  const byDate = {};
  entries.forEach(e => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(date => {
    const group = document.createElement('div');
    group.className = 'history-date-group';

    const heading = document.createElement('div');
    heading.className = 'history-date-heading';
    heading.textContent = formatDate(date);
    group.appendChild(heading);

    byDate[date].forEach(entry => {
      const row = document.createElement('div');
      row.className = 'history-entry';

      const summary = entry.type === 'cardio'
        ? `${entry.duration} min`
        : `${entry.sets} x ${entry.reps}${entry.weight ? ` @ ${entry.weight}kg` : ''}`;

      const main = document.createElement('div');
      main.innerHTML = `<div class="entry-main"><strong>${escapeHtml(entry.exercise)}</strong> — ${summary}</div>` +
        (entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : '');

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '✕';
      del.title = 'Delete entry';
      del.addEventListener('click', () => {
        entries = entries.filter(e => e.id !== entry.id);
        saveEntries(entries);
        renderAll();
      });

      row.appendChild(main);
      row.appendChild(del);
      group.appendChild(row);
    });

    list.appendChild(group);
  });
}

function formatDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Progress ----------

const progressSelect = document.getElementById('progressExercise');

function renderExerciseOptions() {
  const exercises = [...new Set(entries.map(e => e.exercise))].sort((a, b) => a.localeCompare(b));

  const datalist = document.getElementById('exerciseList');
  datalist.innerHTML = exercises.map(ex => `<option value="${escapeHtml(ex)}">`).join('');

  const previouslySelected = progressSelect.value;
  progressSelect.innerHTML = exercises.map(ex => `<option value="${escapeHtml(ex)}">${escapeHtml(ex)}</option>`).join('');
  if (exercises.includes(previouslySelected)) {
    progressSelect.value = previouslySelected;
  }
}

progressSelect.addEventListener('change', renderProgress);

function renderProgress() {
  const chartTitle = document.getElementById('chartTitle');
  const svg = document.getElementById('progressChart');
  const tbody = document.querySelector('#progressTable tbody');
  const emptyMsg = document.getElementById('emptyProgress');
  const tooltip = document.getElementById('chartTooltip');

  svg.innerHTML = '';
  tbody.innerHTML = '';
  tooltip.style.display = 'none';

  const exercise = progressSelect.value;
  if (!exercise) {
    chartTitle.textContent = 'Weight over time';
    document.getElementById('progressTable').style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  const data = entries
    .filter(e => e.exercise === exercise)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    document.getElementById('progressTable').style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  const isCardio = data[data.length - 1].type === 'cardio';
  const metric = isCardio ? 'duration' : 'weight';
  const metricLabel = isCardio ? 'minutes' : 'kg';
  chartTitle.textContent = `${exercise} — ${isCardio ? 'duration' : 'weight'} over time`;

  const head = document.getElementById('progressTableHead');
  head.innerHTML = isCardio
    ? '<th>Date</th><th>Duration</th>'
    : '<th>Date</th><th>Sets x Reps</th><th>Weight (kg)</th>';

  document.getElementById('progressTable').style.display = 'table';
  emptyMsg.style.display = data.length < 2 ? 'block' : 'none';
  if (data.length < 2) {
    emptyMsg.textContent = 'Log one more session to see a trend line.';
  }

  data.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = isCardio
      ? `<td>${formatDate(e.date)}</td><td>${e.duration} min</td>`
      : `<td>${formatDate(e.date)}</td><td>${e.sets} x ${e.reps}</td><td>${e.weight}</td>`;
    tbody.appendChild(tr);
  });

  drawChart(svg, tooltip, data, metric, metricLabel);
}

function drawChart(svg, tooltip, data, metric, metricLabel) {
  const W = 600, H = 300;
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const weights = data.map(d => d[metric]);
  const maxW = Math.max(...weights, 1);
  const minW = Math.min(...weights, 0);
  const range = maxW - minW || 1;
  const yMax = maxW + range * 0.15;
  const yMin = Math.max(0, minW - range * 0.15);

  const x = i => pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = v => pad.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const ns = 'http://www.w3.org/2000/svg';
  const style = getComputedStyle(document.documentElement);
  const gridline = style.getPropertyValue('--gridline').trim();
  const baseline = style.getPropertyValue('--baseline').trim();
  const muted = style.getPropertyValue('--text-muted').trim();
  const series1 = style.getPropertyValue('--series-1').trim();
  const surface1 = style.getPropertyValue('--surface-1').trim();

  // gridlines (4 horizontal steps)
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = yMin + ((yMax - yMin) * i) / steps;
    const gy = y(v);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', pad.left);
    line.setAttribute('x2', W - pad.right);
    line.setAttribute('y1', gy);
    line.setAttribute('y2', gy);
    line.setAttribute('stroke', gridline);
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', pad.left - 8);
    label.setAttribute('y', gy + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', muted);
    label.textContent = Math.round(v);
    svg.appendChild(label);
  }

  // baseline
  const base = document.createElementNS(ns, 'line');
  base.setAttribute('x1', pad.left);
  base.setAttribute('x2', W - pad.right);
  base.setAttribute('y1', H - pad.bottom);
  base.setAttribute('y2', H - pad.bottom);
  base.setAttribute('stroke', baseline);
  base.setAttribute('stroke-width', '1');
  svg.appendChild(base);

  // x labels (first, middle, last)
  const labelIdxs = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  labelIdxs.forEach(i => {
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', x(i));
    label.setAttribute('y', H - pad.bottom + 18);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', muted);
    const d = new Date(data[i].date + 'T00:00:00');
    label.textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    svg.appendChild(label);
  });

  // line path
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[metric])}`).join(' ');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', series1);
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  // points with hover tooltip
  data.forEach((d, i) => {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', x(i));
    circle.setAttribute('cy', y(d[metric]));
    circle.setAttribute('r', 5);
    circle.setAttribute('fill', series1);
    circle.setAttribute('stroke', surface1);
    circle.setAttribute('stroke-width', '2');
    circle.style.cursor = 'pointer';

    circle.addEventListener('mouseenter', () => showTooltip(circle, tooltip, svg, d, metric, metricLabel));
    circle.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    circle.addEventListener('click', () => showTooltip(circle, tooltip, svg, d, metric, metricLabel));

    svg.appendChild(circle);
  });
}

function showTooltip(circle, tooltip, svg, entry, metric, metricLabel) {
  const cx = parseFloat(circle.getAttribute('cx'));
  const cy = parseFloat(circle.getAttribute('cy'));
  const rect = svg.getBoundingClientRect();
  const scaleX = rect.width / 600;
  const scaleY = rect.height / 300;

  tooltip.style.left = `${cx * scaleX}px`;
  tooltip.style.top = `${cy * scaleY}px`;
  const detail = metric === 'duration' ? '' : ` (${entry.sets}x${entry.reps})`;
  tooltip.textContent = `${formatDate(entry.date)}: ${entry[metric]}${metricLabel === 'kg' ? 'kg' : ' min'}${detail}`;
  tooltip.style.display = 'block';
}

// ---------- Init ----------

function renderAll() {
  renderStats();
  renderHistory();
  renderExerciseOptions();
  if (document.getElementById('progressTab').classList.contains('active')) {
    renderProgress();
  }
}

renderAll();
