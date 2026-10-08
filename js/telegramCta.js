// Достраивает ссылку на Telegram текстом из data-message, чтобы само
// сообщение редактировалось в index.html, а не в JS (раздел 6 ТЗ).

export function initTelegramCta() {
  const ctas = document.querySelectorAll('.js-telegram-cta');

  ctas.forEach((cta) => {
    const message = cta.dataset.message;
    const baseHref = cta.getAttribute('href');
    if (!message || !baseHref) return;

    cta.href = `${baseHref}?text=${encodeURIComponent(message)}`;
  });
}
