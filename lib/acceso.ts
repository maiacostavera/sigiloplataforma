// Toda consulta del revisor filtra por revisor_id. Estas funciones son la
// única puerta: si devuelven null, la entidad no existe PARA ESTE revisor.
import { and, eq } from "drizzle-orm";
import { db, t } from "./db";
import { uuid } from "./validar";

export async function sujetoDelRevisor(revisorId: string, sujetoId: string) {
  if (!uuid(sujetoId) || !uuid(revisorId)) return null;
  const [s] = await db.select().from(t.sujetoObligado)
    .where(and(eq(t.sujetoObligado.id, sujetoId), eq(t.sujetoObligado.revisorId, revisorId)));
  return s ?? null;
}

export async function revisionDelRevisor(revisorId: string, revisionId: string) {
  if (!uuid(revisionId) || !uuid(revisorId)) return null;
  const [r] = await db.select({ revision: t.revision, sujeto: t.sujetoObligado })
    .from(t.revision)
    .innerJoin(t.sujetoObligado, eq(t.sujetoObligado.id, t.revision.sujetoObligadoId))
    .where(and(eq(t.revision.id, revisionId), eq(t.sujetoObligado.revisorId, revisorId)));
  return r ?? null;
}

export async function puntoDelRevisor(revisorId: string, puntoId: string) {
  if (!uuid(puntoId) || !uuid(revisorId)) return null;
  const [p] = await db.select({ punto: t.puntoPrograma, revision: t.revision, sujeto: t.sujetoObligado })
    .from(t.puntoPrograma)
    .innerJoin(t.revision, eq(t.revision.id, t.puntoPrograma.revisionId))
    .innerJoin(t.sujetoObligado, eq(t.sujetoObligado.id, t.revision.sujetoObligadoId))
    .where(and(eq(t.puntoPrograma.id, puntoId), eq(t.sujetoObligado.revisorId, revisorId)));
  return p ?? null;
}

export async function requerimientoDelRevisor(revisorId: string, requerimientoId: string) {
  if (!uuid(requerimientoId) || !uuid(revisorId)) return null;
  const [q] = await db.select({ requerimiento: t.requerimiento, revision: t.revision, sujeto: t.sujetoObligado })
    .from(t.requerimiento)
    .innerJoin(t.revision, eq(t.revision.id, t.requerimiento.revisionId))
    .innerJoin(t.sujetoObligado, eq(t.sujetoObligado.id, t.revision.sujetoObligadoId))
    .where(and(eq(t.requerimiento.id, requerimientoId), eq(t.sujetoObligado.revisorId, revisorId)));
  return q ?? null;
}
