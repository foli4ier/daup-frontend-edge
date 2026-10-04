import { describe, expect, it } from 'vitest';
import { askPageStill, walkAsk, type AskPageNode } from './askPages';

const pages: Record<string, AskPageNode[] | undefined> = {
  eatery: [
    {
      id: 'services',
      label: 'Services',
      children: [{ id: 'roster', label: 'Roster', still: '/stills/roster.png' }]
    },
    { id: 'tables', label: 'Tables' }
  ]
};

describe('ask walk', () => {
  it('shows one step at a time and never the whole tree', () => {
    expect(walkAsk({ appId: null, path: [] }).kind).toBe('apps');
    const eatery = walkAsk({ appId: 'eatery', appLabel: 'Eatery', path: [], pages });
    expect(eatery.kind).toBe('choices');
    if (eatery.kind !== 'choices') return;
    expect(eatery.nodes.map(node => node.label)).toEqual(['Services', 'Tables']);
    expect(eatery.nodes.some(node => node.label === 'Roster')).toBe(false);

    const services = walkAsk({ appId: 'eatery', path: ['services'], pages });
    expect(services.kind).toBe('choices');
    if (services.kind !== 'choices') return;
    expect(services.nodes.map(node => node.label)).toEqual(['Roster']);

    const roster = walkAsk({ appId: 'eatery', path: ['services', 'roster'], pages });
    expect(roster.kind).toBe('page');
    if (roster.kind !== 'page') return;
    expect(roster.page.label).toBe('Roster');
    expect(askPageStill(roster.page)).toBe('/stills/roster.png');

    const tables = walkAsk({ appId: 'eatery', path: ['tables'], pages });
    expect(tables.kind).toBe('page');
    if (tables.kind !== 'page') return;
    expect(askPageStill(tables.page)).toBe('');
  });

  it('asks about an app that has no pages yet', () => {
    const step = walkAsk({ appId: 'project', appLabel: 'Project', path: [], pages });
    expect(step.kind).toBe('page');
    if (step.kind !== 'page') return;
    expect(step.page.label).toBe('Project');
    expect(askPageStill(step.page)).toBe('');
  });
});
