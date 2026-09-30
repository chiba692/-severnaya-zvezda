const base=(process.env.SITE_URL||'http://127.0.0.1:8787').replace(/\/$/,'');
let failed=false;
for(const p of ['/','/admin.html','/booking.html','/prices.html','/privacy.html','/api/health']){
  try{const r=await fetch(base+p,{redirect:'manual'}),ok=r.status>=200&&r.status<400;console.log(`${ok?'OK':'FAIL'} ${r.status} ${p}`);if(!ok)failed=true}catch(e){console.log(`FAIL ${p}: ${e.message}`);failed=true}
}
try{
  const r=await fetch(base+'/api/price-items',{headers:{accept:'application/json'}}),d=await r.json();
  const items=Array.isArray(d.items)?d.items:[],farm=items.filter(x=>x.booking_service==='farm'||String(x.item_key||'').startsWith('farm-'));
  const ok=r.ok&&items.length===116&&farm.length===0;
  console.log(`${ok?'OK':'FAIL'} price catalog: ${items.length} items, ${farm.length} farm`);if(!ok)failed=true;
}catch(e){console.log(`FAIL price catalog: ${e.message}`);failed=true}
if(failed)process.exit(1);
