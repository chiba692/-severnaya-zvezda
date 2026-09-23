const {reply,jsonBody}=require('./_util');
const {makeSession,safeEqual}=require('./_auth');
const {sameOrigin,clientIp,consume}=require('./_public-guard');
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    if(!sameOrigin(event))return reply(403,{error:'Запрос отклонён защитой сайта'});
    const b=jsonBody(event,5000),login=String(b.login||'').trim().slice(0,100),password=String(b.password||'').slice(0,300),ip=clientIp(event);
    const ipOk=await consume('admin-login:ip',ip,8,900),userOk=await consume('admin-login:user',login.toLowerCase()||'empty',5,900);
    if(!ipOk||!userOk)return reply(429,{error:'Слишком много попыток входа. Подождите 15 минут.'});
    const good=safeEqual(login,process.env.ADMIN_LOGIN||'')&&safeEqual(password,process.env.ADMIN_PASSWORD||'');
    if(!good)return reply(401,{error:'Неверный логин или пароль'});
    const {token,csrf}=makeSession(12);
    return reply(200,{ok:true,csrf},{'Set-Cookie':`admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`});
  }catch(e){console.error(e);return reply(e.status||500,{error:e.status?e.message:'Не удалось выполнить вход'})}
};
