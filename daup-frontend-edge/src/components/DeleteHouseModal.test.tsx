import { describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { DeleteHouseModal } from './DeleteHouseModal';
import { BANNED_DOOR_WORDS, DELETE_HOUSE_MODAL_COPY, hasBannedDoorCopy } from '../hub/copy';

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    input.focus();
    input.value = value;
    Simulate.change(input);
  });
}

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

describe('DeleteHouseModal', () => {
  it('keeps Delete quiet when empty or wrong, and enables only on exact match', () => {
    const { container, unmount } = render(
      <DeleteHouseModal isOpen houseName="Kortrijk" onClose={() => {}} onConfirm={() => {}} />
    );

    const confirm = container.querySelector('[data-testid="delete-house-confirm"]') as HTMLButtonElement;
    const input = container.querySelector('[data-testid="delete-house-name"]') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(confirm.disabled).toBe(true);

    typeInto(input, 'kortrijk');
    expect(confirm.disabled).toBe(true);

    typeInto(input, 'The Olive');
    expect(confirm.disabled).toBe(true);

    typeInto(input, 'Kortrijk');
    expect(confirm.disabled).toBe(false);

    const text = container.textContent || '';
    expect(text).toContain('This takes Kortrijk off your hub.');
    for (const word of BANNED_DOOR_WORDS) {
      expect(new RegExp(`\\b${word}\\b`, 'i').test(text), `banned "${word}" on delete modal`).toBe(false);
    }
    expect(text).not.toMatch(/DHT|IPFS|instance/i);
    expect(DELETE_HOUSE_MODAL_COPY.every(line => !hasBannedDoorCopy(line))).toBe(true);
    unmount();
  });
});
