// Модальные окна карточек «Что делаю». Используем нативный <dialog> —
// showModal() сам удерживает фокус внутри окна и блокирует взаимодействие
// с остальной страницей, Esc закрывает через событие cancel. Здесь только
// то, что браузер не делает сам: анимация (opacity/transform), клик по
// затемнению, блокировка скролла страницы и возврат фокуса на кнопку.

const VISIBLE_CLASS = 'is-visible';
const CLOSE_ANIMATION_FALLBACK_MS = 260;

export function initServiceModals() {
  const dialogs = document.querySelectorAll('.service-modal');
  if (!dialogs.length) return;

  dialogs.forEach((dialog) => {
    const panel = dialog.querySelector('.service-modal__panel');
    const closeBtn = dialog.querySelector('.js-close-modal');
    let trigger = null;
    let closing = false;

    const prefersReducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function finishClose() {
      if (!dialog.open) return;
      dialog.close();
    }

    function animateClose() {
      if (closing) return;
      closing = true;
      document.body.classList.remove('has-modal-open');
      dialog.classList.remove(VISIBLE_CLASS);

      if (prefersReducedMotion() || !panel) {
        finishClose();
        return;
      }

      let settled = false;
      const onEnd = (event) => {
        if (event.target !== panel || event.propertyName !== 'opacity') return;
        if (settled) return;
        settled = true;
        panel.removeEventListener('transitionend', onEnd);
        finishClose();
      };
      panel.addEventListener('transitionend', onEnd);
      setTimeout(() => {
        if (settled) return;
        settled = true;
        panel.removeEventListener('transitionend', onEnd);
        finishClose();
      }, CLOSE_ANIMATION_FALLBACK_MS);
    }

    dialog.addEventListener('cancel', (event) => {
      // Esc: не даём браузеру закрыть окно мгновенно — сперва проигрываем
      // анимацию исчезновения, затем закрываем сами.
      event.preventDefault();
      animateClose();
    });

    dialog.addEventListener('close', () => {
      closing = false;
      document.body.classList.remove('has-modal-open');
      dialog.classList.remove(VISIBLE_CLASS);
      if (trigger) {
        trigger.focus();
        trigger = null;
      }
    });

    dialog.addEventListener('click', (event) => {
      // Окно растянуто на весь экран (см. CSS) — клик именно по <dialog>,
      // а не по .service-modal__panel, означает клик по затемнению.
      if (event.target === dialog) {
        animateClose();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => animateClose());
    }

    dialog.openFromTrigger = (triggerEl) => {
      trigger = triggerEl;
      closing = false;
      document.body.classList.add('has-modal-open');
      dialog.showModal();
      requestAnimationFrame(() => dialog.classList.add(VISIBLE_CLASS));
      (closeBtn || dialog).focus();
    };
  });

  document.querySelectorAll('.js-open-modal').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const targetId = trigger.dataset.modal;
      const dialog = targetId && document.getElementById(targetId);
      if (!dialog || typeof dialog.openFromTrigger !== 'function') return;
      dialog.openFromTrigger(trigger);
    });
  });
}
