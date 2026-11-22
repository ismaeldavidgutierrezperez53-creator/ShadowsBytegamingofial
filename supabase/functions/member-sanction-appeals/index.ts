import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import nodemailer from "npm:nodemailer@6.9.16";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: cors });
const idPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Body = {action?: string; email?: string; code?: string; reason?: string; sanction_event_id?: number; appeal_id?: string; decision?: string; note?: string; message?: string; access_token?: string; before?: string; search?: string; status?: string; date_from?: string; date_to?: string; assigned_filter?: string; page?: number; assigned_to?: string | null};
const usable = (event: any) =>
  event && ["warning","suspend","ban"].includes(event.action) &&
  (event.action === "ban" || Date.now() - Date.parse(event.created_at) < 90 * 86400000);
const safeSubject = "Shadows Byte Gaming Official";
const frontUrl = "https://ismaeldavidgutierrezperez53-creator.github.io/ShadowsBytegamingofial/#/apelaciones";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors});
  if (req.method !== "POST") return reply({error:"Método no permitido"},405);
  const url=Deno.env.get("SUPABASE_URL");
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url || !secret) return reply({error:"Servidor no configurado"},500);
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const mailUser=Deno.env.get("GMAIL_USER");
  const mailPass=Deno.env.get("GMAIL_APP_PASSWORD");
  const sendEmail=async(to:string,subject:string,body:string)=>{
    if(!mailUser||!mailPass) throw new Error("No hay correo SMTP configurado");
    const transport=nodemailer.createTransport({
      host:"smtp.gmail.com",port:465,secure:true,auth:{user:mailUser,pass:mailPass},
      connectionTimeout:8000,greetingTimeout:8000,socketTimeout:8000
    });
    try{
      await transport.sendMail({from:{name:safeSubject,address:mailUser},to,subject,text:body});
    }finally{transport.close();}
  };
  const hashCode=async(id:string,code:string)=>{
    const data=new TextEncoder().encode(id+"|"+code+"|"+secret);
    const digest=await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
  };
  const locateEmail=async(email:string)=>{
    // La API de administración es privada: nunca se devuelve la existencia de una cuenta.
    for(let page=1;page<=10;page++){
      const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
      if(error){console.error("Could not list accounts",error.message);return null;}
      const result=(data?.users||[]).find(u=>u.email?.toLowerCase()===email);
      if(result) return result;
      if((data?.users||[]).length<1000) break;
    }
    return null;
  };
  const bearer=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]||"";
  const current=async()=>{
    if(!bearer) return null;
    const {data,error}=await db.auth.getUser(bearer);
    return error ? null : data.user;
  };
  const memberEvent=async(memberId:string,eventId:number)=>{
    const {data,error}=await db.from("member_moderation_events")
      .select("id,target_id,actor_id,action,reason,created_at,expires_at")
      .eq("target_id",memberId).eq("id",eventId).maybeSingle();
    return error ? null : data;
  };
  const submit=async(memberId:string,eventId:number,reason:string)=>{
    const event=await memberEvent(memberId,eventId);
    if(!usable(event))return reply({error:"La sanción ya no admite apelaciones"},409);
    const {data,error}=await db.from("member_sanction_appeals").insert({
      member_id:memberId,sanction_event_id:eventId,reason
    }).select("id").single();
    if(error?.code==="23505")return reply({error:"Ya existe una apelación para esta sanción"},409);
    if(error||!data){console.error("Appeal create failed",error?.message);return reply({error:"No se pudo registrar la apelación"},500);}
    return reply({ok:true,appeal_id:data.id});
  };
  let body:Body;
  try{
    if(Number(req.headers.get("content-length")||0)>7000)return reply({error:"Solicitud demasiado grande"},413);
    body=await req.json();
    if(!body || typeof body!=="object") throw new Error();
  }catch{return reply({error:"Solicitud no válida"},400);}
  const action=String(body.action||"");
  const reason=String(body.reason||"").trim();
  const code=String(body.code||"").trim();
  const eventId=Number(body.sanction_event_id);
  const email=String(body.email||"").trim().toLowerCase();
  if(action==="request_code"){
    if(email.length>254 || !emailPattern.test(email))return reply({error:"Correo electrónico no válido"},400);
    if(!mailUser||!mailPass)return reply({error:"El servicio de correo no está disponible"},503);
    const generic=reply({ok:true,message:"Si existe una sanción apelable, recibirás un código por correo. Revisa también spam."});
    const account=await locateEmail(email);
    if(!account?.email || !account.email_confirmed_at) return generic;
    const {data:status}=await db.from("member_moderation_status").select("action,expires_at")
      .eq("user_id",account.id).maybeSingle();
    const active=status && (status.action==="ban" || Date.parse(status.expires_at||"")>Date.now());
    let eventsQuery=db.from("member_moderation_events")
      .select("id,target_id,actor_id,action,reason,created_at,expires_at")
      .eq("target_id",account.id).in("action",["warning","suspend","ban"])
      .order("created_at",{ascending:false}).limit(25);
    const {data:events,error:eventError}=await eventsQuery;
    if(eventError)return generic;
    const selected=(events||[]).find(e=>usable(e) && (!active || e.action===status.action)) ||
      (events||[]).find(e=>usable(e));
    if(!selected)return generic;
    const {data:existing}=await db.from("member_sanction_appeals").select("id")
      .eq("sanction_event_id",selected.id).maybeSingle();
    if(existing)return generic;
    const {data:recent}=await db.from("member_appeal_email_codes").select("id,created_at")
      .eq("member_id",account.id).gte("created_at",new Date(Date.now()-86400000).toISOString())
      .order("created_at",{ascending:false}).limit(6);
    if((recent||[]).length>=5 || (recent?.[0] && Date.now()-Date.parse(recent[0].created_at)<600000))return generic;
    const challengeId=crypto.randomUUID();
    const otp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");
    const {error}=await db.from("member_appeal_email_codes").insert({
      id:challengeId,member_id:account.id,sanction_event_id:selected.id,
      code_hash:await hashCode(challengeId,otp),
      expires_at:new Date(Date.now()+10*60000).toISOString()
    });
    if(error){console.error("OTP insertion failed",error.message);return generic;}
    try{
      await sendEmail(account.email,"Código para apelar una sanción · Shadows Byte",
        "Hola,\n\nTu código para presentar una apelación es: "+otp+
        "\n\nVálido durante 10 minutos y para una sola solicitud.\nSi tú no lo has solicitado, ignora este mensaje.\n\n"+
        frontUrl+"\n\nEl equipo de Shadows Byte Gaming Official");
    }catch(e){console.error("Appeal code email failed",e instanceof Error?e.message:"unknown");}
    return generic;
  }
  if(action==="submit_code"){
    if(email.length>254 || !emailPattern.test(email) || !/^\d{6}$/.test(code))
      return reply({error:"Correo o código inválido"},400);
    if(reason.length<15 || reason.length>1500)
      return reply({error:"Explica tu apelación en 15–1500 caracteres"},400);
    const account=await locateEmail(email);
    if(!account)return reply({error:"Código inválido o caducado"},400);
    const {data:challenge}=await db.from("member_appeal_email_codes").select("*")
      .eq("member_id",account.id).is("used_at",null)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!challenge || challenge.attempts>=5)return reply({error:"Código inválido o caducado"},400);
    // Contador atómico para evitar intentos ilimitados mediante peticiones paralelas.
    const {data:attempt}=await db.from("member_appeal_email_codes")
      .update({attempts:challenge.attempts+1})
      .eq("id",challenge.id).eq("attempts",challenge.attempts).is("used_at",null)
      .select("id").maybeSingle();
    if(!attempt)return reply({error:"Inténtalo de nuevo"},409);
    const digest=await hashCode(challenge.id,code);
    if(digest!==challenge.code_hash)return reply({error:"Código inválido o caducado"},400);
    const {data:consumed}=await db.from("member_appeal_email_codes")
      .update({used_at:new Date().toISOString()}).eq("id",challenge.id)
      .is("used_at",null).select("id").maybeSingle();
    if(!consumed)return reply({error:"El código ya fue utilizado"},409);
    return submit(account.id,Number(challenge.sanction_event_id),reason);
  }

  // Mensajería de apelaciones: verificación por sesión o token temporal tras código de email.
  if(action==="request_thread_code"){
    if(email.length>254 || !emailPattern.test(email))return reply({error:"Correo electrónico no válido"},400);
    if(!mailUser||!mailPass)return reply({error:"El servicio de correo no está disponible"},503);
    const generic=reply({ok:true,message:"Si tienes una apelación pendiente, recibirás un código de acceso por correo."});
    const account=await locateEmail(email);
    if(!account?.email || !account.email_confirmed_at)return generic;
    const {data:appeal}=await db.from("member_sanction_appeals")
      .select("id,sanction_event_id").eq("member_id",account.id)
      .eq("status","pending").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!appeal)return generic;
    const {data:recent}=await db.from("member_appeal_email_codes").select("id,created_at")
      .eq("member_id",account.id).gte("created_at",new Date(Date.now()-86400000).toISOString())
      .order("created_at",{ascending:false}).limit(6);
    if((recent||[]).length>=5 || recent?.[0]&&Date.now()-Date.parse(recent[0].created_at)<600000)return generic;
    const challengeId=crypto.randomUUID();
    const otp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");
    const {error:insertError}=await db.from("member_appeal_email_codes").insert({
      id:challengeId,member_id:account.id,sanction_event_id:appeal.sanction_event_id,
      code_hash:await hashCode(challengeId,otp),expires_at:new Date(Date.now()+600000).toISOString()
    });
    if(insertError){console.error("thread code store failed",insertError.message);return generic;}
    try{
      await sendEmail(account.email,"Código para consultar tu apelación · Shadows Byte",
        "Hola,\n\nTu código de acceso a la conversación sobre tu apelación es: "+otp+
        "\n\nCaduca en 10 minutos y solo puede utilizarse una vez. No lo compartas.\n\n"+
        frontUrl+"\n\nEquipo de Shadows Byte Gaming Official");
    }catch(e){console.error("Thread email failed",e instanceof Error?e.message:"unknown");}
    return generic;
  }
  if(action==="verify_thread_code"){
    if(email.length>254 || !emailPattern.test(email) || !/^\d{6}$/.test(code))
      return reply({error:"Correo o código inválido"},400);
    const account=await locateEmail(email);
    if(!account)return reply({error:"Código incorrecto o caducado"},400);
    const {data:challenge}=await db.from("member_appeal_email_codes").select("*")
      .eq("member_id",account.id).is("used_at",null)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!challenge || challenge.attempts>=5)return reply({error:"Código incorrecto o caducado"},400);
    const {data:attempt}=await db.from("member_appeal_email_codes")
      .update({attempts:challenge.attempts+1}).eq("id",challenge.id)
      .eq("attempts",challenge.attempts).is("used_at",null).select("id").maybeSingle();
    if(!attempt)return reply({error:"Inténtalo nuevamente"},409);
    if(await hashCode(challenge.id,code)!==challenge.code_hash)
      return reply({error:"Código incorrecto o caducado"},400);
    const {data:consumed}=await db.from("member_appeal_email_codes")
      .update({used_at:new Date().toISOString()}).eq("id",challenge.id)
      .is("used_at",null).select("id").maybeSingle();
    if(!consumed)return reply({error:"Este código ya ha sido utilizado"},409);
    const {data:appeal}=await db.from("member_sanction_appeals").select("id")
      .eq("member_id",account.id).eq("sanction_event_id",challenge.sanction_event_id)
      .eq("status","pending").maybeSingle();
    if(!appeal)return reply({error:"La apelación ya no está pendiente"},409);
    const accessToken=crypto.randomUUID()+"-"+crypto.randomUUID();
    const {error:tokenError}=await db.from("member_appeal_access_tokens").insert({
      member_id:account.id,appeal_id:appeal.id,token_hash:await hashCode("appeal-access",accessToken),
      expires_at:new Date(Date.now()+30*60000).toISOString()
    });
    if(tokenError)return reply({error:"No se pudo abrir la conversación"},500);
    return reply({ok:true,access_token:accessToken,appeal_id:appeal.id,expires_in_minutes:30});
  }
  if(action==="thread" || action==="reply"){
    const appealId=String(body.appeal_id||"");
    if(!idPattern.test(appealId))return reply({error:"Apelación inválida"},400);
    const {data:appeal,error:appealError}=await db.from("member_sanction_appeals")
      .select("id,member_id,reason,status,review_note,reviewer_id,reviewed_at,created_at,sanction_event_id")
      .eq("id",appealId).maybeSingle();
    if(appealError||!appeal)return reply({error:"Apelación no encontrada"},404);
    const viewer=await current();
    let memberId=viewer?.id||"";
    let allowedStaff=false;
    if(viewer && viewer.id!==appeal.member_id){
      const {data:role}=await db.from("site_staff_roles").select("role")
        .eq("user_id",viewer.id).maybeSingle();
      const {data:verified}=await db.auth.admin.getUserById(viewer.id);
      allowedStaff=!!role && ["owner","admin","moderator"].includes(role.role)
        && verified?.user?.app_metadata?.role===(role.role==="moderator"?"moderator":"admin");
    }
    if(memberId!==appeal.member_id && !allowedStaff){
      memberId="";
      const accessToken=String(body.access_token||"");
      if(accessToken.length<60 || accessToken.length>100)return reply({error:"Debes verificar el correo o iniciar sesión"},401);
      const tokenHash=await hashCode("appeal-access",accessToken);
      const {data:session}=await db.from("member_appeal_access_tokens").select("member_id,appeal_id")
        .eq("token_hash",tokenHash).eq("appeal_id",appeal.id)
        .gt("expires_at",new Date().toISOString()).maybeSingle();
      if(!session || session.member_id!==appeal.member_id)
        return reply({error:"Acceso caducado. Solicita otro código por correo"},401);
      memberId=session.member_id;
    }
    const {data:sanction}=await db.from("member_moderation_events")
      .select("action,reason,created_at,expires_at")
      .eq("id",appeal.sanction_event_id).maybeSingle();
    if(action==="thread"){
      const cursor=String(body.before||"");
      let query=db.from("member_appeal_messages")
        .select("id,sender_id,sender_role,body,created_at")
        .eq("appeal_id",appeal.id)
        .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(101);
      if(cursor && !Number.isNaN(Date.parse(cursor)))query=query.lt("created_at",cursor);
      const {data:messages,error:messageError}=await query;
      if(messageError)return reply({error:"No se pudo consultar el historial"},500);
      const more=(messages||[]).length>100;
      const batch=(messages||[]).slice(0,100);
      const nextBefore=more?batch[batch.length-1]?.created_at:null;
      return reply({appeal,sanction,messages:batch.reverse(),has_more:more,
        next_before:nextBefore,
        viewer_role:allowedStaff?"staff":"member"});
    }
    if(appeal.status!=="pending")return reply({error:"La apelación ya está cerrada. Puedes consultar su historial"},409);
    const message=String(body.message||"").trim();
    if(message.length<2||message.length>2000)return reply({error:"El mensaje debe tener de 2 a 2000 caracteres"},400);
    const senderId=allowedStaff?viewer!.id:memberId;
    const {count,error:rateError}=await db.from("member_appeal_messages")
      .select("id",{head:true,count:"exact"}).eq("appeal_id",appeal.id)
      .eq("sender_id",senderId).gte("created_at",new Date(Date.now()-3600000).toISOString());
    if(rateError)return reply({error:"No se pudo comprobar el límite de mensajes"},500);
    if((count||0)>=12)return reply({error:"Has alcanzado el máximo de 12 mensajes por hora en esta apelación"},429);
    const {data:sent,error:sendError}=await db.from("member_appeal_messages").insert({
      appeal_id:appeal.id,sender_id:senderId,sender_role:allowedStaff?"staff":"member",body:message
    }).select("id,created_at").single();
    if(sendError || !sent){console.error("Appeal message failed",sendError?.message);return reply({error:"No se pudo enviar el mensaje"},500);}
    let emailed=false;
    if(allowedStaff && mailUser && mailPass){
      const {data:target}=await db.auth.admin.getUserById(appeal.member_id);
      if(target?.user?.email){
        try{
          await sendEmail(target.user.email,"Nuevo mensaje sobre tu apelación · Shadows Byte",
            "Hola,\n\nEl equipo de moderación te ha respondido en la conversación de tu apelación.\n"+
            "Por seguridad, entra en la web para leer el mensaje:\n"+frontUrl+
            "\n\nSi no puedes iniciar sesión, utiliza el acceso por código de correo.");
          emailed=true;
        }catch(e){console.error("Appeal message email failed",e instanceof Error?e.message:"unknown");}
      }
    }
    return reply({ok:true,message_id:sent.id,created_at:sent.created_at,emailed});
  }

  const viewer=await current();
  if(!viewer)return reply({error:"Inicia sesión para continuar o utiliza el formulario de correo"},401);
  if(action==="my_list"){
    const [{data:events,error:eventError},{data:appeals,error:appealError}] = await Promise.all([
      db.from("member_moderation_events").select("id,action,reason,expires_at,created_at")
        .eq("target_id",viewer.id).in("action",["warning","suspend","ban"])
        .order("created_at",{ascending:false}).limit(40),
      db.from("member_sanction_appeals")
        .select("id,sanction_event_id,reason,status,review_note,created_at,reviewed_at")
        .eq("member_id",viewer.id).order("created_at",{ascending:false}).limit(40)
    ]);
    if(eventError||appealError)return reply({error:"No se pudieron cargar tus apelaciones"},500);
    return reply({events:events||[],appeals:appeals||[]});
  }
  if(action==="my_history"){
    // Historial privado y paginado. El miembro se obtiene exclusivamente del JWT verificado.
    const filter=String(body.status||"all");
    const focusAppeal=String(body.appeal_id||"").trim();
    if(!["all","pending","accepted","rejected"].includes(filter) ||
      (focusAppeal && !idPattern.test(focusAppeal)))
      return reply({error:"Filtro de historial inválido"},400);
    const perPage=10;
    const page=Number.isSafeInteger(body.page) && Number(body.page)>=0
      ?Math.min(Number(body.page),9999):0;
    let query=db.from("member_sanction_appeals")
      .select("id,sanction_event_id,reason,status,review_note,created_at,reviewed_at",{count:"exact"})
      .eq("member_id",viewer.id)
      .order("created_at",{ascending:false}).order("id",{ascending:false});
    if(focusAppeal)query=query.eq("id",focusAppeal);
    else if(filter!=="all")query=query.eq("status",filter);
    const start=focusAppeal?0:page*perPage;
    const {data:history,error:historyError,count}=await query.range(start,start+(focusAppeal?0:perPage-1));
    if(historyError)return reply({error:"No se pudo consultar tu historial de apelaciones"},500);
    const sanctionIds=[...new Set((history||[]).map(a=>a.sanction_event_id))];
    const {data:sanctions,error:sanctionError}=sanctionIds.length
      ?await db.from("member_moderation_events")
        .select("id,action,reason,created_at,expires_at")
        .eq("target_id",viewer.id).in("id",sanctionIds)
      :{data:[],error:null};
    if(sanctionError)return reply({error:"No se pudieron cargar los expedientes vinculados"},500);
    return reply({history:history||[],sanctions:sanctions||[],total:count||0,
      page:focusAppeal?0:page,per_page:perPage,focused:!!focusAppeal});
  }
  if(action==="submit"){
    if(!Number.isSafeInteger(eventId)||eventId<1)return reply({error:"Selecciona una sanción"},400);
    if(reason.length<15||reason.length>1500)return reply({error:"Explica tu apelación en 15–1500 caracteres"},400);
    return submit(viewer.id,eventId,reason);
  }

  const {data:role,error:roleError}=await db.from("site_staff_roles")
    .select("role").eq("user_id",viewer.id).maybeSingle();
  const {data:verified}=await db.auth.admin.getUserById(viewer.id);
  if(roleError || !role || !["owner","admin","moderator"].includes(role.role) ||
    verified?.user?.app_metadata?.role !== (role.role==="moderator"?"moderator":"admin"))
    return reply({error:"Solo el equipo autorizado puede revisar apelaciones"},403);
  const isAdmin=role.role!=="moderator";
  if(action==="staff_team_stats"){
    // The statistics are computed with exact counts, rather than the
    // paginated rows visible in the staff queue.
    const {data:roles,error:rolesError}=await db.from("site_staff_roles")
      .select("user_id,role").in("role",["owner","admin","moderator"]).limit(120);
    if(rolesError)return reply({error:"No se pudo cargar el equipo de moderación"},500);
    const members=await Promise.all((roles||[]).map(async row=>{
      const {data:identity,error:identityError}=await db.auth.admin.getUserById(row.user_id);
      if(identityError||!identity?.user)return null;
      return identity.user.app_metadata?.role===
        (row.role==="moderator"?"moderator":"admin")?row:null;
    }));
    const eligible=members.filter((m):m is {user_id:string;role:string}=>!!m);
    const ids=eligible.map(m=>m.user_id);
    const {data:profiles,error:profilesError}=ids.length
      ?await db.from("profiles").select("id,display_name,username").in("id",ids)
      :{data:[],error:null};
    if(profilesError)return reply({error:"No se pudieron recuperar los nombres del equipo"},500);
    const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||"Miembro del equipo"]));
    const threshold=new Date(Date.now()-86400000).toISOString();
    const metrics=await Promise.all(eligible.map(async member=>{
      const base=(field:string,status:string)=>db.from("member_sanction_appeals")
        .select("id",{head:true,count:"exact"}).eq(field,member.user_id).eq("status",status);
      const [pending,accepted,rejected,late]=await Promise.all([
        base("assigned_to","pending"),
        base("reviewer_id","accepted"),
        base("reviewer_id","rejected"),
        db.from("member_sanction_appeals").select("id",{head:true,count:"exact"})
          .eq("assigned_to",member.user_id).eq("status","pending")
          .lt("assigned_at",threshold)
      ]);
      if([pending,accepted,rejected,late].some(x=>x.error))return null;
      return {id:member.user_id,role:member.role,
        name:names.get(member.user_id)||member.user_id.slice(0,8)+"…",
        pending:pending.count||0,accepted:accepted.count||0,
        rejected:rejected.count||0,overdue:late.count||0};
    }));
    if(metrics.some(m=>!m))return reply({error:"No se pudieron calcular las estadísticas del equipo"},500);
    return reply({members:metrics,my_id:viewer.id});
  }
  if(action==="assignment_history"){
    const appealId=String(body.appeal_id||"");
    if(!idPattern.test(appealId))return reply({error:"Apelación inválida"},400);
    const {data:appeal,error:appealError}=await db.from("member_sanction_appeals")
      .select("id").eq("id",appealId).maybeSingle();
    if(appealError||!appeal)return reply({error:"Apelación no encontrada"},404);
    const {data:records,error:historyError}=await db.from("member_appeal_assignment_history")
      .select("id,created_at,changed_by,previous_assignee,new_assignee")
      .eq("appeal_id",appealId).order("id",{ascending:false}).limit(30);
    if(historyError)return reply({error:"No se pudo cargar el historial de transferencias"},500);
    const ids=[...new Set((records||[]).flatMap(row=>
      [row.changed_by,row.previous_assignee,row.new_assignee]).filter(Boolean))];
    const {data:profiles,error:profileError}=ids.length
      ?await db.from("profiles").select("id,display_name,username").in("id",ids)
      :{data:[],error:null};
    if(profileError)return reply({error:"No se pudieron cargar los nombres del historial"},500);
    return reply({history:records||[],profiles:profiles||[],has_more:(records||[]).length===30});
  }
  if(action==="staff_stats"){
    const cutoff=new Date(Date.now()-24*3600000).toISOString();
    const query=(status:string)=>db.from("member_sanction_appeals")
      .select("id",{count:"exact",head:true}).eq("status",status);
    const [pending,accepted,rejected,overdue]=await Promise.all([
      query("pending"),query("accepted"),query("rejected"),
      db.from("member_sanction_appeals").select("id",{count:"exact",head:true})
        .eq("status","pending").lt("created_at",cutoff)
    ]);
    if([pending,accepted,rejected,overdue].some(x=>x.error))
      return reply({error:"No se pudieron cargar las estadísticas"},500);
    return reply({stats:{pending:pending.count||0,accepted:accepted.count||0,
      rejected:rejected.count||0,overdue:overdue.count||0}});
  }
  if(action==="staff_list"){
    const status=String(body.status||"pending");
    const search=String(body.search||"").trim().slice(0,80);
    const dateFrom=String(body.date_from||"");
    const dateTo=String(body.date_to||"");
    const assignFilter=String(body.assigned_filter||"all");
    const page=Math.max(0,Math.min(99,Number.isSafeInteger(body.page)?Number(body.page):0));
    const perPage=25;
    // Calendar inputs are converted in the user's local timezone to ISO UTC.
    const validDate=(s:string)=>!s || (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) &&
      Number.isFinite(Date.parse(s)) && new Date(s).toISOString()===s
    );
    if(!["pending","accepted","rejected","all"].includes(status) ||
      !["all","unassigned","mine"].includes(assignFilter) ||
      dateFrom&&(!validDate(dateFrom)) || dateTo&&(!validDate(dateTo)) ||
      (dateFrom&&dateTo&&dateFrom>dateTo))
      return reply({error:"Filtros de apelaciones inválidos"},400);
    const {data:roles,error:rolesError}=await db.from("site_staff_roles")
      .select("user_id,role").in("role",["owner","admin","moderator"]).limit(300);
    if(rolesError)return reply({error:"No se pudo consultar el equipo"},500);
    const checked=await Promise.all((roles||[]).map(async member=>{
      const {data:verified}=await db.auth.admin.getUserById(member.user_id);
      return verified?.user?.app_metadata?.role ===
        (member.role==="moderator"?"moderator":"admin") ? member : null;
    }));
    const staff=checked.filter(Boolean);
    let matchingMembers:string[]|null=null;
    if(search){
      if(idPattern.test(search))matchingMembers=[search];
      else{
        // Use parameterized PostgREST ilike values, not an interpolated .or() filter.
        const pattern="%"+search.replace(/[%_\\]/g,"\\$&")+"%";
        const [byName,byUser]=await Promise.all([
          db.from("profiles").select("id").ilike("display_name",pattern).limit(800),
          db.from("profiles").select("id").ilike("username",pattern).limit(800)
        ]);
        if(byName.error||byUser.error)return reply({error:"No se pudo buscar al miembro"},500);
        matchingMembers=[...new Set([...(byName.data||[]),...(byUser.data||[])].map(p=>p.id))];
      }
    }
    let query=db.from("member_sanction_appeals")
      .select("*",{count:"exact"}).order("created_at",{ascending:false})
      .order("id",{ascending:false});
    if(status!=="all")query=query.eq("status",status);
    if(assignFilter==="unassigned")query=query.is("assigned_to",null);
    if(assignFilter==="mine")query=query.eq("assigned_to",viewer.id);
    if(dateFrom)query=query.gte("created_at",dateFrom);
    if(dateTo)query=query.lt("created_at",dateTo);
    if(search){
      if(matchingMembers?.length)query=query.in("member_id",matchingMembers);
      else return reply({appeals:[],profiles:[],sanctions:[],staff_members:staff,
        is_admin:isAdmin,viewer_id:viewer.id,total:0,page,per_page:perPage});
    }
    const {data:appeals,error:appealError,count}=await query.range(
      page*perPage,page*perPage+perPage-1);
    if(appealError)return reply({error:"No se pudieron cargar las apelaciones"},500);
    const ids=(appeals||[]).map(a=>a.sanction_event_id);
    const {data:sanctions,error:eventError}=ids.length
      ?await db.from("member_moderation_events")
        .select("id,action,actor_id,reason,expires_at,created_at").in("id",ids)
      :{data:[],error:null};
    if(eventError)return reply({error:"No se pudieron cargar las sanciones vinculadas"},500);
    const profileIds=[...new Set([
      ...staff.map(m=>m.user_id),
      ...(appeals||[]).flatMap(a=>[a.member_id,a.reviewer_id,a.assigned_to,a.assigned_by]),
      ...(sanctions||[]).map(s=>s.actor_id)
    ].filter(Boolean))];
    const {data:profiles,error:profileError}=profileIds.length
      ?await db.from("profiles").select("id,display_name,username").in("id",profileIds)
      :{data:[],error:null};
    if(profileError)return reply({error:"No se pudieron cargar los perfiles del equipo"},500);
    return reply({appeals:appeals||[],profiles:profiles||[],sanctions:sanctions||[],
      staff_members:staff,is_admin:isAdmin,viewer_id:viewer.id,total:count||0,
      page,per_page:perPage});
  }
  if(action==="assign"){
    if(!isAdmin)return reply({error:"Solo un administrador puede asignar apelaciones"},403);
    const appealId=String(body.appeal_id||"");
    const assignee=body.assigned_to===null || body.assigned_to==="" ? null :
      String(body.assigned_to||"");
    if(!idPattern.test(appealId) || (assignee!==null&&!idPattern.test(assignee)))
      return reply({error:"Identificador de apelación o responsable inválido"},400);
    const {data:record,error:lookupError}=await db.from("member_sanction_appeals")
      .select("id,status,assigned_to,member_id,sanction_event_id").eq("id",appealId).maybeSingle();
    if(lookupError||!record)return reply({error:"Apelación no encontrada"},404);
    if(record.status!=="pending")return reply({error:"Solo se pueden asignar apelaciones pendientes"},409);
    if(assignee===record.assigned_to)return reply({ok:true,assigned_to:assignee,unchanged:true});
    if(assignee){
      const {data:targetRole}=await db.from("site_staff_roles")
        .select("role").eq("user_id",assignee).maybeSingle();
      if(!targetRole||!["owner","admin","moderator"].includes(targetRole.role))
        return reply({error:"El responsable debe pertenecer al equipo de moderación"},403);
      const {data:target}=await db.auth.admin.getUserById(assignee);
      if(!target?.user || target.user.app_metadata?.role!==(
        targetRole.role==="moderator"?"moderator":"admin"))
        return reply({error:"El responsable no tiene permisos activos"},403);
      if(targetRole.role==="moderator"){
        const {data:sanction}=await db.from("member_moderation_events")
          .select("action,actor_id").eq("id",record.sanction_event_id).maybeSingle();
        if(!sanction)return reply({error:"No se pudo comprobar la sanción"},500);
        if(sanction.action==="ban")return reply({
          error:"Las apelaciones por expulsión solo se asignan a administradores"},403);
        if(sanction.actor_id===assignee)return reply({
          error:"El moderador que aplicó la sanción no puede revisar su propia apelación"},403);
      }
    }
    let update=db.from("member_sanction_appeals").update({
      assigned_to:assignee,assigned_by:viewer.id,
      assigned_at:assignee?new Date().toISOString():null
    }).eq("id",appealId).eq("status","pending");
    // Optimistic lock prevents two admins from silently overwriting each other.
    update=record.assigned_to?update.eq("assigned_to",record.assigned_to):
      update.is("assigned_to",null);
    const {data:written,error:writeError}=await update.select("assigned_to").maybeSingle();
    if(writeError||!written)return reply({error:"El responsable cambió. Actualiza la bandeja e inténtalo nuevamente"},409);
    return reply({ok:true,assigned_to:written.assigned_to});
  }
  if(action==="case_export"){
    const appealId=String(body.appeal_id||"");
    if(!idPattern.test(appealId))return reply({error:"Identificador de apelación inválido"},400);
    const {data:appeal,error:appealError}=await db.from("member_sanction_appeals")
      .select("*").eq("id",appealId).maybeSingle();
    if(appealError||!appeal)return reply({error:"Apelación no encontrada"},404);
    const [{data:sanction,error:sanctionError},{data:assignmentHistory,error:historyError}]=
      await Promise.all([
        db.from("member_moderation_events").select("*")
          .eq("id",appeal.sanction_event_id).maybeSingle(),
        db.from("member_appeal_assignment_history").select("*")
          .eq("appeal_id",appealId).order("created_at",{ascending:true}).order("id",{ascending:true})
          .limit(1001)
      ]);
    if(sanctionError||historyError)return reply({error:"No se pudo cargar el expediente completo"},500);
    if((assignmentHistory||[]).length>1000)
      return reply({error:"El historial de asignaciones supera el límite seguro de exportación"},413);
    const messages:any[]=[];
    for(let offset=0;offset<=5000;offset+=250){
      const {data:batch,error:messageError}=await db.from("member_appeal_messages")
        .select("id,sender_id,sender_role,body,created_at")
        .eq("appeal_id",appealId).order("created_at",{ascending:true})
        .order("id",{ascending:true}).range(offset,offset+249);
      if(messageError)return reply({error:"No se pudo cargar el historial de mensajes"},500);
      if(offset===5000 && batch?.length)
        return reply({error:"El expediente supera el límite de exportación; contacta con soporte para una copia íntegra"},413);
      messages.push(...(batch||[]));
      if(!batch || batch.length<250)break;
    }
    const members=[...new Set([
      appeal.member_id,appeal.reviewer_id,appeal.assigned_to,appeal.assigned_by,
      sanction?.actor_id,
      ...(assignmentHistory||[]).flatMap(h=>[h.changed_by,h.previous_assignee,h.new_assignee]),
      ...messages.map(m=>m.sender_id)
    ].filter(Boolean))];
    const {data:profiles,error:profileError}=members.length
      ?await db.from("profiles").select("id,display_name,username").in("id",members)
      :{data:[],error:null};
    if(profileError)return reply({error:"No se pudo preparar la exportación"},500);
    return reply({document:{appeal,sanction,assignment_history:assignmentHistory||[],
      messages,profiles:profiles||[],generated_at:new Date().toISOString()}});
  }
  if(action==="decide"){
    if(!idPattern.test(String(body.appeal_id||""))||!["accepted","rejected"].includes(body.decision||""))
      return reply({error:"Decisión inválida"},400);
    const note=String(body.note||"").trim();
    if(note.length<10 || note.length>1000)return reply({error:"Escribe una explicación de 10–1000 caracteres"},400);
    const {data:appeal,error:appealError}=await db.from("member_sanction_appeals")
      .select("*").eq("id",body.appeal_id).maybeSingle();
    if(appealError||!appeal)return reply({error:"Apelación no encontrada"},404);
    if(appeal.status!=="pending")return reply({error:"Esta apelación ya fue resuelta"},409);
    const event=await memberEvent(appeal.member_id,Number(appeal.sanction_event_id));
    if(!event)return reply({error:"Sanción original no encontrada"},404);
    if(event.action==="ban"&&!isAdmin)return reply({error:"Solo un administrador puede resolver expulsiones"},403);
    if(event.actor_id===viewer.id&&!isAdmin)return reply({error:"Un moderador no puede revisar su propia sanción"},403);
    const decision=body.decision as "accepted"|"rejected";
    const {data:updated,error:updateError}=await db.from("member_sanction_appeals")
      .update({status:decision,review_note:note,reviewer_id:viewer.id,reviewed_at:new Date().toISOString()})
      .eq("id",appeal.id).eq("status","pending").select("id").maybeSingle();
    if(updateError||!updated)return reply({error:"La apelación ya se está procesando o no se pudo guardar"},409);
    let restored=false,restoreError=false;
    if(decision==="accepted"&&["suspend","ban"].includes(event.action)){
      const [{data:state}, {data:latest}]=await Promise.all([
        db.from("member_moderation_status").select("action,expires_at").eq("user_id",appeal.member_id).maybeSingle(),
        db.from("member_moderation_events").select("id,action").eq("target_id",appeal.member_id)
          .in("action",["suspend","ban","lift"]).order("created_at",{ascending:false}).limit(1).maybeSingle()
      ]);
      const stillBlocked=state&&(state.action==="ban"||Date.parse(state.expires_at||"")>Date.now());
      // No se levanta una sanción posterior ni se restablece otra cuenta accidentalmente.
      if(stillBlocked&&latest?.id===event.id&&state.action===event.action){
        const {error:authError}=await db.auth.admin.updateUserById(appeal.member_id,{ban_duration:"none"});
        if(authError){restoreError=true;console.error("Appeal unban failed",authError.message);}
        else{
          const {error:stateError}=await db.from("member_moderation_status").delete()
            .eq("user_id",appeal.member_id).eq("action",event.action);
          if(stateError){restoreError=true;console.error("Appeal status deletion failed",stateError.message);}
          else{
            const {error:logError}=await db.from("member_moderation_events").insert({
              target_id:appeal.member_id,actor_id:viewer.id,action:"lift",
              reason:("Apelación aceptada: "+note).slice(0,500)
            });
            if(logError){console.error("Appeal lift event failed",logError.message);restoreError=true;}
            else restored=true;
          }
        }
      }
    }
    if(restoreError){
      // No confirmar una apelación aceptada si no se pudo completar el levantamiento.
      await db.from("member_sanction_appeals").update({
        status:"pending",reviewer_id:null,review_note:null,reviewed_at:null
      }).eq("id",appeal.id).eq("status","accepted");
      return reply({error:"No se pudo completar el levantamiento. Revisa el estado de la cuenta antes de intentarlo de nuevo."},500);
    }
    let notified=false;
    const {data:target}=await db.auth.admin.getUserById(appeal.member_id);
    if(target?.user?.email){
      try{
        await sendEmail(target.user.email,
          "Resolución de tu apelación · Shadows Byte",
          "Hola,\n\nTu apelación ha sido "+(decision==="accepted"?"ACEPTADA":"RECHAZADA")+
          ".\n\nMotivo de la revisión:\n"+note+
          "\n\n"+(restored?"El bloqueo de acceso se ha levantado.\n\n":"")+
          "Consulta los detalles en Shadows Byte Gaming Official:\n"+frontUrl+
          "\n\nEl equipo de Shadows Byte Gaming Official");
        notified=true;
      }catch(e){console.error("Appeal decision email failed",e instanceof Error?e.message:"unknown");}
    }
    // Este registro genera el aviso interno y, si hay dispositivos inscritos,
    // el Web Push mediante el disparador seguro de Supabase.
    const {error:rawAlertError}=await db.from("member_appeal_notifications")
      .insert({recipient_id:appeal.member_id,appeal_id:appeal.id,kind:decision});
    const alertError=rawAlertError?.code==="23505"?null:rawAlertError;
    if(alertError)console.error("Appeal outcome notification failed",alertError.message);
    return reply({ok:true,decision,restored,notified,alert_saved:!alertError});
  }
  return reply({error:"Operación no disponible"},400);
});
