import { schema } from './settings-schema.js';
export { schema };
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const descriptor=(platform,feature,key)=>schema[platform]?.find(x=>x.feature===feature&&x.key===key);
export function settingsLeaves(draft,platform){
 const out=[];
 function walk(value,path,encodedPath){
  if(path.length===1&&path[0]==='version')return;
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   if(Object.hasOwn(value,'type')&&Object.hasOwn(value,'value')){out.push({path:[...path,'value'],value:value.value,type:value.type,label:path.at(-1),meta:descriptor(platform,path[1],path[2]),encodedPath});return;}
   for(const[k,v]of Object.entries(value))walk(v,[...path,k],encodedPath);return;
  }
  if(path.length===2&&path[1].endsWith('_payload')&&typeof value==='string'){
   try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){walk(parsed,path,path);return;}}catch{}
  }
  out.push({path,value,label:path.at(-1),meta:descriptor(platform,path[1],path[2]),encodedPath});
 }
 walk(draft,[]);return out;
}
export function setSettingValue(draft,item,value){
 if(item.encodedPath){const [a,b]=item.encodedPath;const payload=JSON.parse(draft[a][b]);setPath(payload,item.path.slice(2),value);draft[a][b]=JSON.stringify(payload);}
 else setPath(draft,item.path,value);
 for(const extra of item.meta?.onChangeAlso||[]){draft.features??={};draft.features[extra.feature]??={};draft.features[extra.feature][extra.key]={type:extra.type,value:extra.value};}
}
function setPath(obj,path,value){if(path.some(x=>['__proto__','constructor','prototype'].includes(x)))throw Error('Chemin invalide');for(const k of path.slice(0,-1))obj=obj[k];obj[path.at(-1)]=value;}
export function choices(meta,value,context={}){
 let options=(meta?.options||[]).map(x=>({...x}));
 if(meta?.runtimeOptions){options=(context[meta.runtimeOptions]||[]).filter(x=>x.enabled!==false).map(x=>String(x.name||x.addon_name||x.plugin_name||'').trim()).filter(Boolean).map(x=>({value:x,label:x}));}
 const values=meta?.control==='multiselect'?(Array.isArray(value)?value:[]):[value];
 for(const v of values)if(!options.some(x=>Object.is(x.value,v)))options.push({value:v,label:v===''?'Aucune / valeur vide':`Valeur actuelle : ${String(v)}`});
 return options.filter((x,i,a)=>a.findIndex(y=>Object.is(y.value,x.value))===i);
}
export function settingControl(item,attributes,context={}){
 const m=item.meta,v=item.value,label=m?.title||item.label;
 const attrs=`${attributes} aria-label="${esc(label)}"`;
 if(m?.options||m?.runtimeOptions){const options=choices(m,v,context),multi=m.control==='multiselect';return `<select ${attrs} data-kind="choice" ${multi?'multiple size="5"':''}>${options.map((o,i)=>`<option value="${i}" ${(multi?Array.isArray(v)&&v.includes(o.value):Object.is(v,o.value))?'selected':''}>${esc(o.label)}${o.supporterOnly?' · Supporter':''}</option>`).join('')}</select>${multi?'<small class="muted">Plusieurs choix : Ctrl/Cmd + clic. Aucun choix = aucune restriction.</small>':''}`;}
 if(typeof v==='boolean')return `<input ${attrs} type="checkbox" ${v?'checked':''}>`;
 if(Array.isArray(v)||v===null||typeof v==='object')return `<textarea ${attrs} data-kind="json">${esc(JSON.stringify(v,null,2))}</textarea>`;
 if(m?.control==='json'||m?.control==='textarea'||m?.control==='fusion_badge_rules')return `<textarea ${attrs}>${esc(v)}</textarea>`;
 if(typeof v==='number'){
  const bounds=m?`${m.min!==undefined?`min="${m.min}"`:''} ${m.max!==undefined?`max="${m.max}"`:''} step="${m.step??(['int','long'].includes(m.type)?1:'any')}"`:'step="any"';
  if(m?.control==='slider'&&v>=m.min&&v<=m.max)return `<div class="range-control"><input ${attrs} type="range" ${bounds} value="${v}"><output>${esc(v)} ${esc(m.unit||'')}</output></div>`;
  return `<input ${attrs} type="number" ${bounds} value="${v}">`;
 }
 return `<input ${attrs} type="${m?.control==='secret'||/key|token|secret|password/i.test(item.path?.join('.')||item.label)?'password':'text'}" value="${esc(v)}">`;
}
export function readSettingControl(el,item,context={}){
 let v;
 if(el.dataset.kind==='choice'){const options=choices(item.meta,item.value,context);const read=o=>{const choice=options[Number(o.value)];if(!choice)throw Error('Choix invalide');return choice.value;};v=el.multiple?Array.from(el.selectedOptions,read):read(el);}
 else if(el.type==='checkbox')v=el.checked;
 else if(el.type==='number'||el.type==='range'){if(el.value.trim()==='')throw Error('Nombre requis');v=Number(el.value);if(!Number.isFinite(v))throw Error('Nombre invalide');if(['int','long'].includes(item.meta?.type||item.type)&&!Number.isInteger(v))throw Error('Nombre entier attendu');if(!el.checkValidity())throw Error('La valeur dépasse les limites autorisées.');}
 else if(el.dataset.kind==='json')v=JSON.parse(el.value);
 else {v=el.value;if(item.meta?.control==='json')JSON.parse(v);}
 return v;
}
