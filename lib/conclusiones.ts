// Conclusiones, observaciones y condiciones de emisión del informe.
// Las funciones de lectura reciben ids ya verificados contra el revisor.
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, t, type DB, type Tx } from "./db";
import { registrarEvento } from "./db/evento";

export async function evidenciasDePunto(puntoId: string) {
  return db.select({ evidencia: t.evidencia, item: { id: t.requerimientoItem.id, descripcion: t.requerimientoItem.descripcion, estado: t.requerimientoItem.estado }, numero: t.requerimiento.numero })
    .from(t.evidencia)
    .innerJoin(t.requerimientoItem, eq(t.requerimientoItem.id, t.evidencia.requerimientoItemId))
    .innerJoin(t.requerimiento, eq(t.requerimiento.id, t.requerimientoItem.requerimientoId))
    .where(eq(t.requerimientoItem.puntoProgramaId, puntoId))
    .orderBy(asc(t.evidencia.recibidoEn));
}

/** Historial completo de conclusiones del punto (la vigente primero) con sus evidencias. */
export async function historialDeConclusiones(puntoId: string) {
  const todas = await db.select({ c: t.conclusion, autor: t.revisor.email }).from(t.conclusion)
    .innerJoin(t.revisor, eq(t.revisor.id, t.conclusion.autorId))
    .where(eq(t.conclusion.puntoProgramaId, puntoId)).orderBy(desc(t.conclusion.emitidaEn));
  const ids = todas.map((x) => x.c.id);
  const vinculos = ids.length ? await db.select().from(t.conclusionEvidencia).where(inArray(t.conclusionEvidencia.conclusionId, ids)) : [];
  const reemplazadas = new Set(todas.map((x) => x.c.reemplazaA).filter(Boolean));
  return todas.map((x) => ({
    ...x.c,
    autor: x.autor,
    vigente: !reemplazadas.has(x.c.id),
    evidencias: vinculos.filter((v) => v.conclusionId === x.c.id).map((v) => v.evidenciaId),
  }));
}

export type FilaPrograma = {
  id: string; codigo: string; titulo: string; texto: string; origen_normativo: string; orden: number;
  resultado: string | null; conclusion_id: string | null; vinculadas: number; recibidas: number;
};

export async function resumenPrograma(revisionId: string): Promise<FilaPrograma[]> {
  const f = await db.execute<FilaPrograma>(sql`
    select p.id, p.codigo, p.titulo, p.texto, p.origen_normativo, p.orden,
           c.resultado, c.id as conclusion_id,
           (select count(*)::int from conclusion_evidencia ce where ce.conclusion_id = c.id) as vinculadas,
           (select count(*)::int from evidencia e join requerimiento_item i on i.id = e.requerimiento_item_id where i.punto_programa_id = p.id) as recibidas
    from punto_programa p
    left join conclusion_vigente c on c.punto_programa_id = p.id
    where p.revision_id = ${revisionId}
    order by p.orden, p.codigo`);
  return [...f];
}

export type Faltante = { codigo: string; titulo: string; puntoId: string; problema: string };

/** Qué impide emitir el informe. Lista vacía = se puede emitir. */
export function faltantes(programa: FilaPrograma[]): Faltante[] {
  const out: Faltante[] = [];
  if (programa.length === 0) out.push({ codigo: "—", titulo: "Programa", puntoId: "", problema: "La revisión no tiene puntos de programa." });
  for (const p of programa) {
    if (!p.conclusion_id) out.push({ codigo: p.codigo, titulo: p.titulo, puntoId: p.id, problema: "No tiene conclusión." });
    else if (p.vinculadas === 0) out.push({ codigo: p.codigo, titulo: p.titulo, puntoId: p.id, problema: "La conclusión no tiene ninguna evidencia vinculada." });
  }
  return out;
}

/**
 * Tras cada conclusión: si el programa quedó completo, la revisión pasa a
 * 'concluida'; si una corrección lo dejó incompleto, vuelve a 'en_curso'.
 */
export async function actualizarEstadoRevision(tx: DB | Tx, revisionId: string, actor: string) {
  const [r] = await tx.select({ estado: t.revision.estado }).from(t.revision).where(eq(t.revision.id, revisionId));
  if (!r || r.estado === "informe_emitido") return;
  const f = await tx.execute<{ incompletos: number; total: number }>(sql`
    select count(*) filter (where c.id is null or not exists (select 1 from conclusion_evidencia ce where ce.conclusion_id = c.id))::int as incompletos,
           count(*)::int as total
    from punto_programa p left join conclusion_vigente c on c.punto_programa_id = p.id
    where p.revision_id = ${revisionId}`);
  const { incompletos, total } = [...f][0];
  const completo = total > 0 && incompletos === 0;
  const nuevo = completo ? "concluida" : r.estado === "concluida" ? "en_curso" : null;
  if (!nuevo || nuevo === r.estado) return;
  await tx.update(t.revision).set({ estado: nuevo }).where(eq(t.revision.id, revisionId));
  await registrarEvento(tx, { entidad: "revision", entidadId: revisionId, tipo: "estado_cambiado", actor, payload: { de: r.estado, a: nuevo } });
}

/** Observaciones vigentes de una revisión, con el punto y, si es arrastrada, su origen. */
export async function observacionesDeRevision(revisionId: string) {
  const f = await db.execute<{
    id: string; punto_programa_id: string; codigo: string; titulo: string; texto: string; recomendacion: string; plazo: string | null;
    estado: string; observacion_origen_id: string | null; creada_en: string; origen_periodo_hasta: string | null;
  }>(sql`
    select o.id, o.punto_programa_id, p.codigo, p.titulo, o.texto, o.recomendacion, o.plazo::text, o.estado, o.observacion_origen_id, o.creada_en,
           rv.periodo_hasta::text as origen_periodo_hasta
    from observacion_vigente o
    join punto_programa p on p.id = o.punto_programa_id
    left join observacion oo on oo.id = o.observacion_origen_id
    left join revision rv on rv.id = oo.revision_id
    where o.revision_id = ${revisionId}
    order by p.orden, o.creada_en`);
  return [...f];
}

/** Observaciones de la revisión anterior que siguen abiertas y todavía no se arrastraron. */
export async function pendientesDeArrastre(revisionId: string, anteriorId: string) {
  const f = await db.execute<{ id: string; codigo: string; titulo: string; texto: string; recomendacion: string; plazo: string | null }>(sql`
    select o.id, p.codigo, p.titulo, o.texto, o.recomendacion, o.plazo::text
    from observacion_vigente o
    join punto_programa p on p.id = o.punto_programa_id
    where o.revision_id = ${anteriorId}
      and o.estado <> 'subsanada'
      and not exists (
        select 1 from observacion x
        where x.revision_id = ${revisionId}
          and (x.observacion_origen_id = o.id
               or x.observacion_origen_id in (select y.id from observacion y where y.reemplaza_a = o.id or o.reemplaza_a = y.id)))
    order by p.orden, o.creada_en`);
  return [...f];
}

export async function observacionesDePunto(puntoId: string) {
  return db.select().from(t.observacionVigente).where(eq(t.observacionVigente.puntoProgramaId, puntoId)).orderBy(asc(t.observacionVigente.creadaEn));
}

