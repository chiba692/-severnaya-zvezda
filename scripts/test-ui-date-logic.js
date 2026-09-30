const fs=require('fs'),vm=require('vm'),assert=require('assert');
function section(file,start,end){const s=fs.readFileSync(file,'utf8'),a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a,`${file}: logic section not found`);return s.slice(a,b)}
{
  const code=section('public/index.html','function isoDateParts','function formatPhone');
  const ctx={Date,result:null};vm.createContext(ctx);vm.runInContext(code+';result=[isTraumaDate("2026-10-03"),isTraumaDate("2026-10-30"),isTraumaDate("2026-10-10")]',ctx);
  assert.deepStrictEqual(Array.from(ctx.result),[true,false,false]);
}
{
  const code=section('public/admin.html','function isoAdminParts','function moscowMinutes');
  const ctx={Date,result:null};vm.createContext(ctx);vm.runInContext(code+';result=[isTraumaDateAdmin("2026-10-03"),isTraumaDateAdmin("2026-10-30"),daySchedule("2026-10-30").slice(0,3),daySchedule("2026-10-03").slice(0,3)]',ctx);
  assert.strictEqual(ctx.result[0],true);assert.strictEqual(ctx.result[1],false);
  assert.deepStrictEqual(Array.from(ctx.result[2]),['10:00','10:20','10:40']);
  assert.deepStrictEqual(Array.from(ctx.result[3]),['10:00','10:30','11:00']);
}
console.log('[UI-DATE] public/admin first-Saturday logic passed; 30.10.2026 is regular with 20-minute slots');
