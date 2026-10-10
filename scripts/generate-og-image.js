// Генерирует og:image 1200×630 в стиле сайта (раздел 6 ТЗ) — без чужих
// материалов, скриптом. Текст рисуем через SVG <text>: в этом окружении
// рендеринга (sharp/librsvg) нет веб-шрифта Barlow Condensed, он не
// гарантированно доступен и на других машинах/CI — поэтому для растрового
// og-превью используется системный гротеск с запасными именами
// (Arial Narrow → Arial → sans-serif). Для самого сайта (HTML/CSS) это не
// проблема: там шрифт подключается через Google Fonts и рендерится в браузере
// пользователя. См. DECISIONS.md.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'assets', 'img', 'og-image.jpg');

const WIDTH = 1200;
const HEIGHT = 630;
const BG = '#0a0c10';
const ACCENT = '#4a8df0';
const TEXT = '#d9dbdc';
const MUTED = '#9aa0a4';

function monogramGroup(x, y, size) {
  const bar = size * 0.16;
  const left = x + size * 0.26;
  const right = x + size * 0.74 - bar;
  const top = y + size * 0.22;
  const bottom = y + size * 0.78;
  const midTop = y + size * 0.42;
  const midBottom = y + size * 0.58;
  return `
    <rect x="${left}" y="${top}" width="${bar}" height="${bottom - top}" fill="${ACCENT}"/>
    <rect x="${right}" y="${top}" width="${bar}" height="${bottom - top}" fill="${ACCENT}"/>
    <rect x="${left}" y="${midTop}" width="${right + bar - left}" height="${midBottom - midTop}" fill="${ACCENT}"/>
  `;
}

function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <radialGradient id="vignette" cx="50%" cy="40%" r="75%">
        <stop offset="45%" stop-color="${BG}" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
      </radialGradient>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.045"/>

    ${monogramGroup(80, 80, 120)}

    <text x="80" y="330" font-family="Arial Narrow, Arial, sans-serif" font-weight="700"
          font-size="96" letter-spacing="1" fill="${TEXT}">НИКИТА</text>
    <text x="80" y="400" font-family="Arial Narrow, Arial, sans-serif" font-weight="700"
          font-size="52" letter-spacing="1" fill="${TEXT}">САЙТЫ, БОТЫ, MINI APP</text>
    <text x="80" y="460" font-family="Arial, sans-serif" font-weight="400"
          font-size="30" fill="${MUTED}">Сайты, Telegram-боты и Mini App для малого бизнеса</text>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>
  </svg>`;
}

async function main() {
  const buffer = await sharp(Buffer.from(buildSvg()))
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(OUT_PATH, buffer);

  const metadata = await sharp(buffer).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
    throw new Error(
      `og-image вышел не 1200×630, а ${metadata.width}×${metadata.height}`
    );
  }
  console.log(`assets/img/og-image.jpg создан: ${metadata.width}×${metadata.height}, ${buffer.length} байт`);
}

main().catch((err) => {
  console.error('Не удалось сгенерировать og-image:', err);
  process.exitCode = 1;
});
