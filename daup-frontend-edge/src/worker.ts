/**
 * Asset Worker plus Paystack routes.
 * /api/paystack/* runs here. Everything else stays on the static hub.
 * PAYSTACK_SECRET_KEY is a Worker secret, not a file in the repo.
 */

import { handlePaystackRequest, type PaystackEnv } from './hub/paystackHandler';

interface AssetBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env extends PaystackEnv {
  ASSETS: AssetBinding;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/paystack/')) {
      return handlePaystackRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
