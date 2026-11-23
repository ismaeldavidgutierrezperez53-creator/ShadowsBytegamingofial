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

  // Progreso por hechos registrados: enviada, asignada al equipo y resuelta.
  // Es un indicador de etapas, no una estimación del tiempo restante.
  function appealTracking(appeal){
    const decided=["accepted","rejected"].includes(appeal?.status);
    const assigned=Boolean(appeal?.assigned_at);
    const stage=decided?3:assigned?2:1;
    const wrapper=el("section","sb-appeal-tracking");
    wrapper.setAttribute("aria-label","Seguimiento de la apelación");
    wrapper.dataset.stage=String(stage);
    const title=el("div","sb-appeal-tracking-heading");
    const state=decided?(appeal.status==="accepted"?"✅ Resuelta: aceptada":"❌ Resuelta: rechazada"):
      assigned?"🔎 En revisión por el equipo":"📨 Enviada, pendiente de asignación";
    title.append(el("strong","", "📍 Seguimiento de la apelación"),
      el("span","sb-appeal-tracking-current",state));
    const track=el("div","sb-appeal-tracking-track");
    track.setAttribute("role","progressbar");
    track.setAttribute("aria-label","Etapas de la apelación");
    track.setAttribute("aria-valuemin","0");
    track.setAttribute("aria-valuemax","3");
    track.setAttribute("aria-valuenow",String(stage));
    track.setAttribute("aria-valuetext","Etapa "+stage+" de 3: "+(stage===1?"Enviada":stage===2?"En revisión":"Resuelta"));
    const fill=el("div","sb-appeal-tracking-fill");
    fill.style.width=(stage/3*100)+"%";
    fill.setAttribute("aria-hidden","true");
    track.append(fill);
    const steps=el("ol","sb-appeal-tracking-steps");
    const info=[
      ["Enviada","Recibida: "+date(appeal?.created_at)],
      ["En revisión",assigned?"Asignada al equipo: "+date(appeal.assigned_at):
        decided?"Etapa completada (sin fecha de asignación)":"Aún no asignada al equipo"],
      ["Resuelta",decided?(appeal.status==="accepted"?"Aceptada":"Rechazada")+
        " · "+(appeal.reviewed_at?date(appeal.reviewed_at):"Fecha no disponible"):
        "Pendiente de decisión"]
    ];
    info.forEach(([label,detail],index)=>{
      const item=el("li","sb-appeal-tracking-step "+
        (index+1<stage?"is-complete":index+1===stage?"is-current":"is-upcoming"));
      const dot=el("span","sb-appeal-tracking-dot",index+1<stage?"✓":String(index+1));
      dot.setAttribute("aria-hidden","true");
      const words=el("span","sb-appeal-tracking-copy");
      words.append(el("strong","",label),el("small","",detail));
      item.append(dot,words);
      steps.append(item);
    });
    wrapper.append(title,track,steps);
    return wrapper;
  }

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
          if(accessToken && data.appeal)notes.append(appealTracking(data.appeal));
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
      const assignmentStatus=panel.querySelector("#sb-appeals-assignment-overview-status");
      if(assignmentStatus){
        const pending=stats.pending||0;
        assignmentStatus.textContent=staffCache?.is_admin
          ?pending===0
            ?"No hay apelaciones pendientes para asignar. El botón «Guardar responsable» aparecerá dentro de una apelación cuando un miembro presente una nueva solicitud."
            :"Hay "+pending+" apelación"+(pending===1?"":"es")+" pendiente"+(pending===1?"":"s")+". Abre una solicitud para elegir su responsable y guardar la asignación."
          :"Los moderadores pueden consultar quién está asignado a cada apelación, pero solo los administradores pueden cambiar el responsable.";
      }
    }catch(error){host.textContent="No se pudieron cargar las estadísticas: "+error.message;}
  }

  async function loadTeamStatistics(panel){
    const host=panel?.querySelector("#sb-appeals-team-stats");
    const mine=panel?.querySelector("#sb-appeals-mine-total");
    if(!host||!panel.isConnected)return;
    host.textContent="Cargando estadísticas del equipo…";
    try{
      const result=await invoke({action:"staff_team_stats"});
      if(!panel.isConnected)return;
      const members=result.members||[];
      if(mine)mine.textContent=String(members.find(m=>m.id===result.my_id)?.pending||0);
      host.replaceChildren();
      const hint=el("p","sb-appeal-hint",
        "Pendientes: expedientes asignados actualmente. Resueltas: decisiones aceptadas o rechazadas por cada miembro del equipo.");
      host.append(hint);
      if(!members.length){
        host.append(el("p","","No hay miembros con permisos de moderación activos."));
        return;
      }
      const scroll=el("div","sb-appeal-stats-scroll");
      const table=el("table","sb-appeal-team-table");
      const header=el("thead");
      const headRow=el("tr");
      for(const title of ["Miembro","Pendientes","Más de 24 h","Aceptadas","Rechazadas","Resueltas"]){
        headRow.append(el("th","",title));
      }
      header.append(headRow);table.append(header);
      const body=el("tbody");
      for(const person of members){
        const tr=el("tr",person.id===result.my_id?"sb-appeal-team-self":"");
        const name=person.name+(person.id===result.my_id?" (tú)":"")+
          " · "+(person.role==="moderator"?"Moderador":"Administrador");
        const resolved=(person.accepted||0)+(person.rejected||0);
        for(const value of [name,person.pending||0,person.overdue||0,
          person.accepted||0,person.rejected||0,resolved]){
          tr.append(el("td","",String(value)));
        }
        body.append(tr);
      }
      table.append(body);scroll.append(table);host.append(scroll);
    }catch(error){feedback(host,"No se pudieron cargar las estadísticas del equipo: "+error.message,true);}
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

  // Historial integral: utiliza el mismo control de acceso del backend que el chat de apelaciones.
  async function mountHistory(panel){
    if(panel.querySelector("#sb-appeals-history"))return;
    const history=el("section","sb-appeals-history");
    history.id="sb-appeals-history";
    const title=el("h3","","📜 Historial completo de apelaciones");
    const intro=el("p","sb-appeal-hint","Consulta solicitudes, fechas, decisiones y conversaciones anteriores.");
    const controls=el("div","sb-appeals-history-controls");
    const label=el("label","","Estado");
    const filter=el("select","sb-appeals-history-filter");
    filter.setAttribute("aria-label","Filtrar historial de apelaciones por estado");
    for(const [key,name] of [
      ["all","Todas"],["pending","Pendientes"],["accepted","Aceptadas"],["rejected","Rechazadas"]
    ]){
      const option=el("option","",name);option.value=key;filter.append(option);
    }
    label.append(filter);
    const all=el("button","outline-btn mini","Ver todas");
    all.type="button";all.hidden=true;
    const refreshTracking=el("button","outline-btn mini sb-appeal-tracking-refresh","🔄 Actualizar seguimiento");
    refreshTracking.type="button";
    controls.append(label,all,refreshTracking);
    const summary=el("p","sb-appeals-history-summary","Cargando historial…");
    summary.setAttribute("role","status");
    const list=el("div","sb-appeals-history-list");
    const paging=el("nav","sb-appeals-history-pagination");
    paging.setAttribute("aria-label","Páginas del historial de apelaciones");
    const prev=el("button","outline-btn mini","Anterior");
    const next=el("button","outline-btn mini","Siguiente");
    prev.type=next.type="button";
    const pages=el("span","","");
    paging.append(prev,pages,next);
    // Tarjetas privadas: los totales exactos vienen del servidor, no de la página actual.
    const statsGrid=el("div","sb-appeals-stats");
    statsGrid.setAttribute("role","group");
    statsGrid.setAttribute("aria-label","Estadísticas personales de apelaciones");
    const statsNote=el("p","sb-appeals-stats-note","Cargando estadísticas…");
    statsNote.setAttribute("role","status");
    const statCards=new Map();
    for(const [key,label,field] of [
      ["all","📂 Total de apelaciones","total"],
      ["pending","🕒 Pendientes","pending"],
      ["accepted","✅ Aceptadas","accepted"],
      ["rejected","❌ Rechazadas","rejected"]
    ]){
      const button=el("button","sb-appeals-stat-card");
      button.type="button";
      button.dataset.status=key;
      button.setAttribute("aria-pressed",String(key==="all"));
      const count=el("strong","sb-appeals-stat-number","—");
      button.append(el("span","sb-appeals-stat-label",label),count);
      statsGrid.append(button);
      statCards.set(key,{button,count,field});
    }
    const refreshStats=el("button","outline-btn mini sb-appeals-refresh-stats","🔄 Actualizar estadísticas");
    refreshStats.type="button";
    const downloadStats=el("button","outline-btn mini sb-appeals-download-stats","📄 Descargar estadísticas en PDF");
    downloadStats.type="button";
    downloadStats.setAttribute("aria-label","Descargar informe privado de estadísticas de apelaciones en PDF");
    const statsActions=el("div","sb-appeals-stats-actions");
    statsActions.append(statsNote,refreshStats,downloadStats);
    const charts=el("div","sb-appeals-charts");
    const distribution=el("section","sb-appeals-chart-panel");
    distribution.setAttribute("aria-label","Distribución de apelaciones por estado");
    const distHeading=el("h4","","📊 Porcentaje de apelaciones por estado");
    const distDescription=el("p","sb-appeals-chart-description",
      "Proporción entre pendientes, aceptadas y rechazadas.");
    const distBar=el("div","sb-appeals-share-bar");
    distBar.setAttribute("role","img");
    const distLegend=el("ul","sb-appeals-chart-legend");
    distribution.append(distHeading,distDescription,distBar,distLegend);
    const evolution=el("section","sb-appeals-chart-panel");
    evolution.setAttribute("aria-label","Evolución mensual de solicitudes de apelación");
    const evolutionHeading=el("h4","","📅 Evolución mensual de solicitudes");
    const evolutionDescription=el("p","sb-appeals-chart-description",
      "Apelaciones presentadas cada mes durante los últimos 12 meses (UTC).");
    const monthScroller=el("div","sb-appeals-month-scroll");
    monthScroller.setAttribute("tabindex","0");
    monthScroller.setAttribute("aria-label","Gráfico de solicitudes de los últimos 12 meses, desplazable");
    const monthChart=el("div","sb-appeals-month-chart");
    monthChart.setAttribute("role","list");
    monthScroller.append(monthChart);
    const monthNote=el("p","sb-appeals-chart-description","");
    evolution.append(evolutionHeading,evolutionDescription,monthScroller,monthNote);
    charts.append(distribution,evolution);
    history.append(title,intro,statsGrid,statsActions,charts,controls,summary,list,paging);
    panel.insertBefore(history,panel.querySelector(".sb-appeals-eligible-heading")||panel.querySelector(".sb-appeals-stack"));
    const hashParams=new URLSearchParams(location.hash.split("?")[1]||"");
    let focused=hashParams.get("focus")==="appeals" ? hashParams.get("appeal")||"" : "";
    let currentPage=0,requestSeq=0;
    const markSelected=()=>{
      for(const [key,{button}] of statCards)
        button.setAttribute("aria-pressed",String(!focused&&filter.value===key));
    };
    const percentageLabel=new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
    const monthLabel=new Intl.DateTimeFormat("es-ES",{month:"short",year:"2-digit",timeZone:"UTC"});
    const renderCharts=data=>{
      const stats=data?.stats||{};
      const total=Math.max(0,Number(stats.total)||0);
      distBar.replaceChildren();
      distLegend.replaceChildren();
      const shareNames=[
        ["pending","Pendientes"],["accepted","Aceptadas"],["rejected","Rechazadas"]
      ];
      const labels=[];
      for(const [status,name] of shareNames){
        const count=Math.max(0,Number(stats[status])||0);
        const percent=total>0?Math.min(100,100*count/total):0;
        const display=percentageLabel.format(percent)+" %";
        labels.push(name+": "+display);
        if(count>0){
          const segment=el("span","sb-appeals-share-segment sb-appeals-share-"+status);
          segment.style.width=percent+"%";
          segment.title=name+": "+count+" ("+display+")";
          segment.setAttribute("aria-hidden","true");
          distBar.append(segment);
        }
        const li=el("li","sb-appeals-legend-item");
        const dot=el("span","sb-appeals-legend-dot sb-appeals-share-"+status);
        dot.setAttribute("aria-hidden","true");
        li.append(dot,el("span","",name+": "+count+" · "+display));
        distLegend.append(li);
      }
      if(total===0){
        const empty=el("span","sb-appeals-share-no-data");
        empty.textContent="Sin datos todavía";
        distBar.append(empty);
      }
      distBar.setAttribute("aria-label",total
        ?"Distribución de "+total+" apelaciones. "+labels.join(". ")
        :"Sin apelaciones registradas");
      monthChart.replaceChildren();
      const series=Array.isArray(data?.monthly)?data.monthly:[];
      const max=Math.max(1,...series.map(item=>Math.max(0,Number(item.total)||0)));
      const sum=series.reduce((acc,item)=>acc+Math.max(0,Number(item.total)||0),0);
      for(const item of series){
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(item.month)))continue;
        const dateObj=new Date(item.month+"-01T00:00:00Z");
        const month=monthLabel.format(dateObj);
        const count=Math.max(0,Number(item.total)||0);
        const column=el("div","sb-appeals-month-column");
        column.setAttribute("role","listitem");
        column.setAttribute("aria-label",month+": "+count+" apelaciones");
        const value=el("strong","sb-appeals-month-value",String(count));
        const track=el("div","sb-appeals-month-track");
        const bar=el("span","sb-appeals-month-bar");
        bar.style.height=(count===0?0:100*count/max)+"%";
        bar.setAttribute("aria-hidden","true");
        track.append(bar);
        column.append(value,track,el("span","sb-appeals-month-label",month));
        monthChart.append(column);
      }
      monthNote.textContent=sum===0
        ?"Todavía no hay solicitudes registradas en este periodo."
        :"Total de solicitudes presentadas en el periodo: "+sum+".";
    };
    const loadStats=async()=>{
      refreshStats.disabled=true;
      statsNote.textContent="Actualizando estadísticas…";
      try{
        const data=await invoke({action:"my_stats"});
        if(!history.isConnected)return;
        for(const {count,field} of statCards.values())
          count.textContent=String(data.stats?.[field]??"—");
        renderCharts(data);
        statsNote.textContent="Datos privados de tu cuenta, actualizados.";
      }catch(error){
        if(history.isConnected)
          statsNote.textContent="No se pudieron cargar las estadísticas: "+error.message;
      }finally{
        if(refreshStats.isConnected)refreshStats.disabled=false;
      }
    };
    const load=async()=>{
      const seq=++requestSeq;
      refreshTracking.disabled=true;
      summary.textContent="Cargando historial…";
      prev.disabled=next.disabled=true;
      try{
        const payload={action:"my_history",status:filter.value,page:currentPage};
        if(focused)payload.appeal_id=focused;
        const result=await invoke(payload);
        if(!history.isConnected||seq!==requestSeq)return;
        list.replaceChildren();
        const records=result.history||[];
        const sanctions=new Map((result.sanctions||[]).map(s=>[s.id,s]));
        all.hidden=!focused;
        if(!records.length){
          const empty=el("p","sb-appeals-history-empty",
            focused?"Este expediente no está disponible en tu historial.":
            filter.value==="all"?"Todavía no has presentado ninguna apelación.":
            "No hay apelaciones con este estado.");
          list.append(empty);
        }
        for(const record of records){
          const card=el("article","sb-appeals-history-card");
          card.dataset.appealId=record.id;
          card.dataset.status=record.status;
          card.tabIndex=-1;
          const sanction=sanctions.get(record.sanction_event_id);
          const top=el("div","sb-appeals-history-top");
          const kind=el("strong","",kinds[sanction?.action]||"Sanción");
          const state=el("span","sb-appeals-history-state",outcomes[record.status]||record.status);
          top.append(kind,state);
          card.append(top,appealTracking(record),
            el("p","","📅 Solicitud enviada: "+date(record.created_at)),
            el("p","","📝 Tu explicación: "+record.reason));
          if(sanction){
            card.append(el("p","","📌 Motivo original: "+sanction.reason));
          }
          if(record.status==="pending"){
            card.append(el("p","sb-appeal-hint","Pendiente de revisión por el equipo."));
          }else{
            card.append(el("p","","🗓️ Resolución: "+date(record.reviewed_at)));
            card.append(el("p","sb-appeal-review-note",
              "🛡️ Respuesta del equipo: "+(record.review_note||"Sin explicación registrada")));
          }
          card.append(threadPanel(record.id));
          list.append(card);
        }
        const total=result.total||0,perPage=result.per_page||10;
        const totalPages=Math.max(1,Math.ceil(total/perPage));
        summary.textContent=focused?"Mostrando el expediente seleccionado.":total+
          " apelación"+(total===1?"":"es")+" · "+(filter.options[filter.selectedIndex]?.textContent||"Todas");
        pages.textContent=focused?"Expediente seleccionado":"Página "+(result.page+1)+" de "+totalPages;
        paging.hidden=!!focused||total===0;
        prev.disabled=!!focused||currentPage===0;
        next.disabled=!!focused||(currentPage+1)*perPage>=total;
        if(focused&&records.length){
          requestAnimationFrame(()=>{
            const target=list.querySelector("[data-appeal-id]");
            if(target?.isConnected){
              target.scrollIntoView({block:"center",behavior:"smooth"});
              target.focus({preventScroll:true});
            }
          });
        }
      }catch(error){
        if(!history.isConnected||seq!==requestSeq)return;
        summary.textContent="No se pudo cargar el historial: "+error.message;
        paging.hidden=true;
      }finally{
        if(history.isConnected&&seq===requestSeq)refreshTracking.disabled=false;
      }
    };
    refreshTracking.onclick=()=>{void load();};
    filter.onchange=()=>{focused="";currentPage=0;markSelected();void load();};
    all.onclick=()=>{focused="";currentPage=0;filter.value="all";markSelected();void load();};
    for(const [key,{button}] of statCards)
      button.onclick=()=>{focused="";filter.value=key;currentPage=0;markSelected();void load();};
    refreshStats.onclick=()=>{void loadStats();};
    downloadStats.onclick=async()=>{
      if(downloadStats.disabled)return;
      downloadStats.disabled=true;
      const oldLabel=downloadStats.textContent;
      downloadStats.textContent="Preparando PDF…";
      statsNote.textContent="Consultando tus estadísticas para generar el informe…";
      try{
        // Se vuelven a consultar los datos privados: nunca exportar solo la página visible.
        const data=await invoke({action:"my_stats"});
        if(!history.isConnected)return;
        const exporter=window.SBAppealStatsPDF;
        if(!exporter||typeof exporter.download!=="function")
          throw new Error("El módulo de PDF no está disponible. Actualiza la página.");
        exporter.download(data);
        statsNote.textContent="✅ Informe PDF preparado. Comprueba las descargas del navegador.";
      }catch(error){
        if(history.isConnected)
          statsNote.textContent="No se pudo generar el PDF: "+(error?.message||"error desconocido");
      }finally{
        if(downloadStats.isConnected){
          downloadStats.disabled=false;
          downloadStats.textContent=oldLabel;
        }
      }
    };
    prev.onclick=()=>{if(currentPage>0){currentPage--;void load();}};
    next.onclick=()=>{currentPage++;void load();};
    markSelected();
    await Promise.all([load(),loadStats()]);
  }

  async function mountAccount(){
    const page=document.querySelector(".sb-account-page");
    if(!page||document.getElementById("sb-my-appeals"))return;
    const panel=el("section","section sb-appeals-account");
    panel.id="sb-my-appeals";
    panel.append(el("h2","", "🛡️ Mis apelaciones"),el("p","","Puedes solicitar una revisión y consultar la decisión del equipo."));
    const eligibleHeading=el("h3","sb-appeals-eligible-heading","⚖️ Solicitar una apelación");
    const content=el("div","sb-appeals-stack","Cargando tus sanciones apelables…");
    panel.append(eligibleHeading,content);
    page.append(panel);
    try{
      const result=await invoke({action:"my_list"});
      if(!panel.isConnected)return;
      const appeals=new Map((result.appeals||[]).map(a=>[a.sanction_event_id,a]));
      content.replaceChildren();
      const events=(result.events||[]).filter(event=>usable(event)&&!appeals.has(event.id));
      if(!events.length){
        const empty=el("div","sb-appeals-empty");
        const icon=el("span","sb-appeals-empty-icon","✓");
        icon.setAttribute("aria-hidden","true");
        const copy=el("div","sb-appeals-empty-copy");
        copy.append(
          el("h3","","No tienes sanciones pendientes de apelación"),
          el("p","","Si recibes una sanción apelable, aparecerá aquí. Tus solicitudes anteriores se conservan en el historial.")
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
          card.dataset.appealId=prior.id;
          card.tabIndex=-1;
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
    await mountHistory(panel);
    const focusParams=new URLSearchParams(location.hash.split("?")[1]||"");
    if(focusParams.get("focus")==="appeals"){
      requestAnimationFrame(()=>{
        if(!panel.isConnected)return;
        const appealId=focusParams.get("appeal");
        const target=appealId?[...panel.querySelectorAll("[data-appeal-id]")].find(card=>card.dataset.appealId===appealId):null;
        (target||panel).scrollIntoView({block:target?"center":"start",behavior:"smooth"});
        if(target)target.focus({preventScroll:true});
      });
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
      void loadTeamStatistics(panel);
    }catch(error){
      if(seq!==staffRequest)return;
      host.textContent="No se pudo cargar la bandeja.";
      feedback(status,error.message,true);
    }
  }
  // The assignment becomes due 24 hours after it was saved. The cron
  // checks at minute 15 of each UTC hour, so its first possible run may
  // be up to 59m59s later. This UI is indicative, not proof of delivery.
  const appealReminderWindow=timestamp=>{
    const assignedAt=Date.parse(timestamp||"");
    if(!Number.isFinite(assignedAt))return null;
    const eligibleAt=assignedAt+24*60*60*1000;
    const hour=60*60*1000,minute15=15*60*1000;
    const scheduledAt=Math.ceil((eligibleAt-minute15)/hour)*hour+minute15;
    return {eligibleAt,scheduledAt};
  };
  const formatAppealCountdown=remaining=>{
    const seconds=Math.max(0,Math.ceil(remaining/1000));
    const hours=Math.floor(seconds/3600);
    const mins=Math.floor((seconds%3600)/60);
    const secs=seconds%60;
    return String(hours).padStart(2,"0")+":"+
      String(mins).padStart(2,"0")+":"+
      String(secs).padStart(2,"0");
  };
  function updateAppealReminderCountdowns(panel){
    if(!panel?.isConnected)return;
    const now=Date.now();
    for(const node of panel.querySelectorAll(".sb-appeal-reminder-countdown[data-scheduled-at]")){
      const scheduled=Number(node.dataset.scheduledAt);
      const eligible=Number(node.dataset.eligibleAt);
      const output=node.querySelector(".sb-appeal-reminder-clock");
      if(!output || !Number.isFinite(scheduled) || !Number.isFinite(eligible))continue;
      node.dataset.state=now>=scheduled?"elapsed":now>=eligible?"eligible":"waiting";
      if(now>=scheduled){
        output.textContent="⏰ Revisión programada hace "+
          formatAppealCountdown(now-scheduled)+" · comprueba el aviso 🔔";
      }else{
        output.textContent=(now>=eligible
          ?"⏰ Próxima revisión automática en "
          :"⏳ Recordatorio estimado en ")+formatAppealCountdown(scheduled-now);
      }
    }
  }
  // The app rebuilds its admin panel during navigation. Keep a single
  // timer and locate the current panel at each tick; never retain a stale
  // detached element, which previously stopped the countdown permanently.
  let reminderCountdownInterval=null;
  function refreshAppealCountdowns(){
    const active=document.getElementById("sb-appeals-staff");
    if(active?.isConnected)updateAppealReminderCountdowns(active);
  }
  function startAppealCountdowns(){
    if(reminderCountdownInterval===null){
      reminderCountdownInterval=setInterval(refreshAppealCountdowns,1000);
    }
    refreshAppealCountdowns();
  }
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)refreshAppealCountdowns();
  });
  window.addEventListener("pageshow",refreshAppealCountdowns);
  function drawStaff(panel){
    const host=panel.querySelector("#sb-appeals-staff-list");
    if(!host||!staffCache)return;
    const people=new Map((staffCache.profiles||[]).map(p=>[p.id,p]));
    const sanctions=new Map((staffCache.sanctions||[]).map(p=>[p.id,p]));
    const name=id=>{const p=people.get(id);return p?.display_name||p?.username||(id?id.slice(0,8)+"…":"Sin usuario");};
    const rows=staffCache.appeals||[];
    host.replaceChildren();
    if(!rows.length){
      const info=el("div","sb-appeals-empty sb-appeals-assign-empty");
      const copy=el("div","sb-appeals-empty-copy");
      const unfiltered=panel.querySelector("#sb-appeals-filter")?.value==="pending" &&
        !panel.querySelector("#sb-appeals-search")?.value &&
        !panel.querySelector("#sb-appeals-from")?.value &&
        !panel.querySelector("#sb-appeals-to")?.value &&
        panel.querySelector("#sb-appeals-assigned-filter")?.value==="all";
      copy.append(
        el("h3","",unfiltered?"📭 No hay apelaciones pendientes":"🔍 Sin resultados"),
        el("p","",unfiltered
          ?"Para asignar un responsable, primero debe llegar una apelación real de un miembro. Cuando aparezca aquí, podrás seleccionar un administrador o moderador y pulsar «Guardar responsable»."
          :"No hay apelaciones que coincidan con estos filtros. Puedes elegir «Todas» o limpiar los filtros.")
      );
      info.append(copy);host.append(info);return;
    }
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
          if(member.role==="moderator" && (
            sanction?.action==="ban" || sanction?.actor_id===member.user_id
          ))continue;
          const kind=member.role==="moderator"?"Moderador":"Administrador";
          select.add(new Option(name(member.user_id)+" · "+kind,member.user_id));
        }
        select.value=record.assigned_to||"";
        const save=el("button","admin-secondary mini",record.assigned_to?"🔄 Transferir responsable":"💾 Guardar responsable");
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
      if(record.status==="pending"){
        const reminder=el("div","sb-appeal-reminder-countdown");
        if(record.assigned_to && record.assigned_at){
          const windowTimes=appealReminderWindow(record.assigned_at);
          if(windowTimes){
            reminder.dataset.scheduledAt=String(windowTimes.scheduledAt);
            reminder.dataset.eligibleAt=String(windowTimes.eligibleAt);
            reminder.append(
              el("strong","sb-appeal-reminder-heading","🔔 Recordatorio al responsable"),
              el("span","sb-appeal-reminder-clock","Calculando tiempo restante…"),
              el("small","sb-appeal-reminder-description",
                "Plazo de 24 h: "+date(new Date(windowTimes.eligibleAt).toISOString())+
                ". Revisión automática prevista: "+
                date(new Date(windowTimes.scheduledAt).toISOString())+
                ". Horario estimado; la recepción depende del servicio de notificaciones.")
            );
          }
        }else{
          reminder.append(
            el("strong","sb-appeal-reminder-heading","🔔 Recordatorio al responsable"),
            el("span","sb-appeal-reminder-clock","Sin responsable asignado"),
            el("small","sb-appeal-reminder-description",
              "Asigna la apelación a un administrador o moderador para iniciar el contador de 24 horas.")
          );
          reminder.dataset.state="unassigned";
        }
        card.append(reminder);
      }
      const assignmentHistory=el("details","sb-appeal-transfer-log");
      const historyToggle=el("summary","",
        "🔄 Historial de asignaciones y transferencias");
      const historyContent=el("div","sb-appeal-transfer-log-content");
      assignmentHistory.append(historyToggle,historyContent);
      let loadedTransfers=false,loadingTransfers=false;
      assignmentHistory.addEventListener("toggle",async()=>{
        if(!assignmentHistory.open||loadedTransfers||loadingTransfers)return;
        loadingTransfers=true;
        historyContent.textContent="Consultando el historial…";
        try{
          const data=await invoke({action:"assignment_history",appeal_id:record.id});
          if(!assignmentHistory.isConnected)return;
          loadedTransfers=true;
          historyContent.replaceChildren();
          const names=new Map((data.profiles||[]).map(p=>
            [p.id,p.display_name||p.username||p.id.slice(0,8)+"…"]));
          const label=id=>id?(names.get(id)||id.slice(0,8)+"…"):"Sin asignar";
          if(!data.history?.length){
            historyContent.append(el("p","","Todavía no hay cambios de responsable."));
          }else{
            for(const item of data.history){
              const row=el("p","sb-appeal-transfer-log-row");
              row.append(el("strong","",date(item.created_at)+" · "+label(item.changed_by)),
                el("span","","De "+label(item.previous_assignee)+" a "+label(item.new_assignee)));
              historyContent.append(row);
            }
          }
          if(data.has_more)historyContent.append(el("p","sb-appeal-hint",
            "Se muestran los 30 cambios más recientes. El PDF del expediente conserva el historial completo."));
        }catch(error){historyContent.textContent="No se pudo cargar el historial: "+error.message;}
        finally{loadingTransfers=false;}
      });
      card.append(assignmentHistory);
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
    updateAppealReminderCountdowns(panel);
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
      <section class="sb-appeals-assignment-overview" aria-labelledby="sb-appeals-assign-heading">
        <h3 id="sb-appeals-assign-heading">👑 Asignar responsable de una apelación</h3>
        <p id="sb-appeals-assignment-overview-status" role="status" aria-live="polite">Comprobando las apelaciones pendientes…</p>
        <button id="sb-appeals-show-pending" class="outline-btn mini" type="button">📋 Ver apelaciones pendientes</button>
      </section>
      <section class="sb-appeals-mine" aria-label="Mis expedientes asignados">
        <div>
          <h3>📋 Mis apelaciones asignadas <span id="sb-appeals-mine-total" class="sb-appeals-count">…</span></h3>
          <p>Consulta las apelaciones pendientes de las que eres responsable.</p>
        </div>
        <button id="sb-appeals-show-mine" type="button" class="gradient-btn mini">Ver mis expedientes</button>
      </section>
      <h3>📊 Estadísticas de apelaciones</h3>
      <div id="sb-appeal-statistics" class="sb-appeal-statistics" aria-live="polite">Cargando estadísticas…</div>
      <h3>📊 Estadísticas por administrador y moderador</h3>
      <div id="sb-appeals-team-stats" class="sb-appeals-team-stats" aria-live="polite">Cargando equipo…</div>
      <p class="sb-appeal-hint">Una apelación asignada sin resolver durante 24 horas genera un único recordatorio privado para su responsable. Si se transfiere, el nuevo responsable recibe su propio plazo.</p>
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
    filter("#sb-appeals-show-mine").addEventListener("click",()=>{
      filter("#sb-appeals-filter").value="pending";
      filter("#sb-appeals-assigned-filter").value="mine";
      filter("#sb-appeals-search").value="";
      filter("#sb-appeals-from").value="";
      filter("#sb-appeals-to").value="";
      loadFirst();
      filter("#sb-appeals-staff-list").scrollIntoView({block:"start",behavior:"smooth"});
    });
    filter("#sb-appeals-show-pending").addEventListener("click",()=>{
      filter("#sb-appeals-filter").value="pending";
      filter("#sb-appeals-assigned-filter").value="all";
      filter("#sb-appeals-search").value="";
      filter("#sb-appeals-from").value="";
      filter("#sb-appeals-to").value="";
      loadFirst();
      filter("#sb-appeals-staff-list").scrollIntoView({block:"start",behavior:"smooth"});
    });
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
    startAppealCountdowns();
    await loadStaff(panel);
    const focus=new URLSearchParams(location.hash.split("?")[1]||"").get("focus");
    if(focus==="appeals"&&panel.isConnected)panel.scrollIntoView({block:"start",behavior:"smooth"});
  }
  window.SBAppeals={mountPublic,mountAccount,mountStaff,refreshPendingCount};
  window.addEventListener("focus",()=>{
    const panel=document.getElementById("sb-appeals-staff");
    if(panel){
      refreshAppealCountdowns();
      void refreshPendingCount();
      void loadStaffStatistics(panel);
      void loadTeamStatistics(panel);
    }
  });
})();
