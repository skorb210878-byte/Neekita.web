// «Журнал работы» в hero (раздел 4 ТЗ): команда печатается посимвольно,
// потом мигает курсор, потом строки коммитов появляются по очереди —
// имитация «кто-то работает прямо сейчас». Чисто декоративно (aria-hidden).
//
// Без JS или при prefers-reduced-motion разметка уже в финальном виде
// (команда и все строки видны статично) — это состояние по умолчанию в CSS,
// здесь только включаем анимированную версию.

const TYPE_INTERVAL_MS = 55;
const CURSOR_PAUSE_MS = 450;
const LINE_INTERVAL_MS = 550;

export function initHeroWorkLog() {
  const list = document.querySelector('.work-log__list');
  const promptEl = document.querySelector('.work-log__prompt');
  const cursor = document.querySelector('.work-log__cursor');
  if (!list || !promptEl) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const items = Array.from(list.children);
  const command = promptEl.textContent;

  list.classList.add('is-typing');
  promptEl.textContent = '';
  if (cursor) cursor.classList.add('is-active');

  let typed = 0;
  const typeTimer = window.setInterval(() => {
    typed += 1;
    promptEl.textContent = command.slice(0, typed);
    if (typed >= command.length) {
      window.clearInterval(typeTimer);
      window.setTimeout(revealLines, CURSOR_PAUSE_MS);
    }
  }, TYPE_INTERVAL_MS);

  function revealLines() {
    items.forEach((li, index) => {
      window.setTimeout(() => li.classList.add('is-visible'), index * LINE_INTERVAL_MS);
    });
  }
}
