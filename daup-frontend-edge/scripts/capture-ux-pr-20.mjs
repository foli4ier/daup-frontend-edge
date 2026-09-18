/**
 * Capture real Hub chrome stills for docs/ux/pr-20.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   node scripts/capture-ux-pr-20.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-20');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-seed-${Date.now()}`;

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

async function assertPlaceDetailKitchen(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="place-detail"]');
    const text = root?.textContent || '';
    const seed = document.querySelector('[data-testid="place-seed"]')?.textContent || '';
    const status = document.querySelector('[data-testid="place-seed-status"]')?.textContent || '';
    const cta = document.querySelector('[data-testid="manage-seed"]')?.textContent || '';
    const forbidden = /seednode|Unknown\./i.test(text);
    return Boolean(
      root
      && seed.includes('Seed.')
      && status.includes('Status not checked yet.')
      && cta.includes('Manage seed.')
      && text.includes('Hosted.')
      && !forbidden
    );
  }, { timeout: 15000 });
  const text = await page.$eval('[data-testid="place-detail"]', el => el.textContent || '');
  if (/seednode|Unknown\./i.test(text)) {
    throw new Error(`place-detail still has forbidden copy: ${text}`);
  }
  if (!text.includes('Seed.') || !text.includes('Manage seed.') || !text.includes('Status not checked yet.')) {
    throw new Error(`place-detail missing kitchen Seed. labels: ${text}`);
  }
  console.log('place-detail kitchen copy ok');
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
  await pair(page, 'places-empty', '[data-testid="your-places-empty"]');

  await click(page, '[data-testid="register-new-house"]');
  await waitFor(page, '[data-testid="hub-wizard"]');
  await waitFor(page, '#place-name');
  await page.waitForFunction(() => (
    (document.querySelector('.wizard-title')?.textContent || '').includes('Create your company')
  ));
  await pair(page, 'wizard-create-place', '[data-testid="hub-wizard"]');

  await finishWizard(page, { name: 'The Olive', city: 'Stellenbosch', app: 'eatery' });
  await waitFor(page, '[data-testid="open-the-house"]');
  await waitFor(page, '[data-testid="register-another-place"]');
  await page.$eval('[data-testid="register-another-place"]', el => el.scrollIntoView({ block: 'center' }));
  await click(page, '[data-testid="register-another-place"]');
  await waitFor(page, '[data-testid="hub-wizard"]');
  await waitFor(page, '#place-name');
  await finishWizard(page, { name: 'Salt', city: 'Cape Town', app: 'project' });
  await waitFor(page, '[data-testid="owner-places-list"]');
  await page.waitForFunction(() => {
    const names = Array.from(document.querySelectorAll('[data-testid="owner-places-list"] [data-place-name]'))
      .map(row => row.getAttribute('data-place-name'));
    return names.includes('The Olive') && names.includes('Salt');
  }, { timeout: 20000 });
  await pair(page, 'places-two', '[data-testid="owner-places-list"]');

  const salt = await page.$('[data-place-name="Salt"] button');
  if (!salt) throw new Error('Salt Open. not found');
  await salt.click();
  await waitFor(page, '[data-testid="place-detail"]');
  await waitFor(page, '[data-testid="place-seed"]');
  await waitFor(page, '[data-testid="place-subscription"]');
  await waitFor(page, '[data-testid="place-apps"]');
  await assertPlaceDetailKitchen(page);
  await pair(page, 'place-detail', '[data-testid="place-detail"]');
  await assertPlaceDetailKitchen(page);
} finally {
  await browser.close();
}
