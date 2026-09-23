const crypto=require('crypto');

function safeEqual(a,b){
  const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function signPayload(payload){
  const secret=process.env.ADMIN_SESSION_SECRET;
  if(!secret)throw Error('ADMIN_SESSION_SECRET is missing');
  const p=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
  const s=crypto.createHmac('sha256',secret).update(p).digest('base64url');
  return `${p}.${s}`;
}
function parseCookie(event,name){
  const cookies=event.headers?.cookie||event.headers?.Cookie||'';
  const m=cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?m[1]:null;
}
function getSession(event){
  const raw=parseCookie(event,'admin_session');
  if(!raw)return null;
  const [p,s]=raw.split('.'),secret=process.env.ADMIN_SESSION_SECRET;
  if(!p||!s||!secret)return null;
  const ex=crypto.createHmac('sha256',secret).update(p).digest('base64url');
  if(!safeEqual(s,ex))return null;
  try{
    const x=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));
    if(x.role!=='admin'||!x.exp||x.exp<=Date.now()||!x.csrf)return null;
    return x;
  }catch{return null}
}
function verifySession(event){return !!getSession(event)}
function verifyCsrf(event){
  const s=getSession(event);if(!s)return false;
  const h=event.headers||{};
  const token=h['x-csrf-token']||h['X-CSRF-Token']||'';
  return safeEqual(token,s.csrf);
}
function makeSession(hours=12){
  const csrf=crypto.randomBytes(24).toString('base64url');
  const payload={role:'admin',iat:Date.now(),exp:Date.now()+Math.max(1,Math.min(168,hours))*3600_000,csrf};
  return{token:signPayload(payload),csrf,payload};
}
module.exports={safeEqual,getSession,verifySession,verifyCsrf,makeSession};
