-- ============================================================
-- 02_tablas.sql
-- ============================================================
create table revisor (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  email     text not null unique,
  cuit      text,
  creado_en timestamptz not null default now()
);
--> statement-breakpoint
create table sujeto_obligado (
  id                   uuid primary key default gen_random_uuid(),
  revisor_id           uuid not null references revisor(id),
  razon_social         text not null,
  cuit                 text not null,
  sector               text not null,
  resolucion_aplicable text not null,
  creado_en            timestamptz not null default now(),
  unique (revisor_id, cuit)
);
--> statement-breakpoint
create table revision (
  id                   uuid primary key default gen_random_uuid(),
  sujeto_obligado_id   uuid not null references sujeto_obligado(id),
  periodo_desde        date not null,
  periodo_hasta        date not null,
  fecha_informe        date not null,
  revision_anterior_id uuid references revision(id),
  estado               estado_revision not null default 'planificada',
  creado_en            timestamptz not null default now(),
  check (periodo_hasta > periodo_desde)
);
--> statement-breakpoint
create table punto_programa (
  id               uuid primary key default gen_random_uuid(),
  revision_id      uuid not null references revision(id),
  codigo           text not null,
  titulo           text not null,
  texto            text not null,
  origen_normativo text not null,
  orden            int  not null,
  unique (revision_id, codigo)
);
--> statement-breakpoint
create table requerimiento (
  id              uuid primary key default gen_random_uuid(),
  revision_id     uuid not null references revision(id),
  numero          int  not null,
  titulo          text,
  token_portal    text not null unique,
  token_expira_en timestamptz not null,
  enviado_en      timestamptz,
  creado_en       timestamptz not null default now(),
  unique (revision_id, numero)
);
--> statement-breakpoint
create table requerimiento_item (
  id                uuid primary key default gen_random_uuid(),
  requerimiento_id  uuid not null references requerimiento(id),
  punto_programa_id uuid not null references punto_programa(id),
  descripcion       text not null,
  vence_en          date not null,
  responsable_email text not null,
  estado            estado_item not null default 'pendiente',
  creado_en         timestamptz not null default now()
);
--> statement-breakpoint
-- ---------- INMUTABLES de acá para abajo ----------

create table evidencia (
  id                    uuid primary key default gen_random_uuid(),
  requerimiento_item_id uuid not null references requerimiento_item(id),
  nombre_archivo        text not null,
  content_type          text not null,
  bytes                 bigint not null check (bytes > 0),
  storage_key           text not null unique,
  sha256                char(64) not null,
  origen                origen_evidencia not null,
  subido_por            text not null,
  recibido_en           timestamptz not null default now()
);
--> statement-breakpoint
create index on evidencia (sha256);
--> statement-breakpoint
create index on evidencia (requerimiento_item_id);
--> statement-breakpoint
create table conclusion (
  id                uuid primary key default gen_random_uuid(),
  punto_programa_id uuid not null references punto_programa(id),
  resultado         resultado_conclusion not null,
  fundamento        text not null check (length(trim(fundamento)) >= 20),
  autor_id          uuid not null references revisor(id),
  reemplaza_a       uuid references conclusion(id),
  emitida_en        timestamptz not null default now()
);
--> statement-breakpoint
create table conclusion_evidencia (
  conclusion_id uuid not null references conclusion(id),
  evidencia_id  uuid not null references evidencia(id),
  primary key (conclusion_id, evidencia_id)
);
--> statement-breakpoint
create table observacion (
  id                    uuid primary key default gen_random_uuid(),
  revision_id           uuid not null references revision(id),
  punto_programa_id     uuid not null references punto_programa(id),
  texto                 text not null,
  recomendacion         text not null,
  plazo                 date,
  estado                estado_observacion not null default 'abierta',
  observacion_origen_id uuid references observacion(id),
  reemplaza_a           uuid references observacion(id),
  creada_en             timestamptz not null default now()
);
--> statement-breakpoint
create table evento (
  id          bigserial primary key,
  entidad     text not null,
  entidad_id  uuid not null,
  tipo        text not null,
  payload     jsonb not null default '{}'::jsonb,
  actor       text not null,
  motivo      text,
  ocurrido_en timestamptz not null default now()
);
--> statement-breakpoint
create index on evento (entidad, entidad_id, ocurrido_en);
