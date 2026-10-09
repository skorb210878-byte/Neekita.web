// Окно редактора кода в hero — печатает код посимвольно по кругу, с
// подсветкой синтаксиса (раздел 4 ТЗ: цвета только из палитры сайта).
// Один модуль: фрагменты + простая токенизация + цикл печати/скролла.
//
// Без JS или при prefers-reduced-motion в разметке уже лежит готовый
// статичный фрагмент (bot.py, полностью, с подсветкой) — это состояние
// по умолчанию, здесь мы только включаем динамику поверх него.

const KEYWORDS = [
  'import', 'from', 'async', 'def', 'await', 'return', 'None', 'True', 'False',
  'export', 'default', 'function', 'const', 'let', 'var', 'new',
  'true', 'false', 'null', 'undefined', 'if', 'else', 'for', 'while', 'in', 'of',
  'class', 'extends', 'this', 'typeof', 'try', 'catch', 'finally', 'throw',
  'break', 'continue',
];

const STRING_RE = /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g');

// Фрагменты реального кода проектов — по одному на каждый (см. QA.md).
// Комментарии короткие, на русском; ссылки/ключи — заглушки, не настоящие.
const FRAGMENTS = [
  {
    filename: 'bot.py',
    lines: [
      '# Обработчик команды /start',
      'from aiogram import Bot, Dispatcher, types',
      'from aiogram.filters import Command',
      'from aiogram.utils.keyboard import InlineKeyboardBuilder',
      '',
      'dp = Dispatcher()',
      '',
      '@dp.message(Command("start"))',
      'async def cmd_start(message: types.Message) -> None:',
      '    # Кнопка со ссылкой на оплату подписки',
      '    keyboard = InlineKeyboardBuilder()',
      '    keyboard.button(',
      '        text="Оформить подписку",',
      '        url="https://example.com/subscribe",',
      '    )',
      '    await message.answer(',
      '        "Привет! Это закрытый канал.",',
      '        reply_markup=keyboard.as_markup(),',
      '    )',
    ],
  },
  {
    filename: 'cart.js',
    lines: [
      '// Корзина Mini App: добавление товара и подсчёт суммы',
      'const cart = [];',
      '',
      'function addToCart(product, qty = 1) {',
      '  const existing = cart.find((item) => item.id === product.id);',
      '',
      '  if (existing) {',
      '    existing.qty += qty;',
      '  } else {',
      '    cart.push({ ...product, qty });',
      '  }',
      '}',
      'function getTotal() {',
      '  // Сумма по всем позициям корзины',
      '  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);',
      '}',
      'function renderTotal() {',
      '  totalEl.textContent = `Итого: ${getTotal()} ₽`;',
      '}',
    ],
  },
  {
    filename: 'catalog.js',
    lines: [
      '// Каталог: переключение фото и сборка текста заказа',
      'let activePhoto = 0;',
      '',
      'function showPhoto(index) {',
      '  const photos = document.querySelectorAll(".gallery__photo");',
      '  photos.forEach((photo, i) => {',
      '    photo.hidden = i !== index;',
      '  });',
      '  activePhoto = index;',
      '}',
      '',
      'function nextPhoto(photosLength) {',
      '  showPhoto((activePhoto + 1) % photosLength);',
      '}',
      '',
      'function buildOrderText(product, scent) {',
      '  // Текст заявки для Telegram',
      '  return [`Хочу заказать: ${product.name}`, `Аромат: ${scent}`].join("\\n");',
      '}',
    ],
  },
  {
    filename: 'scene.js',
    lines: [
      '// 3D-сцена: загрузка модели и вращение камеры',
      'import * as THREE from "three";',
      'import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";',
      '',
      'const scene = new THREE.Scene();',
      'const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);',
      'const renderer = new THREE.WebGLRenderer({ antialias: true });',
      'const loader = new GLTFLoader();',
      'loader.load("/models/car.glb", (gltf) => {',
      '  scene.add(gltf.scene);',
      '});',
      '',
      'function animate() {',
      '  requestAnimationFrame(animate);',
      '  // Медленное вращение камеры вокруг машины',
      '  const t = performance.now() * 0.0001;',
      '  camera.position.set(Math.sin(t) * 6, 1.5, Math.cos(t) * 6);',
      '  camera.lookAt(0, 1, 0);',
      '  renderer.render(scene, camera);',
      '}',
    ],
  },
];

function tokenizeKeywords(segment) {
  const tokens = [];
  let cursor = 0;
  KEYWORD_RE.lastIndex = 0;
  let match = KEYWORD_RE.exec(segment);
  while (match) {
    if (match.index > cursor) {
      tokens.push({ type: 'default', text: segment.slice(cursor, match.index) });
    }
    tokens.push({ type: 'keyword', text: match[0] });
    cursor = match.index + match[0].length;
    match = KEYWORD_RE.exec(segment);
  }
  if (cursor < segment.length) {
    tokens.push({ type: 'default', text: segment.slice(cursor) });
  }
  return tokens;
}

function tokenizeLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return [{ type: 'comment', text: line }];
  }

  const tokens = [];
  let cursor = 0;
  STRING_RE.lastIndex = 0;
  let match = STRING_RE.exec(line);
  while (match) {
    if (match.index > cursor) {
      tokens.push(...tokenizeKeywords(line.slice(cursor, match.index)));
    }
    tokens.push({ type: 'string', text: match[0] });
    cursor = match.index + match[0].length;
    match = STRING_RE.exec(line);
  }
  if (cursor < line.length) {
    tokens.push(...tokenizeKeywords(line.slice(cursor)));
  }

  return tokens.length ? tokens : [{ type: 'default', text: '' }];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.round(rand(min, max));
}

const CHAR_DELAY_MS = [35, 60];
const LINE_PAUSE_MS = [250, 500];
const LONG_PAUSE_MS = [800, 1200];
const LONG_PAUSE_LINES = [6, 10];
const FRAGMENT_PAUSE_MS = 1500;
const CLEAR_FADE_MS = 250;
const SCROLL_DURATION_MS = 320;

export function initHeroCode() {
  const root = document.querySelector('.code-window');
  if (!root) return;

  const viewport = root.querySelector('.code-window__viewport');
  const linesWrapper = root.querySelector('.code-window__lines');
  const tabs = Array.from(root.querySelectorAll('.code-window__tab'));
  if (!viewport || !linesWrapper) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return; // статичный фрагмент из разметки остаётся как есть

  // Запускаем динамику с чистого листа — статичный фрагмент из разметки
  // был только для без-JS/reduced-motion случая.
  linesWrapper.innerHTML = '';

  let lineHeight = 0;
  let maxLines = 4;

  function measureLineHeight() {
    const probe = document.createElement('div');
    probe.className = 'code-window__line';
    probe.innerHTML = '<span class="code-window__lineno">0</span><span class="code-window__code">&nbsp;</span>';
    linesWrapper.appendChild(probe);
    lineHeight = probe.getBoundingClientRect().height || 22;
    linesWrapper.removeChild(probe);
    maxLines = Math.max(4, Math.floor(viewport.clientHeight / lineHeight));
  }
  measureLineHeight();

  let fragmentIndex = 0;
  let lineIndex = -1;
  let lineNumber = 0;
  let linesOnScreen = 0;
  let currentCodeEl = null;
  let currentSpan = null;
  let currentSpanType = null;
  let tokenQueue = [];
  let tokenIndex = 0;
  let tokenCharIndex = 0;
  let linesSinceLongPause = 0;
  let longPauseThreshold = randomInt(LONG_PAUSE_LINES[0], LONG_PAUSE_LINES[1]);
  let timerId = null;

  function schedule(fn, delay) {
    timerId = window.setTimeout(() => {
      if (document.hidden) {
        schedule(fn, 200); // ждём, пока вкладка снова станет видимой
        return;
      }
      fn();
    }, delay);
  }

  function setActiveTab(filename) {
    tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.filename === filename));
  }

  function addLine() {
    // Убираем курсор с предыдущей строки — он всегда только на активной.
    if (currentCodeEl) {
      const prevCursor = currentCodeEl.querySelector('.code-window__cursor');
      if (prevCursor) prevCursor.remove();
    }

    lineNumber += 1;
    const lineEl = document.createElement('div');
    lineEl.className = 'code-window__line';

    const noEl = document.createElement('span');
    noEl.className = 'code-window__lineno';
    noEl.textContent = String(lineNumber);

    const codeEl = document.createElement('span');
    codeEl.className = 'code-window__code';
    const cursorEl = document.createElement('span');
    cursorEl.className = 'code-window__cursor';
    codeEl.appendChild(cursorEl);

    lineEl.appendChild(noEl);
    lineEl.appendChild(codeEl);
    linesWrapper.appendChild(lineEl);

    linesOnScreen += 1;
    currentCodeEl = codeEl;
    currentSpan = null;
    currentSpanType = null;

    if (linesOnScreen > maxLines) {
      linesWrapper.style.transform = `translateY(-${lineHeight}px)`;
      window.setTimeout(() => {
        const oldest = linesWrapper.firstElementChild;
        if (oldest) oldest.remove();
        linesOnScreen -= 1;
        linesWrapper.style.transition = 'none';
        linesWrapper.style.transform = 'translateY(0)';
        void linesWrapper.offsetHeight; // форсируем reflow перед возвратом transition
        linesWrapper.style.transition = '';
      }, SCROLL_DURATION_MS);
    }
  }

  function appendChar(type, char) {
    if (currentSpan && currentSpanType === type) {
      currentSpan.textContent += char;
      return;
    }
    currentSpan = document.createElement('span');
    currentSpan.className = `tok tok--${type}`;
    currentSpan.textContent = char;
    currentSpanType = type;
    currentCodeEl.insertBefore(currentSpan, currentCodeEl.lastElementChild);
  }

  function typeNextChar() {
    if (tokenIndex >= tokenQueue.length) {
      finishLine();
      return;
    }
    const token = tokenQueue[tokenIndex];
    const char = token.text[tokenCharIndex];
    if (char !== undefined) {
      appendChar(token.type, char);
    }
    tokenCharIndex += 1;
    if (tokenCharIndex >= token.text.length) {
      tokenIndex += 1;
      tokenCharIndex = 0;
    }
    schedule(typeNextChar, rand(CHAR_DELAY_MS[0], CHAR_DELAY_MS[1]));
  }

  function finishLine() {
    linesSinceLongPause += 1;
    let delay;
    if (linesSinceLongPause >= longPauseThreshold) {
      delay = rand(LONG_PAUSE_MS[0], LONG_PAUSE_MS[1]);
      linesSinceLongPause = 0;
      longPauseThreshold = randomInt(LONG_PAUSE_LINES[0], LONG_PAUSE_LINES[1]);
    } else {
      delay = rand(LINE_PAUSE_MS[0], LINE_PAUSE_MS[1]);
    }
    schedule(startNextLine, delay);
  }

  function startNextLine() {
    const fragment = FRAGMENTS[fragmentIndex];
    lineIndex += 1;
    if (lineIndex >= fragment.lines.length) {
      finishFragment();
      return;
    }
    addLine();
    tokenQueue = tokenizeLine(fragment.lines[lineIndex]);
    tokenIndex = 0;
    tokenCharIndex = 0;
    schedule(typeNextChar, rand(CHAR_DELAY_MS[0], CHAR_DELAY_MS[1]));
  }

  function finishFragment() {
    schedule(() => {
      linesWrapper.classList.add('is-clearing');
      schedule(() => {
        linesWrapper.innerHTML = '';
        linesWrapper.classList.remove('is-clearing');
        linesWrapper.style.transform = 'translateY(0)';
        linesOnScreen = 0;
        lineNumber = 0;
        fragmentIndex = (fragmentIndex + 1) % FRAGMENTS.length;
        lineIndex = -1;
        setActiveTab(FRAGMENTS[fragmentIndex].filename);
        startNextLine();
      }, CLEAR_FADE_MS);
    }, FRAGMENT_PAUSE_MS);
  }

  setActiveTab(FRAGMENTS[0].filename);
  startNextLine();
}
