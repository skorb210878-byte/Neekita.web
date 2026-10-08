// Пауза анимаций на скрытой вкладке (раздел 6 ТЗ): ставит класс .is-hidden
// на body, CSS сам переводит анимации в animation-play-state: paused.

export function initVisibilityPause() {
  const apply = () => {
    document.body.classList.toggle('is-hidden', document.hidden);
  };
  document.addEventListener('visibilitychange', apply);
  apply();
}
