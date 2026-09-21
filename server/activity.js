import {assert} from './core.js';
import {rpc,call} from './nuvio.js';
export const activityKinds={
 library:{table:'library_items',order:'added_at.desc,id.asc',columns:'content_id,content_type,name,poster,release_info,added_at',rpc:'sync_get_all_library',date:'added_at'},
 progress:{table:'watch_progress',order:'last_watched.desc,id.asc',columns:'content_id,content_type,video_id,season,episode,position,duration,last_watched',rpc:'sync_get_all_watch_progress',date:'last_watched'},
 watched:{table:'watched_items',order:'watched_at.desc,id.asc',columns:'content_id,content_type,title,season,episode,watched_at',rpc:'sync_get_all_watched_items',date:'watched_at'},
};
export async function activity(token,profileId,kind,page=1,providerId='nuvio',transport={rpc,call}){
 assert(Number.isInteger(profileId)&&profileId>=1,'Profil invalide');
 assert(Object.hasOwn(activityKinds,kind),'Catégorie invalide');
 assert(Number.isInteger(page)&&page>=1&&page<=10000,'Page invalide');
 const profiles=await transport.rpc('sync_pull_profiles',{},token,providerId);
 const identity=profiles.find(x=>x.profile_index===profileId);
 assert(identity?.user_id,'Profil introuvable',404);
 const config=activityKinds[kind],pageSize=100,offset=(page-1)*pageSize;
 let rows;
 if(providerId==='tuvora'){
  // Tuvora restricts direct REST SELECT on these tables (RLS); its own app
  // reads them through the sync_get_all_* RPCs, which return every row.
  const all=await transport.rpc(config.rpc,{p_profile_id:profileId},token,providerId);
  assert(Array.isArray(all),'Réponse Tuvora invalide',502);
  const sorted=[...all].sort((a,b)=>(Date.parse(b?.[config.date])||0)-(Date.parse(a?.[config.date])||0)||String(a?.id??'').localeCompare(String(b?.id??'')));
  rows=sorted.slice(offset,offset+pageSize+1);
 }else{
  const query=new URLSearchParams({user_id:'eq.'+identity.user_id,profile_id:'eq.'+profileId,select:config.columns,order:config.order,limit:String(pageSize+1),offset:String(offset)});
  rows=await transport.call('/rest/v1/'+config.table+'?'+query,null,token,'GET',providerId);
  assert(Array.isArray(rows),'Réponse Nuvio invalide',502);
 }
 return {kind,page,pageSize,hasMore:rows.length>pageSize,items:rows.slice(0,pageSize)};
}
