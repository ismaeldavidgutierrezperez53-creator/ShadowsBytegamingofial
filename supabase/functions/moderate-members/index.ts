import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const response = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers });
type Action = "warning" | "suspend" | "ban" | "lift";
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return response({ error: "Método no permitido" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return response({ error: "Servidor no configurado" }, 500);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response({ error: "Inicia sesión" }, 401);
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: caller, error: authError } = await db.auth.getUser(token);
  if (authError || !caller.user) return response({ error: "Sesión inválida" }, 401);
  const [{ data: account }, { data: staff, error: staffError }] = await Promise.all([
    db.auth.admin.getUserById(caller.user.id),
    db.from("site_staff_roles").select("role").eq("user_id", caller.user.id).maybeSingle(),
  ]);
  if (staffError || !staff || !["owner", "admin", "moderator"].includes(staff.role) ||
      account?.user?.app_metadata?.role !== (staff.role === "moderator" ? "moderator" : "admin")) {
    return response({ error: "No tienes permiso para gestionar sanciones" }, 403);
  }
  const isAdmin = staff.role !== "moderator";

  let body: { action?: string; target_id?: string; reason?: string; duration_hours?: number; limit?: number };
  try { body = await request.json(); }
  catch { return response({ error: "Datos inválidos" }, 400); }

  if (body.action === "list") {
    const [members, roles, states] = await Promise.all([
      db.from("profiles").select("id,display_name,username").order("created_at", { ascending: false }).limit(1000),
      db.from("site_staff_roles").select("user_id,role"),
      db.from("member_moderation_status").select("user_id,action,reason,expires_at,updated_at"),
    ]);
    if (members.error || roles.error || states.error)
      return response({ error: "No se pudo consultar la lista de miembros" }, 500);
    const roleById = new Map((roles.data || []).map(r => [r.user_id, r.role]));
    const stateById = new Map((states.data || []).map(s => [s.user_id, s]));
    return response({ members: (members.data || []).map(member => ({
      ...member, role: roleById.get(member.id) || "member",
      sanction: stateById.get(member.id) || null,
    })) });
  }

  if (body.action === "history") {
    const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
    let query = db.from("member_moderation_events")
      .select("id,target_id,actor_id,action,reason,expires_at,created_at")
      .order("created_at", { ascending: false }).limit(limit);
    if (body.target_id) {
      if (!uuid.test(body.target_id)) return response({ error: "Miembro no válido" }, 400);
      query = query.eq("target_id", body.target_id);
    }
    const { data, error } = await query;
    if (error) return response({ error: "No se pudo cargar el historial" }, 500);
    return response({ history: data || [] });
  }

  if (!["warning", "suspend", "ban", "lift"].includes(body.action || "") ||
      !uuid.test(body.target_id || "")) {
    return response({ error: "Selecciona una sanción y un miembro" }, 400);
  }
  const action = body.action as Action;
  const targetId = body.target_id as string;
  const reason = String(body.reason || "").trim().slice(0, 501);
  if (reason.length < 6 || reason.length > 500) {
    return response({ error: "Escribe un motivo entre 6 y 500 caracteres" }, 400);
  }
  if (caller.user.id === targetId) return response({ error: "No puedes sancionarte a ti mismo" }, 403);
  if (action === "ban" && !isAdmin) return response({ error: "Solo un administrador puede expulsar permanentemente" }, 403);

  const duration = body.duration_hours;
  if (action === "suspend" && (![24, 72, 168, 720].includes(duration || 0) ||
    (!isAdmin && duration === 720))) {
    return response({ error: "Duración no permitida para tu cargo" }, 403);
  }

  const [target, targetStaff, profile, current] = await Promise.all([
    db.auth.admin.getUserById(targetId),
    db.from("site_staff_roles").select("role").eq("user_id", targetId).maybeSingle(),
    db.from("profiles").select("id").eq("id", targetId).maybeSingle(),
    db.from("member_moderation_status").select("*").eq("user_id", targetId).maybeSingle(),
  ]);
  if (target.error || !target.data.user || profile.error || !profile.data) {
    return response({ error: "El miembro no existe" }, 404);
  }
  if (targetStaff.error || current.error) return response({ error: "No se pudieron verificar los permisos" }, 500);
  if (targetStaff.data || ["admin", "moderator"].includes(target.data.user.app_metadata?.role)) {
    return response({ error: "Los cargos del equipo están protegidos. Retira el cargo antes de sancionar." }, 403);
  }
  const prev = current.data;
  const prevActive = prev && (prev.action === "ban" || Date.parse(prev.expires_at || "") > Date.now());
  if (action === "lift" && !prevActive) return response({ error: "Este miembro no tiene una sanción activa" }, 409);
  if (action === "lift" && prev?.action === "ban" && !isAdmin) {
    return response({ error: "Solo un administrador puede levantar una expulsión" }, 403);
  }
  if (action === "suspend" && prevActive && prev?.action === "ban") {
    return response({ error: "Primero debes levantar la expulsión vigente" }, 409);
  }
  if (action === "ban" && prevActive && prev?.action === "ban") {
    return response({ error: "Este miembro ya está expulsado" }, 409);
  }

  const until = action === "suspend"
    ? new Date(Date.now() + (duration as number) * 3600000).toISOString()
    : null;
  // GoTrue impide futuros accesos. La RLS también bloquea publicaciones
  // durante el tiempo de vida de un JWT anterior a la sanción.
  if (action === "suspend" || action === "ban" || action === "lift") {
    const banDuration = action === "lift" ? "none" : action === "ban" ? "876000h" : `${duration}h`;
    const { error } = await db.auth.admin.updateUserById(targetId, { ban_duration: banDuration });
    if (error) {
      console.error("Auth ban update failed:", error.message);
      return response({ error: "No se pudo cambiar el acceso de la cuenta" }, 500);
    }
    const change = action === "lift"
      ? await db.from("member_moderation_status").delete().eq("user_id", targetId)
      : await db.from("member_moderation_status").upsert({
          user_id: targetId, action, reason, expires_at: until,
          updated_by: caller.user.id, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    if (change.error) {
      // A failed state update must not leave the target blocked.
      const previousBan = prevActive
        ? prev?.action === "ban" ? "876000h"
          : `${Math.max(1, Math.ceil((Date.parse(prev.expires_at) - Date.now()) / 3600000))}h`
        : "none";
      await db.auth.admin.updateUserById(targetId, { ban_duration: previousBan });
      console.error("Moderation state update failed:", change.error.message);
      return response({ error: "No se pudo registrar el nuevo estado de la cuenta" }, 500);
    }
  }

  const { data: event, error: eventError } = await db.from("member_moderation_events").insert({
    target_id: targetId, actor_id: caller.user.id, action, reason, expires_at: until,
  }).select("id").single();
  if (eventError) {
    console.error("Sanction history insert failed:", eventError.message);
    // Do not claim a successful audit when it failed.
    return response({ error: "El acceso pudo cambiar, pero no se guardó el historial. Contacta con administración." }, 500);
  }
  return response({ ok: true, event_id: event.id, action, expires_at: until });
});
