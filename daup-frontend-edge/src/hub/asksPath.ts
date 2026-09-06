export const ASKS_PATH = '/asks';
export const HUB_HOME_PATH = '/';

export function normalizeHubPath(pathname: string): string {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '');
  return path || HUB_HOME_PATH;
}

export function isAsksPath(pathname?: string): boolean {
  const path = pathname ?? (typeof window === 'undefined' ? HUB_HOME_PATH : window.location.pathname);
  return normalizeHubPath(path) === ASKS_PATH;
}

export function readHubPage(pathname?: string): 'home' | 'ask' {
  return isAsksPath(pathname) ? 'ask' : 'home';
}

export function goToAsks(): void {
  if (typeof window === 'undefined') return;
  if (!isAsksPath()) {
    window.history.pushState({ hub: 'ask' }, '', ASKS_PATH);
  }
}

export function goToHubHome(): void {
  if (typeof window === 'undefined') return;
  if (normalizeHubPath(window.location.pathname) !== HUB_HOME_PATH) {
    window.history.pushState({ hub: 'home' }, '', HUB_HOME_PATH);
  }
}
