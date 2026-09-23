const base=(process.env.SITE_URL||'https://zevzvezda.netlify.app').replace(/\/$/,'');
const targets=['/','/admin.html','/booking.html','/privacy.html','/.netlify/functions/health'];let failed=false;
for(const p of targets){try{const r=await fetch(base+p,{redirect:'follow'});console.log(`${r.status} ${p}`);if(!r.ok&&p!=='/booking.html')failed=true}catch(e){console.error('FAIL',p,e.message);failed=true}}
if(failed)process.exit(1);
