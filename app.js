// app.js —— 界面逻辑

// ===== 常量 =====
const EMOJIS = ['😊', '🥰', '😌', '😢', '😰', '😠', '😴', '🤩', '🙏'];
const EMOJI_NAMES = {
  '😊': '开心', '🥰': '幸福', '😌': '平静', '😢': '难过', '😰': '焦虑',
  '😠': '生气', '😴': '疲惫', '🤩': '兴奋', '🙏': '感恩'
};
const SCORE_DIMENSIONS = ['心情', '精力', '睡眠', '健康', '锻炼'];

// ===== 状态 =====
const state = {
  currentDate: todayStr(),
  emoji: null,
  scores: {},   // { 心情: 4, ... }
  photos: [],   // Blob 数组
};

let dirty = false;          // 今天视图是否有未保存的修改
let heatYear = new Date().getFullYear();
let histYear = new Date().getFullYear();
let histMonth = new Date().getMonth();
let photoUrls = [];         // 用于释放 objectURL
let pastPhotoUrls = [];     // 往年今日照片的 objectURL

// ===== 日期工具 =====
function pad(n) { return String(n).padStart(2, '0'); }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return dateToStr(new Date()); }
function parseDate(str) { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); }
function getMonthDay(str) { return str.slice(5); }
function getYear(str) { return Number(str.slice(0, 4)); }
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
  buildEmojiRow();
  buildScores();
  renderLegend();
  bindEvents();
  await refreshToday();
}

async function refreshToday() {
  await loadEntry(todayStr());
  await renderPastToday();
}

// ===== 构建静态 UI =====
function buildEmojiRow() {
  const row = document.getElementById('emoji-row');
  EMOJIS.forEach(e => {
    const span = document.createElement('span');
    span.className = 'emoji-item';
    span.textContent = e;
    span.title = EMOJI_NAMES[e];
    span.onclick = () => selectEmoji(e);
    row.appendChild(span);
  });
}

function buildScores() {
  const container = document.getElementById('scores');
  SCORE_DIMENSIONS.forEach(dim => {
    const row = document.createElement('div');
    row.className = 'score-row';
    const label = document.createElement('span');
    label.className = 'score-label';
    label.textContent = dim;
    const dots = document.createElement('div');
    dots.className = 'score-dots';
    dots.dataset.dim = dim;
    for (let i = 1; i <= 5; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.dataset.val = i;
      dot.onclick = () => setScore(dim, i);
      dots.appendChild(dot);
    }
    row.appendChild(label);
    row.appendChild(dots);
    container.appendChild(row);
  });
}

function renderLegend() {
  const c = document.getElementById('heat-legend-colors');
  HEAT_COLORS.forEach(col => {
    const s = document.createElement('span');
    s.style.background = col;
    c.appendChild(s);
  });
}

// ===== 今天视图：加载 / 渲染 =====
async function loadEntry(date) {
  const entry = await getEntry(date);
  state.currentDate = date;
  state.emoji = entry ? (entry.emoji || null) : null;
  state.scores = entry ? (entry.scores || {}) : {};
  state.photos = entry ? (entry.photos || []) : [];
  document.getElementById('diary-text').value = entry ? (entry.text || '') : '';
  renderEmoji();
  renderScores();
  renderPhotos();
  updateDateHeader(date);
  dirty = false;
}

function updateDateHeader(dateStr) {
  const d = parseDate(dateStr);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  document.getElementById('today-date').textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const isToday = dateStr === todayStr();
  document.getElementById('today-week').textContent = '星期' + weekdays[d.getDay()] + (isToday ? ' · 今天' : ' · 补记');
  document.getElementById('today-greeting').textContent = isToday ? greeting() + '，记录一下今天吧' : '补记这一天';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function selectEmoji(e) {
  state.emoji = state.emoji === e ? null : e;
  renderEmoji();
  dirty = true;
}

function renderEmoji() {
  document.querySelectorAll('.emoji-item').forEach(el => {
    el.classList.toggle('selected', el.textContent === state.emoji);
  });
}

function setScore(dim, val) {
  if (state.scores[dim] === val) {
    delete state.scores[dim];
  } else {
    state.scores[dim] = val;
  }
  renderScores();
  dirty = true;
}

function renderScores() {
  document.querySelectorAll('.score-row').forEach(row => {
    const dim = row.querySelector('.score-dots').dataset.dim;
    const val = state.scores[dim] || 0;
    row.querySelectorAll('.dot').forEach(dot => {
      dot.classList.toggle('on', Number(dot.dataset.val) <= val);
    });
  });
}

function renderPhotos() {
  photoUrls.forEach(u => URL.revokeObjectURL(u));
  photoUrls = [];
  const grid = document.getElementById('photo-grid');
  grid.innerHTML = '';
  state.photos.forEach((blob, idx) => {
    const url = URL.createObjectURL(blob);
    photoUrls.push(url);
    const item = document.createElement('div');
    item.className = 'photo-item';
    const img = document.createElement('img');
    img.src = url;
    const del = document.createElement('button');
    del.className = 'photo-del';
    del.textContent = '×';
    del.onclick = () => { state.photos.splice(idx, 1); renderPhotos(); dirty = true; };
    item.appendChild(img);
    item.appendChild(del);
    grid.appendChild(item);
  });
}

async function save(silent = false) {
  const text = document.getElementById('diary-text').value.trim();
  const isEmpty = !state.emoji
    && Object.keys(state.scores).length === 0
    && !text
    && state.photos.length === 0;

  if (isEmpty) {
    await deleteEntry(state.currentDate);
    if (!silent) toast('已清空这天的记录');
  } else {
    await putEntry({
      date: state.currentDate,
      emoji: state.emoji,
      scores: state.scores,
      text: text,
      photos: state.photos,
      updatedAt: Date.now(),
    });
    if (!silent) toast('已保存 ✓');
  }
  dirty = false;
  await renderPastToday();
}

// ===== 往年今日 =====
async function renderPastToday() {
  const container = document.getElementById('past-today');
  pastPhotoUrls.forEach(u => URL.revokeObjectURL(u));
  pastPhotoUrls = [];
  const entries = await getAllEntries();
  const md = getMonthDay(state.currentDate);
  const year = getYear(state.currentDate);
  const past = entries
    .filter(e => getMonthDay(e.date) === md && getYear(e.date) < year)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (past.length === 0) {
    container.innerHTML = '<div class="past-today">往年这一天还没有记录，从今年开始留下回忆吧 🌱</div>';
    return;
  }
  container.innerHTML = '';
  past.forEach(e => {
    const div = document.createElement('div');
    div.className = 'past-item';

    const yearEl = document.createElement('div');
    yearEl.className = 'past-year';
    yearEl.textContent = getYear(e.date) + ' 年';

    const moodEl = document.createElement('div');
    moodEl.className = 'past-mood';
    let mood = [];
    if (e.emoji) mood.push(e.emoji + ' ' + EMOJI_NAMES[e.emoji]);
    if (e.scores && Object.keys(e.scores).length) {
      mood.push(Object.entries(e.scores).map(([k, v]) => `${k}${v}`).join(' · '));
    }
    moodEl.textContent = mood.join('　');

    div.appendChild(yearEl);
    div.appendChild(moodEl);

    if (e.text) {
      const textEl = document.createElement('div');
      textEl.className = 'past-text';
      textEl.textContent = e.text;
      div.appendChild(textEl);
    }
    if (e.photos && e.photos.length) {
      const photosEl = document.createElement('div');
      photosEl.className = 'past-photos';
      e.photos.forEach(blob => {
        const img = document.createElement('img');
        const url = URL.createObjectURL(blob);
        pastPhotoUrls.push(url);
        img.src = url;
        photosEl.appendChild(img);
      });
      div.appendChild(photosEl);
    }
    container.appendChild(div);
  });
}

// ===== 心情热力图 =====
const HEAT_COLORS = ['#5b7db1', '#7fa6c9', '#d8c49a', '#f0b27a', '#e8875e'];

function scoreColor(score) {
  if (score === undefined || score === null) return '#ece7df';
  return HEAT_COLORS[score - 1] || '#ece7df';
}

async function renderHeatmap() {
  document.getElementById('heat-year').textContent = heatYear + '年';
  const entries = await getAllEntries();
  const entryMap = new Map(entries.map(e => [e.date, e]));
  const container = document.getElementById('heatmap');
  container.innerHTML = '';

  for (let m = 0; m < 12; m++) {
    const monthLabel = document.createElement('div');
    monthLabel.className = 'heat-month-label';
    monthLabel.textContent = (m + 1) + '月';
    container.appendChild(monthLabel);

    const firstWeekday = new Date(heatYear, m, 1).getDay();
    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement('div');
      empty.className = 'heat-cell empty';
      container.appendChild(empty);
    }

    const daysInMonth = new Date(heatYear, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dateToStr(new Date(heatYear, m, d));
      const entry = entryMap.get(dateStr);
      const emoji = entry ? entry.emoji : undefined;
      const score = entry ? entry.scores.心情 : undefined;
      const hasEntry = !!entry;

      const cell = document.createElement('div');
      cell.className = 'heat-cell' + (hasEntry ? '' : ' empty');
      cell.style.background = scoreColor(score);
      cell.textContent = emoji || '';
      cell.title = hasEntry
        ? `${dateStr}${score !== undefined ? ' 心情 ' + score + ' 分' : ''}`
        : `${dateStr}（无记录）`;
      if (hasEntry) cell.onclick = () => openEntry(dateStr);
      container.appendChild(cell);
    }
  }
}

// ===== 历史日历 =====
async function renderCalendar() {
  document.getElementById('hist-month').textContent = `${histYear}年${histMonth + 1}月`;
  const entries = await getAllEntries();
  const entryMap = new Map(entries.map(e => [e.date, e]));
  const container = document.getElementById('calendar');
  container.innerHTML = '';

  const first = new Date(histYear, histMonth, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(histYear, histMonth + 1, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell other-month';
    container.appendChild(empty);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dateToStr(new Date(histYear, histMonth, d));
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.textContent = d;
    if (entryMap.has(dateStr)) cell.classList.add('has-entry');
    if (dateStr === todayStr()) cell.classList.add('today');
    cell.onclick = () => openEntry(dateStr);
    container.appendChild(cell);
  }
}

async function openEntry(dateStr) {
  await loadEntry(dateStr);
  await renderPastToday();
  switchView('today');
}

// ===== 时光胶囊 =====
async function renderCapsules() {
  const capsules = await getAllCapsules();
  const container = document.getElementById('capsule-list');
  if (capsules.length === 0) {
    container.innerHTML = '<div class="past-today" style="padding:30px 0">还没有时光胶囊。给未来的自己写一封信吧 ✉️</div>';
    return;
  }
  container.innerHTML = '';
  const now = Date.now();
  capsules.sort((a, b) => b.createdAt - a.createdAt).forEach(c => {
    const unlocked = now >= c.unlockAt;
    const div = document.createElement('div');
    div.className = 'capsule-item' + (unlocked ? '' : ' locked');

    const head = document.createElement('div');
    head.className = 'capsule-head';

    const status = document.createElement('span');
    status.className = 'capsule-status' + (unlocked ? ' unlocked' : '');
    status.textContent = unlocked ? '已解锁' : '🔒 封存中';

    const date = document.createElement('span');
    date.className = 'capsule-date';
    date.textContent = `封存于 ${formatDate(new Date(c.createdAt))}`;

    const del = document.createElement('button');
    del.className = 'capsule-del';
    del.textContent = '删除';
    del.onclick = async () => { await deleteCapsule(c.id); renderCapsules(); };

    head.appendChild(status);
    head.appendChild(date);
    head.appendChild(del);
    div.appendChild(head);

    const content = document.createElement('div');
    content.className = 'capsule-content-text';
    if (unlocked) {
      content.textContent = c.content;
    } else {
      const days = Math.ceil((c.unlockAt - now) / 86400000);
      const countdown = document.createElement('div');
      countdown.className = 'capsule-countdown';
      countdown.textContent = `还有 ${days} 天解锁（${formatDate(new Date(c.unlockAt))}）`;
      div.appendChild(countdown);
      content.textContent = '「内容已封存，等待时间抵达……」';
    }
    div.appendChild(content);
    container.appendChild(div);
  });
}

function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function openCapsuleModal() {
  document.getElementById('capsule-modal').classList.remove('hidden');
  document.getElementById('capsule-content').value = '';
  document.getElementById('capsule-unlock').value = '+1year';
  document.getElementById('capsule-custom-date').classList.add('hidden');
}

function closeCapsuleModal() {
  document.getElementById('capsule-modal').classList.add('hidden');
}

function calcUnlockAt(option, customStr) {
  const now = new Date();
  switch (option) {
    case '+1year': return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).getTime();
    case '+6month': return new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).getTime();
    case '+3month': return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).getTime();
    case 'custom': {
      if (!customStr) return null;
      const [y, m, d] = customStr.split('-').map(Number);
      return new Date(y, m - 1, d).getTime();
    }
    default: return null;
  }
}

async function saveCapsule() {
  const content = document.getElementById('capsule-content').value.trim();
  if (!content) { alert('写点什么再封存吧'); return; }
  const option = document.getElementById('capsule-unlock').value;
  const custom = document.getElementById('capsule-custom-date').value;
  const unlockAt = calcUnlockAt(option, custom);
  if (unlockAt === null || unlockAt <= Date.now()) {
    alert('请选择一个未来的解锁日期');
    return;
  }
  await addCapsule({ content, createdAt: Date.now(), unlockAt, opened: false });
  closeCapsuleModal();
  await renderCapsules();
  toast('已封存 ✉️');
}

// ===== 导出 / 导入 =====
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function base64ToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function exportData() {
  const entries = await getAllEntries();
  const capsules = await getAllCapsules();
  const data = { version: 1, exportedAt: Date.now(), entries: [], capsules };
  for (const e of entries) {
    const photos = [];
    for (const blob of (e.photos || [])) {
      photos.push(await blobToBase64(blob));
    }
    data.entries.push({ ...e, photos });
  }
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diary-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('已导出备份');
}

async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.entries && !data.capsules) throw new Error('无效的备份文件');
    for (const e of (data.entries || [])) {
      const photos = [];
      for (const b64 of (e.photos || [])) photos.push(base64ToBlob(b64));
      await putEntry({ ...e, photos });
    }
    for (const c of (data.capsules || [])) {
      const { id, ...rest } = c;
      await addCapsule(rest);
    }
    toast('导入完成 ✓');
    await refreshToday();
    await renderCapsules();
  } catch (err) {
    alert('导入失败：' + err.message);
  }
}

// ===== 视图切换 =====
async function switchView(name) {
  const current = document.querySelector('.view.active');
  if (current && current.id === 'view-today' && dirty) {
    await save(true);
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));

  if (name === 'heatmap') await renderHeatmap();
  if (name === 'capsule') await renderCapsules();
  if (name === 'history') await renderCalendar();
  if (name === 'today') { await loadEntry(state.currentDate); await renderPastToday(); }
  window.scrollTo(0, 0);
}

// ===== 事件绑定 =====
function bindEvents() {
  // 底部标签栏
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // 正文输入
  document.getElementById('diary-text').addEventListener('input', () => { dirty = true; });

  // 保存
  document.getElementById('save-btn').addEventListener('click', () => save());

  // 照片
  document.getElementById('add-photo-btn').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('photo-input').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(f => state.photos.push(f));
    e.target.value = '';
    renderPhotos();
    dirty = true;
  });

  // 热力图年份切换
  document.getElementById('heat-year-prev').addEventListener('click', () => { heatYear--; renderHeatmap(); });
  document.getElementById('heat-year-next').addEventListener('click', () => { heatYear++; renderHeatmap(); });

  // 历史月份切换
  document.getElementById('hist-month-prev').addEventListener('click', () => {
    histMonth--;
    if (histMonth < 0) { histMonth = 11; histYear--; }
    renderCalendar();
  });
  document.getElementById('hist-month-next').addEventListener('click', () => {
    histMonth++;
    if (histMonth > 11) { histMonth = 0; histYear++; }
    renderCalendar();
  });

  // 胶囊
  document.getElementById('new-capsule-btn').addEventListener('click', openCapsuleModal);
  document.getElementById('capsule-cancel').addEventListener('click', closeCapsuleModal);
  document.getElementById('capsule-save').addEventListener('click', saveCapsule);
  document.getElementById('capsule-unlock').addEventListener('change', (e) => {
    document.getElementById('capsule-custom-date').classList.toggle('hidden', e.target.value !== 'custom');
  });

  // 导出导入
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-input').click();
  });
  document.getElementById('import-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  // 点击弹窗遮罩关闭
  document.getElementById('capsule-modal').addEventListener('click', (e) => {
    if (e.target.id === 'capsule-modal') closeCapsuleModal();
  });
}

// ===== Toast 提示 =====
let toastTimer;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 18px;border-radius:20px;font-size:14px;z-index:200;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}
