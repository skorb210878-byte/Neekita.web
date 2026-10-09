// Оркестратор самопроверки сайта (раздел 7 ТЗ).
// Поднимает локальный сервер, прогоняет html-validate, Playwright (3 разрешения),
// axe-core и Lighthouse (mobile). Реальные результаты печатает в консоль и
// сохраняет в qa/qa-results.json — ничего не придумывает, если инструмент не
// запустился, это честно фиксируется в результатах (правило 3 раздела 2 ТЗ).

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import httpServer from 'http-server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { HtmlValidate } from 'html-validate';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENS_DIR = path.join(ROOT, 'qa', 'screens');
// Время, чтобы разовые анимации (fade-in тумана, появление боке-огней)
// успели устояться до скриншота/axe. Печать в окне редактора кода —
// бесконечная, не «settle»-ится в принципе: скриншоты специально ловят
// её в процессе печати (так и задумано по ТЗ), эта пауза на неё не влияет.
const ANIMATION_SETTLE_MS = 4000;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const results = {
  timestamp: new Date().toISOString(),
  htmlValidate: null,
  playwright: [],
  axe: null,
  lighthouse: null,
};

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function runHtmlValidate() {
  logSection('html-validate');
  const htmlvalidate = new HtmlValidate();
  const report = await htmlvalidate.validateFile(path.join(ROOT, 'index.html'));

  for (const result of report.results) {
    for (const msg of result.messages) {
      const level = msg.severity === 2 ? 'error' : 'warning';
      console.log(`${msg.line}:${msg.column} [${level}] ${msg.message} (${msg.ruleId})`);
    }
  }
  if (report.valid) console.log('Ошибок не найдено.');

  results.htmlValidate = {
    ok: report.valid,
    errorCount: report.errorCount,
    warningCount: report.warningCount,
  };
  return report.valid;
}

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

async function checkPage(browser, viewport) {
  logSection(`Playwright: ${viewport.name} (${viewport.width}x${viewport.height})`);
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();

  const consoleIssues = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleIssues.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => consoleIssues.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => {
    requestFailures.push(`${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(ANIMATION_SETTLE_MS);

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  const linksWithoutHref = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a'))
      .filter((a) => !a.hasAttribute('href'))
      .map((a) => a.outerHTML)
  );

  const brokenAnchors = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="#"]'))
      .map((a) => a.getAttribute('href'))
      .filter((href) => href && href.length > 1);
    return anchors.filter((href) => !document.querySelector(href));
  });

  mkdirSync(SCREENS_DIR, { recursive: true });
  const screenshotPath = path.join(SCREENS_DIR, `${viewport.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await context.close();

  const pageResult = {
    viewport: viewport.name,
    consoleIssues,
    requestFailures,
    hasHorizontalScroll,
    linksWithoutHref,
    brokenAnchors,
    screenshot: path.relative(ROOT, screenshotPath),
    ok:
      consoleIssues.length === 0 &&
      requestFailures.length === 0 &&
      !hasHorizontalScroll &&
      linksWithoutHref.length === 0 &&
      brokenAnchors.length === 0,
  };

  console.log(JSON.stringify(pageResult, null, 2));
  results.playwright.push(pageResult);
  return pageResult;
}

async function runAxe(browser) {
  logSection('axe-core (desktop viewport)');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(ANIMATION_SETTLE_MS);

  const axeResults = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = axeResults.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  await context.close();

  const summary = {
    totalViolations: axeResults.violations.length,
    seriousOrCritical: seriousOrCritical.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    })),
    ok: seriousOrCritical.length === 0,
  };
  console.log(JSON.stringify(summary, null, 2));
  results.axe = summary;
  return summary.ok;
}

async function runLighthouse() {
  logSection('Lighthouse (mobile)');
  const outputPath = path.join(ROOT, 'qa', 'lighthouse.json');
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless=new', '--disable-gpu'],
    });
  } catch (err) {
    const message = `chrome-launcher не смог запустить системный Chrome: ${err.message}`;
    console.error(message);
    results.lighthouse = { ok: false, ranSuccessfully: false, error: message };
    return false;
  }

  try {
    const runnerResult = await lighthouse(BASE_URL, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
    });

    if (!runnerResult) {
      throw new Error('Lighthouse не вернул результат (runnerResult пуст)');
    }

    writeFileSync(outputPath, runnerResult.report);

    const categories = runnerResult.lhr.categories;
    const scores = {
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      'best-practices': Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100),
    };
    const thresholds = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 95 };
    const ok = Object.keys(thresholds).every((k) => scores[k] >= thresholds[k]);
    console.log(JSON.stringify(scores, null, 2));
    results.lighthouse = { ok, ranSuccessfully: true, scores, thresholds };
    return ok;
  } catch (err) {
    const message = `Lighthouse упал с ошибкой: ${err.stack || err.message}`;
    console.error(message);
    results.lighthouse = { ok: false, ranSuccessfully: false, error: message };
    return false;
  } finally {
    await chrome.kill();
  }
}

async function launchBrowser() {
  // Собственный Chromium Playwright не скачиваем (см. DECISIONS.md) — используем
  // уже установленный в системе браузер через channel: сначала Chrome, иначе Edge.
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (chromeErr) {
    console.warn(`Chrome недоступен для Playwright (${chromeErr.message}), пробую Edge…`);
    try {
      return await chromium.launch({ channel: 'msedge' });
    } catch (edgeErr) {
      throw new Error(
        `Не удалось запустить ни Chrome, ни Edge через Playwright.\nChrome: ${chromeErr.message}\nEdge: ${edgeErr.message}`
      );
    }
  }
}

async function main() {
  const htmlOk = await runHtmlValidate();

  const server = await startServer();
  await waitForServer();

  let playwrightOk = true;
  let axeOk = true;
  let browser;
  try {
    browser = await launchBrowser();
    for (const viewport of VIEWPORTS) {
      const r = await checkPage(browser, viewport);
      if (!r.ok) playwrightOk = false;
    }
    axeOk = await runAxe(browser);
  } finally {
    if (browser) await browser.close();
  }

  const lighthouseOk = await runLighthouse();

  server.close();

  writeFileSync(
    path.join(ROOT, 'qa', 'qa-results.json'),
    JSON.stringify(results, null, 2)
  );

  logSection('ИТОГ');
  console.log(`html-validate: ${htmlOk ? 'OK' : 'FAIL'}`);
  console.log(`playwright: ${playwrightOk ? 'OK' : 'FAIL'}`);
  console.log(`axe-core: ${axeOk ? 'OK' : 'FAIL'}`);
  console.log(`lighthouse: ${lighthouseOk ? 'OK' : 'FAIL (см. qa/qa-results.json)'}`);

  const overallOk = htmlOk && playwrightOk && axeOk && lighthouseOk;
  process.exitCode = overallOk ? 0 : 1;
}

main().catch((err) => {
  console.error('QA упал с ошибкой:', err);
  process.exitCode = 1;
});
