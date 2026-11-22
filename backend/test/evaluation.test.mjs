import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/adapters/evaluation.mjs';
const cases=[{entrada:'21',salida_esperada:'42',es_publico:true}];
function setup(t) {
 for(const [name,value] of Object.entries({ONLINECOMPILER_API_URL:'https://api.onlinecompiler.io',ONLINECOMPILER_API_KEY:'native-test-key'})) {
  const old=process.env[name];process.env[name]=value;
  t.after(()=>old===undefined?delete process.env[name]:process.env[name]=old);
 }
}
const success=(output='42\n')=>({status:'success',exit_code:0,output,error:'',truncated:false});
test('native request uses Authorization and keeps hidden-case feedback private',async t=>{
 setup(t);let count=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  count++;assert.equal(url,'https://api.onlinecompiler.io/api/run-code-sync/');
  assert.deepEqual(options.headers,{'Content-Type':'application/json',Authorization:'native-test-key'});
  const b=JSON.parse(options.body);assert.equal(b.compiler,'python-3.14');assert.equal(b.input,'21');assert.equal(b.code,'print(42)');assert.equal(b.time_limit,2);assert.equal(b.memory_limit,128);assert.equal('language_id' in b,false);
  return Response.json(success());
 });
 const r=await evaluate('Python','consola',{'main.py':'print(42)'},[...cases,{...cases[0],es_publico:false}]);
 assert.equal(count,2);assert.equal(r.estado,'aprobado');assert.equal(r.detalle,'42\n\nCaso privado aprobado.');
});
test('wrong output, runtime errors, timeouts and truncation do not approve a practice',async t=>{
 setup(t);
 for(const result of [success('wrong'),{...success(),status:'error',exit_code:1,error:'SyntaxError'}, {...success(),status:'error',exit_code:124}, {...success(),truncated:true}]) {
  const m=t.mock.method(globalThis,'fetch',async()=>Response.json(result));
  assert.equal((await evaluate('Python','consola',{'main.py':'print(42)'},cases)).estado,'con errores');m.mock.restore();
 }
});
test('TypeScript uses its native compiler and Node compatibility, with no worker call',async t=>{
 setup(t);
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://api.onlinecompiler.io/api/run-code-sync/');const b=JSON.parse(options.body);assert.equal(b.compiler,'typescript-deno');assert.match(b.code,/createRequire/);return Response.json(success());
 });
 assert.equal((await evaluate('TypeScript','consola',{'main.ts':'console.log(42)'},cases)).estado,'aprobado');
});
test('authorization, quota, malformed responses and network errors remain service errors',async t=>{
 setup(t);
 for(const status of [401,403,429,500]) {
  const m=t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status}));
  await assert.rejects(evaluate('Python','consola',{'main.py':'print(42)'},cases),e=>e.status===503);m.mock.restore();
 }
 for(const fn of [async()=>Response.json({status:'success'}),async()=>new Response('not json'),async()=>{throw Error('network');}]) {
  const m=t.mock.method(globalThis,'fetch',fn);await assert.rejects(evaluate('Python','consola',{'main.py':'print(42)'},cases),e=>e.status===503);m.mock.restore();
 }
});
test('running uses the supplied stdin instead of the exercise input',async t=>{
 setup(t);t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(JSON.parse(options.body).input,'99');return Response.json(success('198'));});
 const r=await evaluate('Node.js','consola',{'main.js':'console.log(198)'},cases,true,'99');assert.equal(r.estado,'ejecutado');assert.equal(r.detalle,'198');
});
