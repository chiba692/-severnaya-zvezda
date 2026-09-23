const assert=require('assert');
process.env.ADMIN_SESSION_SECRET='test-secret-for-unit-tests-only';
const s=require('../netlify/functions/_schedule');
const {normalizePhone}=require('../netlify/functions/_util');
const {makeSession,getSession,verifyCsrf}=require('../netlify/functions/_auth');
function firstSaturday(year,month){for(let d=1;d<=7;d++){const ds=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(s.type(ds)==='traumatologist')return ds}}
assert.strictEqual(s.validate('2026-09-21','10:00',true),null);
assert.strictEqual(s.validate('2026-09-21','10:10',true),'Время не соответствует расписанию');
assert.strictEqual(s.validate('2026-09-20','10:00',true),'В этот день клиника закрыта');
assert.strictEqual(s.validate('2026-09-26','15:40',true),null);
assert.strictEqual(s.validate('2026-09-26','16:00',true),'Время не соответствует расписанию');
assert.ok(firstSaturday(2026,10));
assert.strictEqual(normalizePhone('8 (911) 123-45-67'),'79111234567');
assert.strictEqual(normalizePhone('+7 911 123-45-67'),'79111234567');
assert.strictEqual(normalizePhone('9111234567'),'79111234567');
assert.strictEqual(s.generateSlots('2026-09-21').length,21);
const sess=makeSession(12),event={headers:{cookie:`admin_session=${sess.token}`,'x-csrf-token':sess.csrf}};
assert.strictEqual(getSession(event).role,'admin');assert.strictEqual(verifyCsrf(event),true);assert.strictEqual(verifyCsrf({headers:{cookie:`admin_session=${sess.token}`,'x-csrf-token':'bad'}}),false);
console.log('[TEST] schedule, phone and admin-session tests passed');
