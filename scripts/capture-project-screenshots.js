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
// У каждого проекта может быть свой размер окна захвата (поле capture),
// но соотношение сторон всегда 16:10 и финальный вывод всегда 800x500.
const DEFAULT_CAPTURE = { width: 1280, height: 800 };
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 500;

const PROJECTS = [
  { slug: 'sida-candle', url: 'http://sidacandle.ru/' },
  { slug: 'bmw-m5-g90', url: 'https://anarabdullaevtwitch.netlify.app/' },
  {
    slug: 'lumos-coffee',
    url: 'https://skorb210878-byte.github.io/Lumus.Coffee/',
    capture: { width: 1440, height: 900 },
  },
];

// Запуск с аргументом — захватить только один проект по slug, не трогая
// уже готовые скриншоты остальных (напр. `node capture-project-screenshots.js lumos-coffee`).
const onlySlug = process.argv[2];
const TARGETS = onlySlug ? PROJECTS.filter((p) => p.slug === onlySlug) : PROJECTS;

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

  for (const project of TARGETS) {
    console.log(`Снимаю ${project.url}…`);
    const capture = project.capture ?? DEFAULT_CAPTURE;
    const page = await browser.newPage({
      viewport: { width: capture.width, height: capture.height },
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
