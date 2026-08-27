/* ===== Bùshǒu 部首 — логика приложения ===== */
'use strict';

const KEY = 'bushou.v1';
const TOTAL = 214;

/* Вес тира при расчёте покрытия частотных иероглифов.
   Тир 1 — ядро письменности, тир 3 — редкие ключи. */
const WEIGHT = { 1: 3, 2: 1.5, 3: 0.4 };

const el = id => document.getElementById(id);
const byNum = n => RADICALS.find(r => r.num === n);

/* ─────────── состояние ─────────── */
const blank = () => ({
  cards: {},          // num -> {box, due, seen}
  streak: 0,
  lastDay: null,
  todayCount: 0,
  totalAnswers: 0,
  theme: 'light'
});

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return Object.assign(blank(), parsed);
  } catch (e) {
    console.warn('Не удалось прочитать сохранение, начинаем заново', e);
    return blank();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    toast('Не удалось сохранить прогресс');
  }
}

const today = () => new Date().toISOString().slice(0, 10);

function touchDay() {
  const d = today();
  if (S.lastDay === d) return;
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.streak = (S.lastDay === yest) ? S.streak + 1 : 1;
  S.lastDay = d;
  S.todayCount = 0;
  save();
}

/* ─────────── статусы ─────────── */
// box: 0..5, выученным считаем от 3-й коробки
const isLearned = n => (S.cards[n]?.box || 0) >= 3;
const isSeen = n => !!S.cards[n] && !isLearned(n);

function stats() {
  const learned = RADICALS.filter(r => isLearned(r.num));
  const seen = RADICALS.filter(r => isSeen(r.num));
  const totalW = RADICALS.reduce((a, r) => a + WEIGHT[r.tier], 0);
  const gotW = learned.reduce((a, r) => a + WEIGHT[r.tier], 0);
  return {
    learned: learned.length,
    seen: seen.length,
    left: TOTAL - learned.length - seen.length,
    pct: Math.round(learned.length / TOTAL * 100),
    cover: Math.round(gotW / totalW * 100)
  };
}

/* ─────────── навигация ─────────── */
function go(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  el('v-' + name).classList.add('on');
  window.scrollTo(0, 0);
  if (name === 'start') renderStart();
  if (name === 'browse') renderGrid();
}

/* ─────────── тема ─────────── */
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
}
function toggleTheme() {
  S.theme = S.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  save();
}

/* ─────────── тосты ─────────── */
let toastTimer;
function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ─────────── стартовый экран ─────────── */
function renderStart() {
  const s = stats();
  el('pct').textContent = s.pct + '%';
  el('s-learned').textContent = s.learned;
  el('s-seen').textContent = s.seen;
  el('s-left').textContent = s.left;
  el('cover').textContent = s.cover + '%';
  el('cover-bar').style.width = s.cover + '%';

  const C = 2 * Math.PI * 45;
  el('ring-arc').style.strokeDasharray = C;
  el('ring-arc').style.strokeDashoffset = C * (1 - s.pct / 100);

  el('k-streak').textContent = S.streak;
  el('k-today').textContent = S.todayCount;
  el('k-total').textContent = S.totalAnswers;

  const due = pickDue().length;
  el('train-hint').textContent = due
    ? `${due} ${plural(due, 'карточка', 'карточки', 'карточек')} к повторению`
    : 'новые ключи по порядку';

  renderTiers();
}

/* Прогресс по тирам: видно, что ядро письменности закрывается быстрее хвоста. */
const TIER_NOTE = {
  1: 'ядро письменности',
  2: 'частые компоненты',
  3: 'редкие, для полноты'
};

function renderTiers() {
  const box = el('tiers');
  box.innerHTML = '';

  [1, 2, 3].forEach(t => {
    const all = RADICALS.filter(r => r.tier === t);
    const got = all.filter(r => isLearned(r.num)).length;
    const pct = all.length ? Math.round(got / all.length * 100) : 0;

    const row = document.createElement('div');
    row.className = 'tier-row t' + t;
    row.innerHTML =
      `<div class="t-top">
         <span class="t-name">Тир ${t}</span>
         <span class="t-note">${TIER_NOTE[t]}</span>
         <span class="t-num">${got} / ${all.length}</span>
       </div>
       <div class="bar"><i style="width:${pct}%"></i></div>`;
    box.appendChild(row);
  });
}

function plural(n, one, few, many) {
  const m = n % 100, d = n % 10;
  if (m > 10 && m < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

/* ─────────── сетка ключей ─────────── */
let filter = 'all';
let query = '';

/* Пиньинь без тонов: shuǐ → shui, lǜ → lv. Индекс считаем один раз. */
const TONELESS = (() => {
  const map = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
    'ń':'n','ň':'n','ǹ':'n','ḿ':'m'
  };
  const strip = s => s.toLowerCase().replace(/./g, ch => map[ch] || ch);
  const idx = {};
  RADICALS.forEach(r => { idx[r.num] = strip(r.pinyin); });
  return { strip, idx };
})();

function matchesQuery(r, q) {
  if (!q) return true;
  if (r.char === q || r.examples.includes(q)) return true;          // сам иероглиф
  if (String(r.num) === q) return true;                             // номер
  if (r.meaning.toLowerCase().includes(q)) return true;             // значение
  if (r.pinyin.toLowerCase().includes(q)) return true;              // пиньинь с тонами
  if (TONELESS.idx[r.num].includes(TONELESS.strip(q))) return true; // пиньинь без тонов
  return false;
}

function renderGrid() {
  const q = query.trim().toLowerCase();

  const list = RADICALS.filter(r => {
    if (!matchesQuery(r, q)) return false;
    if (filter === 'all') return true;
    if (filter === 'learned') return isLearned(r.num);
    if (filter === 'new') return !S.cards[r.num];
    return r.tier === +filter;
  });

  el('browse-count').textContent =
    `${list.length} ${plural(list.length, 'ключ', 'ключа', 'ключей')}`;

  const g = el('grid');
  g.innerHTML = '';
  const frag = document.createDocumentFragment();

  list.forEach(r => {
    const b = document.createElement('button');
    b.className = 'cell hz' + (isLearned(r.num) ? ' learned' : isSeen(r.num) ? ' seen' : '');
    b.innerHTML = `<span class="n">${r.num}</span>${r.char}`;
    b.title = `${r.pinyin} — ${r.meaning}`;
    b.setAttribute('aria-label', `Ключ ${r.num}: ${r.char}, ${r.meaning}`);
    b.onclick = () => openCard(r.num);
    frag.appendChild(b);
  });

  g.appendChild(frag);
  el('grid-empty').hidden = list.length > 0;
}

/* ─────────── карточка ключа ─────────── */
let writer = null;
let current = null;

function openCard(num) {
  current = num;
  const r = byNum(num);
  if (!r) return;

  el('c-tier').textContent = 'Тир ' + r.tier;
  el('c-py').textContent = r.pinyin;
  el('c-mean').textContent = r.meaning;
  el('c-info').textContent =
    `Ключ №${r.num} · ${r.strokes} ${plural(r.strokes, 'черта', 'черты', 'черт')}`;
  el('c-mnemo').textContent = r.mnemonic;

  const ex = el('c-ex');
  ex.innerHTML = '';
  r.examples.forEach(c => {
    const d = document.createElement('div');
    d.className = 'ex hz';
    d.textContent = c;
    ex.appendChild(d);
  });

  const done = isLearned(num);
  const btn = el('btn-learned');
  btn.textContent = done ? '✓ Выучено — сбросить этот ключ' : 'Отметить выученным';
  btn.className = done ? 'btn ghost' : 'btn';

  go('card');
  mountWriter(r.char);
}

function mountWriter(char) {
  const box = el('writer');
  box.innerHTML = '';
  writer = null;

  if (typeof HanziWriter === 'undefined') {
    box.innerHTML = `<div class="hz" style="font-size:110px;padding:30px">${char}</div>`;
    return;
  }

  const css = getComputedStyle(document.documentElement);
  writer = HanziWriter.create(box, char, {
    width: 220, height: 220, padding: 16,
    showCharacter: false,
    strokeColor: css.getPropertyValue('--ink').trim(),
    outlineColor: css.getPropertyValue('--line').trim(),
    drawingColor: css.getPropertyValue('--jade').trim(),
    drawingWidth: 16,
    strokeAnimationSpeed: 1.3,
    delayBetweenStrokes: 180,
    charDataLoader: (c, onLoad, onErr) => {
      fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`)
        .then(r => { if (!r.ok) throw new Error('нет данных'); return r.json(); })
        .then(onLoad)
        .catch(() => {
          box.innerHTML = `<div class="hz" style="font-size:110px;padding:30px">${c}</div>`;
          if (onErr) onErr();
        });
    }
  });

  setTimeout(() => { try { writer.animateCharacter(); } catch (e) {} }, 250);
}

/* ─────────── SRS ─────────── */
const GAPS = [0, 1, 2, 4, 8, 16, 32]; // дней по коробкам

function pickDue(limit = 10) {
  const now = Date.now();
  const due = RADICALS.filter(r => {
    const c = S.cards[r.num];
    return c && c.due <= now;
  }).sort((a, b) => S.cards[a.num].due - S.cards[b.num].due);

  const fresh = RADICALS
    .filter(r => !S.cards[r.num])
    .sort((a, b) => a.tier - b.tier || a.num - b.num);

  return [...due, ...fresh].slice(0, limit);
}

function grade(num, ok) {
  const c = S.cards[num] || { box: 0, due: 0, seen: 0 };
  // Верный ответ — на коробку вверх. Промах откатывает ниже порога «выучено»,
  // иначе забытый ключ так и остался бы в зачёте.
  c.box = ok ? Math.min(c.box + 1, 6) : Math.min(c.box - 1, 2);
  if (c.box < 0) c.box = 0;
  c.seen = (c.seen || 0) + 1;
  c.due = Date.now() + GAPS[c.box] * 864e5;
  S.cards[num] = c;
  S.totalAnswers++;
  S.todayCount++;
  save();
}

/* ─────────── тренировка ─────────── */
let deck = [], di = 0, flipped = false;
// busy — защёлка на время анимации перехода между карточками.
// Без неё повторный клик/нажатие клавиши обращается к deck[di] за границей массива.
let busy = false;

function startTrain() {
  touchDay();
  deck = pickDue(10);

  if (!deck.length) {
    toast('Все ключи выучены. Отличная работа!');
    return;
  }

  di = 0;
  flipped = false;
  busy = false;
  el('t-deck').style.display = '';
  el('t-actions').style.display = '';
  el('t-done').style.display = 'none';

  const dots = el('t-dots');
  dots.innerHTML = '';
  deck.forEach((_, i) => {
    const d = document.createElement('i');
    d.className = 'dot' + (i === 0 ? ' on' : '');
    d.id = 'dot-' + i;
    dots.appendChild(d);
  });

  showCard();
  go('train');
}

function showCard() {
  const r = deck[di];
  flipped = false;
  el('t-flip').classList.remove('flipped');
  el('t-count').textContent = `${di + 1} из ${deck.length}`;

  setTimeout(() => {
    el('t-glyph').textContent = r.char;
    el('t-py').textContent = r.pinyin;
    el('t-mean').textContent = r.meaning;
    el('t-mnemo').textContent = r.mnemonic;
  }, 120);
}

function flip() {
  if (busy) return;
  flipped = !flipped;
  el('t-flip').classList.toggle('flipped', flipped);
}

function answer(ok) {
  if (busy) return;                 // перехода ещё не было — второй клик игнорируем
  const r = deck[di];
  if (!r) return;                   // страховка: колода уже закончилась
  busy = true;
  grade(r.num, ok);

  const dot = el('dot-' + di);
  if (dot) { dot.classList.remove('on'); dot.classList.add(ok ? 'ok' : 'bad'); }

  if (ok) {
    el('t-stamp-g').textContent = r.char;
    const st = el('t-stamp');
    st.classList.remove('go');
    void st.offsetWidth;
    st.classList.add('go');
    if (navigator.vibrate) navigator.vibrate(25);
  }

  di++;
  const delay = ok ? 620 : 160;

  if (di >= deck.length) {
    setTimeout(() => { finishTrain(); busy = false; }, delay);
    return;
  }
  setTimeout(() => {
    showCard();
    const nd = el('dot-' + di);
    if (nd) nd.classList.add('on');
    busy = false;
  }, delay);
}

function finishTrain() {
  el('t-deck').style.display = 'none';
  el('t-actions').style.display = 'none';
  el('t-done').style.display = 'block';
  const s = stats();
  el('t-summary').textContent =
    `Разобрано ${deck.length} ${plural(deck.length, 'карточка', 'карточки', 'карточек')}. Выучено ${s.learned} из ${TOTAL}.`;
}

/* ─────────── экспорт / импорт ─────────── */
function exportProgress() {
  const payload = {
    app: 'bushou',
    version: 1,
    exportedAt: new Date().toISOString(),
    state: S
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bushou-progress-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Файл с прогрессом сохранён');
}

// Разбор отделён от чтения файла: так его можно вызвать и протестировать напрямую.
function importFromText(text) {
    try {
      const parsed = JSON.parse(text);
      const incoming = parsed && parsed.state ? parsed.state : parsed;

      if (!incoming || typeof incoming !== 'object' || typeof incoming.cards !== 'object') {
        toast('Это не похоже на файл прогресса');
        return false;
      }

      // Берём только известные поля и отбрасываем мусор: номера вне 1..214,
      // нечисловые коробки и прочее, что сломало бы расчёты.
      const clean = blank();
      clean.theme = S.theme;

      Object.entries(incoming.cards).forEach(([k, v]) => {
        const n = +k;
        if (!Number.isInteger(n) || n < 1 || n > TOTAL) return;
        if (!v || typeof v !== 'object') return;
        const box = Math.min(5, Math.max(0, Math.round(+v.box) || 0));
        clean.cards[n] = {
          box,
          due: Number.isFinite(+v.due) ? +v.due : Date.now(),
          seen: Math.max(0, Math.round(+v.seen) || 0)
        };
      });

      clean.streak = Math.max(0, Math.round(+incoming.streak) || 0);
      clean.todayCount = Math.max(0, Math.round(+incoming.todayCount) || 0);
      clean.totalAnswers = Math.max(0, Math.round(+incoming.totalAnswers) || 0);
      clean.lastDay = typeof incoming.lastDay === 'string' ? incoming.lastDay : null;

      S = clean;
      save();
      go('start');
      const n = Object.keys(clean.cards).length;
      toast(`Загружено: ${n} ${plural(n, 'карточка', 'карточки', 'карточек')}`);
      return true;
    } catch (e) {
      toast('Не удалось прочитать файл');
      return false;
    }
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => importFromText(reader.result);
  reader.onerror = () => toast('Не удалось прочитать файл');
  reader.readAsText(file);
}

/* ─────────── сброс ─────────── */
// Мягкий сброс: забываем расписание повторений, но выученное остаётся выученным.
function softReset() {
  Object.keys(S.cards).forEach(n => {
    if (isLearned(n)) S.cards[n].due = Date.now();
    else delete S.cards[n];
  });
  save();
  el('modal-soft').classList.remove('on');
  go('start');
  toast('Расписание сброшено');
}

function doReset() {
  const theme = S.theme;
  S = blank();
  S.theme = theme;
  try { localStorage.removeItem(KEY); } catch (e) {}
  save();
  el('modal').classList.remove('on');
  go('start');
  toast('Прогресс обнулён');
}

/* ─────────── события ─────────── */
function bind() {
  el('theme-btn').onclick = toggleTheme;
  el('theme-btn2').onclick = toggleTheme;

  el('btn-train').onclick = startTrain;
  el('btn-browse').onclick = () => go('browse');

  el('search').oninput = e => {
    query = e.target.value;
    renderGrid();
  };
  // Esc в поле поиска очищает запрос, а не только модалки
  el('search').onkeydown = e => {
    if (e.key === 'Escape' && query) {
      e.stopPropagation();
      query = '';
      e.target.value = '';
      renderGrid();
    }
  };
  el('btn-reset').onclick = () => el('modal').classList.add('on');

  el('m-no').onclick = () => el('modal').classList.remove('on');
  el('m-yes').onclick = doReset;
  el('modal').onclick = e => { if (e.target.id === 'modal') el('modal').classList.remove('on'); };

  el('btn-soft').onclick = () => el('modal-soft').classList.add('on');
  el('ms-no').onclick = () => el('modal-soft').classList.remove('on');
  el('ms-yes').onclick = softReset;
  el('modal-soft').onclick = e => { if (e.target.id === 'modal-soft') el('modal-soft').classList.remove('on'); };

  el('btn-export').onclick = exportProgress;
  el('btn-import').onclick = () => el('file-in').click();
  el('file-in').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (f) importProgress(f);
    e.target.value = '';        // чтобы повторный выбор того же файла срабатывал
  };

  // Esc закрывает любую открытую модалку
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    el('modal').classList.remove('on');
    el('modal-soft').classList.remove('on');
  });

  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => go('start'));

  document.querySelectorAll('#filters .chip').forEach(c => {
    c.onclick = () => {
      document.querySelectorAll('#filters .chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      filter = c.dataset.f;
      renderGrid();
    };
  });

  el('btn-anim').onclick = () => {
    if (!writer) return;
    try { writer.cancelQuiz(); } catch (e) {}
    writer.hideCharacter();
    writer.animateCharacter();
  };

  el('btn-quiz').onclick = () => {
    if (!writer) return;
    writer.hideCharacter();
    writer.quiz({
      onComplete: () => {
        toast('Верно! Все черты на месте');
        setTimeout(() => writer.animateCharacter(), 700);
      }
    });
  };

  el('c-nav-prev').onclick = () => openCard(current > 1 ? current - 1 : TOTAL);
  el('c-nav-next').onclick = () => openCard(current < TOTAL ? current + 1 : 1);

  el('btn-learned').onclick = () => {
    touchDay();
    if (isLearned(current)) {
      delete S.cards[current];
      save();
      toast('Ключ убран из выученных');
    } else {
      S.cards[current] = { box: 3, due: Date.now() + GAPS[3] * 864e5, seen: (S.cards[current]?.seen || 0) + 1 };
      save();
      toast('Отмечено выученным');
    }
    openCard(current);
  };

  el('t-flip').onclick = flip;
  el('t-no').onclick = () => answer(false);
  el('t-yes').onclick = () => answer(true);
  el('t-again').onclick = startTrain;
  el('t-home').onclick = () => go('start');

  document.addEventListener('keydown', e => {
    if (!el('v-train').classList.contains('on')) return;
    if (el('t-done').style.display === 'block') return;
    if (e.code === 'Space') { e.preventDefault(); flip(); }
    if (e.key === '1') answer(false);
    if (e.key === '2') answer(true);
  });
}

/* ─────────── старт ─────────── */
function init() {
  if (typeof RADICALS === 'undefined' || !RADICALS.length) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif">Не удалось загрузить data.js — проверь, что файл лежит рядом с index.html.</div>';
    return;
  }
  applyTheme();
  bind();
  renderStart();
  console.log(`Bùshǒu: загружено ${RADICALS.length} ключей`);
}

document.addEventListener('DOMContentLoaded', init);
