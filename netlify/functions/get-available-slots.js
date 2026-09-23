const {reply}=require('./_util');const {dateInfo,today,type}=require('./_schedule');const {slotsFor}=require('./_availability');
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return reply(405,{error:'Method not allowed'});
  try{
    const date=String((event.queryStringParameters||{}).date||'');if(!dateInfo(date))return reply(400,{error:'Некорректная дата'});
    if(date<today())return reply(200,{date,type:type(date),slots:[]});
    return reply(200,{date,type:type(date),slots:await slotsFor(date)});
  }catch(e){console.error(e);return reply(500,{error:'Не удалось загрузить расписание'})}
};
