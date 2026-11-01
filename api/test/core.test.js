const {test}=require('node:test'),assert=require('node:assert/strict');const {targets,summarize,validate}=require('../src/core');
test('40-attendee targets',()=>assert.deepEqual(targets().map(x=>x.target),[40,40,32,20,32,60,28]));
test('pending does not count as confirmed',()=>{const s=summarize([{category:'protein',servings:20,status:'pending'},{category:'protein',servings:10,status:'approved'}]);assert.equal(s[0].approved,10);assert.equal(s[0].pending,20);assert.equal(s[0].shortage,30)});
test('rejects invalid categories',()=>assert.throws(()=>validate({name:'Test User',phone:'3015551212',dish:'Chicken',category:'fake',servings:10,adults:1}),/category/));
