const {reply,env,requireAdmin,clean,jsonBody,normalizePhone}=require('./_util');
const {guardPublicGet}=require('./_public-guard');

const DEFAULTS={
  phone_display:'+7 911 648-06-44',
  phone_tel:'+79116480644',
  address:'ул. Северная, д. 7 · Малая Вишера',
  map_query:'Малая Вишера, ул. Северная, 7',
  hero_lead:'Выберите услугу и удобное время онлайн. Если случай срочный или вы сомневаетесь, какой приём нужен, просто позвоните — подскажем, как лучше поступить.',
  urgent_text:'Если питомцу требуется срочная помощь, позвоните в клинику перед поездкой.',
  announcement_enabled:false,
  announcement_text:'',
  announcement_until:null
};

function normalize(raw={}){
  const digits=normalizePhone(raw.phone_tel||raw.phone_display||DEFAULTS.phone_tel);
  const tel=digits?('+'+digits):DEFAULTS.phone_tel;
  const until=/^\d{4}-\d{2}-\d{2}$/.test(String(raw.announcement_until||''))?String(raw.announcement_until):null;
  return{
    phone_display:clean(raw.phone_display||DEFAULTS.phone_display,40),
    phone_tel:tel,
    address:clean(raw.address||DEFAULTS.address,180),
    map_query:clean(raw.map_query||DEFAULTS.map_query,180),
    hero_lead:clean(raw.hero_lead||DEFAULTS.hero_lead,500),
    urgent_text:clean(raw.urgent_text||DEFAULTS.urgent_text,300),
    announcement_enabled:!!raw.announcement_enabled,
    announcement_text:clean(raw.announcement_text,300),
    announcement_until:until
  };
}

async function readSettings(url,headers){
  const r=await fetch(`${url}/rest/v1/clinic_settings?key=eq.public_site&select=value&limit=1`,{headers});
  if(!r.ok)return DEFAULTS;
  const rows=await r.json().catch(()=>[]);
  return normalize(rows?.[0]?.value||DEFAULTS);
}

exports.handler=async event=>{
  try{
    const {url,headers}=env();
    if(event.httpMethod==='GET'){
      const g=await guardPublicGet(event,{scope:'clinic-settings',limit:120,window:600});if(!g.ok)return reply(g.status,{error:g.error});
      const settings=await readSettings(url,headers);
      return reply(200,{settings});
    }
    if(event.httpMethod==='POST'){
      const a=requireAdmin(event,{csrf:true});
      if(!a.ok)return reply(a.status,{error:a.error});
      const b=jsonBody(event,12000),settings=normalize(b.settings||b);
      const payload={key:'public_site',value:settings,updated_at:new Date().toISOString()};
      const r=await fetch(`${url}/rest/v1/clinic_settings`,{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      if(!r.ok)throw Error(await r.text());
      return reply(200,{ok:true,settings});
    }
    return reply(405,{error:'Method not allowed'});
  }catch(e){console.error('clinic-settings',e);return reply(e.status||500,{error:e.status?e.message:'Не удалось сохранить настройки сайта'})}
};
