-- ============================================================
-- 03_vistas.sql   (el estado actual se proyecta, no se guarda)
-- ============================================================
create view conclusion_vigente as
  select c.* from conclusion c
  where not exists (select 1 from conclusion x where x.reemplaza_a = c.id);
--> statement-breakpoint
create view observacion_vigente as
  select o.* from observacion o
  where not exists (select 1 from observacion x where x.reemplaza_a = o.id);
