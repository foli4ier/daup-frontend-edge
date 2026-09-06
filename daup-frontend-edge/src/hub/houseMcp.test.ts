import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_HOUSE_MCP_BASE,
  HOUSE_MCP_PATH,
  HOUSE_MCP_TOOLS,
  callHouseMcpTool,
  housePlaceToPlatform,
  listPlacesByEmail,
  registerHousePlace,
  resolveHouseMcpBaseUrl,
  resolveHouseMcpUrl,
  unregisterHousePlace
} from './houseMcp';
import { YOUR_PLACES_EMPTY, hasBannedDoorCopy } from './copy';

function jsonRpcText(data: unknown) {
  return {
    jsonrpc: '2.0',
    id: 1,
    result: {
      content: [{ type: 'text', text: JSON.stringify(data) }]
    }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('house MCP URL', () => {
  it('defaults to the live house host and /mcp', () => {
    expect(resolveHouseMcpBaseUrl('')).toBe(DEFAULT_HOUSE_MCP_BASE);
    expect(resolveHouseMcpUrl('')).toBe(`${DEFAULT_HOUSE_MCP_BASE}${HOUSE_MCP_PATH}`);
    expect(resolveHouseMcpUrl('https://mcp.daup.co.za/')).toBe('https://mcp.daup.co.za/mcp');
    expect(resolveHouseMcpUrl('https://mcp.daup.co.za/mcp')).toBe('https://mcp.daup.co.za/mcp');
    expect(resolveHouseMcpUrl('http://localhost:8080')).toBe('http://localhost:8080/mcp');
    expect(resolveHouseMcpUrl('http://localhost:8080/mcp/')).toBe('http://localhost:8080/mcp');
  });
});

describe('house MCP JSON-RPC client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('lists places for the signed-in email and maps Hub records', async () => {
    fetchMock.mockResolvedValue(jsonResponse(jsonRpcText({
      email: 'You@Gmail.com',
      places: [{
        placeId: 'place-kortrijk',
        ownerEmail: 'You@Gmail.com',
        placeName: 'Kortrijk',
        app: 'eatery',
        country: 'South Africa',
        region: 'Western Cape',
        city: 'Stellenbosch'
      }]
    })));

    const listed = await listPlacesByEmail('You@Gmail.com', { fetch: fetchMock, baseUrl: 'https://mcp.daup.co.za' });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.email).toBe('you@gmail.com');
    expect(listed.places[0].placeName).toBe('Kortrijk');
    expect(listed.places[0].placeId).toBe('place-kortrijk');
    expect(housePlaceToPlatform(listed.places[0])).toEqual({
      placeName: 'Kortrijk',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      placeId: 'place-kortrijk',
      ownerEmail: 'you@gmail.com'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mcp.daup.co.za/mcp');
    const body = JSON.parse(String(init.body));
    expect(body.method).toBe('tools/call');
    expect(body.params.name).toBe(HOUSE_MCP_TOOLS.listByEmail);
    expect(body.params.arguments.ownerEmail).toBe('you@gmail.com');
    expect(body.params.arguments.ownerEmail).not.toBe('frans@daup.co.za');
  });

  it('mints a house with the signed-in email and place fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse(jsonRpcText({
      placeId: 'mint-1',
      ownerEmail: 'owner@theolive.co.za',
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    })));

    const minted = await registerHousePlace({
      ownerEmail: 'Owner@TheOlive.co.za',
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    }, { fetch: fetchMock });

    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    expect(minted.place.placeId).toBe('mint-1');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.params.name).toBe(HOUSE_MCP_TOOLS.register);
    expect(body.params.arguments).toEqual({
      ownerEmail: 'owner@theolive.co.za',
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    });
  });

  it('unregisters by placeId, or placeName + ownerEmail', async () => {
    fetchMock.mockResolvedValue(jsonResponse(jsonRpcText({ removed: true })));
    const byId = await unregisterHousePlace({ placeId: 'place-kortrijk' }, { fetch: fetchMock });
    expect(byId.ok).toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).params.name).toBe(HOUSE_MCP_TOOLS.unregister);

    fetchMock.mockResolvedValue(jsonResponse(jsonRpcText({ removed: true })));
    const byName = await unregisterHousePlace({
      ownerEmail: 'you@gmail.com',
      placeName: 'Kortrijk'
    }, { fetch: fetchMock });
    expect(byName.ok).toBe(true);
    const args = JSON.parse(String(fetchMock.mock.calls[1][1].body)).params.arguments;
    expect(args).toEqual({ placeName: 'Kortrijk', ownerEmail: 'you@gmail.com' });
  });

  it('fails soft when the house node is down or times out', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const down = await listPlacesByEmail('you@gmail.com', { fetch: fetchMock });
    expect(down).toEqual({ ok: false, reason: 'unreachable' });

    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }));
    const timedOut = await listPlacesByEmail('you@gmail.com', { fetch: fetchMock, timeoutMs: 20 });
    expect(timedOut.ok).toBe(false);
    if (timedOut.ok) return;
    expect(timedOut.reason).toBe('timeout');

    fetchMock.mockResolvedValue(jsonResponse({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32601, message: 'Method not found' }
    }));
    const rpc = await callHouseMcpTool('places_list_by_email', { ownerEmail: 'you@gmail.com' }, { fetch: fetchMock });
    expect(rpc.ok).toBe(false);

    expect(YOUR_PLACES_EMPTY).toBe('No house on this hub yet.');
    expect(hasBannedDoorCopy(YOUR_PLACES_EMPTY)).toBe(false);
  });
});
