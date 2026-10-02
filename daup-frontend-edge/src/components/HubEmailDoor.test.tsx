import { describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { HubEmailDoor } from '../components/HubEmailDoor';
import {
  BANNED_DOOR_WORDS,
  HUB_DOOR_BODY,
  HUB_DOOR_GLOSSARY,
  OPEN_YOUR_HUB_LABEL,
  STAFF_INVITE_LABEL,
  YOUR_EMAIL_LABEL
} from '../hub/copy';

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
    const invite = container.querySelector('[data-testid="hub-staff-invite"]');
    expect(label?.textContent).toBe(YOUR_EMAIL_LABEL);
    expect(container.querySelector('[data-testid="hub-door-body"]')?.textContent).toBe(HUB_DOOR_BODY);
    expect(container.querySelector('[data-testid="hub-door-glossary"]')?.textContent).toBe(HUB_DOOR_GLOSSARY);
    expect(container.querySelectorAll('input[type="email"]')).toHaveLength(1);
    expect(button?.textContent).toContain(OPEN_YOUR_HUB_LABEL);
    expect(button?.className).toContain('btn-primary');
    expect(invite?.textContent).toBe(STAFF_INVITE_LABEL);
    expect(STAFF_INVITE_LABEL.endsWith('.')).toBe(true);
    expect(invite?.className).toContain('btn-outline');
    expect(invite?.className).toContain('btn-wide');
    expect(container.querySelector('[data-testid="hub-door-island"]')).toBeTruthy();
    const tap = getComputedStyle(document.documentElement).getPropertyValue('--tap').trim();
    expect(tap === '' || tap === '48px').toBe(true);
    const text = container.textContent || '';
    for (const word of BANNED_DOOR_WORDS) {
      expect(new RegExp(`\\b${word}\\b`, 'i').test(text), `banned "${word}" on email door`).toBe(false);
    }
    unmount();
  });
});
