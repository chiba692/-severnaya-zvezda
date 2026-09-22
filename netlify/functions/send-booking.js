const crypto=require('crypto');
const {validate,type,now,today,mins,dateInfo}=require('./_schedule');
const {reply,env,clean,digits}=require('./_util');
const {sendPush}=require('./_push');
const {guardPublicPost}=require('./_public-guard');

const SERVICES={exam:'Осмотр',ultrasound:'УЗИ',xray:'Рентген',vaccination:'Вакцинация',tests:'Анализы',inpatient:'Стационар',other:'Другое'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function details(s,d){
  d=d&&typeof d==='object'?d:{};
  if(s==='vaccination')return{vaccine_type:clean(d.vaccine_type,30),last_vaccine_date:d.last_vaccine_date||null};
  if(['ultrasound','xray'].includes(s))return{area:clean(d.area,120)};
  if(s==='tests')return{test_type:clean(d.test_type,30)};
  if(s==='inpatient')return{care:clean(d.care,500)};
  if(s==='other')return{reason:clean(d.reason,200)};
  return{};
}

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    let b;
    try{b=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Некорректный запрос'})}

    // Невидимое поле-ловушка для простых ботов.
    if(clean(b.website,200))return reply(200,{ok:true,id:null,token:crypto.randomBytes(24).toString('hex')});

    const request_id=UUID.test(String(b.request_id||''))?String(b.request_id):null;
    const {url,headers}=env();

    // Повтор одной и той же отправки из-за двойного клика/плохой сети не создаёт дубль.
    if(request_id){
      const ir=await fetch(`${url}/rest/v1/bookings?request_id=eq.${encodeURIComponent(request_id)}&select=id,public_token,status&limit=1`,{headers});
      if(!ir.ok)throw Error(await ir.text());
      const existing=(await ir.json())[0];
      if(existing)return reply(200,{ok:true,id:existing.id,token:existing.public_token,status:existing.status,idempotent:true});
    }

    const owner_name=clean(b.owner_name,100),phone=clean(b.phone,40),phone_norm=digits(phone),pet=clean(b.pet,100),pet_species=clean(b.pet_species,20)||'other',pet_age=clean(b.pet_age,40),service=clean(b.service,30)||'exam',comment=clean(b.comment,700),service_details=details(service,b.service_details);
    if(!owner_name||!phone||!pet||!SERVICES[service])return reply(400,{error:'Заполните обязательные поля'});
    if(phone_norm.length<10||phone_norm.length>15)return reply(400,{error:'Проверьте номер телефона'});

    let booking_date=String(b.booking_date||''),booking_time=String(b.booking_time||''),stay_start=b.stay_start?String(b.stay_start):null,stay_end=b.stay_end?String(b.stay_end):null;
    const inpatient=service==='inpatient';
    if(inpatient){
      if(!dateInfo(stay_start)||!dateInfo(stay_end)||stay_end<stay_start||stay_start<today())return reply(400,{error:'Проверьте даты стационара'});
      booking_date=stay_start;booking_time='00:00';
    }else{
      const err=validate(booking_date,booking_time);if(err)return reply(400,{error:err});
      if(booking_date===today()){const n=now();if(mins(booking_time)<=n.getHours()*60+n.getMinutes())return reply(400,{error:'Это время уже прошло'})}
    }

    const guard=await guardPublicPost(event,{scope:'booking',ipLimit:12,ipWindow:600,key:phone_norm,keyLimit:5,keyWindow:1800,maxBytes:12000});
    if(!guard.ok)return reply(guard.status,{error:guard.error});

    // Защита от повторной одинаковой заявки с того же телефона.
    const since=new Date(Date.now()-15*60*1000).toISOString();
    const dr=await fetch(`${url}/rest/v1/bookings?phone_norm=eq.${encodeURIComponent(phone_norm)}&created_at=gte.${encodeURIComponent(since)}&select=id,pet,booking_date,booking_time,service,status&order=created_at.desc&limit=10`,{headers});
    if(dr.ok){
      const duplicate=(await dr.json()).some(x=>
        !['rejected','cancelled'].includes(x.status)&&
        String(x.pet||'').trim().toLowerCase()===pet.toLowerCase()&&
        x.service===service&&String(x.booking_date)===booking_date&&String(x.booking_time||'').slice(0,5)===booking_time
      );
      if(duplicate)return reply(409,{error:'Похожая заявка уже отправлена. Проверьте раздел «Мои записи» на главной странице.'});
    }

    if(!inpatient){
      const q=await fetch(`${url}/rest/v1/bookings?booking_date=eq.${encodeURIComponent(booking_date)}&booking_time=eq.${encodeURIComponent(booking_time)}&select=id,status`,{headers});
      if(!q.ok)throw Error(await q.text());
      if((await q.json()).some(x=>!['rejected','cancelled'].includes(x.status)))return reply(409,{error:'Это время уже занято. Выберите другое.'});
    }

    const public_token=crypto.randomBytes(24).toString('hex');
    const payload={owner_name,phone,phone_norm,pet,pet_species,pet_age:pet_age||null,booking_date,booking_time,comment:comment||null,booking_type:type(booking_date),status:'new',service,service_details,stay_start:inpatient?stay_start:null,stay_end:inpatient?stay_end:null,public_token,request_id,updated_at:new Date().toISOString()};
    const ins=await fetch(`${url}/rest/v1/bookings`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)});
    if(!ins.ok){
      const t=await ins.text();
      if(ins.status===409||t.includes('23505')){
        if(request_id){
          const rr=await fetch(`${url}/rest/v1/bookings?request_id=eq.${encodeURIComponent(request_id)}&select=id,public_token,status&limit=1`,{headers});
          if(rr.ok){const x=(await rr.json())[0];if(x)return reply(200,{ok:true,id:x.id,token:x.public_token,status:x.status,idempotent:true})}
        }
        return reply(409,{error:'Это время уже занято или такая заявка уже отправлена.'});
      }
      throw Error(t);
    }
    const row=(await ins.json())[0];
    const when=inpatient?`${stay_start} — ${stay_end}`:`${booking_date} в ${booking_time}`;
    const push=await sendPush({title:'🐾 Новая заявка — '+SERVICES[service],body:`${owner_name}: ${pet}, ${when}`,url:'/admin.html#notifications',badge:1});
    return reply(200,{ok:true,id:row?.id,token:public_token,status:'new',push});
  }catch(e){console.error(e);return reply(500,{error:'Ошибка сервера'})}
};
