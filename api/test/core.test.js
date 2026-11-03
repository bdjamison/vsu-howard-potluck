const test=require('node:test');
const assert=require('node:assert/strict');
const {targets,summarize,validate}=require('../src/core');
const valid={name:'Alex Smith',email:'Alex@example.com',phone:'301-555-0142',attendees:2,category:'protein',dish:'Chicken',servings:40};
test('contributor targets for 40-person gathering',()=>assert.deepEqual(targets().map(c=>c.target),[5,3,4,3,5,3,3]));
test('pending does not count as confirmed',()=>{const c=summarize([{category:'protein',status:'pending',servings:40}])[0];assert.equal(c.approved,0);assert.equal(c.pending,1);assert.equal(c.shortage,5);assert.equal(c.pendingServings,40)});
test('counts contributors rather than portions',()=>{const c=summarize([{category:'protein',status:'approved',servings:100}])[0];assert.equal(c.approved,1);assert.equal(c.approvedServings,100);assert.equal(c.shortage,4)});
test('contributors above goal allowed',()=>{const c=summarize(Array.from({length:7},(_,i)=>({guestId:'guest-'+i,category:'protein',status:'approved',servings:40})))[0];assert.equal(c.approved,7);assert.equal(c.shortage,0)});
test('normalizes contact info',()=>{const v=validate(valid);assert.equal(v.email,'alex@example.com');assert.equal(v.phone,'301-555-0142')});
test('rejects invalid email',()=>assert.throws(()=>validate({...valid,email:'invalid'})));
test('rejects invalid mobile',()=>assert.throws(()=>validate({...valid,phone:'123'})));
test('rejects invalid attendees',()=>assert.throws(()=>validate({...valid,attendees:0})));
test('rejects invalid category',()=>assert.throws(()=>validate({...valid,category:'other'})));

test('same guest bringing two dishes in one category counts once',()=>{const c=summarize([{guestId:'g1',category:'protein',status:'approved',servings:40},{guestId:'g1',category:'protein',status:'approved',servings:20}])[0];assert.equal(c.approved,1);assert.equal(c.approvedServings,60)});

test('returning registrant still supplies valid attendee count',()=>assert.throws(()=>validate({...valid,attendees:0,mode:'existing'})));
