// Consultas de lectura para las pantallas del revisor. Todas reciben el
// revisorId y lo usan en el WHERE: nunca se lee nada de otro revisor.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, t } from "./db";

export type FilaExpediente = {
  sujeto_id: string;
  razon_social: string;
  cuit: string;
  sector: string;
  revision_id: string | null;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  fecha_informe: string | null;
  estado: string | null;
};

/**
 * Un renglón por sujeto obligado, con su revisión activa: la que no emitió
 * informe y vence primero; si todas emitieron, la más reciente.
 */
export async function misExpedientes(revisorId: string): Promise<FilaExpediente[]> {
  const filas = await db.execute<FilaExpediente>(sql`
    select s.id as sujeto_id, s.razon_social, s.cuit, s.sector,
           r.id as revision_id, r.periodo_desde::text, r.periodo_hasta::text, r.fecha_informe::text, r.estado
    from sujeto_obligado s
    left join lateral (
      select * from revision r where r.sujeto_obligado_id = s.id
      order by (r.estado = 'informe_emitido'), case when r.estado = 'informe_emitido' then null else r.fecha_informe end asc nulls last, r.periodo_hasta desc limit 1
    ) r on true
    where s.revisor_id = ${revisorId}
    order by r.fecha_informe asc nulls last, s.razon_social asc`);
  return [...filas];
}

export async function revisionesDelSujeto(revisorId: string, sujetoId: string) {
  return db.select({ revision: t.revision }).from(t.revision)
    .innerJoin(t.sujetoObligado, eq(t.sujetoObligado.id, t.revision.sujetoObligadoId))
    .where(and(eq(t.revision.sujetoObligadoId, sujetoId), eq(t.sujetoObligado.revisorId, revisorId)))
    .orderBy(desc(t.revision.periodoHasta))
    .then((f) => f.map((x) => x.revision));
}

export async function revisionPorId(revisionId: string) {
  const [r] = await db.select().from(t.revision).where(eq(t.revision.id, revisionId));
  return r ?? null;
}

/** Puntos de una revisión que ya se verificó que es del revisor. */
export async function puntosDeRevision(revisionId: string) {
  return db.select().from(t.puntoPrograma).where(eq(t.puntoPrograma.revisionId, revisionId))
    .orderBy(asc(t.puntoPrograma.orden), asc(t.puntoPrograma.codigo));
}

export async function requerimientosDeRevision(revisionId: string) {
  return db.execute<{
    id: string; numero: number; titulo: string | null; enviado_en: string | null; token_expira_en: string; creado_en: string;
    items: number; pendientes: number; respondidos: number; aceptados: number; rechazados: number; vence_primero: string | null;
  }>(sql`
    select q.id, q.numero, q.titulo, q.enviado_en, q.token_expira_en, q.creado_en,
           count(i.id)::int as items,
           count(i.id) filter (where i.estado = 'pendiente')::int as pendientes,
           count(i.id) filter (where i.estado = 'respondido')::int as respondidos,
           count(i.id) filter (where i.estado = 'aceptado')::int as aceptados,
           count(i.id) filter (where i.estado = 'rechazado')::int as rechazados,
           min(i.vence_en) filter (where i.estado in ('pendiente','rechazado'))::text as vence_primero
    from requerimiento q
    left join requerimiento_item i on i.requerimiento_id = q.id
    where q.revision_id = ${revisionId}
    group by q.id
    order by q.numero desc`).then((f) => [...f]);
}

/** Ítems de un requerimiento ya verificado, con el punto al que responden. */
export async function itemsDeRequerimiento(requerimientoId: string) {
  return db.select({ item: t.requerimientoItem, punto: { id: t.puntoPrograma.id, codigo: t.puntoPrograma.codigo, titulo: t.puntoPrograma.titulo } })
    .from(t.requerimientoItem)
    .innerJoin(t.puntoPrograma, eq(t.puntoPrograma.id, t.requerimientoItem.puntoProgramaId))
    .where(eq(t.requerimientoItem.requerimientoId, requerimientoId))
    .orderBy(asc(t.puntoPrograma.orden), asc(t.requerimientoItem.creadoEn));
}
