const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

process.env.ADMIN_SESSION_SECRET='x'.repeat(64);
process.env.ADMIN_SESSION_VERSION='1';
process.env.ADMIN_LOGIN='security-admin';
process.env.ADMIN_PASSWORD='A'.repeat(20)+'1!';
process.env.RATE_LIMIT_SECRET='r'.repeat(64);

const util=require('../netlify/functions/_util');
const auth=require('../netlify/functions/_auth');
// Local validator intentionally does not install dependencies; stub web-push only for module loading.
const Module=require('module'),originalLoad=Module._load;
Module._load=function(request,parent,isMain){if(request==='web-push')return{setVapidDetails(){},async sendNotification(){return true}};return originalLoad.apply(this,arguments)};
const publicBooking=require('../netlify/functions/public-booking');
Module._load=originalLoad;
const manage=require('../netlify/functions/manage-booking');

(async()=>{
  // Input parser: SQL-like text remains data; requests are size/type/JSON validated.
  const sqlLike=`Robert'); DROP TABLE bookings;--`;
  const parsed=util.jsonBody({body:JSON.stringify({name:sqlLike}),headers:{'content-type':'application/json'}},1000);
  assert.strictEqual(parsed.name,sqlLike);
  assert.throws(()=>util.jsonBody({body:'{"x":',headers:{'content-type':'application/json'}},1000),e=>e.status===400);
  assert.throws(()=>util.jsonBody({body:'{}',headers:{'content-type':'text/plain'}},1000),e=>e.status===415);
  assert.throws(()=>util.jsonBody({body:JSON.stringify({x:'a'.repeat(2000)}),headers:{'content-type':'application/json'}},100),e=>e.status===413);

  // CSV/Excel formula injection protection.
  assert.ok(util.csvEscape('=1+1').startsWith("'"));
  assert.ok(util.csvEscape('+SUM(A1:A2)').startsWith("'"));
  assert.ok(util.csvEscape('@cmd').startsWith("'"));

  // Public bearer token must not be replaceable with a numeric booking ID.
  assert.strictEqual(publicBooking.TOKEN.test('1'),false);
  assert.strictEqual(publicBooking.TOKEN.test('a'.repeat(48)),true);
  assert.strictEqual(publicBooking.TOKEN.test('b'.repeat(64)),true);
  assert.strictEqual(publicBooking.TOKEN.test('g'.repeat(64)),false);

  // Public response excludes sensitive/internal fields.
  const safe=publicBooking.safe({
    id:7,pet:'Барсик',pet_age:'3',booking_date:'2026-10-01',booking_time:'10:20:00',booking_type:'regular',
    status:'new',service:'exam',service_details:{interest:'Осмотр'},created_at:'x',updated_at:'y',
    phone:'+70000000000',owner_name:'Секрет',admin_note:'internal',public_token:'a'.repeat(64),request_id:'uuid',phone_norm:'70000000000'
  });
  for(const k of ['phone','owner_name','admin_note','public_token','request_id','phone_norm'])assert.ok(!(k in safe),`public response leaked ${k}`);

  // Admin endpoints are server-protected, not merely hidden in UI.
  let r=await manage.handler({httpMethod:'POST',headers:{},body:'{}'});
  assert.strictEqual(r.statusCode,401);
  const ua='SecurityTest/1.0';
  const sess=auth.makeSession({headers:{'user-agent':ua}},12);
  r=await manage.handler({httpMethod:'POST',headers:{cookie:`${auth.COOKIE}=${sess.token}`,'user-agent':ua,'x-csrf-token':'wrong','content-type':'application/json'},body:'{}'});
  assert.strictEqual(r.statusCode,403);
  assert.strictEqual(auth.getSession({headers:{cookie:`${auth.COOKIE}=${sess.token}`,'user-agent':'DifferentAgent'}}),null);

  // Client files must never contain server secret variables or server env access.
  const publicFiles=['index.html','admin.html','booking.html','prices.html','privacy.html','404.html','sw.js','site.webmanifest','admin-manifest.webmanifest'];
  const secretNames=['SUPABASE_SECRET_KEY','VAPID_PRIVATE_KEY','ADMIN_PASSWORD','ADMIN_SESSION_SECRET','RATE_LIMIT_SECRET'];
  for(const f of publicFiles){
    const s=read(f);
    assert.ok(!/process\.env/.test(s),`${f} contains process.env`);
    for(const name of secretNames)assert.ok(!s.includes(name),`${f} exposes secret name ${name}`);
    assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(s),`${f} contains Supabase secret-looking value`);
    assert.ok(!/eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(s),`${f} contains JWT-looking secret`);
  }

  // Known stored-XSS sink is forbidden: user-controlled pet/phone inside inline JS attribute.
  const admin=read('admin.html');
  assert.ok(!/onclick=["'][^"']*quickFromPet\s*\(\s*["']\$\{/i.test(admin));
  assert.ok(/class="btn ghost petQuick"/.test(admin),'safe petQuick data-button missing');
  assert.ok(/\$\$\('\.petQuick'\).*dataset\.phone/s.test(admin),'petQuick listener missing');
  assert.ok(!/public_token\s*:\s*b\.public_token/.test(admin),'admin offline cache stores public bearer token');

  // New private links use URL fragment, so bearer token is not sent with the static page request.
  const index=read('index.html'),booking=read('booking.html');
  assert.ok(index.includes("/booking.html#t="));
  assert.ok(admin.includes("/booking.html#t="));
  assert.ok(booking.includes("/booking.html#t="));
  assert.ok(/action:'read',token/.test(index));
  assert.ok(/action:'read',token/.test(booking));

  // Service worker must never cache Netlify Functions or navigate Push to arbitrary URLs.
  const sw=read('sw.js');
  assert.ok(sw.includes("u.pathname.startsWith('/.netlify/functions/')"));
  assert.ok(sw.includes("url.startsWith('/admin.html')"));

  // No obvious runtime code execution primitives.
  for(const f of [...publicFiles,...fs.readdirSync(path.join(root,'netlify/functions')).filter(x=>x.endsWith('.js')).map(x=>'netlify/functions/'+x)]){
    const s=read(f);
    assert.ok(!/\beval\s*\(/.test(s),`${f} uses eval`);
    assert.ok(!/new\s+Function\s*\(/.test(s),`${f} uses new Function`);
    assert.ok(!/insertAdjacentHTML\s*\(/.test(s),`${f} uses insertAdjacentHTML`);
  }

  // SQL hardening is part of the single migration.
  const sql=read('supabase/SECURITY-HARDENING-MIGRATION.sql');
  for(const needle of [
    'revoke all on public.bookings from anon,authenticated',
    'create policy deny_direct_access on public.bookings',
    'revoke all on function public.consume_public_rate_limit',
    'revoke execute on function public.guard_public_booking_insert()',
    'create unique index bookings_date_time_unique',
    "raise exception 'DUPLICATE_BOOKING'",
    'clinic_price_items_booking_service_check'
  ])assert.ok(sql.toLowerCase().includes(needle.toLowerCase()),`migration missing: ${needle}`);
  const widen=sql.indexOf('clinic_services_key_check'),seed=sql.indexOf("insert into public.clinic_services");
  assert.ok(widen>=0&&seed>=0&&widen<seed,'clinic_services whitelist is not widened before seed');

  // Server code does not execute raw SQL; PostgREST filters that include bearer/user strings are encoded.
  const funcs=fs.readdirSync(path.join(root,'netlify/functions')).filter(x=>x.endsWith('.js'));
  for(const f of funcs){
    const s=read('netlify/functions/'+f);
    assert.ok(!/\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.+\s+(?:FROM|INTO|SET)\b/i.test(s),`${f} appears to contain raw SQL`);
  }
  assert.ok(read('netlify/functions/public-booking.js').includes('encodeURIComponent(token)'));
  assert.ok(read('netlify/functions/send-booking.js').includes('encodeURIComponent(phone_norm)'));

  // Brute force and public abuse controls are wired in code + DB RPC.
  const login=read('netlify/functions/admin-login.js');
  assert.ok(login.includes("consume('admin-login:ip'"));
  assert.ok(login.includes("consume('admin-login:user-fail'"));
  assert.ok(read('netlify/functions/_public-guard.js').includes('/rest/v1/rpc/consume_public_rate_limit'));

  // CSP baseline exists, though unsafe-inline remains a documented residual risk.
  const toml=read('netlify.toml');
  for(const directive of ["default-src 'self'","object-src 'none'","frame-ancestors 'none'","base-uri 'self'","form-action 'self'"])
    assert.ok(toml.includes(directive),`CSP missing ${directive}`);

  console.log('[SECURITY] hardened auth, CSRF, token, XSS, input, storage, SQL/RLS and abuse checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
