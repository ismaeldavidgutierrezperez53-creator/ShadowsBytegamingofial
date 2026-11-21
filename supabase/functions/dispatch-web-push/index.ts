import { createClient } from 'npm:@supabase/supabase-js@2.84.0';
import webpush from 'npm:web-push@3.6.7';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }});
const allowedOrigin = 'https://ismaeldavidgutierrezperez53-creator.github.io';
const headers = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
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
async function notifyUser(userId:string, notice:Notice, partnerId?:string): Promise<number> {
  const preferences=await admin.from('member_notification_preferences')
    .select('dnd_enabled,dnd_until,dnd_schedule_enabled,dnd_start,dnd_end,dnd_timezone')
    .eq('user_id',userId).maybeSingle();
  if (isQuiet(preferences.data)) return 0;
  if (partnerId) {
    const privatePrefs=await admin.from('member_private_chat_notifications')
      .select('muted,popup_enabled').eq('user_id',userId).eq('partner_id',partnerId).maybeSingle();
    if (privatePrefs.data?.muted === true || privatePrefs.data?.popup_enabled === false) return 0;
  }
  const {data:subscriptions,error}=await admin.from('member_web_push_subscriptions')
    .select('endpoint,p256dh,auth').eq('user_id',userId).limit(25);
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
async function dispatch(type:string,id:string):Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return 0;
  if (type==='member_notifications') {
    const {data:n,error}=await admin.from('member_notifications')
      .select('id,recipient_id,kind,actor_id').eq('id',id).maybeSingle();
    if (error || !n) return 0;
    const kinds:Record<string,[string,string,string]> = {
      follow:['👤 Nuevo seguidor','Una persona ha comenzado a seguirte.','#/notificaciones'],
      like:['❤️ Nuevo me gusta','A alguien le ha gustado tu publicación.','#/comunidad'],
      comment:['💬 Nuevo comentario','Has recibido un comentario en tu publicación.','#/comunidad'],
      gift:['🎁 Has recibido un regalo','Tienes un regalo nuevo en tu buzón.','#/regalos'],
      poll:['🗳️ Nueva encuesta','Ya puedes participar en una encuesta.','#/encuestas'],
      poll_reminder:['🗳️ Encuesta pendiente','Tienes una encuesta por responder.','#/encuestas'],
      profile_view:['👀 Visita a tu perfil','Alguien ha visto tu perfil.','#/cuenta'],
      news_reply:['📰 Respuesta a tu comentario','Hay una nueva respuesta en noticias.','#/noticias']
    };
    let info=kinds[n.kind] || ['🔔 Nueva notificación','Tienes novedades en Shadows Byte Gaming.','#/notificaciones'];
    // El aviso externo de Seguidores identifica al miembro y abre directamente su perfil.
    if (n.kind==='follow' && /^[0-9a-f-]{36}$/i.test(n.actor_id || '')) {
      const {data:actor}=await admin.from('profiles').select('display_name,username')
        .eq('id',n.actor_id).eq('is_public',true).maybeSingle();
      const actorName=String(actor?.display_name || actor?.username || 'Un miembro').trim().slice(0,60);
      info=['👥 Nuevo seguidor',actorName+' empezó a seguirte.','#/perfil?id='+encodeURIComponent(n.actor_id)];
    }
    return await notifyUser(n.recipient_id,{title:info[0],body:info[1],path:info[2],tag:'notice-'+n.id});
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
      if(!['member_notifications','member_direct_messages','member_chat_group_messages'].includes(body.type))
        return reply({error:'Unknown event'},400);
      const delivered=await dispatch(body.type,String(body.id||''));
      return reply({ok:true,delivered});
    }
    if(body.type==='test'){
      const auth=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
      const {data:{user},error}=await admin.auth.getUser(auth);
      if(error || !user)return reply({error:'Unauthorized'},401);
      const delivered=await notifyUser(user.id,{
        title:'🎮 Notificaciones activadas',body:'¡Ya puedes recibir avisos fuera de Shadows Byte Gaming!',
        path:'#/notificaciones',tag:'push-test-'+Math.floor(Date.now()/60000)
      });
      return reply({ok:true,delivered});
    }
    return reply({error:'Unauthorized'},401);
  }catch(e){
    console.error('Web push error',e instanceof Error?e.message:'unknown');
    return reply({error:'Could not process web push request'},500);
  }
});
