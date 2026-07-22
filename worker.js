const LEADBYTE_URL  = 'https://interactive.leadbyte.co.uk/api/submit.php?campid=SOLARLEADS&returnjson=yes';
const GOADDRESS_URL = 'https://goaddress-proxy.kyle-rankin.workers.dev/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/address') return handleAddress(url);
    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json({ code: 0, response: 'Method not allowed — use POST' }, 405);
      return handleLead(request);
    }
    return env.ASSETS.fetch(request); // static site
  },
};

async function handleAddress(url) {
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

async function handleLead(request) {
  let data;
  try { data = await request.json(); }
  catch (_) { return json({ code: 0, response: 'Bad request (invalid JSON)' }, 400); }
  const params = new URLSearchParams();
  const set = (k, v) => { if (v != null && String(v).trim() !== '') params.set(k, String(v).trim()); };
  set('firstname', data.firstName);
  set('lastname',  data.lastName);
  set('postcode',  (data.postcode || '').toUpperCase());
  set('phone1',    (data.phone || '').replace(/\s+/g, ''));
  set('email',     data.email);
  set('street1',   data.street1);
  set('street2',   data.street2);
  set('towncity',  data.towncity);
  set('optinurl',  data.pageUrl);
  set('optindate', data.optinDate);
  set('product_interest',   data.product_interest);
  set('homeowner',          data.homeowner);
  set('property_type',      data.propertyType);
  set('monthly_bill',       data.monthlyBill);
  set('heating_type',       data.heatingType);
  set('off_street_parking', data.offStreetParking);
  ['sid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','clickid','aff_id']
    .forEach((k) => set(k, data[k]));
  set('ip',        request.headers.get('CF-Connecting-IP') || '');
  set('useragent', request.headers.get('User-Agent') || '');
  try {
    const lbRes = await fetch(LEADBYTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await lbRes.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch (_) { payload = { code: 0, response: 'Unexpected response from LeadByte', raw: text }; }
    return json(payload, 200);
  } catch (_) {
    return json({ code: 0, response: 'Upstream error contacting LeadByte' }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
}
