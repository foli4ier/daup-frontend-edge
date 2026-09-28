/**
 * Capture Hub Apps + Open. doors for Property.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   HUB_URL=http://127.0.0.1:3000 node scripts/capture-ux-pr-27.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-27');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-property-${Date.now()}`;

const DESKTOP = { width: 1280, height: 1600, deviceScaleFactor: 1 };
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

async function assertApps(page) {
  await page.waitForFunction(() => {
    const social = document.querySelector('[data-testid="apps-social"]');
    const paid = document.querySelector('[data-testid="apps-paid"]');
    const property = document.querySelector('[data-testid="shop-app-property"]');
    const vault = document.querySelector('[data-testid="shop-app-vault"]');
    const farm = document.querySelector('[data-testid="coming-app-farm"]');
    const cards = [...(paid?.querySelectorAll('[data-testid^="shop-app-"], [data-testid^="coming-app-"]') || [])]
      .map(el => el.getAttribute('data-testid'));
    const text = `${social?.textContent || ''} ${paid?.textContent || ''}`;
    const forbidden = /peer|\bDID\b|\bMCP\b|\bnode\b|rental/i.test(text);
    return Boolean(
      social?.textContent?.includes('Social.')
      && social?.textContent?.includes('EatOut')
      && social?.textContent?.includes('Chat')
      && !social?.textContent?.includes('Property')
      && paid?.textContent?.includes('Paid.')
      && property?.textContent?.includes('Property')
      && property?.textContent?.includes('LIVE')
      && property?.querySelector('[data-testid="get-app-property"]')
      && !document.querySelector('[data-testid="coming-app-property"]')
      && vault?.textContent?.includes('Vault')
      && farm?.textContent?.includes('Coming')
      && cards.join(',') === [
        'shop-app-eatery',
        'shop-app-project',
        'shop-app-vault',
        'shop-app-property',
        'coming-app-farm',
        'coming-app-reseller',
        'coming-app-maker'
      ].join(',')
      && !forbidden
    );
  }, { timeout: 15000 });
  console.log('apps Paid includes Property LIVE after Vault ok');
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
  await page.waitForFunction(() => {
    const property = document.querySelector('[data-testid="enable-app-property"]');
    const eatout = document.querySelector('[data-testid="enable-app-eatout"]');
    const order = [...document.querySelectorAll('[data-testid^="enable-app-"]')]
      .map(el => el.getAttribute('data-testid'));
    return Boolean(
      property?.textContent?.includes('Property')
      && property?.textContent?.includes('LIVE')
      && !/rental/i.test(property?.textContent || '')
      && !eatout
      && order.join(',') === [
        'enable-app-eatery',
        'enable-app-project',
        'enable-app-vault',
        'enable-app-property',
        'enable-app-farm',
        'enable-app-reseller',
        'enable-app-maker',
        'enable-app-chat'
      ].join(',')
    );
  }, { timeout: 15000 });
  console.log('wizard enable apps shows Property LIVE ok');
  await pairElement(page, '[data-testid="enable-apps"]', 'wizard-apps');

  await click(page, '[data-testid="enable-app-eatery"]');
  await continueWizard(page);
  await type(page, '#phone', '+27820000000');
  await continueWizard(page);
  await continueWizard(page);
  await click(page, '[data-testid="see-your-apps"]');
  await waitFor(page, '[data-testid="hub-home"]');
  await waitFor(page, '[data-testid="open-the-house"]');

  await click(page, '[data-testid="hub-nav-apps"]');
  await waitFor(page, '[data-testid="get-apps"]');
  await assertApps(page);
  await pairElement(page, '[data-testid="get-apps"]', 'apps');

  await click(page, '[data-testid="hub-nav-places"]');
  await waitFor(page, '[data-testid="open-the-house"]');
  await click(page, '[data-testid="open-the-house"]');
  await waitFor(page, '[data-testid="place-detail"]');
  await waitFor(page, '[data-testid="place-add-apps"]');
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="place-add-apps"]');
    const property = document.querySelector('[data-testid="add-app-property"]');
    const eatout = document.querySelector('[data-testid="add-app-eatout"]');
    return Boolean(
      root?.textContent?.includes('Add apps.')
      && property
      && !property.disabled
      && property.textContent?.includes('Property')
      && property.textContent?.includes('LIVE')
      && !/rental/i.test(property.textContent || '')
      && !eatout
    );
  }, { timeout: 15000 });
  console.log('place Add apps. shows Property ok');
  await pairElement(page, '[data-testid="place-apps"]', 'place-add-apps');

  await click(page, '[data-testid="hub-nav-apps"]');
  await waitFor(page, '[data-testid="get-app-property"]');
  await click(page, '[data-testid="get-app-property"]');
  await page.waitForFunction(() => {
    const property = document.querySelector('[data-testid="open-app-property"]');
    const text = document.querySelector('[data-testid="get-apps"]')?.textContent || '';
    const forbidden = /peer|\bDID\b|\bMCP\b|\bnode\b|rental/i.test(text);
    return Boolean(
      property
      && property.tagName === 'A'
      && property.getAttribute('href') === 'https://property.daup.co.za'
      && property.getAttribute('target') === '_self'
      && property.textContent?.includes('Open.')
      && !forbidden
    );
  }, { timeout: 15000 });
  console.log('held Property Open. links to property.daup.co.za ok');
  await pairElement(page, '[data-testid="get-apps"]', 'apps-open');
} finally {
  await browser.close();
}
