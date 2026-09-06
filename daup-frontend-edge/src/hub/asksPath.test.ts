import { describe, expect, it, beforeEach } from 'vitest';
import {
  ASKS_PATH,
  goToAsks,
  goToHubHome,
  isAsksPath,
  readHubPage
} from './asksPath';

describe('asks path', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('uses the kitchen /asks route', () => {
    expect(ASKS_PATH).toBe('/asks');
    expect(isAsksPath('/asks')).toBe(true);
    expect(isAsksPath('/asks/')).toBe(true);
    expect(isAsksPath('/')).toBe(false);
    expect(isAsksPath('/enhancements')).toBe(false);
    expect(readHubPage('/asks')).toBe('ask');
    expect(readHubPage('/')).toBe('home');
  });

  it('pushes /asks and back to the hub home path', () => {
    goToAsks();
    expect(window.location.pathname).toBe('/asks');
    goToAsks();
    expect(window.location.pathname).toBe('/asks');
    goToHubHome();
    expect(window.location.pathname).toBe('/');
  });
});
