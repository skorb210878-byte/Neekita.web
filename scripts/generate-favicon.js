// Генерирует фавиконку в стиле сайта (раздел 6 ТЗ: «favicon (SVG-монограмма «Н»)»).
// Монограмма нарисована геометрией (прямоугольники), а не текстом: шрифт
// Barlow Condensed — веб-шрифт, в headless-окружении рендеринга SVG (sharp/
// librsvg) его может не быть, а буква "Н" от этого не должна плыть между
// средами. PNG-растры — для apple-touch-icon и старых браузеров.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'img');

const BG = '#0a0c10';
const ACCENT = '#4a8df0';

// Буква «Н» как геометрия: две вертикальные стойки + горизонтальная перекладина,
// пропорции под плотный гротеск (Barlow Condensed) — стойки ближе друг к другу,
// чем в обычном "H".
function monogramSvg(size) {
  const bar = size * 0.16;
  const left = size * 0.26;
  const right = size * 0.74 - bar;
  const top = size * 0.22;
  const bottom = size * 0.78;
  const midTop = size * 0.42;
  const midBottom = size * 0.58;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}"/>
    <rect x="${left}" y="${top}" width="${bar}" height="${bottom - top}" fill="${ACCENT}"/>
    <rect x="${right}" y="${top}" width="${bar}" height="${bottom - top}" fill="${ACCENT}"/>
    <rect x="${left}" y="${midTop}" width="${right + bar - left}" height="${midBottom - midTop}" fill="${ACCENT}"/>
  </svg>`;
}

async function main() {
  const svg = monogramSvg(64);
  writeFileSync(path.join(OUT_DIR, 'favicon.svg'), svg);
  console.log('assets/img/favicon.svg обновлён');

  for (const size of [32, 180]) {
    const buffer = await sharp(Buffer.from(monogramSvg(size))).png().toBuffer();
    const fileName = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`;
    writeFileSync(path.join(OUT_DIR, fileName), buffer);
    console.log(`assets/img/${fileName} создан (${buffer.length} байт)`);
  }
}

main().catch((err) => {
  console.error('Не удалось сгенерировать favicon:', err);
  process.exitCode = 1;
});
