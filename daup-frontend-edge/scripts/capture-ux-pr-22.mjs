/**
 * Capture real Hub chrome stills for docs/ux/pr-22.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   HUB_URL=http://127.0.0.1:3000 node scripts/capture-ux-pr-22.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-22');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-apps-seed-${Date.now()}`;

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

async function assertAppsIa(page) {
  await page.waitForFunction(() => {
    const social = document.querySelector('[data-testid="apps-social"]')?.textContent || '';
    const paid = document.querySelector('[data-testid="apps-paid"]')?.textContent || '';
    const root = document.querySelector('[data-testid="get-apps"]');
    const order = Array.from(root?.querySelectorAll('[data-testid="apps-social"], [data-testid="apps-paid"]') || [])
      .map(el => el.getAttribute('data-testid'));
    return Boolean(
      social.includes('Social.')
      && social.includes('EatOut')
      && social.includes('Chat')
      && paid.includes('Paid.')
      && paid.includes('Eatery')
      && paid.includes('Project')
      && paid.includes('Farm')
      && order[0] === 'apps-social'
      && order[1] === 'apps-paid'
    );
  }, { timeout: 15000 });
  console.log('apps IA ok');
}

async function assertPlaceDetail(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="place-detail"]');
    const text = root?.textContent || '';
    const order = Array.from(root?.querySelectorAll(
      '[data-testid="place-apps"], [data-testid="place-seed"], [data-testid="place-subscription"]'
    ) || []).map(el => el.getAttribute('data-testid'));
    const forbidden = /seednode|Unknown\.|\bnode\b|MCP|DID|co_/i.test(text);
    return Boolean(
      root
      && order[0] === 'place-apps'
      && order[1] === 'place-seed'
      && order[2] === 'place-subscription'
      && text.includes('Hosted.')
      && text.includes('On this premises.')
      && text.includes('Status not checked yet.')
      && text.includes('Check seed.')
      && text.includes('R199 a month for this place.')
      && text.includes('R299 hosted seed.')
      && !forbidden
    );
  }, { timeout: 15000 });
  console.log('place-detail kitchen copy ok');
}

async function assertOnPrem(page) {
  await page.waitForFunction(() => {
    const hosted = document.querySelector('[data-testid="seed-mode-hosted"]')?.getAttribute('aria-pressed');
    const onPrem = document.querySelector('[data-testid="seed-mode-on-prem"]')?.getAttribute('aria-pressed');
    const host = document.querySelector('[data-testid="place-seed-host"]')?.textContent || '';
    const meters = document.querySelector('[data-testid="place-sub-meters"]')?.textContent || '';
    const download = document.querySelector('[data-testid="download-seed-setup"]');
    return Boolean(
      hosted === 'false'
      && onPrem === 'true'
      && host.includes('This premises.')
      && meters.includes('R0 hosted seed.')
      && meters.includes('R199 a month for this place.')
      && download?.getAttribute('href') === 'https://github.com/foli4ier/daup-mcp-servers/releases/download/onprem-seed-v0/daup-onprem-seed-v0.zip'
      && (download?.textContent || '').includes('Download seed setup.')
    );
  }, { timeout: 15000 });
  console.log('on-prem kitchen copy ok');
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

  await click(page, '[data-testid="hub-nav-apps"]');
  await waitFor(page, '[data-testid="get-apps"]');
  await waitFor(page, '[data-testid="apps-social"]');
  await waitFor(page, '[data-testid="apps-paid"]');
  await assertAppsIa(page);
  await pair(page, 'apps', '[data-testid="get-apps"]');

  await click(page, '[data-testid="hub-nav-places"]');
  await waitFor(page, '[data-testid="open-the-house"]');
  await click(page, '[data-testid="open-the-house"]');
  await waitFor(page, '[data-testid="place-detail"]');
  await waitFor(page, '[data-testid="place-apps"]');
  await waitFor(page, '[data-testid="place-seed"]');
  await assertPlaceDetail(page);
  await pair(page, 'place-detail', '[data-testid="place-detail"]');

  await click(page, '[data-testid="seed-mode-on-prem"]');
  await waitFor(page, '[data-testid="download-seed-setup"]');
  await assertOnPrem(page);
  await page.$eval('[data-testid="place-seed"]', el => el.scrollIntoView({ block: 'start' }));
  await pair(page, 'place-on-prem', '[data-testid="download-seed-setup"]');
} finally {
  await browser.close();
}
