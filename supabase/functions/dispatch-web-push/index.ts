import { createClient } from 'npm:@supabase/supabase-js@2.84.0';
import webpush from 'npm:web-push@3.6.7';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }});
const allowedOrigin = 'https://ismaeldavidgutierrezperez53-creator.github.io';
const headers = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version, x-region',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};
const reply = (obj: unknown, status=200) => new Response(JSON.stringify(obj), {status,headers});
function trustedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && (!u.port || u.port === '443') &&
      (['fcm.googleapis.com','fcm-xm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com'].includes(host) ||
       host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com'));
  } catch { return false; }
}
type Config = {public_key: string, private_key: string, hook_secret: string};
async function getConfig(): Promise<Config> {
  const result = await admin.rpc('sb_webpush_server_config');
  if (result.error) throw result.error;
  let c = result.data as Config | null;
  if (!c?.public_key || !c.private_key) {
    const generated = webpush.generateVAPIDKeys();
    const initialize = await admin.rpc('sb_webpush_initialize_vapid', {
      p_public_key: generated.publicKey,
      p_private_key: generated.privateKey
    });
    if (initialize.error) throw initialize.error;
    const retry = await admin.rpc('sb_webpush_server_config');
    if (retry.error || !retry.data) throw retry.error || new Error('VAPID configuration unavailable');
    c = retry.data as Config;
  }
  if (!c || !c.hook_secret || !c.private_key) throw new Error('Missing server push configuration');
  return c;
}
type Notice = {title:string, body:string, path:string, tag:string};
function isQuiet(preference: Record<string,unknown>|null): boolean {
  if (!preference) return false;
  if (preference.dnd_enabled === true) return true;
  if (typeof preference.dnd_until === 'string' && Date.parse(preference.dnd_until) > Date.now()) return true;
  if (preference.dnd_schedule_enabled !== true) return false;
  try {
    const timezone = String(preference.dnd_timezone || 'Europe/Madrid');
    const clock = new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
    const toMin = (val:string) => {const [h,m]=val.slice(0,5).split(':').map(Number);return h*60+m;};
    const current=toMin(clock), start=toMin(String(preference.dnd_start||'22:00')), end=toMin(String(preference.dnd_end||'08:00'));
    return start===end ? false : start<end ? current>=start && current<end : current>=start || current<end;
  } catch { return false; }
}
async function notifyUser(userId:string, notice:Notice, partnerId?:string, onlyEndpoint?:string): Promise<number> {
  const preferences=await admin.from('member_notification_preferences')
    .select('dnd_enabled,dnd_until,dnd_schedule_enabled,dnd_start,dnd_end,dnd_timezone')
    .eq('user_id',userId).maybeSingle();
  if (isQuiet(preferences.data)) return 0;
  if (partnerId) {
    const privatePrefs=await admin.from('member_private_chat_notifications')
      .select('muted,popup_enabled').eq('user_id',userId).eq('partner_id',partnerId).maybeSingle();
    if (privatePrefs.data?.muted === true || privatePrefs.data?.popup_enabled === false) return 0;
  }
  const query=admin.from('member_web_push_subscriptions')
    .select('endpoint,p256dh,auth').eq('user_id',userId).limit(25);
  // Para "Enviar prueba", limitar al dispositivo solicitado y perteneciente al usuario.
  const {data:subscriptions,error}=await (onlyEndpoint ? query.eq('endpoint',onlyEndpoint) : query);
  if (error) throw error;
  let sent=0;
  for (const subscription of subscriptions || []) {
    if (!trustedPushEndpoint(subscription.endpoint)) continue;
    try {
      await webpush.sendNotification({
        endpoint:subscription.endpoint,
        keys:{p256dh:subscription.p256dh,auth:subscription.auth}
      }, JSON.stringify({ ...notice, icon:'anime-favicon.png' }), {TTL:3600,urgency:'normal'});
      sent++;
    } catch (e) {
      const status=(e as {statusCode?:number})?.statusCode;
      if (status === 404 || status === 410) {
        await admin.from('member_web_push_subscriptions').delete().eq('endpoint',subscription.endpoint).eq('user_id',userId);
      } else console.error('Web push delivery failed:',status || 'unknown status');
    }
  }
  return sent;
}
async function dispatch(type:string,id:string,extra:Record<string,unknown>={}):Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return 0;
  if (type==='member_notifications') {
    const {data:n,error}=await admin.from('member_notifications')
      .select('id,recipient_id,kind,actor_id,game_id,news_id,news_comment_id,post_id,poll_id,tournament_id,trophy_month,season_month,museum_month').eq('id',id).maybeSingle();
    if (error || !n) return 0;
    const kinds:Record<string,[string,string,string]> = {
      follow:['👤 Nuevo seguidor','Una persona ha comenzado a seguirte.','#/notificaciones'],
      like:['❤️ Nuevo me gusta','A alguien le ha gustado tu publicación.','#/comunidad'],
      comment:['💬 Nuevo comentario','Has recibido un comentario en tu publicación.','#/comunidad'],
      gift:['🎁 Has recibido un regalo','Tienes un regalo nuevo en tu buzón.','#/regalos'],
      poll:['🗳️ Nueva encuesta','Ya puedes participar en una encuesta.','#/encuestas'],
      poll_reminder:['🗳️ Encuesta pendiente','Tienes una encuesta por responder.','#/encuestas'],
      profile_view:['👀 Visita a tu perfil','Alguien ha visto tu perfil.','#/cuenta'],
      news_reply:['📰 Respuesta a tu comentario','Hay una nueva respuesta en noticias.','#/noticias'],
      mention:['🏷️ Te han mencionado','Alguien te mencionó en Shadows Byte Gaming.','#/notificaciones'],
      game_like:['🎮 Me gusta en tu biblioteca','A alguien le gustó uno de tus videojuegos.','#/cuenta'],
      game_comment:['💬 Comentario en tu videojuego','Tienes un comentario en tu biblioteca de videojuegos.','#/cuenta'],
      game_reply:['↩️ Respuesta en tu biblioteca','Respondieron a tu comentario sobre un videojuego.','#/cuenta'],
      poll_season_prize:['🏆 Premio de encuestas','Has ganado un premio de temporada de encuestas.','#/encuestas'],
      poll_trophy_like:['❤️ Me gusta en tu trofeo','A alguien le gustó tu trofeo de temporada.','#/cuenta'],
      poll_museum_prize:['🏛️ Premio del museo','Has ganado un premio mensual del Museo de trofeos.','#/encuestas'],
      tournament_full:['🎟️ Torneo completo','El torneo ya tiene todas sus plazas ocupadas.','#/tienda'],
      tournament_match:['⚔️ Nuevo enfrentamiento','Tienes un nuevo enfrentamiento en un torneo.','#/tienda'],
      tournament_finished:['🏆 Torneo finalizado','Consulta los resultados y tus premios.','#/tienda']
    };
    let info=kinds[n.kind] || ['🔔 Nueva notificación','Tienes novedades en Shadows Byte Gaming.','#/notificaciones'];
    if (['game_like','game_comment','game_reply'].includes(n.kind) && n.game_id) info[2]='#/perfil?id='+encodeURIComponent(n.recipient_id)+'&game='+encodeURIComponent(n.game_id);
    if (n.kind==='news_reply' && n.news_id) info[2]='#/noticia?id='+encodeURIComponent(n.news_id);
    if (n.kind==='mention' && n.news_id) {
      info=['🏷️ Mención en Noticias','Te han mencionado en una noticia.','#/noticia?id='+encodeURIComponent(n.news_id)+(n.news_comment_id?'&comment='+encodeURIComponent(n.news_comment_id):'')];
    } else if (n.kind==='mention' && n.post_id) {
      info=['🏷️ Mención en Comunidad','Te han mencionado en una publicación.','#/comunidad?post='+encodeURIComponent(n.post_id)];
    }
    if ((n.kind==='poll'||n.kind==='poll_reminder') && n.poll_id) info[2]='#/encuestas?poll='+encodeURIComponent(n.poll_id);
    if (['tournament_full','tournament_match','tournament_finished'].includes(n.kind) && n.tournament_id) info[2]='#/tienda?tournament='+encodeURIComponent(n.tournament_id);
    if (n.kind==='poll_season_prize' && n.season_month) info[2]='#/encuestas?temporada='+encodeURIComponent(n.season_month);
    if (n.kind==='poll_museum_prize' && n.museum_month) info[2]='#/encuestas?museo='+encodeURIComponent(n.museum_month);
    if (n.kind==='poll_trophy_like' && n.trophy_month) info[2]='#/cuenta?trofeo='+encodeURIComponent(n.trophy_month);
    // El aviso externo de Seguidores identifica al miembro y abre directamente su perfil.
    if (n.kind==='follow' && /^[0-9a-f-]{36}$/i.test(n.actor_id || '')) {
      const {data:actor}=await admin.from('profiles').select('display_name,username')
        .eq('id',n.actor_id).eq('is_public',true).maybeSingle();
      const actorName=String(actor?.display_name || actor?.username || 'Un miembro').trim().slice(0,60);
      info=['👥 Nuevo seguidor',actorName+' empezó a seguirte.','#/perfil?id='+encodeURIComponent(n.actor_id)];
    }
    return await notifyUser(n.recipient_id,{title:info[0],body:info[1],path:info[2],tag:'notice-'+n.id});
  }
  if(type==='news'){
    const {data:article,error}=await admin.from('news')
      .select('id,title,status,published_at').eq('id',id).maybeSingle();
    if(error || !article || article.status!=='published' || !article.published_at || Date.parse(article.published_at)>Date.now())return 0;
    // Sólo reciben avisos quienes han activado push en al menos un dispositivo.
    // Cada cuenta se envía una vez, aunque tenga varios dispositivos.
    const subscribers=new Set<string>();
    for(let offset=0;;offset+=500){
      const {data:devices,error:devicesError}=await admin.from('member_web_push_subscriptions')
        .select('user_id').order('user_id').range(offset,offset+499);
      if(devicesError)throw devicesError;
      for(const device of devices||[])subscribers.add(device.user_id);
      if((devices||[]).length<500)break;
    }
    const notice={
      title:'📰 Nueva noticia publicada',
      body:'Ya puedes leer: '+String(article.title||'Nueva noticia').trim().slice(0,105),
      path:'#/noticia?id='+encodeURIComponent(article.id),tag:'news-'+article.id
    };
    let delivered=0;
    for(const userId of subscribers)delivered+=await notifyUser(userId,notice);
    return delivered;
  }
  if (type==='member_appeal_notifications') {
    const {data:notice,error}=await admin.from('member_appeal_notifications')
      .select('id,recipient_id,kind,appeal_id').eq('id',id).maybeSingle();
    if(error || !notice)return 0;
    const info=notice.kind==='submitted'
      ? {title:'⚖️ Nueva apelación pendiente',body:'Un miembro ha solicitado revisar una sanción.',path:'#/admin?focus=appeals'}
      : notice.kind==='accepted'
      ? {title:'✅ Apelación aceptada',body:'El equipo ha aceptado tu apelación. Consulta la resolución.',path:'#/apelaciones'}
      : {title:'⚖️ Apelación revisada',body:'Se ha rechazado tu apelación. Consulta los detalles.',path:'#/apelaciones'};
    return notifyUser(notice.recipient_id,{...info,tag:'appeal-'+notice.id});
  }
  if (type==='member_report_notifications') {
    const {data:n}=await admin.from(type).select('recipient_id,status').eq('id',id).maybeSingle();
    if(!n)return 0;
    return notifyUser(n.recipient_id,{
      title:'🛡️ Actualización de denuncia',
      body:n.status==='reviewed'?'Tu denuncia ha sido revisada.':'Se ha actualizado el estado de tu denuncia.',
      path:'#/cuenta',tag:'report-'+id
    });
  }
  if (type==='member_private_calls' || type==='member_group_calls') {
    const {data:call}=await admin.from(type).select('callee_id,caller_id,kind,status')
      .eq('id',id).maybeSingle();
    if(!call || call.status!=='ringing' || call.callee_id===call.caller_id)return 0;
    return notifyUser(call.callee_id,{
      title:call.kind==='video'?'📹 Videollamada entrante':'📞 Llamada entrante',
      body:type==='member_group_calls'?'Te están llamando desde un grupo.':'Otro miembro te está llamando.',
      path:'#/mensajes',tag:'call-'+id
    });
  }
  if(type==='member_group_video_invites'){
    const {data:invite}=await admin.from(type).select('invitee_id,inviter_id,response,room_id')
      .eq('id',id).maybeSingle();
    if(!invite || invite.response!=='pending' || invite.invitee_id===invite.inviter_id)return 0;
    return notifyUser(invite.invitee_id,{
      title:'📹 Invitación a videollamada',
      body:'Te han invitado a una videollamada de grupo.',
      path:'#/mensajes',tag:'video-invite-'+id
    });
  }
  // Premios y hitos sin ID UUID propio: se verifican con sus claves compuestas
  // antes de enviar el aviso al usuario. Los campos admitidos son una lista fija.
  const awards:Record<string,{keys:string[],title:string,body:string,path:string}> = {
    member_gamer_badge_notifications:{
      keys:['badge_key'],title:'🏅 Nueva insignia gamer',
      body:'Has desbloqueado una insignia en tu perfil.',path:'#/cuenta'
    },
    member_point_goal_notifications:{
      keys:['goal_id','milestone'],title:'🎯 Avance en tu meta',
      body:'Has alcanzado un nuevo hito de puntos.',path:'#/cuenta'
    },
    member_milestone_awards:{
      keys:['level'],title:'🌟 Nuevo logro de nivel',
      body:'Has ganado un premio al alcanzar un nuevo nivel.',path:'#/cuenta'
    },
    member_poll_milestone_awards:{
      keys:['milestone'],title:'📊 Premio de encuestas',
      body:'Has logrado un nuevo hito de participación.',path:'#/encuestas'
    },
    community_competition_awards:{
      keys:['competition_id'],title:'🏆 Premio de competición',
      body:'Has recibido un premio de una competición.',path:'#/comunidad'
    },
    mystery_box_monthly_awards:{
      keys:['month_start'],title:'🎁 Premio de cajas misteriosas',
      body:'Has recibido tu premio mensual por cajas misteriosas.',path:'#/tienda'
    },
    shop_season_podium_awards:{
      keys:['event_id','place'],title:'🏆 Premio de temporada',
      body:'Has ganado un premio del ranking de temporada.',path:'#/tienda'
    }
  };
  const award=awards[type];
  if(award){
    let query=admin.from(type).select('user_id').eq('user_id',id);
    for(const key of award.keys){
      const value=extra[key];
      if((typeof value!=='string' && typeof value!=='number') || String(value).length>128 || String(value).length===0)return 0;
      query=query.eq(key,value);
    }
    const {data:row,error}=await query.maybeSingle();
    if(error || !row)return 0;
    return notifyUser(row.user_id,{
      title:award.title,body:award.body,path:award.path,
      tag:'award-'+type+'-'+id+'-'+award.keys.map(key=>String(extra[key])).join('-').slice(0,90)
    });
  }
  if (type==='member_direct_messages') {
    const {data:m,error}=await admin.from('member_direct_messages')
      .select('id,sender_id,recipient_id,deleted_at').eq('id',id).maybeSingle();
    if(error || !m || m.deleted_at || m.sender_id===m.recipient_id)return 0;
    return await notifyUser(m.recipient_id,{
      title:'💬 Mensaje privado nuevo',body:'Has recibido un mensaje en Shadows Byte Gaming.',
      path:'#/mensajes',tag:'dm-'+m.id
    },m.sender_id);
  }
  if (type==='member_chat_group_messages') {
    const {data:m,error}=await admin.from('member_chat_group_messages')
      .select('id,group_id,sender_id,deleted_at').eq('id',id).maybeSingle();
    if(error || !m || m.deleted_at)return 0;
    const {data:members}=await admin.from('member_chat_group_members').select('user_id')
      .eq('group_id',m.group_id).neq('user_id',m.sender_id).limit(150);
    let count=0;
    for (const member of members||[]) {
      count+=await notifyUser(member.user_id,{
        title:'👥 Mensaje de grupo nuevo',body:'Tienes un mensaje nuevo en un grupo.',
        path:'#/mensajes',tag:'group-'+m.id
      });
    }
    return count;
  }
  return 0;
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!serviceKey || !url)return reply({error:'Server not configured'},503);
  try{
    if(req.method==='GET'){
      const config=await getConfig();
      return reply({publicKey:config.public_key});
    }
    if(req.method!=='POST')return reply({error:'Method not allowed'},405);
    const body=await req.json().catch(()=>({}));
    const config=await getConfig();
    webpush.setVapidDetails(allowedOrigin,config.public_key,config.private_key);
    if(req.headers.get('x-sb-push-secret') === config.hook_secret) {
      if(!['member_notifications','member_direct_messages','member_chat_group_messages','news','member_report_notifications','member_appeal_notifications','member_private_calls','member_group_calls','member_group_video_invites','member_gamer_badge_notifications','member_point_goal_notifications','member_milestone_awards','member_poll_milestone_awards','community_competition_awards','mystery_box_monthly_awards','shop_season_podium_awards'].includes(body.type))
        return reply({error:'Unknown event'},400);
      const delivered=await dispatch(body.type,String(body.id||''),body.meta && typeof body.meta==='object' && !Array.isArray(body.meta)?body.meta:{});
      return reply({ok:true,delivered});
    }
    if(body.type==='test'){
      const auth=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
      const {data:{user},error}=await admin.auth.getUser(auth);
      if(error || !user)return reply({error:'Unauthorized'},401);
      const endpoint=typeof body.endpoint==='string'&&trustedPushEndpoint(body.endpoint)?body.endpoint:null;
      if(!endpoint)return reply({error:'Invalid push endpoint'},400);
      const delivered=await notifyUser(user.id,{
        title:'🎮 Notificaciones activadas',body:'¡Ya puedes recibir avisos fuera de Shadows Byte Gaming!',
        path:'#/notificaciones',tag:'push-test-'+Math.floor(Date.now()/60000)
      },undefined,endpoint);
      return reply({ok:true,delivered});
    }
    if(body.type==='test_delayed'){
      const auth=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
      const {data:{user},error}=await admin.auth.getUser(auth);
      if(error || !user)return reply({error:'Unauthorized'},401);
      const endpoint=typeof body.endpoint==='string'&&trustedPushEndpoint(body.endpoint)?body.endpoint:null;
      if(!endpoint)return reply({error:'Invalid push endpoint'},400);
      // Los avisos de prueba solo se pueden dirigir a un dispositivo propio.
      const {data:registered,error:deviceError}=await admin.from('member_web_push_subscriptions')
        .select('endpoint').eq('user_id',user.id).eq('endpoint',endpoint).maybeSingle();
      if(deviceError || !registered)return reply({error:'Device not registered for this user'},403);
      const delayMs=20000;
      EdgeRuntime.waitUntil((async()=>{
        await new Promise<void>(resolve=>setTimeout(resolve,delayMs));
        try {
          const delivered=await notifyUser(user.id,{
            title:'📱 Prueba con la app cerrada',
            body:'¡Funciona! Shadows Byte te puede avisar aunque la aplicación no esté abierta.',
            path:'#/notificaciones',
            tag:'push-test-closed-'+crypto.randomUUID()
          },undefined,endpoint);
          console.log('Prueba push diferida:', delivered>0?'enviada':'omitida (No molestar o sin dispositivo)');
        }catch(err){
          console.error('Error en prueba push diferida:',err instanceof Error?err.message:'desconocido');
        }
      })());
      return reply({ok:true,scheduled:true,delay_seconds:delayMs/1000});
    }
    return reply({error:'Unauthorized'},401);
  }catch(e){
    console.error('Web push error',e instanceof Error?e.message:'unknown');
    return reply({error:'Could not process web push request'},500);
  }
});
