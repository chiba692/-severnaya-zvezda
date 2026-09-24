const {reply}=require('./_util');
const {getSession,verifyCsrf,COOKIE}=require('./_auth');
const {sameOrigin}=require('./_public-guard');
exports.handler=async event=>{if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});if(!sameOrigin(event))return reply(403,{error:'Запрос отклонён защитой сайта'});const s=getSession(event);if(s&&!verifyCsrf(event))return reply(403,{error:'Сессия устарела. Обновите страницу.'});return reply(200,{ok:true},{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Priority=High`})};
