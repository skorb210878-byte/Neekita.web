// Печатает список незаполненных мест `[ЗАПОЛНИТЬ: ...]` в index.html —
// раздел 6 ТЗ: «команда npm run placeholders печатает их список».

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'index.html');
const html = readFileSync(indexPath, 'utf-8');

const lines = html.split(/\r?\n/);
const pattern = /\[ЗАПОЛНИТЬ:[^\]]*\]/g;
const found = [];

lines.forEach((line, i) => {
  const matches = line.match(pattern);
  if (matches) {
    matches.forEach((m) => found.push({ line: i + 1, text: m }));
  }
});

if (found.length === 0) {
  console.log('Незаполненных мест не найдено.');
} else {
  console.log(`Найдено незаполненных мест: ${found.length}\n`);
  found.forEach((f) => console.log(`  строка ${f.line}: ${f.text}`));
}

process.exitCode = 0;
