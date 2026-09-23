const {reply}=require('./_util');
exports.handler=async event=>{if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});return reply(200,{ok:true},{'Set-Cookie':'admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'})};
