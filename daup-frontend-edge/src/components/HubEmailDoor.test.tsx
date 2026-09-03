import { describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { HubEmailDoor } from '../components/HubEmailDoor';
import { BANNED_DOOR_WORDS, OPEN_YOUR_HUB_LABEL, YOUR_EMAIL_LABEL } from '../hub/copy';

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

describe('HubEmailDoor', () => {
  it('renders Your email. and a 48px Open your hub. tap', () => {
    const { container, unmount } = render(<HubEmailDoor onOpenHub={() => {}} />);
    const label = container.querySelector('label[for="hub-email"]');
    const button = container.querySelector('[data-testid="open-your-hub"]') as HTMLButtonElement | null;
    expect(label?.textContent).toBe(YOUR_EMAIL_LABEL);
    expect(button?.textContent).toContain(OPEN_YOUR_HUB_LABEL);
    const tap = getComputedStyle(document.documentElement).getPropertyValue('--tap').trim();
    expect(tap === '' || tap === '48px').toBe(true);
    const text = container.textContent || '';
    for (const word of BANNED_DOOR_WORDS) {
      expect(new RegExp(`\\b${word}\\b`, 'i').test(text), `banned "${word}" on email door`).toBe(false);
    }
    unmount();
  });
});
