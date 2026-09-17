/**
 * Capture real Hub chrome stills for docs/ux/pr-18.
 * Uses the running Vite app + system Chrome (puppeteer-core).
 *
 *   npm install --no-save puppeteer-core
 *   node scripts/capture-ux-pr-18.mjs
 */
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/ux/pr-18');
const LEGACY_WIZARD = join(__dirname, '../../docs/ux/register-opens-wizard.png');
const BASE = process.env.HUB_URL || 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const DAY = 24 * 60 * 60 * 1000;

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
  await click(page, '[data-testid="register-new-house"]');
  await waitFor(page, '[data-testid="hub-wizard"]');
  await waitFor(page, '#place-name');
  await page.waitForFunction(() => (
    (document.querySelector('.wizard-title')?.textContent || '').includes('Create your company')
  ));
  await pair(page, 'wizard-create-place', '[data-testid="hub-wizard"]');
  copyFileSync(join(OUT, 'wizard-create-place-desktop.png'), LEGACY_WIZARD);
  console.log('wrote', LEGACY_WIZARD);

  await fillPlace(page);
  await continueWizard(page);
  await waitFor(page, '[data-testid="enable-apps"]');
  await click(page, '[data-testid="enable-app-eatery"]');
  await click(page, '[data-testid="enable-app-farm"]');
  await page.waitForFunction(() => (
    (document.querySelector('.wizard-title')?.textContent || '').includes('Which apps should this place run')
  ));
  await pair(page, 'wizard-enable-apps', '[data-testid="enable-apps"]');

  await continueWizard(page);
  await type(page, '#phone', '+27820000000');
  await continueWizard(page);
  await continueWizard(page);
  await click(page, '[data-testid="see-your-apps"]');
  await waitFor(page, '[data-testid="hub-home"]');
  await waitFor(page, '[data-testid="hub-home-open"]');
  await waitFor(page, '[data-testid="hub-context-place"]');
  await pair(page, 'home-place-bound', '[data-testid="hub-home-open"]');

  await click(page, '[data-testid="hub-nav-you"]');
  await waitFor(page, '[data-testid="hub-you"]');
  await waitFor(page, '[data-testid="hub-you-date"]');
  await pair(page, 'you-trial', '[data-testid="hub-you-date"]');

  const patchStatus = async (kind) => {
    await page.evaluate((which, dayMs) => {
      const vaultRaw = localStorage.getItem('daup_user_vault_v1');
      const vault = vaultRaw ? JSON.parse(vaultRaw) : null;
      const id = vault?.companyNode?.companyId;
      if (!id) throw new Error('no companyId');
      const entsRaw = localStorage.getItem('daup_node_entitlements');
      const ents = entsRaw ? JSON.parse(entsRaw) : {};
      const now = Date.now();
      const rec = ents[id] || {
        companyId: id,
        enabled_apps: ['eatery'],
        billable_locations: 1,
        payment_method_ok: false
      };
      rec.trial_started_at = now - 50 * dayMs;
      rec.trial_ends_at = which === 'past_due' ? now - 2 * dayMs : now - 10 * dayMs;
      rec.payment_method_ok = false;
      rec.node_subscription_status = which;
      ents[id] = rec;
      localStorage.setItem('daup_node_entitlements', JSON.stringify(ents));
      const eventsRaw = localStorage.getItem('daup_node_trial_events');
      const events = eventsRaw ? JSON.parse(eventsRaw) : {};
      events[id] = {
        ...(events[id] || { event: 'node.trial_started', companyId: id }),
        trial_started_at: rec.trial_started_at,
        trial_ends_at: rec.trial_ends_at
      };
      localStorage.setItem('daup_node_trial_events', JSON.stringify(events));
      if (vault.trialState) {
        vault.trialState.isTrialActive = false;
        vault.trialState.trialStartedAt = rec.trial_started_at;
        vault.trialState.trialExpiresAt = rec.trial_ends_at;
        localStorage.setItem('daup_user_vault_v1', JSON.stringify(vault));
      }
    }, kind, DAY);
    await page.reload({ waitUntil: 'networkidle0' });
    await waitFor(page, '[data-testid="hub-home"]');
    await click(page, '[data-testid="hub-nav-you"]');
    await waitFor(page, '[data-testid="hub-you-place-status"]');
  };

  await patchStatus('past_due');
  await pair(page, 'you-past-due', '[data-testid="hub-you-place-status"]');

  await patchStatus('suspended');
  await pair(page, 'you-paused', '[data-testid="hub-you-place-status"]');
} finally {
  await browser.close();
}
