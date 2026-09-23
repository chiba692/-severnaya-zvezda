const {verifySession,verifyCsrf}=require('./_auth');
const reply=(statusCode,body,extra={})=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra},body:JSON.stringify(body)});
const clean=(v,n=200)=>String(v??'').trim().slice(0,n);
function env(){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw Error('Supabase environment variables are missing');
  return{url,key,headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`}};
}
function isAdmin(event){return verifySession(event)}
function requireAdmin(event,{csrf=false}={}){
  if(!verifySession(event))return{ok:false,status:401,error:'Требуется авторизация'};
  if(csrf&&!verifyCsrf(event))return{ok:false,status:403,error:'Сессия устарела. Обновите страницу.'};
  return{ok:true};
}
function digits(v){return String(v||'').replace(/\D/g,'')}
function normalizePhone(v){let d=digits(v);if(d.startsWith('8')&&d.length===11)d='7'+d.slice(1);if(d.length===10)d='7'+d;return d.slice(0,15)}
function jsonBody(event,max=15000){
  if(Buffer.byteLength(event.body||'','utf8')>max)throw Object.assign(Error('Слишком большой запрос'),{status:413});
  try{return JSON.parse(event.body||'{}')}catch{throw Object.assign(Error('Некорректный запрос'),{status:400})}
}
function csvEscape(v){const s=String(v??'');return /[";,\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
module.exports={reply,clean,env,isAdmin,requireAdmin,digits,normalizePhone,jsonBody,csvEscape};
