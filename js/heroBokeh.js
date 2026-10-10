// Фон hero — «ночной город за мокрым стеклом» (переделка hero). Генерирует
// 15–25 размытых холодных огней (меньше на ≤768px) один раз при загрузке;
// дальше дрейф и мерцание — чистый CSS (только transform/opacity, раздел 6
// ТЗ), пауза на скрытой вкладке через общий .is-hidden (js/visibility.js),
// статичный кадр при prefers-reduced-motion (анимация просто выключена в
// CSS, элементы остаются на месте).
//
// Мягкость каждого огня — через radial-gradient с прозрачным краем, не
// через CSS filter: blur — на 20+ элементах blur ощутимо дороже по GPU,
// а градиент даёт тот же эффект дешевле (важно для слабых телефонов).

const COLORS = [
  { color: 'var(--accent)', weight: 6 }, // холодный синий — основной цвет огней
  { color: 'var(--hero-glow-white)', weight: 3 }, // приглушённый холодный белый
  { color: 'var(--hero-glow-rare)', weight: 1 }, // редкий тусклый синий акцент
];

function pickColor() {
  const total = COLORS.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  for (const c of COLORS) {
    if (roll < c.weight) return c.color;
    roll -= c.weight;
  }
  return COLORS[0].color;
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

export function initHeroBokeh() {
  const container = document.querySelector('.hero-bg');
  if (!container) return;

  const isSmall = window.matchMedia('(max-width: 768px)').matches;
  const count = Math.round(isSmall ? between(12, 16) : between(18, 25));

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const light = document.createElement('span');
    light.className = 'hero-light';
    const size = between(isSmall ? 70 : 90, isSmall ? 150 : 240);

    light.style.setProperty('--x', `${between(0, 100)}%`);
    light.style.setProperty('--y', `${between(0, 100)}%`);
    light.style.setProperty('--size', `${size.toFixed(0)}px`);
    light.style.setProperty('--light-color', pickColor());
    light.style.setProperty('--light-opacity', between(0.08, 0.22).toFixed(2));
    light.style.setProperty('--drift-x', `${between(-18, 18).toFixed(0)}px`);
    light.style.setProperty('--drift-y', `${between(-14, 14).toFixed(0)}px`);
    light.style.setProperty('--duration', `${between(22, 42).toFixed(1)}s`);
    light.style.setProperty('--delay', `-${between(0, 30).toFixed(1)}s`);
    light.style.setProperty('--flicker', `${between(4, 9).toFixed(1)}s`);
    light.style.setProperty('--flicker-delay', `-${between(0, 9).toFixed(1)}s`);

    fragment.appendChild(light);
  }
  container.appendChild(fragment);
}
