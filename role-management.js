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
    `;
    const welcome = dashboard.querySelector(".admin-welcome");
    if (welcome) welcome.after(panel);
    else dashboard.prepend(panel);
    panel.querySelector("#sb-staff-search").addEventListener("input", drawMembers);
    panel.querySelector("#sb-staff-refresh").addEventListener("click", loadRoles);
    loadRoles();
    const focus = new URLSearchParams(location.hash.split("?")[1] || "").get("focus");
    if (focus === "staff") requestAnimationFrame(() => panel.scrollIntoView({ block: "start", behavior: "smooth" }));
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
            setStatus("✅ Cargo actualizado: " + person + " → " + names[newRole] +
              ". El miembro deberá actualizar su sesión para ver los nuevos permisos.");
            drawMembers();
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
  }
  window.SBRoleManagement = { mountAdminPanel, renderModeratorPanel };
})();
