/**
 * Dynamic Environment URL & Endpoint Resolver for DAUP Ecosystem
 */

export function getModuleEndpoint(moduleKey: string): string {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

  switch (moduleKey) {
    case 'daup-eatery':
      return (
        import.meta.env.VITE_APP_EATERY_URL || 
        (isDev ? 'http://localhost:3005' : 'https://eatery.daup.co.za')
      );
    case 'daup-farmer':
      return (
        import.meta.env.VITE_APP_FARMER_URL || 
        (isDev ? 'http://localhost:3007' : 'https://farmer.daup.co.za')
      );
    case 'daup-reseller':
      return (
        import.meta.env.VITE_APP_RESELLER_URL || 
        (isDev ? 'http://localhost:3006' : 'https://reseller.daup.co.za')
      );
    case 'daup-manufacturing':
      return (
        import.meta.env.VITE_APP_MANUFACTURING_URL || 
        import.meta.env.VITE_APP_MANUFACTURER_URL || 
        (isDev ? 'http://localhost:3008' : 'https://manufacturing.daup.co.za')
      );
    case 'edge':
    default:
      return (
        import.meta.env.VITE_APP_EDGE_URL || 
        (isDev ? 'http://localhost:3000' : 'https://app.daup.co.za')
      );
  }
}

/**
 * Format legal name to DAUP instance slug: [name].daup
 * e.g., "Cape Bistro Ltd" -> "cape-bistro-ltd.daup"
 */
export function deriveInstanceSlug(legalName?: string): string {
  if (!legalName || !legalName.trim()) return 'node.daup';
  const clean = legalName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean ? `${clean}.daup` : 'node.daup';
}

export interface AppLaunchPayload {
  instanceName?: string;
  legalName?: string;
  did?: string | null;
  token?: string | null;
  address?: string | null;
}

/**
 * Construct deep-link launch URL with handshake query parameters
 */
export function buildAppLaunchUrl(moduleKey: string, payload: AppLaunchPayload = {}): string {
  const baseRaw = getModuleEndpoint(moduleKey);
  const baseUrl = baseRaw.replace(/\/+$/, '');
  const rawLegalName = payload.legalName || payload.instanceName || 'Decentralized Operator';
  const instanceSlug = deriveInstanceSlug(rawLegalName);
  const didEncoded = payload.did || (payload.address ? `did:daup:wallet:${payload.address}` : `did:daup:${instanceSlug}-pub`);
  const token = payload.token || `daup-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('instance', instanceSlug);
    url.searchParams.set('did', didEncoded);
    url.searchParams.set('token', token);
    url.searchParams.set('walletName', rawLegalName);
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}/${sep}instance=${encodeURIComponent(instanceSlug)}&did=${encodeURIComponent(didEncoded)}&token=${encodeURIComponent(token)}&walletName=${encodeURIComponent(rawLegalName)}`;
  }
}

/**
 * Launch child app in new browser tab with handshake query parameters
 */
export function launchExternalApp(moduleKey: string, payload: AppLaunchPayload = {}): string {
  const targetUrl = buildAppLaunchUrl(moduleKey, payload);
  if (typeof window !== 'undefined') {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
  return targetUrl;
}
