import { describe, expect, it, beforeEach } from 'vitest';
import {
  ASK_STORAGE_KEY,
  canRaiseAsk,
  clearAskRequests,
  filterAsksByApp,
  loadAskRequests,
  raiseAskRequest
} from './askStore';
import { ASK_PICK_AN_APP } from './copy';

describe('ask store', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAskRequests();
  });

  it('cannot raise a request without Which app?', () => {
    expect(canRaiseAsk({ app: '', title: 'More covers on Friday' })).toBe(false);
    expect(canRaiseAsk({ app: 'kitchen', title: 'More covers on Friday' })).toBe(false);
    const result = raiseAskRequest({
      app: '',
      title: 'More covers on Friday',
      detail: 'We need a bigger Friday book.'
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('app');
    expect(ASK_PICK_AN_APP).toBe('Pick an app first.');
    expect(loadAskRequests()).toEqual([]);
    expect(localStorage.getItem(ASK_STORAGE_KEY)).toBeNull();
  });

  it('saves a request tagged to a fixed app, including Coming apps', () => {
    const farm = raiseAskRequest({
      app: 'farm',
      kind: 'Enhancement',
      title: 'Harvest list on the phone',
      detail: 'Need the pick list in the field.',
      now: 100
    });
    const eatery = raiseAskRequest({
      app: 'eatery',
      kind: 'Defect',
      title: 'Ticket printer stays quiet',
      now: 200
    });
    expect(farm.ok).toBe(true);
    expect(eatery.ok).toBe(true);
    if (!farm.ok || !eatery.ok) return;

    const all = loadAskRequests();
    expect(all).toHaveLength(2);
    expect(all.map(row => row.app).sort()).toEqual(['eatery', 'farm']);

    const onlyFarm = filterAsksByApp(all, 'farm');
    expect(onlyFarm).toHaveLength(1);
    expect(onlyFarm[0].title).toBe('Harvest list on the phone');
    expect(onlyFarm[0].app).toBe('farm');

    const onlyEatery = filterAsksByApp(all, 'eatery');
    expect(onlyEatery).toHaveLength(1);
    expect(onlyEatery[0].app).toBe('eatery');
    expect(filterAsksByApp(all, 'all')).toHaveLength(2);
  });
});
