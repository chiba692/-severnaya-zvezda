const {reply}=require('./_util');const {getSession}=require('./_auth');
exports.handler=async event=>{if(event.httpMethod!=='GET')return reply(405,{error:'Method not allowed'});const s=getSession(event);if(!s)return reply(401,{error:'Требуется авторизация'});return reply(200,{ok:true,csrf:s.csrf,expires_at:s.exp})};
