import {schema,settingControl,readSettingControl} from './settings-controls.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function featureValue(draft,feature){const v=draft.features?.[feature];if(typeof v==='string'){if(!v.trim())return {};try{const parsed=JSON.parse(v);if(parsed===null)return {};if(typeof parsed!=='object'||Array.isArray(parsed))throw Error('Objet attendu');return parsed;}catch{throw Error('Le bloc '+feature+' contient un JSON invalide. Corrige-le dans l’éditeur avancé.');}}return v||{};}
export async function addSetting({platform,draft,openDialog,onApply,context={}}){
 const entries=schema[platform].filter(x=>!Object.hasOwn(featureValue(draft,x.feature),x.key));
 openDialog(`<h2>Ajouter un réglage</h2><p class="muted">Choix issus du site officiel Nuvio. Le réglage sera ajouté au brouillon.</p><form id="catalog-form" class="form"><label>Rechercher un réglage<input id="catalog-filter" type="search" placeholder="Langue, thème, sous-titres…"></label><label>Réglage<select id="catalog-select" required></select></label><div id="catalog-value"></div><div class="dialog-actions"><button type="button" data-close>Annuler</button><button class="primary">Ajouter au brouillon</button></div></form>`);
 const $=s=>document.querySelector(s);let item;
 function renderValue(){const x=entries[Number($('#catalog-select').value)];if(!x){$('#catalog-value').innerHTML='<p>Aucun réglage correspondant.</p>';item=null;return;}
  item={meta:x,type:x.type,label:x.title,path:['features',x.feature,x.key],value:x.defaultValue??(x.type==='boolean'?false:x.type==='string_set'?[]:x.type==='string'?'':0)};
  $('#catalog-value').innerHTML=`<label>${esc(x.title)}${settingControl(item,'id="catalog-input"',context)}</label><p class="muted">${esc(x.description)}</p><small class="key">${esc(x.feature+' / '+x.key)}</small>`;
  $('#catalog-input').oninput=()=>{const el=$('#catalog-input');el.setCustomValidity('');if(el.type==='range')el.nextElementSibling.textContent=el.value+' '+(x.unit||'');};
 }
 function options(){const q=$('#catalog-filter').value.toLocaleLowerCase('fr');$('#catalog-select').innerHTML=entries.map((x,i)=>({x,i})).filter(({x})=>(x.title+' '+x.feature+' '+x.key).toLocaleLowerCase('fr').includes(q)).map(({x,i})=>`<option value="${i}">${esc(x.title)} · ${esc(x.feature)}</option>`).join('');renderValue();}
 options();$('#catalog-filter').oninput=options;$('#catalog-select').onchange=renderValue;
 $('#catalog-form').onsubmit=e=>{e.preventDefault();if(!item)return;try{const x=item.meta,value=readSettingControl($('#catalog-input'),item,context);draft.version??=1;draft.features??={};
  if(x.feature.endsWith('_payload')){const existing=draft.features[x.feature],payload=featureValue(draft,x.feature);payload[x.key]=x.control==='json'?JSON.parse(value):value;draft.features[x.feature]=typeof existing==='object'&&existing!==null?payload:JSON.stringify(payload);}
  else if(x.feature === "notifications_settings") {draft.features[x.feature]??={};draft.features[x.feature][x.key]=value;}
  else {draft.features[x.feature]??={};draft.features[x.feature][x.key]={type:x.type,value};}
  for(const extra of x.onChangeAlso||[]){draft.features[extra.feature]??={};draft.features[extra.feature][extra.key]={type:extra.type,value:extra.value};}
  $('#dialog').close();onApply();
 }catch(err){$('#catalog-input').setCustomValidity(err.message);$('#catalog-input').reportValidity();}};
}
