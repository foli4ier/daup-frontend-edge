import {
  ASK_KIND_DEFECT,
  ASK_KIND_ENHANCEMENT,
  ASK_KIND_SUPPORT,
  CHAIN_APP_LABELS,
  COMING_KICKER
} from './copy';
import { PLATFORM_APP_IDS, type PlatformAppId } from '../stores/identityStore';

export const ASK_STORAGE_KEY = 'daup:hub:ask_requests';

export type AskAppId = PlatformAppId;
export type AskKind = typeof ASK_KIND_ENHANCEMENT | typeof ASK_KIND_DEFECT | typeof ASK_KIND_SUPPORT;
export type AskAppFilter = AskAppId | 'all';

export interface AskRequest {
  id: string;
  app: AskAppId;
  kind: AskKind;
  title: string;
  detail: string;
  createdAt: number;
  houseName?: string;
}

export const ASK_KINDS: AskKind[] = [
  ASK_KIND_ENHANCEMENT,
  ASK_KIND_DEFECT,
  ASK_KIND_SUPPORT
];

export const ASK_APP_CHOICES: { id: AskAppId; label: string; coming: boolean }[] = PLATFORM_APP_IDS.map(id => ({
  id,
  label: CHAIN_APP_LABELS[id],
  coming: id !== 'eatery'
}));

export function isAskAppId(value: string): value is AskAppId {
  return (PLATFORM_APP_IDS as readonly string[]).includes(value);
}

export function isAskKind(value: string): value is AskKind {
  return ASK_KINDS.includes(value as AskKind);
}

export function askAppLabel(app: AskAppId): string {
  return CHAIN_APP_LABELS[app];
}

export function askAppChoiceLabel(app: AskAppId): string {
  const choice = ASK_APP_CHOICES.find(row => row.id === app);
  if (!choice) return askAppLabel(app);
  return choice.coming ? `${choice.label} · ${COMING_KICKER}` : choice.label;
}

export function canRaiseAsk(input: {
  app: string;
  title?: string;
  detail?: string;
}): boolean {
  return isAskAppId(input.app);
}

export function filterAsksByApp(items: AskRequest[], app: AskAppFilter): AskRequest[] {
  const rows = items.slice().sort((a, b) => b.createdAt - a.createdAt);
  if (app === 'all') return rows;
  return rows.filter(item => item.app === app);
}

function readRaw(): unknown {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ASK_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function asRequest(value: unknown): AskRequest | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<AskRequest>;
  if (!row.id || !isAskAppId(String(row.app || '')) || !isAskKind(String(row.kind || ''))) return null;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (!title) return null;
  return {
    id: String(row.id),
    app: row.app as AskAppId,
    kind: row.kind as AskKind,
    title,
    detail: typeof row.detail === 'string' ? row.detail : '',
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    houseName: typeof row.houseName === 'string' ? row.houseName : undefined
  };
}

export function loadAskRequests(): AskRequest[] {
  const parsed = readRaw();
  if (!Array.isArray(parsed)) return [];
  return parsed.map(asRequest).filter((row): row is AskRequest => Boolean(row));
}

export function saveAskRequests(items: AskRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota
  }
}

export function raiseAskRequest(input: {
  app: string;
  kind?: string;
  title: string;
  detail?: string;
  houseName?: string;
  now?: number;
}): { ok: true; request: AskRequest } | { ok: false; reason: 'app' | 'title' } {
  if (!isAskAppId(input.app)) {
    return { ok: false, reason: 'app' };
  }
  const title = (input.title || '').trim();
  if (!title) {
    return { ok: false, reason: 'title' };
  }
  const kind: AskKind = isAskKind(String(input.kind || ''))
    ? (input.kind as AskKind)
    : ASK_KIND_ENHANCEMENT;
  const request: AskRequest = {
    id: `ask-${input.now || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    app: input.app,
    kind,
    title,
    detail: (input.detail || '').trim(),
    createdAt: input.now || Date.now(),
    houseName: (input.houseName || '').trim() || undefined
  };
  const next = [request, ...loadAskRequests()];
  saveAskRequests(next);
  return { ok: true, request };
}

export function clearAskRequests(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ASK_STORAGE_KEY);
  } catch {
    // ignore
  }
}
