// Достраивает ссылку на Telegram текстом из data-message, чтобы само
// сообщение редактировалось в index.html, а не в JS (раздел 6 ТЗ).

export function initTelegramCta() {
  const cta = document.getElementById('telegram-cta');
  if (!cta) return;

  const message = cta.dataset.message;
  const baseHref = cta.getAttribute('href');
  if (!message || !baseHref) return;

  cta.href = `${baseHref}?text=${encodeURIComponent(message)}`;
}
