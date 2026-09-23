const {S,mins,dateInfo,now,today}=require('./_schedule');
const {env}=require('./_util');
const time5=v=>String(v||'').slice(0,5);
function blockedBy(block,time){
  if(!block)return false;
  if(!block.start_time&&!block.end_time)return true;
  const t=mins(time),a=mins(time5(block.start_time)),b=mins(time5(block.end_time));
  if(t===null||a===null||b===null)return false;
  return t>=a&&t<b;
}
async function blocksFor(date){
  const {url,headers}=env();
  const r=await fetch(`${url}/rest/v1/schedule_blocks?block_date=eq.${encodeURIComponent(date)}&select=id,block_date,start_time,end_time,reason`,{headers});
  if(!r.ok)throw Error(await r.text());return await r.json();
}
async function busyFor(date,excludeId=null){
  const {url,headers}=env();
  const r=await fetch(`${url}/rest/v1/bookings?booking_date=eq.${encodeURIComponent(date)}&service=neq.inpatient&archived_at=is.null&select=id,booking_time,status`,{headers});
  if(!r.ok)throw Error(await r.text());
  return new Set((await r.json()).filter(x=>String(x.id)!==String(excludeId||'')&&!['rejected','cancelled'].includes(x.status)).map(x=>time5(x.booking_time)));
}
async function slotsFor(date,{excludeId=null,filterPast=true}={}){
  const di=dateInfo(date);if(!di)return[];const sch=S[di.x.getUTCDay()];if(!sch)return[];
  const [busy,blocks]=await Promise.all([busyFor(date,excludeId),blocksFor(date)]);
  let slots=[];
  for(let m=mins(sch[0]);m<mins(sch[1]);m+=20){
    const t=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    if(!busy.has(t)&&!blocks.some(b=>blockedBy(b,t)))slots.push(t);
  }
  if(filterPast&&date===today()){
    const n=now(),cur=n.getHours()*60+n.getMinutes();slots=slots.filter(t=>mins(t)>cur);
  }
  return slots;
}
async function slotAvailable(date,time,{excludeId=null,allowPast=false}={}){
  if(!allowPast&&date<today())return false;
  const slots=await slotsFor(date,{excludeId,filterPast:!allowPast});return slots.includes(time5(time));
}
async function inpatientCapacity(){
  const {url,headers}=env();
  const r=await fetch(`${url}/rest/v1/clinic_settings?setting_key=eq.inpatient_capacity&select=value&limit=1`,{headers});
  if(!r.ok)throw Error(await r.text());const row=(await r.json())[0];return Math.max(1,Math.min(50,Number(row?.value?.capacity)||3));
}
async function inpatientAvailable(start,end,{excludeId=null}={}){
  const {url,headers}=env(),capacity=await inpatientCapacity();
  const q=`${url}/rest/v1/bookings?service=eq.inpatient&archived_at=is.null&stay_start=lte.${encodeURIComponent(end)}&stay_end=gte.${encodeURIComponent(start)}&select=id,status`;
  const r=await fetch(q,{headers});if(!r.ok)throw Error(await r.text());
  const used=(await r.json()).filter(x=>String(x.id)!==String(excludeId||'')&&!['rejected','cancelled'].includes(x.status)).length;
  return{ok:used<capacity,used,capacity};
}
module.exports={slotsFor,slotAvailable,blocksFor,inpatientCapacity,inpatientAvailable,time5};
