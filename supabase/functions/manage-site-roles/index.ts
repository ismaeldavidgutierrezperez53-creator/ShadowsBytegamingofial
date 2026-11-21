import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

type SiteRole = "owner" | "admin" | "moderator" | "member";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return reply({ error: "Configuración del servidor incompleta" }, 500);

  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply({ error: "Inicia sesión" }, 401);

  const server = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate the actual caller, then check current server-side permissions,
  // never user_metadata or a client-supplied role.
  const { data: callerData, error: authError } = await server.auth.getUser(bearer);
  if (authError || !callerData.user) return reply({ error: "Sesión no válida" }, 401);
  const callerId = callerData.user.id;
  const [{ data: freshCaller, error: callerError }, { data: staff, error: staffError }] =
    await Promise.all([
      server.auth.admin.getUserById(callerId),
      server.from("site_staff_roles").select("role").eq("user_id", callerId).maybeSingle(),
    ]);
  if (callerError || staffError || freshCaller?.user?.app_metadata?.role !== "admin" ||
      !["owner", "admin"].includes(staff?.role ?? "")) {
    return reply({ error: "Solo los administradores pueden gestionar cargos" }, 403);
  }

  let body: { action?: string; target_id?: string; role?: SiteRole };
  try { body = await request.json(); }
  catch { return reply({ error: "Solicitud no válida" }, 400); }

  if (body.action === "list") {
    const [{ data: profiles, error: profileError }, { data: roles, error: rolesError }] =
      await Promise.all([
        server.from("profiles").select("id,display_name,username,created_at").order("created_at", { ascending: false }).limit(1000),
        server.from("site_staff_roles").select("user_id,role"),
      ]);
    if (profileError || rolesError) return reply({ error: "No se pudieron consultar los miembros" }, 500);
    const mapped = new Map((roles || []).map((entry) => [entry.user_id, entry.role]));
    return reply({
      members: (profiles || []).map((member) => ({
        ...member, role: mapped.get(member.id) || "member",
      })),
    });
  }

  if (body.action !== "set" || !body.target_id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.target_id) ||
      !["admin", "moderator", "member"].includes(body.role || "")) {
    return reply({ error: "Selecciona un miembro y un cargo válido" }, 400);
  }

  const targetId = body.target_id;
  const desiredRole = body.role as SiteRole;
  if (targetId === callerId) return reply({ error: "No puedes modificar tu propio cargo" }, 403);

  const [{ data: targetData, error: targetError }, { data: oldAssignment, error: assignmentError },
    { data: profile, error: profileError }] = await Promise.all([
      server.auth.admin.getUserById(targetId),
      server.from("site_staff_roles").select("*").eq("user_id", targetId).maybeSingle(),
      server.from("profiles").select("id").eq("id", targetId).maybeSingle(),
    ]);
  if (targetError || !targetData.user || profileError || !profile) return reply({ error: "Miembro no encontrado" }, 404);
  if (assignmentError) return reply({ error: "No se pudo consultar el cargo actual" }, 500);
  if (oldAssignment?.role === "owner") return reply({ error: "El administrador principal está protegido" }, 403);
  if (!oldAssignment && targetData.user.app_metadata?.role === "admin") {
    return reply({ error: "Este administrador no se puede modificar sin registrar primero su cargo" }, 403);
  }

  const previousRole: SiteRole = oldAssignment?.role || "member";
  if (previousRole === desiredRole) return reply({ ok: true, role: desiredRole, unchanged: true });

  const originalMetadata = { ...(targetData.user.app_metadata || {}) };
  const nextMetadata = { ...originalMetadata };
  if (desiredRole === "member") delete nextMetadata.role;
  else nextMetadata.role = desiredRole;

  // Record the new staff membership before modifying Auth metadata.
  const write = desiredRole === "member"
    ? await server.from("site_staff_roles").delete().eq("user_id", targetId)
    : await server.from("site_staff_roles").upsert({
        user_id: targetId, role: desiredRole, assigned_by: callerId,
        assigned_at: oldAssignment?.assigned_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  if (write.error) return reply({ error: "No se pudo guardar el nuevo cargo" }, 500);

  const { error: updateError } = await server.auth.admin.updateUserById(targetId, {
    app_metadata: nextMetadata,
  });
  if (updateError) {
    // Best-effort rollback of membership if the Auth API rejects the change.
    if (oldAssignment) {
      await server.from("site_staff_roles").upsert(oldAssignment);
    } else {
      await server.from("site_staff_roles").delete().eq("user_id", targetId);
    }
    console.error("Error al actualizar Auth:", updateError.message);
    return reply({ error: "No se pudo actualizar la cuenta. Inténtalo de nuevo." }, 500);
  }

  const { error: auditError } = await server.from("site_staff_role_audit").insert({
    actor_id: callerId, target_id: targetId, old_role: previousRole, new_role: desiredRole,
  });
  if (auditError) console.error("No se pudo registrar la auditoría:", auditError.message);
  return reply({ ok: true, role: desiredRole, audit_recorded: !auditError });
});
