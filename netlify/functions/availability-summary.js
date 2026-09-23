const {reply}=require('./_util');const {today,type,addDays,nextFirstSaturday}=require('./_schedule');const {slotsFor}=require('./_availability');
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return reply(405,{error:'Method not allowed'});
  try{
    const start=today();let next=null;
    for(let i=0;i<=30;i++){const date=addDays(start,i),slots=await slotsFor(date);if(slots.length){next={date,time:slots[0],type:type(date)};break}}
    const td=nextFirstSaturday(start),ts=td?await slotsFor(td):[];
    return reply(200,{next,traumatologist:td?{date:td,slots:ts.length,first_time:ts[0]||null}:null});
  }catch(e){console.error(e);return reply(500,{error:'Не удалось загрузить ближайшее время'})}
};
