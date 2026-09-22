const crypto=require('crypto');
const {env}=require('./_util');

function bodyTooLarge(event,maxBytes=14000){
  const raw=event.body||'';
  return Buffer.byteLength(raw,'utf8')>maxBytes;
}

function sameOrigin(event){
  const h=event.headers||{};
  const host=String(h['x-forwarded-host']||h['X-Forwarded-Host']||h.host||h.Host||'').toLowerCase().split(',')[0].trim().split(':')[0];
  const source=h.origin||h.Origin||h.referer||h.Referer||'';
  if(!host||!source)return true;
  try{return new URL(source).hostname.toLowerCase()===host}catch{return false}
}

function clientIp(event){
  const h=event.headers||{};
  return String(
    h['x-nf-client-connection-ip']||h['X-Nf-Client-Connection-Ip']||
    h['x-forwarded-for']||h['X-Forwarded-For']||
    h['client-ip']||h['Client-Ip']||'unknown'
  ).split(',')[0].trim().slice(0,120);
}

function fingerprint(value){
  const secret=process.env.RATE_LIMIT_SECRET||process.env.ADMIN_SESSION_SECRET||'severnaya-zvezda-rate-limit';
  return crypto.createHmac('sha256',secret).update(String(value||'unknown')).digest('hex');
}

async function consume(scope,rawKey,limit,windowSeconds){
  const {url,headers}=env();
  const r=await fetch(`${url}/rest/v1/rpc/consume_public_rate_limit`,{
    method:'POST',
    headers,
    body:JSON.stringify({
      p_scope:String(scope).slice(0,60),
      p_key_hash:fingerprint(rawKey),
      p_limit:Math.max(1,Math.min(100,Number(limit)||1)),
      p_window_seconds:Math.max(10,Math.min(86400,Number(windowSeconds)||60))
    })
  });
  if(!r.ok){
    const detail=await r.text();
    throw new Error(`Rate limit backend error: ${r.status} ${detail}`);
  }
  const allowed=await r.json();
  return allowed===true;
}

async function guardPublicPost(event,{scope='public',ipLimit=12,ipWindow=900,key=null,keyLimit=4,keyWindow=1800,maxBytes=14000}={}){
  if(bodyTooLarge(event,maxBytes))return{ok:false,status:413,error:'Слишком большой запрос'};
  if(!sameOrigin(event))return{ok:false,status:403,error:'Запрос отклонён защитой сайта'};
  const ip=clientIp(event);
  if(!(await consume(`${scope}:ip`,ip,ipLimit,ipWindow)))return{ok:false,status:429,error:'Слишком много запросов. Подождите немного и попробуйте снова.'};
  if(key&&!(await consume(`${scope}:key`,key,keyLimit,keyWindow)))return{ok:false,status:429,error:'Слишком много похожих запросов. Подождите немного или позвоните в клинику.'};
  return{ok:true};
}

module.exports={guardPublicPost,sameOrigin,bodyTooLarge,clientIp,fingerprint,consume};
