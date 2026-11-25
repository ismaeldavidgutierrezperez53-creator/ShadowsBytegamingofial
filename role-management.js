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
        <details class="sb-history-ranking"><summary>📊 Actividad de administradores</summary><div id="sb-history-ranking"></div></details>
        <div class="sb-staff-history-actions">
          <button type="button" id="sb-history-export" class="admin-secondary">📥 Descargar CSV</button>
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
    startRoleAlerts(panel);
    history.querySelector("#sb-history-refresh").addEventListener("click", () => loadHistory(history, 0));
    history.querySelector("#sb-history-prev").addEventListener("click", () => loadHistory(history, Math.max(0, Number(history.dataset.page || 0) - 1)));
    history.querySelector("#sb-history-next").addEventListener("click", () => loadHistory(history, Number(history.dataset.page || 0) + 1));
    const focus = new URLSearchParams(location.hash.split("?")[1] || "").get("focus");
    if (focus === "staff") requestAnimationFrame(() => panel.scrollIntoView({ block: "start", behavior: "smooth" }));
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
    for (const [label, value] of [["Cambios",s.total],["Ascensos",s.grants],["Descensos",s.revocations],["Otros ajustes",s.other],["Administradores activos",s.admins]]) {
      const tile = element("div", "sb-history-stat");
      tile.append(element("strong", "", String(value ?? 0)), element("small", "", label));
      stats.append(tile);
    }
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
      const rows = [["Fecha UTC","Miembro","Administrador","Cargo anterior","Cargo nuevo"],
        ...data.records.map(r => [r.changed_at,r.target_name,r.actor_name,names[r.old_role] || r.old_role,names[r.new_role] || r.new_role])];
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
        person.append(element("small", "", "Realizado por: " + (event.actor_name || "Cuenta no disponible")));
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
      row.append(summary);

      const actions = element("div", "sb-staff-actions");
      const selector = document.createElement("select");
      selector.setAttribute("aria-label", "Cargo de " + (member.display_name || member.username || "miembro"));
      if (member.role === "owner") {
        selector.add(new Option("Administrador principal — protegido", "owner"));
        selector.disabled = true;
        actions.append(selector);
      } else {
        for (const role of allowed) selector.add(new Option(names[role], role));
        selector.value = member.role;
        const save = element("button", "admin-secondary", "Guardar cargo");
        save.type = "button";
        save.disabled = true;
        selector.addEventListener("change", () => { save.disabled = selector.value === member.role; });
        save.addEventListener("click", async () => {
          const newRole = selector.value;
          const person = member.display_name || member.username || "este miembro";
          if (newRole === member.role) return;
          if (!confirm("¿Cambiar el cargo de " + person + " a " + names[newRole] + "?")) return;
          save.disabled = true;
          selector.disabled = true;
          setStatus("Guardando el nuevo cargo de " + person + "…");
          try {
            const { data, error } = await sb.functions.invoke("manage-site-roles", {
              body: { action: "set", target_id: member.id, role: newRole }
            });
            if (error || data?.error || !data?.ok) throw new Error(data?.error || error?.message || "Cambio no confirmado");
            member.role = newRole;
            const sessionNote = newRole === "member"
              ? ". Permisos retirados en el servidor. La interfaz se actualizará al renovar la sesión."
              : ". El miembro deberá actualizar su sesión para ver sus permisos.";
            const auditNote = data.audit_recorded === false
              ? " Aviso: no se pudo registrar la auditoría; revisa el historial."
              : "";
            setStatus("✅ Cargo actualizado: " + person + " → " + names[newRole] +
              sessionNote + auditNote, data.audit_recorded === false);
            drawMembers();
            const history = document.getElementById("sb-staff-history");
            if (history?.open) loadHistory(history, 0);
          } catch (err) {
            setStatus("No se pudo cambiar el cargo: " + err.message, true);
            selector.disabled = false;
            save.disabled = false;
          }
        });
        actions.append(selector, save);
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
  }
  window.SBRoleManagement = { mountAdminPanel, renderModeratorPanel };
})();
