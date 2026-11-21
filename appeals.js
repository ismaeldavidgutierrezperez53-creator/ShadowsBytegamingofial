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
      const events=(result.events||[]).filter(usable);
      if(!events.length){
        content.append(el("p","","No hay sanciones recientes que puedas apelar."));
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
      content.append(el("p","sb-appeal-hint","Si tu cuenta está bloqueada y no puedes iniciar sesión, usa el formulario de apelaciones por correo."));
      const link=el("a","outline-btn mini","📩 Apelar con código de correo");
      link.href="#/apelaciones";content.append(link);
    }catch(error){
      content.textContent="No se pudieron cargar las apelaciones: "+error.message;
    }
  }

  let staffCache=null;
  async function loadStaff(panel){
    const host=panel.querySelector("#sb-appeals-staff-list");
    const status=panel.querySelector("#sb-appeals-staff-status");
    if(!host)return;
    host.textContent="Cargando apelaciones…";
    try{
      staffCache=await invoke({action:"staff_list"});
      if(!host.isConnected)return;
      feedback(status,"Apelaciones actualizadas.");
      drawStaff(panel);
    }catch(error){host.textContent="No se pudo cargar la bandeja.";feedback(status,error.message,true);}
  }
  function drawStaff(panel){
    const host=panel.querySelector("#sb-appeals-staff-list");
    if(!host||!staffCache)return;
    const filter=panel.querySelector("#sb-appeals-filter").value;
    const people=new Map((staffCache.profiles||[]).map(p=>[p.id,p]));
    const sanctions=new Map((staffCache.sanctions||[]).map(p=>[p.id,p]));
    const name=id=>{const p=people.get(id);return p?.display_name||p?.username||(id?id.slice(0,8)+"…":"Sin usuario");};
    const rows=(staffCache.appeals||[]).filter(a=>filter==="all"||a.status===filter);
    host.replaceChildren();
    if(!rows.length){host.append(el("p","","No hay apelaciones en este estado."));return;}
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
          <h2>⚖️ Apelaciones de sanciones</h2>
          <p>Revisa las solicitudes de los miembros. Cada decisión exige un motivo y queda registrada.</p>
        </div><button id="sb-appeals-reload" class="admin-secondary" type="button">🔄 Actualizar</button>
      </div>
      <div class="sb-appeals-controls"><label for="sb-appeals-filter">Mostrar apelaciones</label>
        <select id="sb-appeals-filter">
          <option value="pending">Pendientes</option><option value="all">Todas</option>
          <option value="accepted">Aceptadas</option><option value="rejected">Rechazadas</option>
        </select></div>
      <p id="sb-appeals-staff-status" role="status" aria-live="polite"></p>
      <div id="sb-appeals-staff-list" class="sb-appeals-stack">Cargando…</div>
    `;
    const sanction=dashboard.querySelector("#sb-sanction-panel");
    const welcome=dashboard.querySelector(".admin-welcome");
    if(sanction)sanction.after(panel);
    else if(welcome)welcome.after(panel);
    else dashboard.prepend(panel);
    panel.querySelector("#sb-appeals-filter").addEventListener("change",()=>drawStaff(panel));
    panel.querySelector("#sb-appeals-reload").addEventListener("click",()=>loadStaff(panel));
    await loadStaff(panel);
    const focus=new URLSearchParams(location.hash.split("?")[1]||"").get("focus");
    if(focus==="appeals"&&panel.isConnected)panel.scrollIntoView({block:"start",behavior:"smooth"});
  }
  window.SBAppeals={mountPublic,mountAccount,mountStaff};
})();
