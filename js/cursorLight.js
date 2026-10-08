// Световое пятно за курсором (раздел 4 ТЗ).
// Включается только на десктопе с точным указателем и без prefers-reduced-motion.

export function initCursorLight() {
  const el = document.querySelector('.cursor-light');
  if (!el) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (prefersReducedMotion || !isFinePointer) return;

  let pendingFrame = null;

  function handlePointerMove(event) {
    if (pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
      el.style.setProperty('--mouse-x', `${event.clientX}px`);
      el.style.setProperty('--mouse-y', `${event.clientY}px`);
      el.classList.add('is-active');
      pendingFrame = null;
    });
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
}
