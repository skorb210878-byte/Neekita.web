import { initCursorLight } from './cursorLight.js';
import { initVisibilityPause } from './visibility.js';
import { initTelegramCta } from './telegramCta.js';
import { initHeroBokeh } from './heroBokeh.js';
import { initHeroWorkLog } from './heroWorkLog.js';

const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = String(new Date().getFullYear());
}

initCursorLight();
initVisibilityPause();
initTelegramCta();
initHeroBokeh();
initHeroWorkLog();
