/* Sanciones del equipo de Shadows Byte Gaming V2.
   El servidor valida cada acción. Este panel nunca recibe claves privadas. */
(() => {
  "use strict";
  const types = {
    warning: "⚠️ Advertencia",
    suspend: "⏳ Suspensión temporal",
    ban: "🚫 Expulsión",
    lift: "✅ Retirar sanción"
  };
  const dateLabel = value => value ? new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin caducidad";
  const validState = sanction => Boolean(sanction &&
    (sanction.action === "ban" || (sanction.expires_at && new Date(sanction.expires_at).getTime() > Date.now())));
  const labelState = sanction => !validState(sanction) ? "Sin sanción activa"
    : sanction.action === "ban" ? "🚫 Expulsión vigente"
    : "⏳ Suspendido hasta " + dateLabel(sanction.expires_at);
  const create = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const apiError = async (error, data) => {
    if (data?.error) return data.error;
    try { if (error?.context) return (await error.context.json())?.error || error.message; }
    catch (_) { /* body may already have been read */ }
    return error?.message || "Error desconocido";
  };
  const state = { members: [], actorId: null, isAdmin: false, history: [] };
  const nameFor = id => {
    const member = state.members.find(entry => entry.id === id);
    return member ? (member.display_name || member.username || "Miembro") : (id ? id.slice(0, 8) + "…" : "Sistema");
  };
  const announce = (message, problem = false) => {
    const node = document.getElementById("sb-sanction-feedback");
    if (node) { node.textContent = message; node.dataset.error = String(problem); }
  };
  function drawHistory() {
    const host = document.getElementById("sb-sanction-history");
    if (!host) return;
    host.replaceChildren();
    const selectedId = document.getElementById("sb-sanction-member")?.value || "";
    const events = state.history.filter(item => !selectedId || item.target_id === selectedId);
    if (!events.length) { host.append(create("p", "", "Todavía no hay sanciones registradas para esta selección.")); return; }
    for (const item of events) {
      const entry = create("article", "sb-sanction-event");
      const head = create("div", "sb-sanction-event-head");
      head.append(create("strong", "", (types[item.action] || item.action) + " · " + nameFor(item.target_id)));
      head.append(create("time", "", dateLabel(item.created_at)));
      entry.append(head, create("p", "", item.reason));
      const metadata = "Aplicada por: " + nameFor(item.actor_id) +
        (item.expires_at ? " · Finaliza: " + dateLabel(item.expires_at) : "");
      entry.append(create("small", "", metadata));
      host.append(entry);
    }
  }
  function updateForm() {
    const select = document.getElementById("sb-sanction-member");
    const actionInput = document.getElementById("sb-sanction-action");
    const duration = document.getElementById("sb-sanction-duration-row");
    const selected = state.members.find(item => item.id === select?.value);
    const badge = document.getElementById("sb-sanction-current-status");
    if (badge) badge.textContent = selected ? labelState(selected.sanction) : "Selecciona un miembro";
    if (actionInput && selected?.sanction?.action === "ban" && validState(selected.sanction) && !state.isAdmin) {
      if (actionInput.value === "lift") actionInput.value = "warning";
    }
    if (duration) duration.hidden = actionInput?.value !== "suspend";
    const forbidden = !selected || selected.id === state.actorId ||
      ["owner", "admin", "moderator"].includes(selected.role);
    const save = document.getElementById("sb-sanction-submit");
    if (save) save.disabled = forbidden;
    const hint = document.getElementById("sb-sanction-hint");
    if (hint) hint.textContent = forbidden && selected
      ? "Los cargos del equipo y tu propia cuenta están protegidos."
      : "La advertencia no bloquea el acceso. Una suspensión caduca automáticamente.";
    drawHistory();
  }
  async function loadPeople(preserve = "") {
    const select = document.getElementById("sb-sanction-member");
    if (!select) return;
    select.replaceChildren(new Option("Cargando miembros…", ""));
    const { data, error } = await sb.functions.invoke("moderate-members", { body: { action: "list" } });
    if (!select.isConnected) return;
    if (error || data?.error || !Array.isArray(data?.members)) {
      select.replaceChildren(new Option("No se pudo cargar la lista", ""));
      announce(await apiError(error, data), true);
      return;
    }
    state.members = data.members;
    const previous = preserve || select.value;
    select.replaceChildren(new Option("Elige un miembro…", ""));
    for (const member of state.members) {
      const label = (member.display_name || member.username || "Miembro") +
        (member.username && member.username !== member.display_name ? " (@" + member.username + ")" : "") +
        (validState(member.sanction) ? " · " + labelState(member.sanction) : "");
      const opt = new Option(label, member.id);
      opt.disabled = member.id === state.actorId || ["owner", "admin", "moderator"].includes(member.role);
      select.add(opt);
    }
    if (previous && state.members.some(m => m.id === previous)) select.value = previous;
    updateForm();
  }
  async function loadHistory() {
    const root = document.getElementById("sb-sanction-history");
    if (!root) return;
    root.textContent = "Cargando historial…";
    const { data, error } = await sb.functions.invoke("moderate-members", { body: { action: "history", limit: 200 } });
    if (!root.isConnected) return;
    if (error || data?.error || !Array.isArray(data?.history)) {
      root.textContent = await apiError(error, data);
      return;
    }
    state.history = data.history;
    drawHistory();
  }
  async function submitSanction(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const memberId = document.getElementById("sb-sanction-member").value;
    const action = document.getElementById("sb-sanction-action").value;
    const reason = document.getElementById("sb-sanction-reason").value.trim();
    const duration = Number(document.getElementById("sb-sanction-duration").value);
    const target = state.members.find(m => m.id === memberId);
    if (!target || target.id === state.actorId || target.role !== "member") {
      announce("Selecciona un miembro sin cargos administrativos.", true); return;
    }
    if (reason.length < 6 || reason.length > 500) {
      announce("Escribe un motivo de entre 6 y 500 caracteres.", true); return;
    }
    if (action === "ban" && !state.isAdmin) {
      announce("Solo los administradores pueden expulsar permanentemente.", true); return;
    }
    if (action === "lift" && !validState(target.sanction)) {
      announce("El miembro no tiene ninguna sanción activa.", true); return;
    }
    if (action === "lift" && target.sanction?.action === "ban" && !state.isAdmin) {
      announce("Solo un administrador puede levantar una expulsión.", true); return;
    }
    const ask = action === "ban" ? "Esta expulsión impedirá que la cuenta inicie sesión. ¿Continuar?"
      : action === "suspend" ? "La cuenta quedará suspendida temporalmente. ¿Confirmar?"
      : action === "lift" ? "¿Retirar el bloqueo de esta cuenta?" : "¿Enviar esta advertencia?";
    if (!window.confirm(ask + "\nMiembro: " + (target.display_name || target.username || "Miembro"))) return;
    const button = form.querySelector("#sb-sanction-submit");
    button.disabled = true;
    announce("Guardando decisión en Supabase…");
    try {
      const { data, error } = await sb.functions.invoke("moderate-members", {
        body: { action: action, target_id: memberId, reason, duration_hours: action === "suspend" ? duration : undefined }
      });
      if (error || !data?.ok) throw new Error(await apiError(error, data));
      announce("✅ " + types[action] + " aplicada a " + (target.display_name || target.username || "Miembro") +
        ". El historial queda registrado.");
      form.querySelector("#sb-sanction-reason").value = "";
      await Promise.all([loadPeople(memberId), loadHistory()]);
    } catch (problem) {
      announce("No se pudo guardar la sanción: " + (problem?.message || problem), true);
    } finally {
      button.disabled = false;
      updateForm();
    }
  }
  async function mountPanel() {
    const dashboard = document.querySelector("#admin-root .admin-dashboard");
    if (!dashboard || document.getElementById("sb-sanction-panel")) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !dashboard.isConnected) return;
    state.actorId = user.id;
    state.isAdmin = user.app_metadata?.role === "admin";
    if (!state.isAdmin && user.app_metadata?.role !== "moderator") return;
    const panel = create("section", "admin-panel sb-sanction-panel");
    panel.id = "sb-sanction-panel";
    panel.innerHTML = `
      <div class="admin-panel-heading"><div>
        <span class="admin-kicker">CONVIVENCIA Y SEGURIDAD</span>
        <h2>🛡️ Sanciones de miembros</h2>
        <p>Envía advertencias, aplica suspensiones y consulta el historial. Solo administración puede realizar expulsiones permanentes.</p>
      </div><button type="button" id="sb-sanction-reload" class="admin-secondary">🔄 Actualizar</button></div>
      <form id="sb-sanction-form" class="sb-sanction-form">
        <label>Miembro
          <select id="sb-sanction-member" required aria-label="Seleccionar miembro"><option value="">Cargando…</option></select>
        </label>
        <label>Acción
          <select id="sb-sanction-action">
            <option value="warning">⚠️ Enviar advertencia</option>
            <option value="suspend">⏳ Suspensión temporal</option>
            ${state.isAdmin ? '<option value="ban">🚫 Expulsar de la web</option>' : ''}
            <option value="lift">✅ Retirar sanción activa</option>
          </select>
        </label>
        <label id="sb-sanction-duration-row" hidden>Duración de la suspensión
          <select id="sb-sanction-duration">
            <option value="24">24 horas</option><option value="72">3 días</option>
            <option value="168">7 días</option>
            ${state.isAdmin ? '<option value="720">30 días</option>' : ''}
          </select>
        </label>
        <label class="sb-sanction-reason">Motivo obligatorio
          <textarea id="sb-sanction-reason" rows="3" required minlength="6" maxlength="500" placeholder="Describe qué norma se incumplió…"></textarea>
        </label>
        <p id="sb-sanction-current-status" class="sb-sanction-current">Selecciona un miembro</p>
        <p id="sb-sanction-hint" class="sb-sanction-hint"></p>
        <div class="sb-sanction-actions"><button class="gradient-btn mini" type="submit" id="sb-sanction-submit">Aplicar acción</button></div>
      </form>
      <p id="sb-sanction-feedback" role="status" aria-live="polite"></p>
      <h3>📜 Historial de moderación</h3>
      <p class="sb-sanction-hint">Muestra las últimas 200 decisiones. Selecciona un miembro para filtrar el historial.</p>
      <div id="sb-sanction-history" class="sb-sanction-history"></div>
    `;
    const staff = dashboard.querySelector("#sb-staff-panel");
    const welcome = dashboard.querySelector(".admin-welcome");
    if (staff) staff.after(panel);
    else if (welcome) welcome.after(panel);
    else dashboard.prepend(panel);
    panel.querySelector("#sb-sanction-form").addEventListener("submit", submitSanction);
    panel.querySelector("#sb-sanction-member").addEventListener("change", updateForm);
    panel.querySelector("#sb-sanction-action").addEventListener("change", updateForm);
    panel.querySelector("#sb-sanction-reload").addEventListener("click", async () => {
      announce("Actualizando…");
      await Promise.all([loadPeople(document.getElementById("sb-sanction-member")?.value || ""), loadHistory()]);
      announce("Lista e historial actualizados.");
    });
    updateForm();
    await Promise.all([loadPeople(), loadHistory()]);
    const focus = new URLSearchParams(location.hash.split("?")[1] || "").get("focus");
    if (focus === "sanctions") panel.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function mountAccountPanel() {
    const page = document.querySelector(".sb-account-page");
    if (!page || document.getElementById("sb-my-sanctions")) return;
    const root = create("section", "section sb-my-sanctions");
    root.id = "sb-my-sanctions";
    root.innerHTML = "<h2>🛡️ Mis advertencias y sanciones</h2><div id='sb-my-sanctions-list' role='status' aria-live='polite'>Consultando historial personal…</div>";
    page.append(root);
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (!root.isConnected) return;
    if (userError || !user) { root.remove(); return; }
    const [events, current] = await Promise.all([
      sb.from("member_moderation_events").select("action,reason,expires_at,created_at")
        .eq("target_id", user.id).order("created_at", { ascending: false }).limit(30),
      sb.from("member_moderation_status").select("action,expires_at").eq("user_id", user.id).maybeSingle()
    ]);
    if (!root.isConnected) return;
    const body = root.querySelector("#sb-my-sanctions-list");
    body.replaceChildren();
    if (events.error || current.error) {
      body.textContent = "No se pudo consultar tu historial de moderación."; return;
    }
    body.append(create("p", "sb-sanction-current", labelState(current.data)));
    if (!events.data?.length) { body.append(create("p", "", "No tienes advertencias ni sanciones registradas.")); return; }
    for (const item of events.data) {
      const card = create("article", "sb-sanction-event");
      card.append(create("strong", "", types[item.action] || item.action));
      card.append(create("small", "", dateLabel(item.created_at)));
      card.append(create("p", "", item.reason));
      if (item.expires_at) card.append(create("small", "", "Finaliza: " + dateLabel(item.expires_at)));
      body.append(card);
    }
  }
  window.SBMemberModeration = { mountPanel, mountAccountPanel };
})();
