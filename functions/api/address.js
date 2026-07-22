const GOADDRESS_URL = 'https://goaddress-proxy.kyle-rankin.workers.dev/';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const pc = (url.searchParams.get('q') || url.searchParams.get('postcode') || '').trim();
  if (pc.length < 3) return json({ new_address_res: [], results: [] });
  try {
    const r = await fetch(GOADDRESS_URL + '?q=' + encodeURIComponent(pc));
    const text = await r.text();
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (_) {
    return json({ new_address_res: [], results: [], error: 'lookup_upstream_error' });
  }
}
function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });
}
