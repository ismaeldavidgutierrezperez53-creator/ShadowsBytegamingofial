// Gestión de cargos de Shadows Byte Gaming Official V2.
(() => {
  const names = {
    owner: "👑 Administrador principal",
    admin: "🛡️ Administrador",
    moderator: "🔧 Moderador",
    member: "👤 Miembro"
  };
  const allowed = ["member", "moderator", "admin"];
  let cache = [];
  let canManage = false;
  const localDateTime = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16) : ""; };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function setStatus(message, isError = false) {
    const status = document.getElementById("sb-staff-status");
    if (status) {
      status.textContent = message;
      status.dataset.error = String(isError);
    }
  }
  function mountAdminPanel() {
    const dashboard = document.querySelector("#admin-root .admin-dashboard");
    if (!dashboard || document.getElementById("sb-staff-panel")) return;

    const panel = element("section", "admin-panel sb-staff-panel");
    panel.id = "sb-staff-panel";
    panel.innerHTML = `
      <div class="admin-panel-heading">
        <div><span class="admin-kicker">SEGURIDAD Y EQUIPO</span>
          <h2>👑 Administradores y moderadores</h2>
          <p>Elige el cargo de cada miembro. Solo los administradores pueden conceder o retirar permisos. El administrador principal está protegido.</p>
        </div>
        <button type="button" id="sb-staff-refresh" class="admin-secondary">🔄 Actualizar</button>
      </div>
      <div class="sb-staff-controls">
        <label for="sb-staff-search">Buscar miembro</label>
        <input id="sb-staff-search" type="search" placeholder="Nombre o usuario…" autocomplete="off" />
      </div>
      <p id="sb-staff-status" role="status" aria-live="polite"></p>
      <div id="sb-staff-list" class="sb-staff-list">Cargando miembros…</div>
      <div class="sb-role-alert" aria-live="polite">
        <span id="sb-role-alert-text">🔔 Consultando avisos de cargos…</span>
        <button type="button" id="sb-role-alert-read" class="admin-secondary" disabled>Marcar revisados</button>
      </div>
      <details id="sb-staff-history" class="sb-staff-history">
        <summary>📋 Historial administrativo de cargos</summary>
        <p>Consulta quién concedió o retiró permisos y cuándo. Solo administradores.</p>
        <form id="sb-history-filters" class="sb-history-filters">
          <label>Buscar miembro<input id="sb-history-search" type="search" maxlength="120" placeholder="Nombre o usuario"></label>
          <label>Cargo anterior o nuevo<select id="sb-history-role"><option value="">Todos</option><option value="member">Miembro</option><option value="moderator">Moderador</option><option value="admin">Administrador</option><option value="owner">Administrador principal</option></select></label>
          <label>Desde (Madrid)<input id="sb-history-from" type="date"></label>
          <label>Hasta (Madrid)<input id="sb-history-to" type="date"></label>
          <button class="admin-secondary" type="submit">🔍 Aplicar filtros</button>
          <button class="admin-secondary" type="reset">Limpiar filtros</button>
        </form>
        <div id="sb-history-stats" class="sb-history-stats"></div>
        <p id="sb-history-review" role="status"></p>
        <details class="sb-history-ranking"><summary>📈 Actividad mensual</summary><div id="sb-history-monthly" class="sb-history-monthly"></div></details>
        <details class="sb-history-ranking"><summary>📊 Actividad de administradores</summary><div id="sb-history-ranking"></div></details>
        <div class="sb-staff-history-actions">
          <button type="button" id="sb-history-export" class="admin-secondary">📥 Descargar CSV</button>
          <button type="button" id="sb-history-pdf" class="admin-secondary">📄 Guardar informe PDF</button>
          <button type="button" id="sb-history-refresh" class="admin-secondary">🔄 Actualizar historial</button>
          <button type="button" id="sb-history-prev" class="admin-secondary" disabled>Anterior</button>
          <button type="button" id="sb-history-next" class="admin-secondary" disabled>Siguiente</button>
        </div>
        <p id="sb-history-status" role="status" aria-live="polite"></p>
        <p id="sb-history-export-status" role="status" aria-live="polite"></p>
        <div id="sb-history-list" class="sb-staff-list"></div>
      </details>
    `;
    const welcome = dashboard.querySelector(".admin-welcome");
    if (welcome) welcome.after(panel);
    else dashboard.prepend(panel);
    panel.querySelector("#sb-staff-search").addEventListener("input", drawMembers);
    panel.querySelector("#sb-staff-refresh").addEventListener("click", loadRoles);
    loadRoles();
    const history = panel.querySelector("#sb-staff-history");
    history.addEventListener("toggle", () => { if (history.open) loadHistory(history, 0); });
    history.querySelector("#sb-history-filters").addEventListener("submit", event => { event.preventDefault(); loadHistory(history, 0); });
    history.querySelector("#sb-history-filters").addEventListener("reset", () => setTimeout(() => loadHistory(history, 0), 0));
    history.querySelector("#sb-history-export").addEventListener("click", () => exportHistory(history));
    history.querySelector("#sb-history-pdf").addEventListener("click", () => printHistory(history));
    startRoleAlerts(panel);
    mountTeamPanel(dashboard);
    history.querySelector("#sb-history-refresh").addEventListener("click", () => loadHistory(history, 0));
    history.querySelector("#sb-history-prev").addEventListener("click", () => loadHistory(history, Math.max(0, Number(history.dataset.page || 0) - 1)));
    history.querySelector("#sb-history-next").addEventListener("click", () => loadHistory(history, Number(history.dataset.page || 0) + 1));
    const focus = new URLSearchParams(location.hash.split("?")[1] || "").get("focus");
    if (focus === "staff") requestAnimationFrame(() => panel.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  function mountTeamPanel(dashboard) {
    if (!dashboard || dashboard.querySelector("#sb-team-panel")) return;
    const panel = element("section","admin-panel sb-team-panel");
    panel.id = "sb-team-panel";
    panel.innerHTML = `
      <div class="admin-panel-heading">
        <div><span class="admin-kicker">EQUIPO · ORGANIZACIÓN</span><h2>👑 Panel del equipo administrativo</h2>
        <p>Actividad, vencimientos, solicitudes y avisos exclusivos del equipo.</p></div>
        <button type="button" class="admin-secondary" id="sb-team-refresh">🔄 Actualizar equipo</button>
      </div>
      <p id="sb-team-status" role="status" aria-live="polite">Cargando equipo…</p>
      <label class="sb-team-presence"><input type="checkbox" id="sb-team-share" disabled> Compartir mi actividad reciente en este panel con el equipo</label>
      <p class="sb-team-hint">La presencia es voluntaria y no indica conexión general a la web. Se considera actividad reciente durante dos minutos.</p>
      <div id="sb-team-summary" class="sb-history-stats"></div>
      <div id="sb-team-members" class="sb-staff-list"></div>
      <details class="sb-team-section"><summary>📅 Calendario de vencimientos</summary><div id="sb-team-calendar"></div></details>
      <details class="sb-team-section" open><summary>📝 Solicitudes de renovación</summary><div id="sb-team-renewals"></div></details>
      <details class="sb-team-section"><summary>🔔 Centro de avisos del equipo</summary><div id="sb-team-alerts"></div></details>
    `;
    const welcome = dashboard.querySelector(".admin-welcome");
    if (welcome) welcome.after(panel); else dashboard.prepend(panel);
    const q = id => panel.querySelector("#"+id);
    const status = q("sb-team-status");
    const share = q("sb-team-share");
    let current = null, busy = false, closed = false;
    let lastRequest = 0;
    const act = async (action, payload={}) => {
      const {data,error} = await sb.functions.invoke("manage-site-roles",{body:{action:"team",team_action:action,team_body:payload}});
      if (error || !data?.ok) {
        let msg = data?.error || error?.message || "No se pudo realizar la acción";
        if (error?.context && typeof error.context.json === "function") {
          try { const response = await error.context.json(); msg = response.error || msg; } catch {}
        }
        throw new Error(msg);
      }
      return data;
    };
    const card = (container, label, value) => {
      const tile = element("div","sb-history-stat");
      tile.append(element("strong","",String(value)),element("small","",label));
      container.append(tile);
    };
    const countdownText = expiry => {
      const ms = Date.parse(expiry)-Date.now();
      if (ms <= 0) return "Caducado";
      const min = Math.ceil(ms/60000);
      const days = Math.floor(min/1440), hours=Math.floor((min%1440)/60);
      return (days ? days+" d " : "") + hours+" h "+min%60+" min";
    };
    function expiryNode(expiry) {
      const node = element("span","sb-team-countdown",countdownText(expiry));
      node.dataset.expiry = expiry;
      return node;
    }
    function presenceText(value) {
      return value==="recent" ? "🟢 Actividad reciente" : value==="inactive" ? "⚪ Sin actividad reciente" : "🔒 Presencia no compartida";
    }
    function render(data) {
      current=data;
      share.checked=!!data.share_presence;
      share.disabled=false;
      const summary=q("sb-team-summary"), members=q("sb-team-members"), calendar=q("sb-team-calendar"), renewals=q("sb-team-renewals"), alerts=q("sb-team-alerts");
      for (const node of [summary,members,calendar,renewals,alerts]) node.replaceChildren();
      const team=data.team||[], requests=data.requests||[], notices=data.alerts||[];
      card(summary,"Integrantes vigentes",team.length);
      card(summary,"Actividad reciente compartida",team.filter(x=>x.presence==="recent").length);
      card(summary,"Vencimientos visibles",team.filter(x=>x.expires_at).length);
      card(summary,"Solicitudes pendientes",requests.filter(x=>x.status==="pending").length);
      for (const m of team) {
        const row=element("article","sb-staff-row sb-team-member");
        const info=element("div","sb-staff-member");
        info.append(element("strong","",m.name),element("small","",names[m.role]||m.role));
        const presence=element("span","sb-team-presence-state",presenceText(m.presence));
        presence.dataset.teamPresence=m.id; info.append(presence);
        if (m.expiry_visible) {
          if (m.expires_at) info.append(element("small","","Vence: "+new Date(m.expires_at).toLocaleString("es-ES")),expiryNode(m.expires_at));
          else info.append(element("small","","Cargo permanente"));
        }
        row.append(info);
        if (m.moderation!==null && m.moderation!==undefined) {
          const stats=element("div","sb-team-individual");
          stats.append(element("small","","Actividad de los últimos 30 días"),element("span","",m.moderation+" acciones de moderación"),element("span","",m.reports+" denuncias revisadas"),element("span","",m.appeals+" apelaciones revisadas"));
          row.append(stats);
        }
        if (data.can_configure && m.role!=="owner" && m.permissions) {
          const settings=element("details","sb-team-permissions");
          settings.append(element("summary","","🛡️ Permisos personalizados del panel"));
          const controls=element("div","sb-team-permission-options");
          const fields=[["view_team_stats","Ver estadísticas del equipo"],["view_team_calendar","Ver calendario del equipo"],["view_team_alerts","Ver avisos de todo el equipo"],["request_renewal","Solicitar renovación propia"]];
          const inputs={};
          for (const [key,label] of fields) {
            const field=element("label","");
            const input=document.createElement("input"); input.type="checkbox";input.checked=!!m.permissions[key];
            inputs[key]=input;field.append(input,document.createTextNode(" "+label));controls.append(field);
          }
          const save=element("button","admin-secondary","Guardar permisos del panel");save.type="button";
          save.addEventListener("click",async()=>{
            save.disabled=true;
            try {
              await act("permissions",{target_id:m.id,...Object.fromEntries(fields.map(([key])=>[key,inputs[key].checked]))});
              await refresh(false);status.textContent="✅ Permisos del panel guardados.";
            } catch(err){status.textContent=err.message;} finally{save.disabled=false;}
          });
          controls.append(save,element("small","sb-team-hint","Solo afectan a este nuevo panel, no amplían los permisos del cargo."));
          settings.append(controls);row.append(settings);
        }
        members.append(row);
      }
      const expiring=team.filter(x=>x.expires_at).sort((x,y)=>Date.parse(x.expires_at)-Date.parse(y.expires_at));
      calendar.append(element("p","sb-team-hint",data.permissions?.view_team_calendar ? "Agenda de cargos temporales vigentes." : "Solo se muestra tu propio vencimiento."));
      if (!expiring.length) calendar.append(element("p","","No hay vencimientos visibles."));
      let group="";
      for (const m of expiring) {
        const when=new Date(m.expires_at);
        const month=when.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
        if(month!==group){calendar.append(element("h3","",month));group=month;}
        const item=element("div","sb-staff-row");
        item.append(element("strong","",when.toLocaleString("es-ES")),element("span","",m.name+" · "+(names[m.role]||m.role)),expiryNode(m.expires_at));calendar.append(item);
      }
      if(data.expires_at && data.permissions?.request_renewal && !requests.some(r=>r.user_id===data.viewer_id&&r.status==="pending")){
        const form=element("form","sb-team-renew-form");
        const select=document.createElement("select");select.setAttribute("aria-label","Días adicionales de renovación");
        for(const n of [7,15,30])select.add(new Option("+"+n+" días",String(n)));
        const reason=document.createElement("textarea");reason.required=true;reason.minLength=5;reason.maxLength=500;reason.placeholder="Motivo de la renovación (5–500 caracteres)";reason.setAttribute("aria-label","Motivo de la renovación");
        const send=element("button","admin-secondary","Solicitar renovación");send.type="submit";
        form.append(select,reason,send);
        form.addEventListener("submit",async ev=>{
          ev.preventDefault();send.disabled=true;
          try{await act("request",{days:Number(select.value),reason:reason.value.trim()});await refresh(false);status.textContent="✅ Solicitud enviada al equipo permanente.";}
          catch(err){status.textContent=err.message;}finally{send.disabled=false;}
        });
        renewals.append(form);
      }
      const labels={pending:"Pendiente",approved:"Aprobada",rejected:"Rechazada",obsolete:"Caducada o sustituida"};
      if(!requests.length)renewals.append(element("p","","No hay solicitudes de renovación."));
      for(const req of requests){
        const row=element("div","sb-staff-row"), info=element("div","sb-staff-member");
        info.append(element("strong","",req.name+" · +"+req.extra_days+" días"),element("small","",labels[req.status]||req.status),element("small","",req.reason),element("small","","Vencimiento original: "+new Date(req.original_expiry).toLocaleString("es-ES")));
        row.append(info);
        if(data.can_manage&&req.status==="pending"&&req.user_id!==data.viewer_id){
          const controls=element("div","sb-staff-actions");
          for(const [decision,label] of [["approve","Aprobar"],["reject","Rechazar"]]){
            const btn=element("button","admin-secondary",label);btn.type="button";
            btn.addEventListener("click",async()=>{
              if(!confirm(label+" solicitud de "+req.name+"?"))return;
              let confirmation="";
              if(decision==="approve"&&req.requested_role==="admin"){
                confirmation=prompt("Escribe CONCEDER ADMIN para confirmar la renovación administrativa.")||"";
                if(confirmation!=="CONCEDER ADMIN")return;
              }
              for(const b of controls.querySelectorAll("button"))b.disabled=true;
              try{await act("resolve",{request_id:req.id,decision,confirmation});await refresh(false);if(document.getElementById("sb-staff-list"))loadRoles();status.textContent="✅ Solicitud resuelta.";}
              catch(err){status.textContent=err.message;}finally{for(const b of controls.querySelectorAll("button"))b.disabled=false;}
            });controls.append(btn);
          }row.append(controls);
        }renewals.append(row);
      }
      const soon=expiring.filter(m=>Date.parse(m.expires_at)-Date.now()<=86400000);
      for(const m of soon)alerts.append(element("p","sb-team-warning","⏳ "+m.name+" vence en "+countdownText(m.expires_at)));
      const pending=requests.filter(r=>r.status==="pending").length;
      if(pending)alerts.append(element("p","sb-team-warning","📝 "+pending+" solicitudes de renovación pendientes."));
      for(const notice of notices){
        const row=element("div","sb-staff-row");
        row.append(element("strong","",notice.target_name),element("span","",(notice.automatic?"Caducidad automática · ":"")+(names[notice.old_role]||notice.old_role)+" → "+(names[notice.new_role]||notice.new_role)),element("small","",new Date(notice.changed_at).toLocaleString("es-ES")));alerts.append(row);
      }
      if(!notices.length&&!soon.length&&!pending)alerts.append(element("p","","No hay avisos disponibles."));
      status.textContent="Equipo actualizado · "+new Date().toLocaleTimeString("es-ES");
    }
    async function refresh(background) {
      if(!panel.isConnected||closed)return;
      if(background && (busy||document.hidden))return;
      const serial=++lastRequest;
      busy=true;
      if(!background)status.textContent="Consultando equipo…";
      try{
        const data=await act("dashboard",{heartbeat:!document.hidden});
        if(!panel.isConnected||serial!==lastRequest)return;
        if(background&&current){
          const changed = JSON.stringify(current.permissions)!==JSON.stringify(data.permissions) || current.role!==data.role || current.can_manage!==data.can_manage || current.can_configure!==data.can_configure;
          if(changed){render(data);return;}
          const byId=new Map(data.team.map(m=>[m.id,m]));
          panel.querySelectorAll("[data-team-presence]").forEach(node=>{const m=byId.get(node.dataset.teamPresence);node.textContent=m?presenceText(m.presence):"Cargo no vigente";});
        }else render(data);
      }catch(err){
        if(serial!==lastRequest||!panel.isConnected)return;
        status.textContent=err.message;
        if(background){
          current=null;share.disabled=true;
          for(const id of ["sb-team-summary","sb-team-members","sb-team-calendar","sb-team-renewals","sb-team-alerts"])q(id).replaceChildren();
        }
      }finally{if(serial===lastRequest)busy=false;}
    }
    q("sb-team-refresh").addEventListener("click",()=>refresh(false));
    share.addEventListener("change",async()=>{
      share.disabled=true;
      try{await act("presence",{enabled:share.checked});await refresh(false);}
      catch(err){status.textContent=err.message;share.checked=!!current?.share_presence;}finally{share.disabled=false;}
    });
    refresh(false);
    const timer=setInterval(()=>{
      if(!panel.isConnected){closed=true;clearInterval(timer);return;}
      if(!document.hidden){
        panel.querySelectorAll("[data-expiry]").forEach(node=>node.textContent=countdownText(node.dataset.expiry));
      }
    },1000);
    const heartbeat=setInterval(()=>{
      if(!panel.isConnected){clearInterval(heartbeat);return;}refresh(true);
    },45000);
  }
  function historyFilters(panel) {
    return {
      search: panel.querySelector("#sb-history-search").value.trim(),
      filter_role: panel.querySelector("#sb-history-role").value,
      from: panel.querySelector("#sb-history-from").value,
      to: panel.querySelector("#sb-history-to").value
    };
  }
  function renderHistoryStats(panel, data) {
    const stats = panel.querySelector("#sb-history-stats");
    const ranking = panel.querySelector("#sb-history-ranking");
    stats.replaceChildren();
    ranking.replaceChildren();
    const s = data.stats || {};
    for (const [label, value] of [["Cambios",s.total],["Ascensos",s.grants],["Descensos",s.revocations],["Otros ajustes",s.other],["Administradores activos",s.admins],["Cargos caducados",data.expired_count]]) {
      const tile = element("div", "sb-history-stat");
      tile.append(element("strong", "", String(value ?? 0)), element("small", "", label));
      stats.append(tile);
    }
    const monthly = panel.querySelector("#sb-history-monthly");
    monthly.replaceChildren();
    const series = data.monthly || [];
    const maximum = Math.max(1, ...series.map(m => Number(m.total)));
    for (const month of series) {
      const line = element("div", "sb-history-month");
      line.append(element("strong", "", month.month_key));
      const bar = element("div", "sb-history-bar");
      const fill = element("span", "");
      fill.style.width = Math.min(100, 100 * Number(month.total) / maximum) + "%";
      bar.append(fill);
      line.append(bar, element("small", "", month.total + " cambios · " + month.grants + " ascensos · " + month.revocations + " descensos"));
      monthly.append(line);
    }
    if (!series.length) monthly.append(element("p", "", "Sin actividad en las fechas seleccionadas."));
    panel.querySelector("#sb-history-review").textContent = "⚠️ Cambios que requieren revisión: " + (data.review_count || 0) + ". Una alerta no demuestra un uso indebido.";
    const leaders = data.ranking || [];
    if (!leaders.length) ranking.append(element("p", "", "No hay actividad en los filtros seleccionados."));
    for (const actor of leaders) {
      const row = element("div", "sb-staff-row");
      row.append(element("strong", "", actor.actor_name), element("span", "", actor.total + " cambios · " + actor.grants + " ascensos · " + actor.revocations + " descensos"));
      ranking.append(row);
    }
  }
  async function exportHistory(panel) {
    const button = panel.querySelector("#sb-history-export");
    const status = panel.querySelector("#sb-history-export-status");
    button.disabled = true;
    status.textContent = "Preparando CSV…";
    try {
      const { data, error } = await sb.functions.invoke("manage-site-roles", { body: { action: "history_export", ...historyFilters(panel) } });
      if (!panel.isConnected) return;
      if (error || data?.error || !Array.isArray(data?.records)) throw new Error(data?.error || error?.message || "No se pudo exportar");
      if (data.export_truncated) throw new Error("Hay más de 5000 registros. Reduce el intervalo de fechas antes de exportar.");
      const cell = value => {
        let v = String(value ?? "");
        if (/^[\s\u0000-\u001f]*[=+@-]/.test(v) || /^[\t\r\n]/.test(v)) v = "'" + v;
        return '"' + v.replace(/"/g, '""') + '"';
      };
      const rows = [["Fecha UTC","Miembro","Administrador","Cargo anterior","Cargo nuevo","Motivo","Revisión","Caducidad anterior","Nueva caducidad","Automático"],
        ...data.records.map(r => [r.changed_at,r.target_name,r.automatic ? "Sistema automático" : r.actor_name,names[r.old_role] || r.old_role,names[r.new_role] || r.new_role,r.reason || "",r.review_flag || "",r.old_expires_at || "",r.new_expires_at || "",r.automatic ? "Sí" : "No"])];
      const blob = new Blob(["\uFEFF" + rows.map(row => row.map(cell).join(";")).join("\r\n")], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "SB-V2-historial-cargos-" + new Date().toISOString().slice(0,10) + ".csv";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "CSV preparado: " + data.records.length + " registros. Contiene información administrativa.";
    } catch (err) { status.textContent = err.message; }
    finally { button.disabled = false; }
  }
  async function printHistory(panel) {
    // Open synchronously from the click to avoid popup blocking.
    const win = window.open("", "_blank");
    const status = panel.querySelector("#sb-history-export-status");
    if (!win) { status.textContent = "Permite ventanas emergentes para guardar el informe."; return; }
    try {
      win.opener = null;
      win.document.title = "SB V2 · Informe administrativo";
      win.document.body.textContent = "Preparando informe…";
      const { data, error } = await sb.functions.invoke("manage-site-roles", { body: { action:"history_export", ...historyFilters(panel) } });
      if (win.closed) return;
      if (error || !Array.isArray(data?.records)) throw new Error("No se pudo obtener el informe");
      if (data.export_truncated) throw new Error("Reduce el intervalo a un máximo de 5000 registros.");
      const d = win.document;
      d.body.replaceChildren();
      const style = d.createElement("style");
      style.textContent = "body{font:12px Arial,sans-serif;color:#111;margin:24px}h1{font-size:22px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #bbb;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}button{margin:12px 0}@media print{button{display:none}body{margin:0}}@page{size:landscape;margin:12mm}";
      d.head.append(style);
      const add = (parent, tag, value) => { const el = d.createElement(tag); el.textContent = value; parent.append(el); return el; };
      add(d.body,"h1","Shadows Byte Gaming Official V2 · Informe administrativo");
      add(d.body,"p","Confidencial · " + new Date().toLocaleString("es-ES") + " · " + data.records.length + " cambios");
      add(d.body,"p","Ascensos: " + (data.stats?.grants ?? 0) + " · Descensos: " + (data.stats?.revocations ?? 0) + " · Revisar: " + (data.review_count ?? 0));
      const print = add(d.body,"button","Imprimir / Guardar como PDF");
      print.addEventListener("click",()=>win.print());
      const table=d.createElement("table"), head=d.createElement("thead"), body=d.createElement("tbody"), header=d.createElement("tr");
      for (const title of ["Fecha","Miembro","Responsable","Cargo anterior","Cargo nuevo","Motivo","Revisión","Caducidad"]) add(header,"th",title);
      head.append(header);table.append(head,body);d.body.append(table);
      for(const r of data.records) {
        const tr=d.createElement("tr");
        for(const value of [new Date(r.changed_at).toLocaleString("es-ES"),r.target_name,r.actor_name,names[r.old_role]||r.old_role,names[r.new_role]||r.new_role,r.reason||"No registrado",r.review_flag||"—",r.new_expires_at || r.old_expires_at || "—"]) add(tr,"td",String(value??""));
        body.append(tr);
      }
      status.textContent = "Informe preparado. En la nueva ventana elige Imprimir / Guardar como PDF.";
    } catch(err) {
      if (!win.closed) win.document.body.textContent = err.message;
      status.textContent = err.message;
    }
  }
  async function startRoleAlerts(panel) {
    const status = panel.querySelector("#sb-role-alert-text");
    const mark = panel.querySelector("#sb-role-alert-read");
    let key = null, seen = "0", latest = "0", busy = false;
    try {
      const { data } = await sb.auth.getUser();
      if (!data?.user || !panel.isConnected) { status.textContent = "🔔 Avisos no disponibles"; return; }
      key = "sb-role-alert-seen:" + data.user.id;
      try { seen = localStorage.getItem(key) || "0"; } catch {}
      if (!/^\d{1,19}$/.test(seen)) seen = "0";
    } catch { status.textContent = "🔔 Avisos no disponibles"; return; }
    async function check() {
      if (!panel.isConnected || busy || document.hidden) return;
      busy = true;
      try {
        const { data,error } = await sb.functions.invoke("manage-site-roles", { body:{ action:"history_alerts", after_id:seen } });
        if (!panel.isConnected) return;
        if (error || !data || data.error) throw new Error("Sin acceso o conexión");
        latest = String(data.latest_id || seen);
        status.textContent = data.unread > 0 ? "🔔 " + data.unread + " cambios de cargo sin revisar en este dispositivo" : "🔔 No hay cambios de cargo nuevos";
        mark.disabled = !(data.unread > 0);
      } catch {
        status.textContent = "🔔 Avisos no disponibles. Revisa tu sesión o conexión.";
        mark.disabled = true;
      } finally { busy = false; }
    }
    mark.addEventListener("click", () => {
      seen = latest;
      try { localStorage.setItem(key, seen); } catch {}
      mark.disabled = true;
      check();
    });
    await check();
    const timer = setInterval(() => { if (!panel.isConnected) clearInterval(timer); else check(); }, 30000);
  }
  async function loadHistory(panel, page) {
    if (!panel?.isConnected || !panel.open) return;
    const list = panel.querySelector("#sb-history-list");
    const status = panel.querySelector("#sb-history-status");
    const prev = panel.querySelector("#sb-history-prev");
    const next = panel.querySelector("#sb-history-next");
    const token = String(Number(panel.dataset.request || 0) + 1);
    panel.dataset.request = token;
    prev.disabled = next.disabled = true;
    list.replaceChildren();
    panel.querySelector("#sb-history-stats").replaceChildren();
    panel.querySelector("#sb-history-ranking").replaceChildren();
    status.textContent = "Consultando historial…";
    try {
      const { data, error } = await sb.functions.invoke("manage-site-roles", {
        body: { action: "history", page, ...historyFilters(panel) }
      });
      if (!panel.isConnected || panel.dataset.request !== token) return;
      if (error || data?.error || !Array.isArray(data?.records)) {
        throw new Error(data?.error || error?.message || "Respuesta no válida");
      }
      renderHistoryStats(panel, data);
      panel.dataset.page = String(page);
      prev.disabled = page === 0;
      next.disabled = !data.has_more;
      status.textContent = data.records.length
        ? "Página " + (page + 1) + " · " + data.records.length + " de " + (data.stats?.total ?? data.records.length) + " cambios · Más recientes primero"
        : "No hay cambios registrados en esta página.";
      for (const event of data.records) {
        const row = element("article", "sb-staff-row sb-history-row");
        const person = element("div", "sb-staff-member");
        person.append(element("strong", "", event.target_name || "Cuenta no disponible"));
        person.append(element("small", "", "Realizado por: " + (event.automatic ? "Sistema automático" : (event.actor_name || "Cuenta no disponible"))));
        person.append(element("small", "", "Motivo: " + (event.reason || "No registrado (histórico)")));
        if (event.automatic) person.append(element("span", "sb-history-review-flag", "⏳ Caducidad automática"));
        if (event.old_expires_at) person.append(element("small", "", "Vencimiento anterior: " + new Date(event.old_expires_at).toLocaleString("es-ES")));
        if (event.new_expires_at) person.append(element("small", "", "Nuevo vencimiento: " + new Date(event.new_expires_at).toLocaleString("es-ES")));
        if (event.review_flag) person.append(element("span", "sb-history-review-flag", "⚠️ Revisar: " + event.review_flag));
        const when = new Date(event.changed_at);
        person.append(element("small", "", Number.isNaN(when.getTime()) ? "Fecha no disponible" :
          when.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })));
        const change = element("div", "sb-history-change");
        change.append(element("span", "", names[event.old_role] || "Cargo desconocido"));
        change.append(element("span", "sb-history-arrow", "→"));
        change.append(element("strong", "", names[event.new_role] || "Cargo desconocido"));
        row.append(person, change);
        list.append(row);
      }
    } catch (err) {
      if (!panel.isConnected || panel.dataset.request !== token) return;
      status.textContent = "No se pudo cargar el historial: " + err.message + ". Pulsa Actualizar historial.";
    }
  }
  async function loadRoles() {
    const root = document.getElementById("sb-staff-list");
    if (!root) return;
    root.textContent = "Consultando cargos…";
    const { data, error } = await sb.functions.invoke("manage-site-roles", { body: { action: "list" } });
    if (!root.isConnected) return;
    if (error || data?.error || !Array.isArray(data?.members)) {
      root.textContent = "No se pudieron cargar los cargos.";
      setStatus(data?.error || error?.message || "Revisa tu sesión e inténtalo de nuevo.", true);
      return;
    }
    cache = data.members;
    canManage = data.can_manage === true;
    setStatus("Cargos cargados. Los cambios quedan registrados en Supabase.");
    drawMembers();
  }
  function drawMembers() {
    const list = document.getElementById("sb-staff-list");
    if (!list) return;
    const term = (document.getElementById("sb-staff-search")?.value || "").trim().toLocaleLowerCase("es");
    const filtered = cache.filter(member =>
      (member.display_name || "").toLocaleLowerCase("es").includes(term) ||
      (member.username || "").toLocaleLowerCase("es").includes(term)
    );
    list.replaceChildren();
    if (!filtered.length) {
      list.textContent = "No hay miembros que coincidan con la búsqueda.";
      return;
    }

    for (const member of filtered) {
      const row = element("div", "sb-staff-row");
      const summary = element("div", "sb-staff-member");
      summary.append(element("strong", "", member.display_name || member.username || "Miembro"));
      if (member.username) summary.append(element("small", "", "@" + member.username));
      summary.append(element("span", "sb-staff-current", names[member.role] || names.member));
      if (member.expires_at) {
        const expires = new Date(member.expires_at);
        summary.append(element("small", "", (expires.getTime() <= Date.now() ? "⏳ Caducado; retirada en proceso: " : "⏳ Vence: ") + expires.toLocaleString("es-ES")));
      } else if (member.role !== "member") summary.append(element("small", "", "Cargo permanente"));
      row.append(summary);

      const actions = element("div", "sb-staff-actions");
      const selector = document.createElement("select");
      selector.setAttribute("aria-label", "Cargo de " + (member.display_name || member.username || "miembro"));
      if (!canManage) {
        actions.append(element("span", "", "Solo administradores permanentes pueden cambiar cargos"));
      } else if (member.role === "owner") {
        selector.add(new Option("Administrador principal — protegido", "owner"));
        selector.disabled = true;
        actions.append(selector);
      } else {
        for (const role of allowed) selector.add(new Option(names[role], role));
        selector.value = member.role;
        const duration = document.createElement("select");
        duration.setAttribute("aria-label", "Duración del cargo");
        for (const [value,label] of [["permanent","Permanente"],["24h","24 horas"],["7d","7 días"],["15d","15 días"],["30d","30 días"],["custom","Fecha personalizada"]]) duration.add(new Option(label,value));
        duration.value = member.expires_at ? "custom" : "permanent";
        const custom = document.createElement("input");
        custom.type = "datetime-local";
        custom.setAttribute("aria-label","Fecha y hora local de caducidad");
        custom.value = member.expires_at ? localDateTime(member.expires_at) : "";
        custom.min = localDateTime(Date.now()+60000);
        const save = element("button", "admin-secondary", member.role === "member" ? "Guardar cargo" : "Guardar / renovar cargo");
        save.type = "button";
        save.disabled = true;
        function syncDuration() {
          const enabled = selector.value !== "member";
          duration.hidden = !enabled;
          custom.hidden = !enabled || duration.value !== "custom";
          save.disabled = selector.value === member.role && (!enabled || (duration.value === (member.expires_at ? "custom" : "permanent") && (duration.value !== "custom" || custom.value === localDateTime(member.expires_at))));
        }
        selector.addEventListener("change", syncDuration);
        duration.addEventListener("change", syncDuration);
        custom.addEventListener("input", syncDuration);
        syncDuration();
        save.addEventListener("click", async () => {
          const newRole = selector.value;
          const person = member.display_name || member.username || "este miembro";
          if (newRole === "member" && newRole === member.role) return;
          const chosenDuration = newRole === "member" ? "permanent" : duration.value;
          let expiry = null;
          if (chosenDuration === "custom") {
            const time = new Date(custom.value);
            if (!custom.value || !Number.isFinite(time.getTime()) || time.getTime() <= Date.now()) { setStatus("Selecciona una fecha futura.",true); return; }
            expiry = time.toISOString();
          }
          if (!confirm("¿Cambiar el cargo de " + person + " a " + names[newRole] + "?")) return;
          const reason = prompt("Indica el motivo del cambio (5–500 caracteres). No incluyas datos sensibles.");
          if (reason === null) return;
          if (reason.trim().length < 5 || reason.trim().length > 500) {
            setStatus("Indica un motivo de entre 5 y 500 caracteres.", true); return;
          }
          let confirmation = "";
          if (newRole === "admin") {
            confirmation = prompt("Este cargo concede permisos administrativos. Escribe CONCEDER ADMIN para confirmar.") || "";
            if (confirmation !== "CONCEDER ADMIN") { setStatus("Concesión cancelada.", true); return; }
          }
          save.disabled = true;
          selector.disabled = true;
          setStatus("Guardando el nuevo cargo de " + person + "…");
          try {
            const { data, error } = await sb.functions.invoke("manage-site-roles", {
              body: { action: "set", target_id: member.id, role: newRole, reason: reason.trim(), confirmation, duration: chosenDuration, expires_at: expiry }
            });
            if (error || data?.error || !data?.ok) throw new Error(data?.error || error?.message || "Cambio no confirmado");
            member.role = newRole;
            member.expires_at = data.expires_at || null;
            const sessionNote = newRole === "member"
              ? ". Permisos retirados en el servidor. La interfaz se actualizará al renovar la sesión."
              : ". El miembro deberá actualizar su sesión para ver sus permisos.";
            const auditNote = data.audit_recorded === false
              ? " Aviso: no se pudo registrar la auditoría; revisa el historial."
              : "";
            setStatus("✅ Cargo actualizado: " + person + " → " + names[newRole] +
              sessionNote + auditNote + (data.notice_recorded === false ? " Aviso de cargo no registrado." : ""), data.audit_recorded === false || data.notice_recorded === false);
            drawMembers();
            const history = document.getElementById("sb-staff-history");
            if (history?.open) loadHistory(history, 0);
          } catch (err) {
            setStatus("No se pudo cambiar el cargo: " + err.message, true);
            selector.disabled = false;
            save.disabled = false;
          }
        });
        actions.append(selector, duration, custom, save);
      }
      row.append(actions);
      list.append(row);
    }
  }
  function renderModeratorPanel(user) {
    const root = document.getElementById("admin-root");
    if (!root) return;
    root.innerHTML = `
      <div class="admin-dashboard sb-moderator-dashboard">
        <div class="admin-welcome">
          <div><span class="admin-kicker">SHADOWS BYTE · EQUIPO</span>
            <h2>🔧 Panel de moderación</h2>
            <p>Gestiona las publicaciones, comentarios y denuncias de la comunidad.</p>
          </div><span class="admin-admin-badge">● Moderador</span>
        </div>
        <div id="admin-message" role="status" aria-live="polite"></div>
        <section class="admin-panel">
          <div class="admin-panel-heading">
            <div><span class="admin-kicker">MODERACIÓN</span><h2>Publicaciones y comentarios</h2><p>Retira contenido que incumpla las normas.</p></div>
            <select id="admin-moderation-type" aria-label="Tipo de contenido">
              <option value="all">Todo</option><option value="posts">Publicaciones</option>
              <option value="comments">Comentarios</option>
            </select>
          </div><div id="admin-moderation-list"></div>
        </section>
        <section class="admin-panel">
          <div class="admin-panel-heading">
            <div><span class="admin-kicker">DENUNCIAS</span><h2>Revisión de reportes</h2>
              <p>Marcar un reporte como revisado no elimina el contenido.</p></div>
            <select id="admin-reports-filter" aria-label="Filtrar reportes">
              <option value="pending">Pendientes</option><option value="overdue">⚠️ Más de 48 h</option>
              <option value="all">Todos</option><option value="reviewed">Revisados</option>
              <option value="dismissed">Descartados</option>
            </select>
          </div><div id="admin-reports-list"></div>
        </section>
      </div>`;
    if (typeof adminLoadModeration === "function") adminLoadModeration();
    if (typeof adminLoadReports === "function") adminLoadReports();
    if (typeof adminInitReportAlerts === "function") adminInitReportAlerts();
    window.SBMemberModeration?.mountPanel();
    mountTeamPanel(root.querySelector(".sb-moderator-dashboard"));
  }
  window.SBRoleManagement = { mountAdminPanel, renderModeratorPanel };
})();
