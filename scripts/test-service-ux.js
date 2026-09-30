const fs=require('fs');
const assert=require('assert');

const sql=fs.readFileSync('supabase/FINAL-MIGRATION.sql','utf8');
const index=fs.readFileSync('public/index.html','utf8');
const prices=fs.readFileSync('public/prices.html','utf8');
const admin=fs.readFileSync('public/admin.html','utf8');
const send=fs.readFileSync('src/functions/send-booking.js','utf8');
const manage=fs.readFileSync('src/functions/manage-booking.js','utf8');

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
const selectable=x=>!['general-035','general-048','general-052'].includes(x.item_key);
const expected={tests:8,ultrasound:5,xray:6,vaccination:15,dentistry:2};
for(const [service,count] of Object.entries(expected)){
  let arr=active.filter(x=>x.booking_service===service&&selectable(x));
  assert.strictEqual(arr.length,count,`${service} picker expected ${count}, got ${arr.length}`);
}
assert(byKey['general-035'],'UZI umbrella row must stay in full price');
assert(byKey['general-052'],'after-hours multiplier must stay in full price');
assert(/function canBook\(x\)\{return !\['general-035','general-048','general-052'\]/.test(prices),'informational rows must not be bookable from full price');
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
assert(/\.nav \.book:hover,\.nav \.book:focus-visible/.test(index),'top booking button hover/focus regression guard missing');
assert(/id="priceCountBadge">—</.test(index),'price count must not be hardcoded');
assert(!/>\s*139\s*</.test(index+prices+admin),'stale visible 139 count must not return');
assert(/value="ferret">Хорёк</.test(index)&&/value="rabbit">Кролик</.test(index)&&/value="rodent">Грызун</.test(index)&&/value="bird">Птица</.test(index),'public animal selector is incomplete');
assert(/value="ferret">Хорёк</.test(admin)&&/value="rabbit">Кролик</.test(admin)&&/value="rodent">Грызун</.test(admin)&&/value="bird">Птица</.test(admin),'admin animal selector is incomplete');
assert(!/value="reptile"|>Рептил/i.test(index+admin),'reptiles must not appear in booking selectors');
assert(/id="petSpeciesOther"/.test(index)&&/id="fSpeciesOther"/.test(admin),'custom animal field missing');
assert(/pet_species_other/.test(send)&&/pet_species_other/.test(manage),'custom animal must be persisted server-side');
const priceApi=fs.readFileSync('src/functions/price-items.js','utf8'),servicesApi=fs.readFileSync('src/functions/services.js','utf8');
assert(/booking_service=neq\.farm/.test(priceApi),'price API must hide farm defensively even before migration');
assert(/service_key=neq\.farm/.test(servicesApi),'services API must hide farm defensively even before migration');
assert(/function speciesName\(b\)/.test(admin),'admin species localization helper missing');
assert(!/\$\{esc\(b\.pet_species\|\|'\'\)\}/.test(admin),'raw species token leaks into admin card');
assert(!/id="versionPill"|id="systemVersion"/.test(admin),'visible app version must be removed');
assert(/cardQuickActions/.test(admin)&&/Перенести/.test(admin)&&/Не пришёл/.test(admin)&&/Отменить/.test(admin),'large admin quick actions missing');
assert(/grid-template-areas:"title title" "price enabled" "price save"/.test(admin),'admin price rows need robust long-text layout');
assert(/grid-template-areas:"main action" "price action"/.test(prices)&&/overflow-wrap:anywhere/.test(prices),'public price rows need robust wrapping');
assert(/function isoAdminParts/.test(admin)&&/Date\.UTC/.test(admin),'admin trauma date logic must be timezone-safe');
assert(/function isoDateParts/.test(index)&&/Date\.UTC/.test(index),'public trauma date logic must be timezone-safe');
assert(/serverTrauma!==calendarTrauma/.test(index),'public UI must reject server/client trauma classification mismatch');
console.log('[SERVICES] v10 catalog, species, admin UX, price wrapping, hover and trauma guards passed');
