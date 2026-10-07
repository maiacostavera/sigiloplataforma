// Espejo en Drizzle del esquema de /drizzle/*.sql. Las migraciones son SQL
// escrito a mano: este archivo solo sirve para tipar las consultas.
import {
  bigint, bigserial, char, date, integer, jsonb, pgEnum, pgTable, pgView, primaryKey, text, timestamp, uuid,
} from "drizzle-orm/pg-core";

const ts = (n: string) => timestamp(n, { withTimezone: true, mode: "date" });
const fecha = (n: string) => date(n, { mode: "string" });

export const estadoRevision = pgEnum("estado_revision", ["planificada", "en_curso", "concluida", "informe_emitido"]);
export const estadoItem = pgEnum("estado_item", ["pendiente", "respondido", "aceptado", "rechazado"]);
export const resultadoConclusion = pgEnum("resultado_conclusion", ["cumple", "cumple_parcialmente", "no_cumple"]);
export const estadoObservacion = pgEnum("estado_observacion", ["abierta", "subsanada", "no_subsanada"]);
export const origenEvidencia = pgEnum("origen_evidencia", ["portal", "mail", "carga_revisor"]);

export const revisor = pgTable("revisor", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  cuit: text("cuit"),
  creadoEn: ts("creado_en").notNull().defaultNow(),
});

export const revisorCredencial = pgTable("revisor_credencial", {
  revisorId: uuid("revisor_id").primaryKey().references(() => revisor.id),
  claveHash: text("clave_hash").notNull(),
  actualizadaEn: ts("actualizada_en").notNull().defaultNow(),
});

export const sujetoObligado = pgTable("sujeto_obligado", {
  id: uuid("id").primaryKey().defaultRandom(),
  revisorId: uuid("revisor_id").notNull().references(() => revisor.id),
  razonSocial: text("razon_social").notNull(),
  cuit: text("cuit").notNull(),
  sector: text("sector").notNull(),
  resolucionAplicable: text("resolucion_aplicable").notNull(),
  creadoEn: ts("creado_en").notNull().defaultNow(),
});

export const revision = pgTable("revision", {
  id: uuid("id").primaryKey().defaultRandom(),
  sujetoObligadoId: uuid("sujeto_obligado_id").notNull().references(() => sujetoObligado.id),
  periodoDesde: fecha("periodo_desde").notNull(),
  periodoHasta: fecha("periodo_hasta").notNull(),
  fechaInforme: fecha("fecha_informe").notNull(),
  revisionAnteriorId: uuid("revision_anterior_id"),
  estado: estadoRevision("estado").notNull().default("planificada"),
  creadoEn: ts("creado_en").notNull().defaultNow(),
});

export const puntoPrograma = pgTable("punto_programa", {
  id: uuid("id").primaryKey().defaultRandom(),
  revisionId: uuid("revision_id").notNull().references(() => revision.id),
  codigo: text("codigo").notNull(),
  titulo: text("titulo").notNull(),
  texto: text("texto").notNull(),
  origenNormativo: text("origen_normativo").notNull(),
  orden: integer("orden").notNull(),
});

export const requerimiento = pgTable("requerimiento", {
  id: uuid("id").primaryKey().defaultRandom(),
  revisionId: uuid("revision_id").notNull().references(() => revision.id),
  numero: integer("numero").notNull(),
  titulo: text("titulo"),
  tokenPortal: text("token_portal").notNull().unique(),
  tokenExpiraEn: ts("token_expira_en").notNull(),
  enviadoEn: ts("enviado_en"),
  creadoEn: ts("creado_en").notNull().defaultNow(),
});

export const requerimientoItem = pgTable("requerimiento_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  requerimientoId: uuid("requerimiento_id").notNull().references(() => requerimiento.id),
  puntoProgramaId: uuid("punto_programa_id").notNull().references(() => puntoPrograma.id),
  descripcion: text("descripcion").notNull(),
  venceEn: fecha("vence_en").notNull(),
  responsableEmail: text("responsable_email").notNull(),
  estado: estadoItem("estado").notNull().default("pendiente"),
  creadoEn: ts("creado_en").notNull().defaultNow(),
});

// ---------- INMUTABLES ----------

export const evidencia = pgTable("evidencia", {
  id: uuid("id").primaryKey().defaultRandom(),
  requerimientoItemId: uuid("requerimiento_item_id").notNull().references(() => requerimientoItem.id),
  nombreArchivo: text("nombre_archivo").notNull(),
  contentType: text("content_type").notNull(),
  bytes: bigint("bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull().unique(),
  sha256: char("sha256", { length: 64 }).notNull(),
  origen: origenEvidencia("origen").notNull(),
  subidoPor: text("subido_por").notNull(),
  recibidoEn: ts("recibido_en").notNull().defaultNow(),
});

const columnasConclusion = {
  id: uuid("id").primaryKey().defaultRandom(),
  puntoProgramaId: uuid("punto_programa_id").notNull(),
  resultado: resultadoConclusion("resultado").notNull(),
  fundamento: text("fundamento").notNull(),
  autorId: uuid("autor_id").notNull(),
  reemplazaA: uuid("reemplaza_a"),
  emitidaEn: ts("emitida_en").notNull().defaultNow(),
};
export const conclusion = pgTable("conclusion", columnasConclusion);

export const conclusionEvidencia = pgTable(
  "conclusion_evidencia",
  {
    conclusionId: uuid("conclusion_id").notNull().references(() => conclusion.id),
    evidenciaId: uuid("evidencia_id").notNull().references(() => evidencia.id),
  },
  (t) => [primaryKey({ columns: [t.conclusionId, t.evidenciaId] })],
);

const columnasObservacion = {
  id: uuid("id").primaryKey().defaultRandom(),
  revisionId: uuid("revision_id").notNull(),
  puntoProgramaId: uuid("punto_programa_id").notNull(),
  texto: text("texto").notNull(),
  recomendacion: text("recomendacion").notNull(),
  plazo: fecha("plazo"),
  estado: estadoObservacion("estado").notNull().default("abierta"),
  observacionOrigenId: uuid("observacion_origen_id"),
  reemplazaA: uuid("reemplaza_a"),
  creadaEn: ts("creada_en").notNull().defaultNow(),
};
export const observacion = pgTable("observacion", columnasObservacion);

export const evento = pgTable("evento", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  entidad: text("entidad").notNull(),
  entidadId: uuid("entidad_id").notNull(),
  tipo: text("tipo").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  actor: text("actor").notNull(),
  motivo: text("motivo"),
  ocurridoEn: ts("ocurrido_en").notNull().defaultNow(),
});

// ---------- vistas ----------
export const conclusionVigente = pgView("conclusion_vigente", columnasConclusion).existing();
export const observacionVigente = pgView("observacion_vigente", columnasObservacion).existing();
