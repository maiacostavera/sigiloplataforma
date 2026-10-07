-- ============================================================
-- 04_inmutabilidad.sql   ← ESTO ES EL PRODUCTO
-- ============================================================
create or replace function bloquear_modificacion() returns trigger as $$
begin
  raise exception
    'La tabla % es append-only. Una corrección se inserta como fila nueva con reemplaza_a.',
    tg_table_name;
end;
$$ language plpgsql;
--> statement-breakpoint
create trigger no_tocar before update or delete on evidencia
  for each row execute function bloquear_modificacion();
--> statement-breakpoint
create trigger no_tocar before update or delete on conclusion
  for each row execute function bloquear_modificacion();
--> statement-breakpoint
create trigger no_tocar before update or delete on observacion
  for each row execute function bloquear_modificacion();
--> statement-breakpoint
create trigger no_tocar before update or delete on evento
  for each row execute function bloquear_modificacion();
