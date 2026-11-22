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
type Body = {action?: string; email?: string; code?: string; reason?: string; sanction_event_id?: number; appeal_id?: string; decision?: string; note?: string};
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
    const {error:alertError}=await db.from("member_appeal_notifications")
      .upsert({recipient_id:appeal.member_id,appeal_id:appeal.id,kind:decision},
        {onConflict:"recipient_id,appeal_id,kind",ignoreDuplicates:true});
    if(alertError)console.error("Appeal outcome notification failed",alertError.message);
    return reply({ok:true,decision,restored,notified,alert_saved:!alertError});
  }
  return reply({error:"Operación no disponible"},400);
});
