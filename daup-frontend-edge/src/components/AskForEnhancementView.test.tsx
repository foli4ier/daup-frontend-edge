import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AskForEnhancementView } from './AskForEnhancementView';
import { UserProfileProvider } from '../context/UserProfileContext';
import { ASK_STORAGE_KEY, clearAskRequests } from '../hub/askStore';
import { ASK_ASK_LABEL, ASK_BODY_LABEL, BANNED_DOOR_WORDS, NO_APPS_YET } from '../hub/copy';
import { SHOP_APPS, type ShopApp } from '../hub/places';
import type { AskPageNode } from '../hub/askPages';

const eatery = SHOP_APPS.find(app => app.id === 'eatery') as ShopApp;
const project = SHOP_APPS.find(app => app.id === 'project') as ShopApp;

const pages: Record<string, AskPageNode[] | undefined> = {
  eatery: [
    {
      id: 'services',
      label: 'Services',
      children: [{ id: 'roster', label: 'Roster', still: '/stills/roster.png' }]
    }
  ]
};

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    }
  };
}

describe('Ask for an enhancement. tab', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAskRequests();
  });

  it('keeps the ask grid at three across and choice rows at 48px', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../owner.css'), 'utf8');
    expect(css).toMatch(/\.ask-app-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
    expect(css).toMatch(/\.ask-choice\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.hub-you-actions \.btn\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.hub-you-actions \.btn-primary\s*\{[^}]*var\(--terracotta\)/s);
    expect(css).toMatch(/\.hub-you-actions \.btn-outline\s*\{[^}]*background:\s*transparent/s);
  });

  it('walks Eatery, then Services, then Roster, and asks without a place', async () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <AskForEnhancementView apps={[eatery, project]} pages={pages} />
      </UserProfileProvider>
    );

    const tiles = Array.from(container.querySelectorAll('[data-testid^="ask-app-"][data-app-id]'));
    expect(tiles.map(tile => tile.getAttribute('data-app-id'))).toEqual(['eatery', 'project']);
    expect(container.textContent).not.toContain('Get.');
    expect(container.textContent).not.toContain('Soon.');
    expect(container.querySelector('[data-testid="ask-choice-roster"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="ask-app-eatery"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-choice-services"]')?.textContent).toBe('Services');
    expect(container.querySelector('[data-testid="ask-choice-roster"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-back"]')?.textContent).toBe('Back.');

    act(() => {
      (container.querySelector('[data-testid="ask-choice-services"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-choice-roster"]')?.textContent).toBe('Roster');
    expect(container.querySelector('.ask-app-grid')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="ask-choice-roster"]') as HTMLButtonElement).click();
    });
    const still = container.querySelector('[data-testid="ask-still"]') as HTMLImageElement;
    expect(still?.getAttribute('src')).toBe('/stills/roster.png');
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector('label[for="ask-body"]')?.textContent).toBe(ASK_BODY_LABEL);
    expect(container.querySelector('[data-testid="ask-ask"]')?.textContent).toBe(ASK_ASK_LABEL);
    for (const word of BANNED_DOOR_WORDS) {
      expect(new RegExp(`\\b${word}\\b`, 'i').test(container.textContent || ''), `banned "${word}"`).toBe(false);
    }

    const body = container.querySelector('[data-testid="ask-body"]') as HTMLInputElement;
    act(() => {
      body.value = 'Show who is on tonight';
      Simulate.change(body);
    });
    act(() => {
      Simulate.submit(container.querySelector('[data-testid="ask-raise-form"]') as HTMLFormElement);
    });
    const stored = JSON.parse(localStorage.getItem(ASK_STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].app).toBe('eatery');
    expect(stored[0].pageId).toBe('roster');
    expect(stored[0].title).toBe('Show who is on tonight');
    expect(stored[0].houseName).toBeUndefined();
    expect(container.querySelector('[data-testid="ask-asked"]')?.textContent).toBe('Asked.');
    unmount();
  });

  it('still asks when the page has no still', () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <AskForEnhancementView apps={[project]} pages={{}} />
      </UserProfileProvider>
    );
    act(() => {
      (container.querySelector('[data-testid="ask-app-project"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-still"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-page-title"]')?.textContent).toBe('Project');
    const body = container.querySelector('[data-testid="ask-body"]') as HTMLInputElement;
    act(() => {
      body.value = 'A shorter list';
      Simulate.change(body);
    });
    act(() => {
      Simulate.submit(container.querySelector('[data-testid="ask-raise-form"]') as HTMLFormElement);
    });
    const stored = JSON.parse(localStorage.getItem(ASK_STORAGE_KEY) || '[]');
    expect(stored[0].pageId).toBe('project');
    expect(stored[0].houseName).toBeUndefined();
    unmount();
  });

  it('says there are no apps yet when he has none', () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <AskForEnhancementView apps={[]} />
      </UserProfileProvider>
    );
    expect(container.querySelector('[data-testid="ask-no-apps"]')?.textContent).toBe(NO_APPS_YET);
    expect(container.querySelector('[data-testid="ask-app-grid"]')).toBeNull();
    unmount();
  });
});
