// Печатает список незаполненных мест `[ЗАПОЛНИТЬ: ...]` в index.html —
// раздел 6 ТЗ: «команда npm run placeholders печатает их список».

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'index.html');
const html = readFileSync(indexPath, 'utf-8');

// Ищем по всему файлу одной строкой (не построчно) — иначе плейсхолдер,
// случайно разбитый переносом строки (например, внутри длинного
// HTML-комментария), не находится: ни одна отдельная строка не содержит
// одновременно и "[", и "]".
const pattern = /\[ЗАПОЛНИТЬ:[^\]]*\]/g;
const found = [];
let match;

while ((match = pattern.exec(html)) !== null) {
  const lineNumber = html.slice(0, match.index).split(/\r?\n/).length;
  const text = match[0].replace(/\s+/g, ' ').trim();
  found.push({ line: lineNumber, text });
}

if (found.length === 0) {
  console.log('Незаполненных мест не найдено.');
} else {
  console.log(`Найдено незаполненных мест: ${found.length}\n`);
  found.forEach((f) => console.log(`  строка ${f.line}: ${f.text}`));
}

process.exitCode = 0;
