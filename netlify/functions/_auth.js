const crypto=require('crypto');
const COOKIE='__Host-sz_admin';
const SESSION_VERSION='2';
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function sessionSecret(){const s=String(process.env.ADMIN_SESSION_SECRET||'');return s.length>=32?s:null}
function uaHash(event){const ua=String(event?.headers?.['user-agent']||event?.headers?.['User-Agent']||'').slice(0,500);return crypto.createHash('sha256').update(ua).digest('base64url').slice(0,32)}
function signPayload(payload){const secret=sessionSecret();if(!secret)throw Error('Admin session configuration is invalid');const p=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');const s=crypto.createHmac('sha256',secret).update(p).digest('base64url');return `${p}.${s}`}
function parseCookie(event,name=COOKIE){const cookies=event?.headers?.cookie||event?.headers?.Cookie||'';const m=String(cookies).match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));return m?m[1]:null}
function getSession(event){const raw=parseCookie(event);if(!raw)return null;const [p,s]=raw.split('.'),secret=sessionSecret();if(!p||!s||!secret)return null;const ex=crypto.createHmac('sha256',secret).update(p).digest('base64url');if(!safeEqual(s,ex))return null;try{const x=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));if(x.v!==SESSION_VERSION||x.role!=='admin'||!x.exp||x.exp<=Date.now()||!x.csrf||!x.ua)return null;if(!safeEqual(x.ua,uaHash(event)))return null;const expected=String(process.env.ADMIN_SESSION_VERSION||'1');if(String(x.sv||'1')!==expected)return null;return x}catch{return null}}
function verifySession(event){return !!getSession(event)}
function verifyCsrf(event){const s=getSession(event);if(!s)return false;const h=event.headers||{},token=h['x-csrf-token']||h['X-CSRF-Token']||'';return safeEqual(token,s.csrf)}
function makeSession(event,hours=12){const csrf=crypto.randomBytes(24).toString('base64url'),payload={v:SESSION_VERSION,sv:String(process.env.ADMIN_SESSION_VERSION||'1'),sid:crypto.randomBytes(18).toString('base64url'),role:'admin',iat:Date.now(),exp:Date.now()+Math.max(1,Math.min(24,hours))*3600_000,csrf,ua:uaHash(event)};return{token:signPayload(payload),csrf,payload}}
function authConfigured(){return String(process.env.ADMIN_LOGIN||'').trim().length>=1&&String(process.env.ADMIN_PASSWORD||'').length>=12&&!!sessionSecret()}
module.exports={COOKIE,safeEqual,getSession,verifySession,verifyCsrf,makeSession,authConfigured,uaHash};
