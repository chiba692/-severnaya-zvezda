const assert=require('assert');
process.env.ADMIN_SESSION_SECRET='x'.repeat(64);
process.env.ADMIN_SESSION_VERSION='1';
const s=require('../src/functions/_schedule');
const {normalizePhone}=require('../src/functions/_util');
const {makeSession,getSession,verifyCsrf,COOKIE}=require('../src/functions/_auth');
const species=require('../src/functions/_species');
function firstSaturday(year,month){for(let d=1;d<=7;d++){const ds=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(s.type(ds)==='traumatologist')return ds}}
assert.strictEqual(s.validate('2026-09-21','10:00',true),null);
assert.strictEqual(s.validate('2026-09-21','10:10',true),'Время не соответствует расписанию');
assert.strictEqual(s.validate('2026-09-20','10:00',true),'В этот день клиника закрыта');
assert.strictEqual(s.validate('2026-09-26','15:40',true),null);
assert.strictEqual(s.validate('2026-09-26','16:00',true),'Время не соответствует расписанию');
assert.strictEqual(firstSaturday(2026,10),'2026-10-03');
assert.strictEqual(s.slotMinutes('2026-10-03'),30);
assert.strictEqual(s.validate('2026-10-03','10:30',true),null);
assert.strictEqual(s.validate('2026-10-03','10:20',true),'Время не соответствует расписанию');
assert.strictEqual(s.generateSlots('2026-10-03').length,12);
assert.strictEqual(s.slotMinutes('2026-09-26'),20);
assert.strictEqual(s.generateSlots('2026-09-26').length,18);
assert.strictEqual(s.generateSlots('2026-09-21').length,21);
assert.strictEqual(s.type('2026-10-30'),'regular','30.10.2026 must be an ordinary Friday, not traumatologist day');
assert.strictEqual(s.slotMinutes('2026-10-30'),20);
assert.strictEqual(s.validate('2026-10-30','10:20',true),null);
assert.strictEqual(s.validate('2026-10-30','10:30',true),'Время не соответствует расписанию');
for(let month=1;month<=12;month++){
  let trauma=[];
  for(let day=1;day<=31;day++){
    const ds=`2026-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if(s.dateInfo(ds)&&s.type(ds)==='traumatologist')trauma.push(ds);
  }
  assert(trauma.length<=1,`month ${month} has more than one trauma date`);
  if(trauma.length)assert(Number(trauma[0].slice(-2))<=7,`trauma date must be in first seven days: ${trauma[0]}`);
}
assert.deepStrictEqual(species.ALLOWED,['cat','dog','ferret','rabbit','rodent','bird','other']);
assert(!species.ALLOWED.includes('reptile'));
assert.strictEqual(species.parseSpecies({pet_species:'other',pet_species_other:''}).ok,false);
assert.strictEqual(species.parseSpecies({pet_species:'other',pet_species_other:'Шиншилла'}).other,'Шиншилла');
assert.strictEqual(normalizePhone('8 (911) 123-45-67'),'79111234567');
assert.strictEqual(normalizePhone('+7 911 123-45-67'),'79111234567');
assert.strictEqual(normalizePhone('9111234567'),'79111234567');
const ua='Mozilla/5.0 UnitTest';
const base={headers:{'user-agent':ua}};
const sess=makeSession(base,12);
const event={headers:{cookie:`${COOKIE}=${sess.token}`,'x-csrf-token':sess.csrf,'user-agent':ua}};
assert.strictEqual(getSession(event).role,'admin');
assert.strictEqual(verifyCsrf(event),true);
assert.strictEqual(verifyCsrf({headers:{cookie:`${COOKIE}=${sess.token}`,'x-csrf-token':'bad','user-agent':ua}}),false);
assert.strictEqual(getSession({headers:{cookie:`${COOKIE}=${sess.token}`,'user-agent':'Different UA'}}),null);
console.log('[TEST] schedule, phone and hardened admin-session tests passed');
