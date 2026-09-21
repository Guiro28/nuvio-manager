import test from 'node:test';
import assert from 'node:assert/strict';
import {activity} from '../server/activity.js';
test('activity reads only the selected owner/profile and paginates without dropping rows',async()=>{
 const transport={rpc:async()=>[{profile_index:2,user_id:'owner'}],call:async(route,body,token,method)=>{const url=new URL(route,'https://example.test');assert.equal(url.pathname,'/rest/v1/library_items');assert.equal(url.searchParams.get('user_id'),'eq.owner');assert.equal(url.searchParams.get('profile_id'),'eq.2');assert.equal(url.searchParams.get('offset'),'100');assert.equal(url.searchParams.get('limit'),'101');assert.equal(method,'GET');assert.equal(token,'token');return Array.from({length:101},(_,i)=>({content_id:String(i)}));}};
 const result=await activity('token',2,'library',2,'nuvio',transport);assert.equal(result.items.length,100);assert.equal(result.hasMore,true);
});
test('invalid categories, pages and inaccessible profiles cannot query history',async()=>{
 const transport={rpc:async()=>[],call:async()=>{throw Error('must not be called');}};
 for(const args of [[2,'unknown',1],[2,'watched',0],[2,'progress',1],[NaN,'library',1]])await assert.rejects(activity('token',...args,'nuvio',transport));
});
