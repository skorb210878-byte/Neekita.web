// Этап 6 ТЗ: реальный вес страницы без картинок (HTML+CSS+JS) ≤ 300 КБ.
// Считает фактические байты на диске — ничего не оценивается на глаз.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { statSync, readdirSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIMIT_BYTES = 300 * 1024;

function filesIn(dir, exts) {
  return readdirSync(path.join(ROOT, dir))
    .filter((f) => exts.some((ext) => f.endsWith(ext)))
    .map((f) => path.join(dir, f));
}

const files = ['index.html', ...filesIn('css', ['.css']), ...filesIn('js', ['.js'])];

let total = 0;
for (const file of files) {
  const size = statSync(path.join(ROOT, file)).size;
  total += size;
  console.log(`${file}: ${size} байт`);
}

const kb = (total / 1024).toFixed(1);
const limitKb = (LIMIT_BYTES / 1024).toFixed(0);
console.log(`\nИтого: ${total} байт (${kb} КБ), лимит ${limitKb} КБ.`);
console.log(total <= LIMIT_BYTES ? 'OK: в пределах лимита.' : 'FAIL: превышен лимит.');

process.exitCode = total <= LIMIT_BYTES ? 0 : 1;
