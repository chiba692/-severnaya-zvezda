const {reply,env,clean}=require('./_util');
const {guardPublicPost}=require('./_public-guard');
const {sendPush}=require('./_push');

exports.handler=async event=>{
  try{
    const {url,headers}=env();
    if(event.httpMethod==='GET'){
      const r=await fetch(`${url}/rest/v1/reviews?is_published=eq.true&select=id,rating,display_name,text,created_at&order=created_at.desc&limit=8`,{headers});
      if(!r.ok)throw Error(await r.text());
      return reply(200,{reviews:await r.json()});
    }

    if(event.httpMethod==='POST'){
      let b;
      try{b=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Некорректный запрос'})}
      if(clean(b.website,200))return reply(200,{ok:true,message:'Спасибо! Отзыв отправлен на публикацию.'});
      const token=clean(b.token,80),rating=Number(b.rating),text=clean(b.text,700);
      if(!token||!Number.isInteger(rating)||rating<1||rating>5||text.length<3)return reply(400,{error:'Проверьте оценку и текст отзыва'});
      const guard=await guardPublicPost(event,{scope:'review',ipLimit:10,ipWindow:3600,key:token,keyLimit:2,keyWindow:86400,maxBytes:5000});
      if(!guard.ok)return reply(guard.status,{error:guard.error});

      const br=await fetch(`${url}/rest/v1/bookings?public_token=eq.${encodeURIComponent(token)}&select=id,owner_name,pet,status&limit=1`,{headers});
      if(!br.ok)throw Error(await br.text());
      const booking=(await br.json())[0];
      if(!booking)return reply(404,{error:'Заявка не найдена'});
      if(booking.status!=='completed')return reply(400,{error:'Отзыв можно оставить после завершённого приёма'});
      const display_name=clean(b.display_name,80)||clean(booking.owner_name,80)||'Клиент';
      const ir=await fetch(`${url}/rest/v1/reviews`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({booking_id:booking.id,rating,display_name,text,is_published:false})});
      if(!ir.ok){
        const t=await ir.text();
        if(ir.status===409||t.includes('23505'))return reply(409,{error:'Отзыв по этой записи уже отправлен'});
        throw Error(t);
      }
      const saved=(await ir.json())[0];
      if(!saved?.id)throw Error('Review insert returned no row');
      await sendPush({title:'⭐ Новый отзыв',body:`${display_name}: ${'★'.repeat(rating)} · ${booking.pet||'питомец'}`,url:'/admin.html#reviews'});
      return reply(200,{ok:true,id:saved.id,message:'Спасибо! Отзыв сохранён и отправлен клинике на модерацию.'});
    }
    return reply(405,{error:'Method not allowed'});
  }catch(e){console.error(e);return reply(500,{error:'Не удалось обработать отзыв'})}
};
