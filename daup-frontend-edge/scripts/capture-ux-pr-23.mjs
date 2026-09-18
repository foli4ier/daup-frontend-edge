/**
 * Capture real Hub chrome stills for docs/ux/pr-23.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   HUB_URL=http://127.0.0.1:3000 node scripts/capture-ux-pr-23.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-23');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-places-sub-${Date.now()}`;

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
  await new Promise(r => setTimeout(r, 400));
  const file = join(OUT, name);
  await page.screenshot({ path: file, type: 'png' });
  console.log('wrote', file);
}

async function setViewport(page, vp) {
  await page.setViewport(vp);
  await new Promise(r => setTimeout(r, 400));
}

async function pair(page, basename, keep) {
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  });
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
  await page.setCacheEnabled(false);
  await page.goto(`${BASE}/?${BUST}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await waitFor(page, '[data-testid="hub-email-door"]');
  await type(page, '#hub-email', 'owner@theolive.co.za');
  await click(page, '[data-testid="open-your-hub"]');
  await waitFor(page, '[data-testid="hub-home"]');
}

async function fillPlace(page, name, city) {
  await type(page, '#place-name', name);
  await type(page, '#country', 'South Africa');
  await type(page, '#province', 'Western Cape');
  await type(page, '#city', city);
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

async function finishWizard(page, { name, city, app }) {
  await fillPlace(page, name, city);
  await continueWizard(page);
  await waitFor(page, '[data-testid="enable-apps"]');
  await click(page, `[data-testid="enable-app-${app}"]`);
  await continueWizard(page);
  await type(page, '#phone', '+27820000000');
  await continueWizard(page);
  await continueWizard(page);
  await click(page, '[data-testid="see-your-apps"]');
  await waitFor(page, '[data-testid="hub-home"]');
}

async function assertMyPlaces(page) {
  await page.waitForFunction(() => {
    const list = document.querySelector('[data-testid="owner-places-list"]');
    const choice = document.querySelector('[data-testid="eatery-place-choice"]')?.textContent || '';
    const remaining = document.querySelector('[data-testid="eatery-place-remaining"]')?.textContent || '';
    const forbidden = /peer|DID|MCP|\bnode\b|co_/i.test(list?.textContent || '');
    return Boolean(
      list
      && choice.includes('R199 a month for this place.')
      && choice.includes('R299 hosted seed.')
      && /days left on trial\./.test(remaining)
      && !forbidden
    );
  }, { timeout: 15000 });
  console.log('my-places sub + remaining ok');
}

async function assertAddApps(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="place-add-apps"]');
    const text = root?.textContent || '';
    const already = document.querySelector('[data-testid="already-on-place-eatery"]')?.textContent || '';
    const eatery = document.querySelector('[data-testid="add-app-eatery"]');
    return Boolean(
      root
      && text.includes('Add apps.')
      && already.includes('Already on this place.')
      && eatery?.disabled
    );
  }, { timeout: 15000 });
  console.log('place-detail Add apps. ok');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--font-render-hinting=none',
    '--disable-application-cache',
    '--disk-cache-size=1'
  ]
});

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache' });

try {
  await setViewport(page, DESKTOP);
  await openHub(page);
  await waitFor(page, '[data-testid="your-places-empty"]');
  await click(page, '[data-testid="register-new-house"]');
  await waitFor(page, '[data-testid="hub-wizard"]');
  await waitFor(page, '#place-name');
  await finishWizard(page, { name: 'The Olive', city: 'Stellenbosch', app: 'eatery' });
  await waitFor(page, '[data-testid="open-the-house"]');
  await assertMyPlaces(page);
  await pair(page, 'my-places', '[data-testid="owner-places-list"]');

  await click(page, '[data-testid="open-the-house"]');
  await waitFor(page, '[data-testid="place-detail"]');
  await waitFor(page, '[data-testid="place-add-apps"]');
  await assertAddApps(page);
  await page.$eval('[data-testid="place-add-apps"]', el => el.scrollIntoView({ block: 'start' }));
  await pair(page, 'place-add-apps', '[data-testid="place-add-apps"]');

  await click(page, '[data-testid="add-app-project"]');
  await click(page, '[data-testid="confirm-add-apps"]');
  await waitFor(page, '[data-testid="already-on-place-project"]');
  await page.$eval('[data-testid="place-add-apps"]', el => el.scrollIntoView({ block: 'start' }));
  await pair(page, 'already-on-place', '[data-testid="already-on-place-project"]');
} finally {
  await browser.close();
}
