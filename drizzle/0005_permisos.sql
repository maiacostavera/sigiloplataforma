-- ============================================================
-- 05_permisos.sql   ← y ESTO lo hace demostrable
-- ============================================================
-- Los roles son globales al servidor: si `app_sigilo` ya existe (otra base del
-- mismo servidor, por ejemplo la de tests) no se vuelve a crear.
-- En producción, cambiá la contraseña: alter role app_sigilo password '...';
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_sigilo') then
    create role app_sigilo login password 'cambiar';
  end if;
end
$$;
--> statement-breakpoint
grant usage on schema public to app_sigilo;
--> statement-breakpoint
grant select, insert on all tables in schema public to app_sigilo;
--> statement-breakpoint
grant usage, select on all sequences in schema public to app_sigilo;
--> statement-breakpoint
grant update, delete on sujeto_obligado, revision, punto_programa,
                        requerimiento, requerimiento_item to app_sigilo;
--> statement-breakpoint
revoke update, delete on evidencia, conclusion, conclusion_evidencia,
                         observacion, evento from app_sigilo;
