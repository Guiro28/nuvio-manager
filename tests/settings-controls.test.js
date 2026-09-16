import test from 'node:test';
import assert from 'node:assert/strict';
import {schema,descriptor,settingsLeaves,officialSettingsItems,settingControl,readSettingControl,setSettingValue,choices,settingsSections,visibleOfficialSettings} from '../public/settings-controls-v2.js';
test('official controls have unique keys, French labels and typed choices',()=>{
 for(const [platform,fields] of Object.entries(schema)){assert.equal(new Set(fields.map(x=>x.feature+'.'+x.key)).size,fields.length);for(const f of fields){assert.ok(f.title);for(const o of f.options||[])if(['int','float','long'].includes(f.type))assert.equal(typeof o.value,'number',platform+f.key);}}
 const m=descriptor('mobile','trakt_settings_payload','continueWatchingDaysCap');
 const item={meta:m,value:60};const opts=choices(m,60);const index=opts.findIndex(x=>x.value===90);
 assert.equal(readSettingControl({dataset:{kind:'choice'},value:String(index)},item),90);
 assert.match(settingControl(item,''),/90 jours/);
 assert.equal(descriptor('mobile','theme_settings','nav_bar_style').options[0].value,'adaptive');
});
test('unknown values are preserved and escaped without changing stored constants',()=>{
 const meta=descriptor('tv','theme_settings','selected_theme'),value='<custom>';
 const item={meta,value};assert.match(settingControl(item,''),/&lt;custom&gt;/);
 assert.equal(readSettingControl({dataset:{kind:'choice'},value:String(choices(meta,value).length-1)},item),value);
 assert.equal(meta.options.find(x=>x.label==='Or').value,'GOLD');
 const swatches=settingControl({meta,value:'CRIMSON'},'data-field="0"');
 assert.match(swatches,/swatch-crimson/);assert.doesNotMatch(swatches,/style=/);
});
test('technical settings version is preserved in the draft but hidden from controls',()=>{
 const draft={version:3,features:{theme_settings:{selected_theme:'DARK'}}};
 const items=settingsLeaves(draft,'mobile');
 assert.equal(items.some(x=>x.path.length===1&&x.path[0]==='version'),false);
 assert.equal(draft.version,3);
});
test('Mobile serialized payload edits preserve unknown keys and native object payloads',()=>{
 for(const encoded of [true,false]){const payload={continueWatchingDaysCap:60,unknown:{retained:7}},draft={features:{trakt_settings_payload:encoded?JSON.stringify(payload):payload}};
 const before=structuredClone(draft),items=settingsLeaves(draft,'mobile');assert.deepEqual(draft,before);
 const item=items.find(x=>x.label==='continueWatchingDaysCap');assert.equal(item.meta.control,'select');setSettingValue(draft,item,90);
 const after=encoded?JSON.parse(draft.features.trakt_settings_payload):draft.features.trakt_settings_payload;
 assert.deepEqual(after,{continueWatchingDaysCap:90,unknown:{retained:7}});
 }
});
test('runtime multiple selections use addon names and retain unavailable values',()=>{
 const meta=descriptor('tv','player_settings','stream_auto_play_selected_addons'),item={meta,value:['Old']},context={addons:[{name:'New',enabled:true},{name:'Disabled',enabled:false}]};
 assert.deepEqual(choices(meta,item.value,context).map(x=>x.value),['New','Old']);
 assert.deepEqual(readSettingControl({dataset:{kind:'choice'},multiple:true,selectedOptions:[{value:'0'},{value:'1'}]},item,context),['New','Old']);
});
test('numeric validation and dependent layout flag preserve Nuvio types',()=>{
 const item={meta:{type:'int'}};assert.throws(()=>readSettingControl({dataset:{},type:'number',value:'1.5',checkValidity:()=>true},item),/entier/);
 const meta=descriptor('tv','layout_settings','selected_layout'),draft={features:{layout_settings:{selected_layout:{type:'string',value:'MODERN'}}}};
 setSettingValue(draft,{meta,path:['features','layout_settings','selected_layout','value']},'GRID');assert.deepEqual(draft.features.layout_settings.has_chosen_layout,{type:'boolean',value:true});
});
test('official editor exposes every web setting and isolates the two app-only Mobile controls',()=>{
 const tv=settingsSections.tv.map(s=>[s.id,s.groups.flatMap(g=>g.keys).length]);
 const mobile=settingsSections.mobile.map(s=>[s.id,s.groups.flatMap(g=>g.keys).length]);
 assert.deepEqual(tv,[['appearance',4],['experience',1],['layout',49],['playback',42],['integrations',50],['advanced',6]]);
 assert.deepEqual(mobile,[['layout',23],['playback',68],['streams',3],['content',6],['integrations',40],['trakt',6],['notifications',1],['app_only',2]]);
 assert.equal(settingsSections.tv.some(section=>section.groups.some(group=>group.keys.includes('theme_settings.selected_theme'))),false);
 assert.equal(settingsSections.mobile.some(section=>section.groups.some(group=>group.keys.includes('theme_settings.selected_theme'))),false);
 const items=officialSettingsItems({version:3,features:{}},'mobile');
 assert.equal(items.official.length,150);assert.equal(items.extra.length,0);assert.equal(items.official.every(x=>x.virtual),true);
 for(const platform of ['tv','mobile']){
  const grouped=new Set(settingsSections[platform].flatMap(section=>section.groups.flatMap(group=>group.keys)));
  const active=new Set(schema[platform].map(item=>item.feature+'.'+item.key));
  assert.deepEqual([...grouped].filter(key=>!active.has(key)),[]);
  assert.deepEqual([...active].filter(key=>!grouped.has(key)),['theme_settings.selected_theme']);
 }
});
test('editing an absent official setting materializes the correct Nuvio wire format',()=>{
 const draft={version:3,features:{}},items=officialSettingsItems(draft,'mobile').official;
 const payload=items.find(x=>x.meta.feature==='trakt_settings_payload'&&x.meta.key==='continueWatchingDaysCap');
 setSettingValue(draft,payload,90);assert.equal(JSON.parse(draft.features.trakt_settings_payload).continueWatchingDaysCap,90);
 const toggle=officialSettingsItems(draft,'mobile').official.find(x=>x.meta.feature==='player_settings'&&x.meta.key==='show_loading_overlay');
 setSettingValue(draft,toggle,false);assert.deepEqual(draft.features.player_settings.show_loading_overlay,{type:'boolean',value:false});
});
test('dependent controls follow the official parent choices',()=>{
 const draft={features:{theme_settings:{amoled_mode:{type:'boolean',value:false}}}},items=officialSettingsItems(draft,'tv').official;
 assert.equal(visibleOfficialSettings('tv',items).some(x=>x.meta.key==='amoled_surfaces_mode'),false);
 const parent=items.find(x=>x.meta.key==='amoled_mode');setSettingValue(draft,parent,true);
 const updated=officialSettingsItems(draft,'tv').official;
 assert.equal(visibleOfficialSettings('tv',updated).some(x=>x.meta.key==='amoled_surfaces_mode'),true);
});
test('API settings stay masked without triggering browser login autofill',()=>{
 const meta=descriptor('mobile','tmdb_settings','tmdb_api_key');
 const html=settingControl({meta,value:'secret',path:['features','tmdb_settings','tmdb_api_key']},'data-field="0"');
 assert.match(html,/type="text"/);assert.match(html,/secret-setting/);assert.match(html,/data-form-type="other"/);assert.doesNotMatch(html,/type="password"/);
});

import {featureValue} from '../public/catalog.js';
test('empty Mobile payloads can be configured while invalid JSON remains protected',()=>{
 for(const value of ['', '  ', 'null', null]) assert.deepEqual(featureValue({features:{block:value}},'block'),{});
 assert.throws(()=>featureValue({features:{block:'invalid'}},'block'),/JSON invalide/);
});
