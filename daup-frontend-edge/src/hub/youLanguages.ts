/** Short language pick on You. Not a settings page. English leads. */

export const YOU_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'xh', label: 'isiXhosa' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' }
];

export function youLanguageChoices(current: string): { code: string; label: string }[] {
  const code = (current || '').trim();
  if (!code || YOU_LANGUAGES.some(row => row.code === code)) return YOU_LANGUAGES;
  return [...YOU_LANGUAGES, { code, label: code }];
}

export function youLanguageLabel(code: string): string {
  const hit = youLanguageChoices(code).find(row => row.code === (code || '').trim());
  return hit?.label || 'English';
}
