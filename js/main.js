// Точка входа клиентского JS. Эффекты hero добавляются отдельными модулями
// на этапе 2, здесь — только базовая логика каркаса.

const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = String(new Date().getFullYear());
}
