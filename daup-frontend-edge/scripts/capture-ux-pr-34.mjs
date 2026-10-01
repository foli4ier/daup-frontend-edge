/**
 * Capture Hub You. WhatsApp stills for docs/ux/pr-34.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   HUB_URL=http://127.0.0.1:3000 node scripts/capture-ux-pr-34.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-34');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BUST = `ux-you-whatsapp-${Date.now()}`;

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

async function setField(page, selector, value) {
  await waitFor(page, selector);
  await page.evaluate((sel, next) => {
    const input = document.querySelector(sel);
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto?.set?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, selector, value);
}

async function stack(page, label) {
  const rows = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        sel,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        h: Math.round(rect.height),
        minH: style.minHeight,
        text: (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 90)
      };
    };
    return [
      '[data-testid="hub-you-email"]',
      'label[for="hub-you-whatsapp-input"]',
      '[data-testid="hub-you-whatsapp-input"]',
      '[data-testid="hub-you-whatsapp-hint"]',
      '[data-testid="hub-you-whatsapp-error"]',
      '[data-testid="hub-you-whatsapp-save"]',
      '[data-testid="hub-you-whatsapp"]',
      '[data-testid="hub-you-whatsapp-change"]',
      '[data-testid="hub-you-whatsapp-back"]'
    ].map(pick).filter(Boolean);
  });
  console.log(label, JSON.stringify(rows));
  return rows;
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

async function openYou(page) {
  await click(page, '[data-testid="hub-nav-you"]');
  await waitFor(page, '[data-testid="hub-you"]');
}

/** WhatsApp unset, and no contact suggestion in the field. */
async function blankWhatsapp(page) {
  await page.evaluate(() => {
    const key = 'daup_user_vault_v1';
    const vault = JSON.parse(localStorage.getItem(key) || '{}');
    vault.profile.demographics.whatsappNumber = '';
    vault.profile.demographics.contactNumber = '';
    localStorage.setItem(key, JSON.stringify(vault));
    localStorage.setItem('daup_user_profile', JSON.stringify(vault.profile));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await openYou(page);
  await waitFor(page, '[data-testid="hub-you-whatsapp-form"]');
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
  await waitFor(page, '[data-testid="open-the-house"]');

  await blankWhatsapp(page);
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-testid="hub-you-whatsapp-input"]');
    const email = document.querySelector('[data-testid="hub-you-email"]');
    const label = document.querySelector('label[for="hub-you-whatsapp-input"]');
    const hint = document.querySelector('[data-testid="hub-you-whatsapp-hint"]');
    const save = document.querySelector('[data-testid="hub-you-whatsapp-save"]');
    if (!(input instanceof HTMLInputElement) || input.value !== '') return false;
    const order = [email, label, input, hint, save];
    return order.every((el, index) => {
      if (!el) return false;
      if (!index) return true;
      return Boolean(order[index - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
  await stack(page, 'empty');
  await pair(page, 'you-empty', '[data-testid="hub-you-whatsapp-save"]');

  await setField(page, '#hub-you-whatsapp-input', '123');
  await click(page, '[data-testid="hub-you-whatsapp-save"]');
  await page.waitForFunction(() => (
    document.querySelector('[data-testid="hub-you-whatsapp-error"]')?.textContent
      === 'Use a WhatsApp number we can text.'
  ));
  await stack(page, 'error');
  await pair(page, 'you-error', '[data-testid="hub-you-whatsapp-error"]');

  await setField(page, '#hub-you-whatsapp-input', '0829261373');
  await click(page, '[data-testid="hub-you-whatsapp-save"]');
  await page.waitForFunction(() => (
    document.querySelector('[data-testid="hub-you-whatsapp"]')?.textContent === '+27829261373'
  ), { timeout: 5000 }).catch(async (error) => {
    console.log('save failed', await page.evaluate(() => document.querySelector('[data-testid="hub-you"]')?.innerText));
    throw error;
  });
  await stack(page, 'saved');
  await pair(page, 'you-saved', '[data-testid="hub-you-whatsapp-change"]');

  await click(page, '[data-testid="hub-you-whatsapp-change"]');
  await waitFor(page, '[data-testid="hub-you-whatsapp-back"]');
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-testid="hub-you-whatsapp-input"]');
    const back = document.querySelector('[data-testid="hub-you-whatsapp-back"]');
    const hint = document.querySelector('[data-testid="hub-you-whatsapp-hint"]');
    if (!(input instanceof HTMLInputElement) || input.value !== '+27829261373') return false;
    if (!back || !hint) return false;
    if (getComputedStyle(back).minHeight !== '48px') return false;
    return Boolean(input.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  await stack(page, 'editing');
  await pair(page, 'you-editing', '[data-testid="hub-you-whatsapp-back"]');
} finally {
  await browser.close();
}
