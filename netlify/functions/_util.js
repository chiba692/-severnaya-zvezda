const {verifySession,verifyCsrf}=require('./_auth');
const reply=(statusCode,body,extra={})=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra},body:JSON.stringify(body)});
const clean=(v,n=200)=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim().slice(0,n);
function env(){const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.SUPABASE_SECRET_KEY;if(!url||!/^https:\/\//i.test(url)||!key)throw Error('Supabase environment variables are missing');return{url,key,headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`}}}
function isAdmin(event){return verifySession(event)}
function requireAdmin(event,{csrf=false}={}){if(!verifySession(event))return{ok:false,status:401,error:'Требуется авторизация'};if(csrf&&!verifyCsrf(event))return{ok:false,status:403,error:'Сессия устарела. Обновите страницу.'};return{ok:true}}
function digits(v){return String(v||'').replace(/\D/g,'')}
function normalizePhone(v){let d=digits(v);if(d.startsWith('8')&&d.length===11)d='7'+d.slice(1);if(d.length===10)d='7'+d;return d.slice(0,15)}
function isJsonContentType(event){const h=event.headers||{},ct=String(h['content-type']||h['Content-Type']||'').toLowerCase();return /^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/.test(ct)}
function jsonBody(event,max=15000){if(Buffer.byteLength(event.body||'','utf8')>max)throw Object.assign(Error('Слишком большой запрос'),{status:413});if((event.body||'').length&&!isJsonContentType(event))throw Object.assign(Error('Ожидается JSON-запрос'),{status:415});try{return JSON.parse(event.body||'{}')}catch{throw Object.assign(Error('Некорректный запрос'),{status:400})}}
function positiveInt(v){const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null}
function csvEscape(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[";,\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
module.exports={reply,clean,env,isAdmin,requireAdmin,digits,normalizePhone,isJsonContentType,jsonBody,positiveInt,csvEscape};
