import {assert} from './core.js';
import {rpc,call} from './nuvio.js';
export const activityKinds={
 library:{table:'library_items',order:'added_at.desc,id.asc',columns:'content_id,content_type,name,poster,release_info,added_at'},
 progress:{table:'watch_progress',order:'last_watched.desc,id.asc',columns:'content_id,content_type,video_id,season,episode,position,duration,last_watched'},
 watched:{table:'watched_items',order:'watched_at.desc,id.asc',columns:'content_id,content_type,title,season,episode,watched_at'},
};
export async function activity(token,profileId,kind,page=1,transport={rpc,call}){
 assert(Number.isInteger(profileId)&&profileId>=1,'Profil invalide');
 assert(Object.hasOwn(activityKinds,kind),'Catégorie invalide');
 assert(Number.isInteger(page)&&page>=1&&page<=10000,'Page invalide');
 const profiles=await transport.rpc('sync_pull_profiles',{},token);
 const identity=profiles.find(x=>x.profile_index===profileId);
 assert(identity?.user_id,'Profil introuvable',404);
 const config=activityKinds[kind],pageSize=100;
 const query=new URLSearchParams({user_id:'eq.'+identity.user_id,profile_id:'eq.'+profileId,select:config.columns,order:config.order,limit:String(pageSize+1),offset:String((page-1)*pageSize)});
 const rows=await transport.call('/rest/v1/'+config.table+'?'+query,null,token,'GET');
 assert(Array.isArray(rows),'Réponse Nuvio invalide',502);
 return {kind,page,pageSize,hasMore:rows.length>pageSize,items:rows.slice(0,pageSize)};
}
