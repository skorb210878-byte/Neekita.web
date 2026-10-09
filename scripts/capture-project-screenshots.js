// Этап 7 ТЗ: реальные скриншоты проектов вместо CSS-заглушки — "не
// подделывать скриншоты проектов" (раздел 10 ТЗ). Открывает живые сайты
// проектов через Playwright, снимает верх страницы (16:10, как
// .project-card__media) и сохраняет в WebP (раздел 6: картинки WebP/AVIF).

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'img', 'projects');

// Соотношение сторон совпадает с .project-card__media (aspect-ratio: 16/10).
const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 800;
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 500;

const PROJECTS = [
  { slug: 'sida-candle', url: 'http://sidacandle.ru/' },
  { slug: 'bmw-m5-g90', url: 'https://anarabdullaevtwitch.netlify.app/' },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (err) {
    console.warn(`Chrome недоступен (${err.message}), пробую Edge…`);
    return await chromium.launch({ channel: 'msedge' });
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await launchBrowser();

  for (const project of PROJECTS) {
    console.log(`Снимаю ${project.url}…`);
    const page = await browser.newPage({
      viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
    });
    await page.goto(project.url, { waitUntil: 'networkidle', timeout: 30000 });
    // 3D-витрина (BMW) может ещё догружать модель/анимацию.
    await page.waitForTimeout(1500);

    const rawPath = path.join(OUT_DIR, `${project.slug}.raw.png`);
    await page.screenshot({ path: rawPath });
    await page.close();

    const outPath = path.join(OUT_DIR, `${project.slug}.webp`);
    await sharp(rawPath)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'top' })
      .webp({ quality: 80 })
      .toFile(outPath);

    const { statSync, unlinkSync } = await import('node:fs');
    unlinkSync(rawPath);
    const { size } = statSync(outPath);
    console.log(`→ ${path.relative(ROOT, outPath)}: ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}, ${size} байт`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('capture-project-screenshots упал с ошибкой:', err);
  process.exitCode = 1;
});
