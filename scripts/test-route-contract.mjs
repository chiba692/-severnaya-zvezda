import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
const publicDir=new URL('../public/',import.meta.url);
const files=fs.readdirSync(publicDir).filter(x=>x.endsWith('.html')||x.endsWith('.js'));
const refs=new Set();
for(const f of files){const s=fs.readFileSync(new URL(f,publicDir),'utf8');for(const m of s.matchAll(/\/api\/([a-z0-9-]+)/g))refs.add(m[1]);}
const routes=new Set([...worker.matchAll(/'([a-z0-9-]+)'\s*:/g)].map(m=>m[1]));
for(const r of refs)assert.ok(routes.has(r),`Frontend API route missing in Worker: /api/${r}`);
assert.ok(routes.has('prices'),'Compatibility alias /api/prices missing');
console.log(`[ROUTES] ${refs.size} frontend API endpoints are mapped in Worker; /api/prices alias present`);
