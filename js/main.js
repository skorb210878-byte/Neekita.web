import { initVisibilityPause } from './visibility.js';
import { initTelegramCta } from './telegramCta.js';
import { initHeroBokeh } from './heroBokeh.js';
import { initHeroCode } from './heroCode.js';

const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = String(new Date().getFullYear());
}

initVisibilityPause();
initTelegramCta();
initHeroBokeh();
initHeroCode();
