const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fetchReserveSnapshot}=require('../assets/data-loader.js');
const doc={schema_version:1,events:[],transactions:[],daily:[],reserve:{reconciled:true},market:{},history:{}};
const wait=async()=>{};
test('a transient network failure recovers automatically',async()=>{
  let calls=0;
  const result=await fetchReserveSnapshot('data/latest.json',{wait,fetchImpl:async()=>{
    if(++calls===1)throw new TypeError('Failed to fetch');
    return {ok:true,json:async()=>doc};
  }});
  assert.equal(calls,2); assert.equal(result,doc);
});
test('a temporary deployment 404 recovers on retry',async()=>{
  let calls=0;
  const result=await fetchReserveSnapshot('data/latest.json',{wait,fetchImpl:async()=>++calls===1?{ok:false,status:404}:{ok:true,json:async()=>doc}});
  assert.equal(calls,2); assert.equal(result,doc);
});
test('persistent server failure reports the actual HTTP status',async()=>{
  let calls=0;
  await assert.rejects(fetchReserveSnapshot('data/latest.json',{wait,fetchImpl:async()=>{calls++;return {ok:false,status:503};}}),e=>e.kind==='http'&&e.status===503);
  assert.equal(calls,3);
});
test('unverified data is rejected without being displayed or retried',async()=>{
  let calls=0;
  await assert.rejects(fetchReserveSnapshot('data/latest.json',{wait,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({...doc,reserve:{reconciled:false}})};}}),e=>e.kind==='verification');
  assert.equal(calls,1);
});
