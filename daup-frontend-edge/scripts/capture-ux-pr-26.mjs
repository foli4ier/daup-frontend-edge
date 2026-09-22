/**
 * Capture Hub Apps Open. doors for Vault + Chat.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   HUB_URL=http://127.0.0.1:3000 node scripts/capture-ux-pr-26.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-26');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-open-vault-chat-${Date.now()}`;

const DESKTOP = { width: 1280, height: 1400, deviceScaleFactor: 1 };
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

async function shotElement(page, selector, name) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.$eval(selector, el => el.scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  const handle = await page.$(selector);
  if (!handle) throw new Error(`missing ${selector}`);
  const file = join(OUT, name);
  await handle.screenshot({ path: file, type: 'png' });
  console.log('wrote', file);
}

async function setViewport(page, vp) {
  await page.setViewport(vp);
  await new Promise(r => setTimeout(r, 300));
}

async function pairElement(page, selector, basename) {
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  });
  await setViewport(page, DESKTOP);
  await shotElement(page, selector, `${basename}-desktop.png`);
  await setViewport(page, MOBILE);
  await shotElement(page, selector, `${basename}-mobile.png`);
  await setViewport(page, DESKTOP);
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
  await fillPlace(page, 'The Olive', 'Stellenbosch');
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

  await click(page, '[data-testid="hub-nav-apps"]');
  await waitFor(page, '[data-testid="get-app-chat"]');
  await click(page, '[data-testid="get-app-chat"]');
  await click(page, '[data-testid="get-app-vault"]');
  await page.waitForFunction(() => {
    const chat = document.querySelector('[data-testid="open-app-chat"]');
    const vault = document.querySelector('[data-testid="open-app-vault"]');
    const text = document.querySelector('[data-testid="get-apps"]')?.textContent || '';
    const forbidden = /peer|\bDID\b|\bMCP\b|\bnode\b|statement/i.test(text);
    return Boolean(
      chat
      && vault
      && chat.tagName === 'A'
      && vault.tagName === 'A'
      && chat.getAttribute('href') === 'https://chat.daup.co.za'
      && vault.getAttribute('href') === 'https://vault.daup.co.za'
      && chat.getAttribute('target') === '_self'
      && vault.getAttribute('target') === '_self'
      && chat.textContent?.includes('Open.')
      && vault.textContent?.includes('Open.')
      && !forbidden
    );
  }, { timeout: 15000 });
  console.log('held Chat + Vault Open. links to the hosts ok');
  await pairElement(page, '[data-testid="get-apps"]', 'apps-open');
} finally {
  await browser.close();
}
