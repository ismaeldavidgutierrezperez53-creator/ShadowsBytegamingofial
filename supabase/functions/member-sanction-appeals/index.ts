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
type Body = {action?: string; email?: string; code?: string; reason?: string; sanction_event_id?: number; appeal_id?: string; decision?: string; note?: string; message?: string; access_token?: string; before?: string};
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
    const [{data:appeals,error:appealError},{data:profiles,error:profilesError}]=await Promise.all([
      db.from("member_sanction_appeals").select("*").order("created_at",{ascending:false}).limit(150),
      db.from("profiles").select("id,display_name,username").limit(2000),
    ]);
    if(appealError||profilesError)return reply({error:"No se pudo cargar la bandeja de apelaciones"},500);
    const ids=(appeals||[]).map(a=>a.sanction_event_id);
    const {data:sanctions,error:eventsError}=ids.length
      ?await db.from("member_moderation_events").select("id,action,actor_id,reason,expires_at,created_at").in("id",ids)
      :{data:[],error:null};
    if(eventsError)return reply({error:"No se pudieron cargar las sanciones vinculadas"},500);
    return reply({appeals,profiles,sanctions,is_admin:isAdmin});
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
