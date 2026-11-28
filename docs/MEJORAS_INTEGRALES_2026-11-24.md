# Plan de mejoras integrales — Shadows Byte Gaming Official V2
Fecha de revisión: 2026-11-24

## Alcance
- 🎌 Anime: revisar listas, reseñas, comentarios, recomendaciones y permisos.
- 🎮 Gaming: revisar biblioteca, sesiones, retos, clasificaciones y perfiles.
- 💬 Comunidad: revisar publicaciones, reacciones, spoilers, encuestas, menciones y moderación.
- 👤 Perfiles: revisar visibilidad, seguidores, información, etiquetas y elementos multimedia.
- 🔔 Notificaciones: comprobar permisos de lectura, historial, push Android/Windows y funciones privilegiadas.
- 🛡️ Administración: auditar roles, visibilidad por apartado, apelaciones, tienda y cajas misteriosas.
- 📱 Experiencia: revisar navegación en móvil, botones, accesibilidad y rendimiento.

## Cambio aplicado directamente en Supabase
Proyecto: Shadows Byte Gaming Official (`nutoxlbdotcllwlshhhr`).
Migración aplicada: `optimize_section_daily_analytics_lookup`.
Índice creado y verificado:

```sql
create index if not exists site_section_views_daily_section_day_idx
on public.site_section_views_daily (section, visit_day desc);
```

Este índice complementa la clave principal `(visit_day, section)` en consultas que filtran primero por sección. **Ya está aplicado en Supabase; no es necesario repetirlo en producción.** No se han modificado datos de miembros.

## Auditoría de seguridad: pendientes de evaluación
El asesor de seguridad de Supabase informó:
- 34 tablas con RLS activado y sin políticas. Algunas pueden estar deliberadamente restringidas: no se deben añadir políticas genéricas sin conocer su uso.
- 1 vista `public.member_notification_history_core` con seguridad del propietario. Antes de cambiarla a `security_invoker`, validar todas las políticas y permisos de tablas subyacentes para evitar pérdida de notificaciones.
- 50 funciones `SECURITY DEFINER` ejecutables por el rol anónimo. Revisar una por una su necesidad pública, validación de identidad y posibles revocaciones; no revocar masivamente.

Referencia: https://supabase.com/docs/guides/database/database-linter
Referencia: https://supabase.com/docs/guides/database/postgres/row-level-security

## Orden de implementación recomendado
1. Revisar roles y permisos efectivos del backend, incluyendo funciones y vistas privilegiadas.
2. Añadir pruebas de seguridad que comprueben que un miembro no puede editar contenidos de otros.
3. Comprobar flujos de usuario: registro, perfiles, publicaciones, notificaciones y videollamadas.
4. Mejorar progresivamente Anime, Gaming y Comunidad sin sustituir funcionalidades existentes.
5. Probar Android y Windows; verificar indicadores de rendimiento y accesibilidad.

## Verificación
- [x] Repositorio GitHub accesible (rama base `main`).
- [x] Supabase activo (`ACTIVE_HEALTHY`).
- [x] Tablas públicas revisadas: RLS activado en las listadas.
- [x] Índice de estadísticas diarias creado y comprobado en `pg_indexes`.
- [ ] Pruebas end-to-end en navegadores y apps.
- [ ] Auditoría detallada de políticas y funciones.
- [ ] Cambios visuales y funcionales por apartado.

> Este documento registra diagnóstico y primeras acciones verificadas. Las demás mejoras son pendientes, no funciones ya implementadas.
