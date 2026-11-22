/* Apelaciones verificadas para miembros y bandeja de revisión para el equipo. */
(() => {
  "use strict";
  const functionName="member-sanction-appeals";
  const kinds={warning:"⚠️ Advertencia",suspend:"⏳ Suspensión",ban:"🚫 Expulsión"};
  const outcomes={pending:"🕒 Pendiente de revisión",accepted:"✅ Apelación aceptada",rejected:"❌ Apelación rechazada"};
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const date=value=>value?new Date(value).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}):"—";
  const invoke=async data=>{
    const {data:result,error}=await sb.functions.invoke(functionName,{body:data});
    if(error||result?.error){
      let message=result?.error||error?.message||"No se pudo completar la solicitud";
      if(error?.context){try{const d=await error.context.clone().json();message=d?.error||message;}catch(_){}}
      throw new Error(message);
    }
    return result||{};
  };
  const feedback=(host,msg,bad=false)=>{
    if(!host)return;
    host.textContent=msg||"";
    host.dataset.error=String(bad);
  };
  const usable=event=>event.action==="ban" || Date.now()-Date.parse(event.created_at)<90*86400000;
  const opts=(tag,values)=>{for(const [value,label] of values)tag.add(new Option(label,value));};
  const reasonInput=()=>{const textarea=el("textarea");textarea.required=true;textarea.minLength=15;textarea.maxLength=1500;textarea.rows=4;textarea.placeholder="Explica por qué debería revisarse la decisión. Evita incluir contraseñas o datos privados.";return textarea;};

  // Historial inmutable del caso: solicitud, conversación y resolución.
  function threadPanel(appealId, accessToken=""){
    const details=el("details","sb-appeal-thread");
    const summary=el("summary","sb-thread-toggle","💬 Conversación e historial del expediente");
    const inner=el("div","sb-thread-container");
    const heading=el("div","sb-thread-heading");
    const notes=el("div","sb-appeal-timeline");
    const log=el("div","sb-thread-messages");
    log.setAttribute("role","log");
    log.setAttribute("aria-live","polite");
    const older=el("button","outline-btn mini","Ver mensajes anteriores");
    older.type="button";older.hidden=true;
    const refresh=el("button","outline-btn mini","🔄 Actualizar conversación");
    refresh.type="button";
    const status=el("p","sb-appeal-status");
    status.setAttribute("role","status");
    const form=el("form","sb-appeal-form sb-thread-reply");
    const label=el("label","","Escribe un mensaje para el expediente");
    const textarea=el("textarea");
    textarea.required=true;textarea.minLength=2;textarea.maxLength=2000;textarea.rows=3;
    textarea.placeholder="Pregunta o responde al equipo de moderación (2–2000 caracteres).";
    label.append(textarea);
    const send=el("button","gradient-btn mini","💬 Enviar respuesta");
    send.type="submit";
    form.append(label,send);
    heading.append(el("strong","","📜 Historial de mensajes"),refresh);
    inner.append(notes,heading,log,older,form,status);
    details.append(summary,inner);
    let nextBefore=null,loaded=false,closed=false;
    const messageNode=row=>{
      const item=el("article","sb-thread-message "+(row.sender_role==="staff"?"sb-thread-staff":"sb-thread-member"));
      const author=el("strong","",row.sender_role==="staff"?"🛡️ Equipo de moderación":"👤 Miembro");
      const time=el("small","",date(row.created_at));
      item.append(author,time,el("p","",row.body));
      return item;
    };
    async function load(before=null){
      feedback(status,before?"Cargando mensajes anteriores…":"Consultando el expediente…");
      try{
        const payload={action:"thread",appeal_id:appealId};
        if(accessToken)payload.access_token=accessToken;
        if(before)payload.before=before;
        const data=await invoke(payload);
        if(!details.isConnected)return;
        if(!before){
          notes.replaceChildren();
          notes.append(el("p","","📌 Sanción: "+(kinds[data.sanction?.action]||"Sanción")+" · "+date(data.sanction?.created_at)),
            el("p","","Motivo original: "+(data.sanction?.reason||"No disponible")),
            el("p","","📝 Solicitud: "+date(data.appeal?.created_at)+" · "+data.appeal?.reason));
          if(data.appeal?.reviewed_at){
            notes.append(el("p","sb-appeal-review-note",
              (outcomes[data.appeal.status]||data.appeal.status)+" · "+date(data.appeal.reviewed_at)+
              "\nResolución: "+(data.appeal.review_note||"Sin explicación registrada")));
          }
          closed=data.appeal?.status!=="pending";
          form.hidden=closed;
          if(closed)notes.append(el("p","sb-appeal-hint","Expediente cerrado: el historial permanece disponible en modo lectura."));
          log.replaceChildren();
        }
        const fragment=document.createDocumentFragment();
        for(const row of data.messages||[])fragment.append(messageNode(row));
        if(before)log.prepend(fragment);else log.append(fragment);
        nextBefore=data.has_more?data.next_before:null;
        older.hidden=!nextBefore;
        loaded=true;
        feedback(status,before?"Se han cargado mensajes anteriores.":"Historial actualizado.");
      }catch(error){feedback(status,error.message,true);}
    }
    details.addEventListener("toggle",()=>{if(details.open&&!loaded)void load();});
    older.onclick=()=>{if(nextBefore)void load(nextBefore);};
    refresh.onclick=()=>void load();
    form.onsubmit=async e=>{
      e.preventDefault();
      if(closed)return;
      send.disabled=true;feedback(status,"Enviando respuesta…");
      try{
        const payload={action:"reply",appeal_id:appealId,message:textarea.value.trim()};
        if(accessToken)payload.access_token=accessToken;
        await invoke(payload);
        textarea.value="";
        await load();
        feedback(status,"✅ Respuesta guardada en el historial.");
      }catch(error){feedback(status,error.message,true);}finally{send.disabled=false;}
    };
    return details;
  }

  function mountEmailChat(root){
    const area=el("section","sb-appeal-email-chat");
    area.id="sb-appeal-email-chat";
    area.append(el("h2","","💬 Consultar y responder sin iniciar sesión"),
      el("p","sb-appeal-hint",
        "Para cuentas suspendidas o expulsadas: verifica tu correo y conversa con moderación sin recuperar el acceso a la cuenta. El código caduca en 10 minutos."));
    const request=el("form","sb-appeal-form");
    const emailLabel=el("label","","Correo registrado en tu cuenta");
    const emailInput=el("input");
    emailInput.type="email";emailInput.required=true;emailInput.maxLength=254;emailInput.autocomplete="email";
    emailLabel.append(emailInput);
    const requestButton=el("button","outline-btn mini","📩 Pedir código de conversación");
    requestButton.type="submit";request.append(emailLabel,requestButton);
    const verify=el("form","sb-appeal-form");
    const codeLabel=el("label","","Código recibido");
    const codeInput=el("input");
    codeInput.type="text";codeInput.required=true;codeInput.pattern="[0-9]{6}";
    codeInput.inputMode="numeric";codeInput.maxLength=6;codeInput.autocomplete="one-time-code";
    codeLabel.append(codeInput);
    const verifyButton=el("button","gradient-btn mini","🔐 Abrir conversación");
    verifyButton.type="submit";verify.append(codeLabel,verifyButton);
    const status=el("p","sb-appeal-status");status.setAttribute("role","status");
    const chat=el("div","sb-thread-verified");
    area.append(request,verify,status,chat);root.append(area);
    request.onsubmit=async e=>{
      e.preventDefault();requestButton.disabled=true;feedback(status,"Solicitando código…");
      try{
        const result=await invoke({action:"request_thread_code",email:emailInput.value.trim()});
        feedback(status,result.message||"Si existe una apelación pendiente, recibirás el código.");
      }catch(error){feedback(status,error.message,true);}finally{requestButton.disabled=false;}
    };
    verify.onsubmit=async e=>{
      e.preventDefault();verifyButton.disabled=true;feedback(status,"Verificando código…");
      try{
        const result=await invoke({action:"verify_thread_code",email:emailInput.value.trim(),code:codeInput.value.trim()});
        chat.replaceChildren();
        const panel=threadPanel(result.appeal_id,result.access_token);
        chat.append(panel);
        panel.open=true;
        feedback(status,"✅ Correo verificado. Acceso temporal durante 30 minutos; no compartas tu código.");
        codeInput.value="";
      }catch(error){feedback(status,error.message,true);}finally{verifyButton.disabled=false;}
    };
  }

  async function loadStaffStatistics(panel){
    const host=panel?.querySelector("#sb-appeal-statistics");
    if(!host||!panel.isConnected)return;
    try{
      const result=await invoke({action:"staff_stats"});
      if(!panel.isConnected)return;
      const stats=result.stats||{};
      const accepted=stats.accepted||0,rejected=stats.rejected||0;
      const total=accepted+rejected;
      host.replaceChildren();
      const metrics=[
        ["🕒 Pendientes",stats.pending||0],
        ["⏰ Más de 24 horas",stats.overdue||0],
        ["✅ Aceptadas",accepted],
        ["❌ Rechazadas",rejected],
        ["📈 Tasa de aceptación",total?Math.round(100*accepted/total)+"%":"—"]
      ];
      for(const [label,value] of metrics){
        const box=el("div","sb-appeal-stat");
        box.append(el("span","",label),el("strong","",String(value)));
        host.append(box);
      }
    }catch(error){host.textContent="No se pudieron cargar las estadísticas: "+error.message;}
  }

  async function mountPublic(){
    const root=document.getElementById("sb-appeal-public");
    if(!root||root.dataset.mounted==="true")return;
    root.dataset.mounted="true";
    root.innerHTML=`
      <div class="sb-appeal-intro">
        <h2>Solicitar revisión de una sanción</h2>
        <p>Si tu cuenta fue suspendida o expulsada y no puedes iniciar sesión, usa el correo vinculado a tu cuenta. Recibirás un código de 6 dígitos para verificar que eres el titular.</p>
        <p class="sb-appeal-hint">Solo se permite una apelación por sanción. El código caduca a los 10 minutos y se solicita como máximo una vez cada 10 minutos.</p>
      </div>
      <form id="sb-appeal-code-form" class="sb-appeal-form">
        <label>Correo electrónico de la cuenta
          <input id="sb-appeal-email" type="email" autocomplete="email" required maxlength="254" placeholder="tu-correo@ejemplo.com">
        </label>
        <button type="submit" class="outline-btn">📩 Solicitar código</button>
      </form>
      <form id="sb-appeal-submit-form" class="sb-appeal-form">
        <label>Código recibido por correo
          <input id="sb-appeal-code" type="text" inputmode="numeric" pattern="[0-9]{6}" required maxlength="6" placeholder="123456" autocomplete="one-time-code">
        </label>
        <label>Explica por qué solicitas una revisión
          <textarea id="sb-appeal-reason" minlength="15" maxlength="1500" rows="5" required placeholder="Describe tu situación y por qué consideras que debería revisarse la sanción."></textarea>
        </label>
        <button type="submit" class="gradient-btn">🛡️ Enviar apelación</button>
      </form>
      <p id="sb-appeal-public-status" role="status" aria-live="polite"></p>
      <p class="sb-appeal-hint">Si puedes iniciar sesión, también puedes presentar y consultar tus apelaciones desde Mi cuenta. Por seguridad, no se confirma públicamente si existe una cuenta asociada a un correo.</p>
      <p><a class="outline-btn mini" href="#/cuenta">👤 Ir a Mi cuenta</a></p>
    `;
    mountEmailChat(root);
    const info=root.querySelector("#sb-appeal-public-status");
    for(const [formName,action] of [["#sb-appeal-code-form","request_code"],["#sb-appeal-submit-form","submit_code"]]){
      const form=root.querySelector(formName);
      form.addEventListener("submit",async e=>{
        e.preventDefault();
        const submit=form.querySelector("button[type=submit]");
        submit.disabled=true;
        feedback(info,action==="request_code"?"Solicitando código…":"Verificando código y registrando apelación…");
        try{
          const payload={action,email:root.querySelector("#sb-appeal-email").value.trim().toLowerCase()};
          if(action==="submit_code"){
            payload.code=root.querySelector("#sb-appeal-code").value.trim();
            payload.reason=root.querySelector("#sb-appeal-reason").value.trim();
          }
          const result=await invoke(payload);
          feedback(info,action==="request_code"
            ?result.message||"Si tienes una sanción apelable, recibirás un código por correo."
            :"✅ Apelación enviada. El equipo la revisará y recibirás un correo con la resolución.");
          if(action==="submit_code")form.reset();
        }catch(error){feedback(info,error.message,true);}
        finally{submit.disabled=false;}
      });
    }
  }

  async function mountAccount(){
    const page=document.querySelector(".sb-account-page");
    if(!page||document.getElementById("sb-my-appeals"))return;
    const panel=el("section","section sb-appeals-account");
    panel.id="sb-my-appeals";
    panel.append(el("h2","", "🛡️ Mis apelaciones"),el("p","","Puedes solicitar una revisión y consultar la decisión del equipo."));
    const content=el("div","sb-appeals-stack","Cargando tus sanciones apelables…");
    panel.append(content);
    page.append(panel);
    try{
      const result=await invoke({action:"my_list"});
      if(!panel.isConnected)return;
      const appeals=new Map((result.appeals||[]).map(a=>[a.sanction_event_id,a]));
      content.replaceChildren();
      const events=(result.events||[]).filter(event=>usable(event)||appeals.has(event.id));
      if(!events.length){
        const empty=el("div","sb-appeals-empty");
        const icon=el("span","sb-appeals-empty-icon","✓");
        icon.setAttribute("aria-hidden","true");
        const copy=el("div","sb-appeals-empty-copy");
        copy.append(
          el("h3","","No tienes sanciones que puedas apelar ahora"),
          el("p","","Si recibes una sanción apelable, aparecerá aquí con la opción de solicitar una revisión.")
        );
        empty.append(icon,copy);
        content.append(empty);
      }
      for(const event of events){
        const card=el("article","sb-appeal-card");
        card.append(el("strong","",(kinds[event.action]||event.action)+" · "+date(event.created_at)));
        card.append(el("p","",event.reason));
        const prior=appeals.get(event.id);
        if(prior){
          card.append(el("strong","sb-appeal-outcome",outcomes[prior.status]||prior.status));
          card.append(el("small","","Apelación: "+prior.reason));
          if(prior.review_note)card.append(el("p","sb-appeal-review-note","Resolución: "+prior.review_note));
          if(prior.reviewed_at)card.append(el("small","","Revisada: "+date(prior.reviewed_at)));
          card.append(threadPanel(prior.id));
        }else{
          const form=el("form","sb-appeal-form");
          const label=el("label","","Tu explicación");
          const input=reasonInput();
          label.append(input);
          const button=el("button","gradient-btn mini","Solicitar revisión");
          button.type="submit";
          const status=el("p","sb-appeal-status");
          status.setAttribute("role","status");
          form.append(label,button,status);
          form.onsubmit=async e=>{
            e.preventDefault();
            if(!confirm("¿Enviar una apelación sobre esta sanción? Solo se permite una por cada sanción."))return;
            button.disabled=true;feedback(status,"Enviando…");
            try{
              await invoke({action:"submit",sanction_event_id:event.id,reason:input.value.trim()});
              feedback(status,"✅ Apelación registrada. En espera de revisión.");
              form.querySelector("label").remove();button.remove();
            }catch(error){feedback(status,error.message,true);button.disabled=false;}
          };
          card.append(form);
        }
        content.append(card);
      }
      content.append(el("p","sb-appeal-hint sb-appeals-help","¿No puedes iniciar sesión por un bloqueo? Puedes solicitar una revisión utilizando tu correo."));
      const link=el("a","outline-btn mini sb-appeals-mail-link","📩 Apelar con código de correo");
      link.href="#/apelaciones";content.append(link);
    }catch(error){
      content.textContent="No se pudieron cargar las apelaciones: "+error.message;
    }
    if(new URLSearchParams(location.hash.split("?")[1]||"").get("focus")==="appeals"){
      requestAnimationFrame(()=>{if(panel.isConnected)panel.scrollIntoView({block:"start",behavior:"smooth"});});
    }
  }

  let staffCache=null;
  let staffRequest=0;
  // El recuento consulta el total real en Supabase, no solo las últimas 150 filas.
  async function refreshPendingCount(){
    const panel=document.getElementById("sb-appeals-staff");
    if(!panel||!panel.isConnected)return;
    const badge=panel.querySelector("#sb-appeals-pending-count");
    const {count,error}=await sb.from("member_sanction_appeals")
      .select("id",{count:"exact",head:true}).eq("status","pending");
    if(error||!panel.isConnected)return;
    if(badge)badge.textContent=(count||0)+" pendientes";
    const direct=document.querySelector('#admin-root .admin-quicklinks a[href="#/admin?focus=appeals"]');
    if(direct)direct.textContent="⚖️ Apelaciones ("+(count||0)+")";
  }
  async function loadStaff(panel,page=0){
    const host=panel.querySelector("#sb-appeals-staff-list");
    const status=panel.querySelector("#sb-appeals-staff-status");
    if(!host)return;
    const seq=++staffRequest;
    host.textContent="Cargando apelaciones…";
    const input=id=>panel.querySelector(id);
    const fromDay=input("#sb-appeals-from")?.value||"";
    const toDay=input("#sb-appeals-to")?.value||"";
    if(fromDay&&toDay&&fromDay>toDay){
      host.textContent="";
      feedback(status,"La fecha de inicio debe ser anterior a la fecha final.",true);
      return;
    }
    const endOfDay=toDay?new Date(toDay+"T00:00:00"):null;
    if(endOfDay)endOfDay.setDate(endOfDay.getDate()+1);
    const query={
      action:"staff_list",page,
      status:input("#sb-appeals-filter")?.value||"pending",
      search:input("#sb-appeals-search")?.value?.trim()||"",
      date_from:fromDay?new Date(fromDay+"T00:00:00").toISOString():"",
      date_to:endOfDay?endOfDay.toISOString():"",
      assigned_filter:input("#sb-appeals-assigned-filter")?.value||"all"
    };
    try{
      const result=await invoke(query);
      if(!host.isConnected||seq!==staffRequest)return;
      staffCache=result;
      const total=result.total||0,perPage=result.per_page||25,currentPage=result.page||0;
      feedback(status,"Mostrando "+(total?currentPage*perPage+1:0)+"–"+
        Math.min(total,(currentPage+1)*perPage)+" de "+total+" apelaciones.");
      const previous=panel.querySelector("#sb-appeals-previous");
      const next=panel.querySelector("#sb-appeals-next");
      const pageInfo=panel.querySelector("#sb-appeals-page-info");
      if(previous)previous.disabled=currentPage<=0;
      if(next)next.disabled=(currentPage+1)*perPage>=total;
      if(pageInfo)pageInfo.textContent="Página "+(currentPage+1)+" de "+
        Math.max(1,Math.ceil(total/perPage));
      drawStaff(panel);
      void refreshPendingCount();
      void loadStaffStatistics(panel);
    }catch(error){
      if(seq!==staffRequest)return;
      host.textContent="No se pudo cargar la bandeja.";
      feedback(status,error.message,true);
    }
  }
  function drawStaff(panel){
    const host=panel.querySelector("#sb-appeals-staff-list");
    if(!host||!staffCache)return;
    const people=new Map((staffCache.profiles||[]).map(p=>[p.id,p]));
    const sanctions=new Map((staffCache.sanctions||[]).map(p=>[p.id,p]));
    const name=id=>{const p=people.get(id);return p?.display_name||p?.username||(id?id.slice(0,8)+"…":"Sin usuario");};
    const rows=staffCache.appeals||[];
    host.replaceChildren();
    if(!rows.length){host.append(el("p","","No hay apelaciones que coincidan con los filtros."));return;}
    for(const record of rows){
      const sanction=sanctions.get(record.sanction_event_id);
      const card=el("article","sb-appeal-card");
      card.append(el("strong","",name(record.member_id)+" · "+(kinds[sanction?.action]||"Sanción")));
      card.append(el("small","","Enviada: "+date(record.created_at)+" · Estado: "+(outcomes[record.status]||record.status)));
      if(sanction){
        card.append(el("p","","Motivo de la sanción: "+sanction.reason));
        card.append(el("small","","Sanción impuesta: "+date(sanction.created_at)+" · Por: "+name(sanction.actor_id)));
      }
      card.append(el("p","","Motivo de la apelación: "+record.reason));
      const assignment=el("div","sb-appeal-assignment");
      const assignedLabel=el("strong","",
        "👤 Responsable: "+(record.assigned_to?name(record.assigned_to):"Sin asignar"));
      assignment.append(assignedLabel);
      if(record.assigned_at)assignment.append(
        el("small","","Último cambio: "+date(record.assigned_at)));
      if(record.status==="pending"&&staffCache.is_admin){
        const group=el("div","sb-appeal-assignment-actions");
        const select=el("select");
        select.setAttribute("aria-label","Elegir administrador o moderador responsable");
        select.add(new Option("Sin asignar",""));
        for(const member of staffCache.staff_members||[]){
          const kind=member.role==="moderator"?"Moderador":"Administrador";
          select.add(new Option(name(member.user_id)+" · "+kind,member.user_id));
        }
        select.value=record.assigned_to||"";
        const save=el("button","admin-secondary mini","💾 Guardar responsable");
        save.type="button";
        const note=el("span","sb-appeal-assign-status");note.setAttribute("role","status");
        save.onclick=async()=>{
          const target=select.value||null;
          if(target===(record.assigned_to||null))return;
          if(!confirm("¿Guardar el responsable de esta apelación? El cambio quedará en el historial."))return;
          save.disabled=true;feedback(note,"Guardando asignación…");
          try{
            await invoke({action:"assign",appeal_id:record.id,assigned_to:target});
            feedback(note,"✅ Responsable actualizado.");
            await loadStaff(panel,staffCache.page||0);
          }catch(error){feedback(note,error.message,true);save.disabled=false;}
        };
        group.append(select,save,note);
        assignment.append(group);
      }else if(record.status==="pending"){
        assignment.append(el("small","",
          "Los responsables los asigna un administrador."));
      }
      card.append(assignment);
      const exportRow=el("div","sb-appeal-export-row");
      const exportButton=el("button","outline-btn mini","📄 Exportar expediente completo a PDF");
      exportButton.type="button";
      const exportStatus=el("span","sb-appeal-export-status");
      exportStatus.setAttribute("role","status");
      exportButton.onclick=async()=>{
        exportButton.disabled=true;
        feedback(exportStatus,"Preparando el historial completo…");
        try{
          const data=await invoke({action:"case_export",appeal_id:record.id});
          if(!window.SBAppealsPDF?.download)throw new Error("El exportador PDF no está disponible. Actualiza la aplicación.");
          const size=window.SBAppealsPDF.download(data.document);
          feedback(exportStatus,"✅ Archivo PDF generado ("+Math.ceil(size/1024)+" KB). Contiene datos privados.");
        }catch(error){feedback(exportStatus,error.message,true);}finally{exportButton.disabled=false;}
      };
      exportRow.append(exportButton,exportStatus);
      card.append(exportRow);
      if(record.status==="pending"&&Date.now()-Date.parse(record.created_at)>24*3600000)
        card.append(el("p","sb-appeal-overdue","⏰ Más de 24 horas esperando revisión"));
      if(record.status==="pending"){
        const form=el("form","sb-appeal-review-form");
        const label=el("label","","Explicación obligatoria de la resolución");
        const note=el("textarea");
        note.minLength=10;note.maxLength=1000;note.rows=3;note.required=true;note.placeholder="Justifica por qué aceptas o rechazas esta apelación.";
        label.append(note);form.append(label);
        const actions=el("div","sb-appeal-review-actions");
        const accept=el("button","admin-secondary","✅ Aceptar");
        const reject=el("button","admin-secondary","❌ Rechazar");
        accept.type=reject.type="button";
        const status=el("p","sb-appeal-status");status.setAttribute("role","status");
        const decide=async decision=>{
          const explanation=note.value.trim();
          if(explanation.length<10||explanation.length>1000){
            feedback(status,"Escribe una explicación de 10 a 1000 caracteres.",true);return;
          }
          const willRestore=decision==="accepted"&&["suspend","ban"].includes(sanction?.action);
          const question=decision==="accepted"
            ?willRestore?"¿Aceptar la apelación y levantar la sanción si sigue siendo la vigente?"
              :"¿Aceptar esta apelación y dejar constancia en el historial?"
            :"¿Rechazar esta apelación?";
          if(!confirm(question))return;
          accept.disabled=reject.disabled=true;
          feedback(status,"Guardando revisión…");
          try{
            const result=await invoke({action:"decide",appeal_id:record.id,decision,note:explanation});
            feedback(status,"✅ Resolución guardada."+
              (result.restored?" Se ha levantado el bloqueo.":"")+
              (!result.notified?" No se pudo confirmar el correo de aviso.":""));
            await loadStaff(panel);
          }catch(error){
            feedback(status,error.message,true);accept.disabled=reject.disabled=false;
          }
        };
        accept.onclick=()=>decide("accepted");reject.onclick=()=>decide("rejected");
        if(sanction?.action==="ban"&&!staffCache.is_admin){
          accept.disabled=reject.disabled=true;
          status.textContent="Solo un administrador puede resolver apelaciones de expulsiones.";
        }
        actions.append(accept,reject);form.append(actions,status);card.append(form);
      }else{
        card.append(el("p","sb-appeal-review-note","Resolución: "+(record.review_note||"Sin observaciones")));
        card.append(el("small","","Revisada por: "+name(record.reviewer_id)+" · "+date(record.reviewed_at)));
      }
      card.append(threadPanel(record.id));
      host.append(card);
    }
  }
  async function mountStaff(){
    const dashboard=document.querySelector("#admin-root .admin-dashboard");
    if(!dashboard||document.getElementById("sb-appeals-staff"))return;
    const panel=el("section","admin-panel sb-appeals-staff");
    panel.id="sb-appeals-staff";
    panel.innerHTML=`
      <div class="admin-panel-heading">
        <div><span class="admin-kicker">JUSTICIA Y MODERACIÓN</span>
          <h2>⚖️ Apelaciones de sanciones <span id="sb-appeals-pending-count" class="sb-appeals-count" aria-live="polite">… pendientes</span></h2>
          <p>Revisa las solicitudes de los miembros. Cada decisión exige un motivo y queda registrada.</p>
        </div><button id="sb-appeals-reload" class="admin-secondary" type="button">🔄 Actualizar</button>
      </div>
      <div class="sb-appeals-advanced-filters" role="search" aria-label="Buscar y filtrar apelaciones">
        <label>Estado
          <select id="sb-appeals-filter">
            <option value="pending">Pendientes</option>
            <option value="all">Todas</option>
            <option value="accepted">Aceptadas</option>
            <option value="rejected">Rechazadas</option>
          </select>
        </label>
        <label>Buscar miembro
          <input type="search" id="sb-appeals-search" maxlength="80"
            placeholder="Nombre, usuario o ID" autocomplete="off">
        </label>
        <label>Desde
          <input type="date" id="sb-appeals-from">
        </label>
        <label>Hasta
          <input type="date" id="sb-appeals-to">
        </label>
        <label>Asignación
          <select id="sb-appeals-assigned-filter">
            <option value="all">Todos los responsables</option>
            <option value="unassigned">Sin asignar</option>
            <option value="mine">Asignadas a mí</option>
          </select>
        </label>
        <div class="sb-appeals-filter-actions">
          <button id="sb-appeals-apply" class="gradient-btn mini" type="button">🔍 Buscar</button>
          <button id="sb-appeals-clear" class="outline-btn mini" type="button">Limpiar filtros</button>
        </div>
      </div>
      <h3>📊 Estadísticas de apelaciones</h3>
      <div id="sb-appeal-statistics" class="sb-appeal-statistics" aria-live="polite">Cargando estadísticas…</div>
      <p class="sb-appeal-hint">Las solicitudes pendientes durante más de 24 horas generan un aviso automático para el equipo.</p>
      <p id="sb-appeals-staff-status" role="status" aria-live="polite"></p>
      <div id="sb-appeals-staff-list" class="sb-appeals-stack">Cargando…</div>
      <nav class="sb-appeals-pagination" aria-label="Páginas de apelaciones">
        <button id="sb-appeals-previous" class="outline-btn mini" type="button" disabled>Anterior</button>
        <span id="sb-appeals-page-info">Página 1</span>
        <button id="sb-appeals-next" class="outline-btn mini" type="button" disabled>Siguiente</button>
      </nav>
    `;
    const sanction=dashboard.querySelector("#sb-sanction-panel");
    const welcome=dashboard.querySelector(".admin-welcome");
    if(sanction)sanction.after(panel);
    else if(welcome)welcome.after(panel);
    else dashboard.prepend(panel);
    const filter=selector=>panel.querySelector(selector);
    const loadFirst=()=>loadStaff(panel,0);
    filter("#sb-appeals-filter").addEventListener("change",loadFirst);
    filter("#sb-appeals-assigned-filter").addEventListener("change",loadFirst);
    filter("#sb-appeals-apply").addEventListener("click",loadFirst);
    filter("#sb-appeals-search").addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();loadFirst();}
    });
    for(const id of ["#sb-appeals-from","#sb-appeals-to"])
      filter(id).addEventListener("change",loadFirst);
    filter("#sb-appeals-clear").addEventListener("click",()=>{
      filter("#sb-appeals-filter").value="pending";
      filter("#sb-appeals-search").value="";
      filter("#sb-appeals-from").value="";
      filter("#sb-appeals-to").value="";
      filter("#sb-appeals-assigned-filter").value="all";
      loadFirst();
    });
    filter("#sb-appeals-previous").addEventListener("click",()=>{
      if(staffCache?.page>0)void loadStaff(panel,staffCache.page-1);
    });
    filter("#sb-appeals-next").addEventListener("click",()=>{
      if(staffCache && (staffCache.page+1)*staffCache.per_page<staffCache.total)
        void loadStaff(panel,staffCache.page+1);
    });
    filter("#sb-appeals-reload").addEventListener("click",()=>{
      loadStaff(panel,staffCache?.page||0);
    });
    await loadStaff(panel);
    const focus=new URLSearchParams(location.hash.split("?")[1]||"").get("focus");
    if(focus==="appeals"&&panel.isConnected)panel.scrollIntoView({block:"start",behavior:"smooth"});
  }
  window.SBAppeals={mountPublic,mountAccount,mountStaff,refreshPendingCount};
  window.addEventListener("focus",()=>{
    const panel=document.getElementById("sb-appeals-staff");
    if(panel){void refreshPendingCount();void loadStaffStatistics(panel);}
  });
})();
