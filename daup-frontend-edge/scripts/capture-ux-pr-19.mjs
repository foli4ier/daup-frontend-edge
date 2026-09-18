/**
 * Capture real Hub chrome stills for docs/ux/pr-19.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   node scripts/capture-ux-pr-19.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-19');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

const DESKTOP = { width: 1280, height: 1100, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 };

mkdirSync(OUT, { recursive: true });

async function waitFor(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
}

async function click(page, selector) {
  await waitFor(page, selector);
  await page.click(selector);
}

async function type(page, selector, value) {
  await waitFor(page, selector);
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value);
}

async function shot(page, name) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise(r => setTimeout(r, 250));
  const file = join(OUT, name);
  await page.screenshot({ path: file, type: 'png' });
  console.log('wrote', file);
}

async function setViewport(page, vp) {
  await page.setViewport(vp);
  await new Promise(r => setTimeout(r, 400));
}

async function pair(page, basename, keep) {
  await setViewport(page, DESKTOP);
  if (keep) await waitFor(page, keep);
  await shot(page, `${basename}-desktop.png`);
  await setViewport(page, MOBILE);
  if (keep) await waitFor(page, keep);
  await shot(page, `${basename}-mobile.png`);
  await setViewport(page, DESKTOP);
  if (keep) await waitFor(page, keep);
}

async function openHub(page) {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await waitFor(page, '[data-testid="hub-email-door"]');
  await type(page, '#hub-email', 'owner@theolive.co.za');
  await click(page, '[data-testid="open-your-hub"]');
  await waitFor(page, '[data-testid="hub-home"]');
}

async function fillPlace(page) {
  await type(page, '#place-name', 'The Olive');
  await type(page, '#country', 'South Africa');
  await type(page, '#province', 'Western Cape');
  await type(page, '#city', 'Stellenbosch');
}

async function continueWizard(page) {
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await page.evaluate(el => (el.textContent || '').trim(), button);
    if (text.includes('Continue')) {
      await button.click();
      return;
    }
  }
  throw new Error('Continue not found');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none']
});

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

try {
  await setViewport(page, DESKTOP);
  await openHub(page);
  await waitFor(page, '[data-testid="your-places-empty"]');
  await page.waitForFunction(() => (
    document.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane') === 'places'
    && !(document.querySelector('[data-testid="hub-thumb-nav"]')?.textContent || '').includes('Home')
  ));
  await pair(page, 'places-default', '[data-testid="your-places-empty"]');

  await click(page, '[data-testid="register-new-house"]');
  await waitFor(page, '[data-testid="hub-wizard"]');
  await waitFor(page, '#place-name');
  await fillPlace(page);
  await continueWizard(page);
  await waitFor(page, '[data-testid="enable-apps"]');
  await click(page, '[data-testid="enable-app-eatery"]');
  await continueWizard(page);
  await type(page, '#phone', '+27820000000');
  await continueWizard(page);
  await continueWizard(page);
  await click(page, '[data-testid="see-your-apps"]');
  await waitFor(page, '[data-testid="hub-home"]');
  await waitFor(page, '[data-testid="open-the-house"]');
  await waitFor(page, '[data-testid="hub-context-place"]');
  await page.waitForFunction(() => (
    document.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane') === 'places'
    && (document.querySelector('[data-testid="eatery-place-name"]')?.textContent || '').includes('The Olive')
  ));
  await pair(page, 'places-bound', '[data-testid="open-the-house"]');

  await click(page, '[data-testid="hub-nav-apps"]');
  await waitFor(page, '[data-testid="get-apps"]');
  await pair(page, 'apps', '[data-testid="get-apps"]');

  await click(page, '[data-testid="hub-nav-you"]');
  await waitFor(page, '[data-testid="hub-you"]');
  await waitFor(page, '[data-testid="hub-you-date"]');
  await pair(page, 'you', '[data-testid="hub-you"]');
} finally {
  await browser.close();
}
