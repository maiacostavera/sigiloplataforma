-- ============================================================
-- 01_extensiones_y_tipos.sql
-- ============================================================
create extension if not exists pgcrypto;
--> statement-breakpoint
create type estado_revision      as enum ('planificada','en_curso','concluida','informe_emitido');
--> statement-breakpoint
create type estado_item          as enum ('pendiente','respondido','aceptado','rechazado');
--> statement-breakpoint
create type resultado_conclusion as enum ('cumple','cumple_parcialmente','no_cumple');
--> statement-breakpoint
create type estado_observacion   as enum ('abierta','subsanada','no_subsanada');
--> statement-breakpoint
create type origen_evidencia     as enum ('portal','mail','carga_revisor');
