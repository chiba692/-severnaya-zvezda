const fs=require('fs');
const assert=require('assert');

const sql=fs.readFileSync('supabase/FINAL-MIGRATION.sql','utf8');
const index=fs.readFileSync('public/index.html','utf8');
const prices=fs.readFileSync('public/prices.html','utf8');

const rowRe=/\('([^']+)','((?:''|[^'])*)','((?:''|[^'])*)','((?:''|[^'])*)','([^']+)',(\d+),(\d+),(true|false)\)/g;
const rows=[];
let m;
while((m=rowRe.exec(sql))){
  rows.push({item_key:m[1],category:m[2].replace(/''/g,"'"),name:m[3].replace(/''/g,"'"),price_label:m[4].replace(/''/g,"'"),booking_service:m[5],category_order:Number(m[6]),sort_order:Number(m[7]),enabled:m[8]==='true'});
}
const active=rows.filter(x=>x.enabled);
assert.strictEqual(active.length,116,`expected 116 enabled price items, got ${active.length}`);
const byKey=Object.fromEntries(active.map(x=>[x.item_key,x]));
assert(byKey['general-014']?.name==='Клинический анализ крови','clinical blood analysis must exist by its real name');
assert(!active.some(x=>/^Общий анализ$/i.test(x.name)),'fake "Общий анализ" must not exist');
const selectable=x=>!['general-035','general-052'].includes(x.item_key);
const expected={tests:8,ultrasound:5,xray:6,vaccination:15,dentistry:2};
for(const [service,count] of Object.entries(expected)){
  let arr=active.filter(x=>x.booking_service===service&&selectable(x));
  if(service==='vaccination')arr=arr.filter(x=>x.item_key!=='general-048');
  assert.strictEqual(arr.length,count,`${service} picker expected ${count}, got ${arr.length}`);
}
assert(byKey['general-035'],'UZI umbrella row must stay in full price');
assert(byKey['general-052'],'after-hours multiplier must stay in full price');
assert(/function canBook\(x\)\{return !\['general-035','general-052'\]/.test(prices),'informational rows must not be bookable from full price');
assert(/key==='ultrasound'&&x\.item_key==='general-035'/.test(prices),'UZI umbrella must not duplicate exact UZI picker');
assert(/key==='vaccination'&&x\.item_key==='general-048'/.test(prices),'vaccine certificate must not appear as vaccine choice');
const hubMatch=index.match(/const serviceHub=\[(.*?)\];/s);assert(hubMatch,'serviceHub config missing');
const quickPairs=[...hubMatch[1].matchAll(/quick:\[([^\]]*)\]/g)].flatMap(x=>[...x[1].matchAll(/'([^']+)'/g)].map(y=>y[1]));
const directKeys=[...hubMatch[1].matchAll(/direct:'([^']+)'/g)].map(x=>x[1]);
for(const key of [...quickPairs,...directKeys])assert(byKey[key],`homepage quick/direct item ${key} missing from price catalog`);
const expectedKeyService={'general-002':'exam','general-014':'tests','general-012':'tests','ultrasound-001':'ultrasound','ultrasound-004':'ultrasound','xray-002':'xray','xray-003':'xray','surgery-001':'surgery','surgery-009':'surgery','surgery-025':'dentistry','surgery-026':'dentistry'};
for(const [key,service] of Object.entries(expectedKeyService))assert.strictEqual(byKey[key]?.booking_service,service,`${key} must map to ${service}`);
assert(!/Конкретная услуга\s*\/\s*процедура/i.test(index),'duplicate concrete-service field must not return');
assert(!/id="specificServices"/.test(index),'legacy datalist service selector must not return');
assert(/id="servicePickerDirections"/.test(index),'direction cards must exist in booking picker');
assert(/data-quick-item/.test(index),'homepage quick service cards must exist');
assert(/function compactPrice/.test(index),'long quick-card prices need compact display');
assert(/enterTraumaMode/.test(index)&&/30 минут · стоимость определяется после осмотра/.test(index),'trauma picker mode must stay explicit and price-safe');
assert(!/Общие услуги/.test(index),'raw broad DB category must not leak into main booking UI');
for(const label of ['Приём и документы','Анализы и лаборатория','Процедуры и уход','Стоматология','Условия и доплаты'])assert(prices.includes(label),`logical price group missing: ${label}`);
assert(/html\[data-theme="dark"\] \.tiny\.book/.test(index),'dark-mode book button contrast regression guard missing');
console.log('[SERVICES] 116 price items, logical groups, quick cards, exact picker counts and trauma UX passed');
