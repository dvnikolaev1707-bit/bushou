/* Bùshǒu — тесты стартового экрана, прогресса и сброса (jsdom) */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<script src="https:[^"]*"><\/script>/g, '')
  .replace('<script src="data.js"></script>', `<script>${fs.readFileSync('data.js', 'utf8')}</script>`)
  .replace('<script src="app.js"></script>', `<script>${fs.readFileSync('app.js', 'utf8')}</script>`);

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true });
const w = dom.window;

w.addEventListener('load', async () => {
  const run = c => w.eval(c);
  const $ = id => w.document.getElementById(id);
  const txt = id => $(id).textContent;
  const click = id => run(`document.getElementById('${id}').click()`);
  const clickSel = sel => run(`document.querySelector('${sel}').click()`);
  const RAD = run('RADICALS');
  const saved = () => JSON.parse(run(`localStorage.getItem('bushou.v1')`) || 'null');
  const cells = () => w.document.querySelectorAll('#grid .cell').length;
  const wait = ms => new Promise(r => setTimeout(r, ms));   // ждём анимацию перехода

  console.log('\n1. Данные');
  ok(RAD.length === 214, 'загружено 214 ключей');
  ok(RAD.every(r => r.char && r.pinyin && r.meaning && r.mnemonic), 'все поля заполнены');
  ok(RAD.every(r => Array.isArray(r.examples) && r.examples.length), 'у каждого есть примеры');
  ok(new Set(RAD.map(r => r.num)).size === 214, 'номера уникальны');

  console.log('\n2. Стартовый экран при нуле');
  ok($('v-start').classList.contains('on'), 'открыт стартовый экран');
  ok(txt('pct') === '0%', 'прогресс 0%');
  ok(txt('s-learned') === '0', 'выучено 0');
  ok(txt('s-seen') === '0', 'в работе 0');
  ok(txt('s-left') === '214', 'осталось 214');
  ok(txt('cover') === '0%', 'покрытие 0%');
  ok(txt('k-streak') === '0' && txt('k-total') === '0', 'счётчики на нуле');
  ok($('cover-bar').style.width === '0%', 'полоса покрытия пуста');

  console.log('\n3. Отметка «выучено»');
  run('openCard(1)'); click('btn-learned');
  run('openCard(9)'); click('btn-learned');
  run("go('start')");
  ok(txt('s-learned') === '2', 'выучено 2');
  ok(txt('s-left') === '212', 'осталось 212');
  ok(+txt('cover').replace('%', '') > 0, 'покрытие выросло → ' + txt('cover'));
  ok(txt('pct') === '1%', 'процент пересчитан → ' + txt('pct'));
  ok(parseFloat($('ring-arc').style.strokeDashoffset) < 283, 'кольцо прогресса сдвинулось');

  console.log('\n4. Сохранение');
  ok(!!saved(), 'запись в localStorage создана');
  ok(saved().cards['1'].box === 3, 'ключ №1 лежит в коробке 3');
  ok(Object.keys(saved().cards).length === 2, 'сохранено 2 карточки');

  console.log('\n5. Снятие отметки');
  run('openCard(1)'); click('btn-learned'); run("go('start')");
  ok(txt('s-learned') === '1', 'выучено снова 1');
  ok(!saved().cards['1'], 'карточка удалена из хранилища');

  console.log('\n6. Модалка сброса');
  click('btn-reset');
  ok($('modal').classList.contains('on'), 'модалка открылась');
  click('m-no');
  ok(!$('modal').classList.contains('on'), '«Отмена» закрывает');
  ok(txt('s-learned') === '1', 'отмена не тронула прогресс');
  click('btn-reset');
  run("document.getElementById('modal').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  ok(!$('modal').classList.contains('on'), 'клик по фону закрывает');

  console.log('\n7. Сброс прогресса');
  click('theme-btn');
  const theme = w.document.documentElement.dataset.theme;
  click('btn-reset'); click('m-yes');
  ok(txt('s-learned') === '0', 'выучено обнулено');
  ok(txt('s-left') === '214', 'осталось снова 214');
  ok(txt('pct') === '0%' && txt('cover') === '0%', 'проценты обнулены');
  ok(txt('k-total') === '0' && txt('k-streak') === '0', 'статистика обнулена');
  ok($('cover-bar').style.width === '0%', 'полоса покрытия пуста');
  ok(!$('modal').classList.contains('on'), 'модалка закрылась');
  ok($('v-start').classList.contains('on'), 'вернулись на старт');
  ok(w.document.documentElement.dataset.theme === theme, `тема выжила сброс (${theme})`);
  ok(Object.keys(saved().cards).length === 0, 'карточки в хранилище пусты');
  ok($('toast').classList.contains('on'), 'показан тост подтверждения');

  console.log('\n8. Список и фильтры');
  run("go('browse')");
  ok(cells() === 214, 'показаны все 214');
  clickSel('#filters .chip[data-f="1"]');
  ok(cells() === RAD.filter(r => r.tier === 1).length, 'фильтр «Тир 1» → ' + cells());
  clickSel('#filters .chip[data-f="3"]');
  ok(cells() === RAD.filter(r => r.tier === 3).length, 'фильтр «Тир 3» → ' + cells());
  clickSel('#filters .chip[data-f="learned"]');
  ok(cells() === 0, '«Выучено» пусто после сброса');
  clickSel('#filters .chip[data-f="new"]');
  ok(cells() === 214, '«Не начато» → все 214');
  clickSel('#filters .chip[data-f="all"]');

  console.log('\n9. Карточка ключа');
  run('openCard(85)');
  ok($('v-card').classList.contains('on'), 'карточка открылась');
  ok(txt('c-py') === byNum(85).pinyin, 'пиньинь верный → ' + txt('c-py'));
  ok(txt('c-mean') === byNum(85).meaning, 'значение верное → ' + txt('c-mean'));
  ok(txt('c-mnemo').length > 5, 'мнемоника на месте');
  ok(w.document.querySelectorAll('#c-ex .ex').length > 0, 'примеры отрисованы');
  click('c-nav-next');
  ok(run('current') === 86, 'листание вперёд');
  click('c-nav-prev');
  ok(run('current') === 85, 'листание назад');
  run('openCard(1)'); click('c-nav-prev');
  ok(run('current') === 214, 'с первого уходим на 214 (цикл)');

  console.log('\n10. Тренировка');
  run("go('start')");
  click('btn-train');
  ok($('v-train').classList.contains('on'), 'экран тренировки открыт');
  await wait(200);                      // showCard подставляет текст через 120 мс
  ok(txt('t-glyph') !== '—', 'иероглиф подставлен → ' + txt('t-glyph'));
  ok(w.document.querySelectorAll('#t-dots .dot').length > 0, 'точки прогресса есть');
  click('t-flip');
  ok($('t-flip').classList.contains('flipped'), 'карточка переворачивается');
  ok(txt('t-py') !== '—', 'обратная сторона заполнена');
  const before = +txt('k-total');
  click('t-yes');
  ok(run('busy') === true, 'на время перехода ввод заблокирован');
  click('t-yes');                       // повторный клик не должен ломать сессию
  await wait(800);
  ok(run('di') === 1, 'двойной клик не перескочил карточку');
  run("go('start')");
  ok(+txt('k-total') === before + 1, 'ответ учтён');
  ok(txt('k-streak') === '1', 'серия стала 1');
  ok(txt('k-today') === '1', 'счётчик за сегодня = 1');

  console.log('\n11. Полный цикл сессии');
  click('btn-train');
  const size = run('deck.length');
  for (let i = 0; i < size; i++) {
    if (!$('t-flip').classList.contains('flipped')) click('t-flip');
    click('t-yes');
    await wait(800);
  }
  ok($('t-done').style.display === 'block', 'сессия завершается экраном итога');
  ok(txt('t-summary').length > 5, 'итог заполнен: ' + txt('t-summary'));
  click('t-home');
  ok($('v-start').classList.contains('on'), 'кнопка «На главную» работает');

  console.log('\n12. Устойчивость');
  run("localStorage.setItem('bushou.v1','{битый JSON')");
  ok(run('typeof load()') === 'object', 'битое сохранение не роняет load()');
  run("localStorage.setItem('bushou.v1', JSON.stringify({cards:{'5':{box:9,due:0,seen:1}}}))");
  ok(run('JSON.parse(localStorage.getItem(\'bushou.v1\')).cards[\'5\'].box') === 9, 'чужие данные читаются');


  console.log('\n13. Разбивка по тирам');
  run("go('start')");
  ok(w.document.querySelectorAll('#tiers .tier-row').length === 3, 'три строки тиров');
  run('S = blank(); save()');
  run('openCard(1)'); click('btn-learned');          // тир 1
  run("go('start')");
  const t1row = w.document.querySelector('#tiers .tier-row.t1 .t-num').textContent;
  ok(/^1 \/ \d+$/.test(t1row.trim()), 'тир 1 учёл ключ → ' + t1row.trim());
  ok(w.document.querySelector('#tiers .tier-row.t3 .t-num').textContent.trim().startsWith('0 /'),
     'тир 3 остался нулевым');
  ok(parseFloat(w.document.querySelector('#tiers .tier-row.t1 .bar i').style.width) > 0,
     'полоса тира 1 заполнилась');

  console.log('\n14. Мягкий сброс');
  run('S = blank(); save()');
  run('openCard(1)'); click('btn-learned');           // выучен
  run("S.cards[2] = {box:1, due:Date.now()+864e5, seen:1}; save()");   // в работе
  run("go('start')");
  ok(txt('s-learned') === '1' && txt('s-seen') === '1', 'исходно: 1 выучен, 1 в работе');
  click('btn-soft');
  ok($('modal-soft').classList.contains('on'), 'модалка мягкого сброса открылась');
  click('ms-no');
  ok(!$('modal-soft').classList.contains('on'), 'отмена закрывает');
  click('btn-soft'); click('ms-yes');
  ok(txt('s-learned') === '1', 'выученное сохранилось');
  ok(txt('s-seen') === '0', 'незакреплённое убрано');
  ok(run('pickDue().length') > 0, 'выученный ключ вернулся в очередь');
  ok(!$('modal-soft').classList.contains('on'), 'модалка закрылась');

  console.log('\n15. Экспорт и импорт');
  run('S = blank(); save()');
  run('openCard(9)'); click('btn-learned');
  run('openCard(30)'); click('btn-learned');
  const snapshot = run('JSON.stringify({app:"bushou",version:1,state:S})');
  run('S = blank(); save()'); run("go('start')");
  ok(txt('s-learned') === '0', 'перед импортом прогресс пуст');
  run(`importFromText(${JSON.stringify(snapshot)})`);
  ok(txt('s-learned') === '2', 'импорт восстановил 2 ключа');
  ok(run('isLearned(9)') === true && run('isLearned(30)') === true, 'восстановлены именно те ключи');

  console.log('\n16. Импорт мусора не ломает состояние');
  run('S = blank(); save()');
  run(`importFromText('{"state":{"cards":{"999":{"box":3},"-5":{"box":3},"9":{"box":"дичь"},"30":{"box":4,"due":123,"seen":2}}}}')`);
  ok(!run('S.cards[999]') && !run("S.cards['-5']"), 'номера вне 1..214 отброшены');
  ok(run('S.cards[9].box') === 0, 'нечисловая коробка обнулена');
  ok(run('S.cards[30].box') === 4, 'корректная запись прошла');
  ok(run('typeof stats().pct') === 'number' && !run('isNaN(stats().pct)'), 'статистика считается без NaN');
  run(`importFromText('это не json')`);
  ok(run('typeof S.cards') === 'object', 'битый файл не сломал состояние');



  console.log('\n18. Поиск');
  run('S = blank(); save()');
  run("go('browse')");
  clickSel('#filters .chip[data-f="all"]');
  const type = q => run(
    `(function(){ const s=document.getElementById('search');` +
    `s.value=${JSON.stringify(q)};` +
    `s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  type('shuǐ');
  ok(cells() === 1 && $('grid').textContent.includes('水'), 'пиньинь с тонами → 水');
  type('shui');
  ok(cells() >= 1 && $('grid').textContent.includes('水'), 'пиньинь без тонов (' + cells() + ' совп.)');
  type('вода');
  ok(cells() === 1 && $('grid').textContent.includes('水'), 'поиск по значению → 水');
  type('85');
  ok(cells() === 1, 'поиск по номеру → 1 результат');
  type('水');
  ok(cells() >= 1 && $('grid').textContent.includes('水'), 'поиск самим иероглифом');
  type('SHUI');
  ok(cells() >= 1, 'регистр не важен');
  ok(run('TONELESS.strip("lǜ")') === 'lv', 'ǜ нормализуется в v');
  type('   вода  ');
  ok(cells() === 1, 'пробелы по краям обрезаются');
  type('заведомонесуществующее');
  ok(cells() === 0, 'мусорный запрос → пусто');
  ok($('grid-empty').hidden === false, 'показано пустое состояние');
  type('shui');
  ok($('grid-empty').hidden === true, 'пустое состояние скрылось');
  clickSel('#filters .chip[data-f="3"]');
  ok(cells() === 0, 'поиск shui внутри «Тир 3» → пусто');
  clickSel('#filters .chip[data-f="1"]');
  ok(cells() >= 1, 'поиск shui внутри «Тир 1» → есть');
  run(`document.getElementById('search').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
  ok(run('query') === '', 'Esc очистил запрос');
  ok(cells() === RAD.filter(r => r.tier === 1).length, 'после очистки виден весь Тир 1');
  clickSel('#filters .chip[data-f="all"]');

  function byNum(n) { return RAD.find(r => r.num === n); }

  console.log(`\n${'─'.repeat(48)}\nПройдено: ${pass}   Провалено: ${fail}`);
  process.exit(fail ? 1 : 0);
});
