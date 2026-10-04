/**
 * One step of Ask for an enhancement.
 * The owner sees only the next choices. A still is a path the hub already
 * has for that page. He does not attach one. Missing stills still ask.
 */

export interface AskPageNode {
  id: string;
  label: string;
  still?: string;
  children?: AskPageNode[];
}

/** Eatery, then Services, then Roster. Siblings stay on their own step. */
export const EATERY_ASK_PAGES: AskPageNode[] = [
  {
    id: 'services',
    label: 'Services',
    children: [
      { id: 'roster', label: 'Roster' }
    ]
  },
  { id: 'tables', label: 'Tables' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'stock', label: 'Stock' }
];

export const ASK_APP_PAGES: Record<string, AskPageNode[] | undefined> = {
  eatery: EATERY_ASK_PAGES
};

export type AskWalk =
  | { kind: 'apps' }
  | { kind: 'choices'; nodes: AskPageNode[] }
  | { kind: 'page'; page: AskPageNode };

export function walkAsk(args: {
  appId: string | null;
  appLabel?: string;
  path: readonly string[];
  pages?: Record<string, AskPageNode[] | undefined>;
}): AskWalk {
  if (!args.appId) return { kind: 'apps' };
  const pages = args.pages || ASK_APP_PAGES;
  const roots = pages[args.appId] || [];
  if (!roots.length) {
    return {
      kind: 'page',
      page: { id: args.appId, label: (args.appLabel || '').trim() || args.appId }
    };
  }
  let level = roots;
  for (let index = 0; index < args.path.length; index += 1) {
    const node = level.find(row => row.id === args.path[index]);
    if (!node) return { kind: 'choices', nodes: level };
    const children = node.children || [];
    const last = index === args.path.length - 1;
    if (!children.length) return { kind: 'page', page: node };
    if (last) return { kind: 'choices', nodes: children };
    level = children;
  }
  return { kind: 'choices', nodes: level };
}

export function askPageStill(page: AskPageNode): string {
  return (page.still || '').trim();
}
