// Этап 6 ТЗ: адаптив 360–1920 px без горизонтальной прокрутки.
// Проходит набор ширин от 360 до 1920 (все брейкпоинты из CSS + промежуточные
// шаги) и на каждой проверяет document.documentElement.scrollWidth <=
// document.documentElement.clientWidth. Поднимает тот же локальный сервер,
// что и qa/run-qa.js.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import httpServer from 'http-server';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const HEIGHT = 900;

// Шаг 20px от 360 до 1920 — захватывает оба CSS-брейкпоинта (480px для
// .about-grid) и промежуточные ширины, где сетки могут "поплыть".
const WIDTHS = [];
for (let w = 360; w <= 1920; w += 20) WIDTHS.push(w);
if (WIDTHS[WIDTHS.length - 1] !== 1920) WIDTHS.push(1920);

function startServer() {
  return new Promise((resolve, reject) => {
    const server = httpServer.createServer({ root: ROOT, cache: -1, silent: true });
    server.server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return true;
    } catch {
      // сервер ещё не поднялся
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Локальный сервер не ответил за 10 секунд');
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (chromeErr) {
    console.warn(`Chrome недоступен (${chromeErr.message}), пробую Edge…`);
    return await chromium.launch({ channel: 'msedge' });
  }
}

async function main() {
  const server = await startServer();
  await waitForServer();

  const failures = [];
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const ok = scrollWidth <= clientWidth;
      console.log(`${width}px: scrollWidth=${scrollWidth} clientWidth=${clientWidth} ${ok ? 'OK' : 'FAIL'}`);
      if (!ok) failures.push({ width, scrollWidth, clientWidth });
    }

    await context.close();
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`\nПроверено ширин: ${WIDTHS.length}. Провалов: ${failures.length}.`);
  if (failures.length) {
    console.log('Провалы:', JSON.stringify(failures, null, 2));
  }
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('check-responsive упал с ошибкой:', err);
  process.exitCode = 1;
});
