-- ============================================================
-- 06_credenciales.sql
-- ============================================================
-- La contraseña del revisor vive en una tabla aparte para no tocar `revisor`.
-- No es parte del expediente: se puede actualizar (cambio de contraseña).
create table revisor_credencial (
  revisor_id     uuid primary key references revisor(id),
  clave_hash     text not null,
  actualizada_en timestamptz not null default now()
);
--> statement-breakpoint
grant select, insert, update on revisor_credencial to app_sigilo;
