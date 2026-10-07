// El portal del sujeto obligado. Público, sin login, por token.
//
// Regla: el token da acceso a UN requerimiento. Toda consulta de este archivo
// filtra por el token (y por su vencimiento). Ningún id que llegue del cliente
// se usa sin cruzarlo antes contra ese requerimiento.
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, t } from "./db";
import { registrarEvento } from "./db/evento";
import { uuid } from "./validar";

const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export type Portal =
  | { estado: "invalido" }
  | { estado: "vencido"; contacto: string; razonSocial: string; numero: number }
  | {
      estado: "ok";
      requerimiento: { id: string; numero: number; titulo: string | null; expiraEn: Date };
      razonSocial: string;
      contacto: string;
      items: ItemPortal[];
    };

export type ItemPortal = {
  id: string;
  descripcion: string;
  venceEn: string;
  estado: "pendiente" | "respondido" | "aceptado" | "rechazado";
  punto: string;
  archivos: { nombre: string; recibidoEn: Date }[];
  motivoRechazo: string | null;
};

/** Requerimiento al que da acceso el token, sin mirar el vencimiento. */
async function requerimientoPorToken(token: string) {
  if (!FORMATO_TOKEN.test(token)) return null;
  const [q] = await db
    .select({
      id: t.requerimiento.id, numero: t.requerimiento.numero, titulo: t.requerimiento.titulo, expiraEn: t.requerimiento.tokenExpiraEn,
      vigente: sql<boolean>`${t.requerimiento.tokenExpiraEn} > now()`,
      razonSocial: t.sujetoObligado.razonSocial, contacto: t.revisor.email,
    })
    .from(t.requerimiento)
    .innerJoin(t.revision, eq(t.revision.id, t.requerimiento.revisionId))
    .innerJoin(t.sujetoObligado, eq(t.sujetoObligado.id, t.revision.sujetoObligadoId))
    .innerJoin(t.revisor, eq(t.revisor.id, t.sujetoObligado.revisorId))
    .where(eq(t.requerimiento.tokenPortal, token));
  return q ?? null;
}

export async function portalPorToken(token: string): Promise<Portal> {
  const q = await requerimientoPorToken(token);
  if (!q) return { estado: "invalido" };
  if (!q.vigente) return { estado: "vencido", contacto: q.contacto, razonSocial: q.razonSocial, numero: q.numero };

  const filas = await db
    .select({ item: t.requerimientoItem, punto: t.puntoPrograma.titulo })
    .from(t.requerimientoItem)
    .innerJoin(t.puntoPrograma, eq(t.puntoPrograma.id, t.requerimientoItem.puntoProgramaId))
    .where(eq(t.requerimientoItem.requerimientoId, q.id))
    .orderBy(asc(t.puntoPrograma.orden), asc(t.requerimientoItem.creadoEn));

  const ids = filas.map((f) => f.item.id);
  const archivos = ids.length
    ? await db.select({ itemId: t.evidencia.requerimientoItemId, nombre: t.evidencia.nombreArchivo, recibidoEn: t.evidencia.recibidoEn })
        .from(t.evidencia).where(inArray(t.evidencia.requerimientoItemId, ids)).orderBy(asc(t.evidencia.recibidoEn))
    : [];
  // Último rechazo de cada ítem, para que el revisado sepa qué volver a mandar.
  const rechazos = ids.length
    ? await db.select({ itemId: t.evento.entidadId, motivo: t.evento.motivo, cuando: t.evento.ocurridoEn })
        .from(t.evento)
        .where(and(eq(t.evento.entidad, "requerimiento_item"), eq(t.evento.tipo, "item_rechazado"), inArray(t.evento.entidadId, ids)))
        .orderBy(asc(t.evento.id))
    : [];
  const motivo = new Map(rechazos.map((r) => [r.itemId, r.motivo]));

  return {
    estado: "ok",
    requerimiento: { id: q.id, numero: q.numero, titulo: q.titulo, expiraEn: q.expiraEn },
    razonSocial: q.razonSocial,
    contacto: q.contacto,
    items: filas.map(({ item, punto }) => ({
      id: item.id,
      descripcion: item.descripcion,
      venceEn: item.venceEn,
      estado: item.estado,
      punto,
      archivos: archivos.filter((a) => a.itemId === item.id).map((a) => ({ nombre: a.nombre, recibidoEn: a.recibidoEn })),
      motivoRechazo: item.estado === "rechazado" ? (motivo.get(item.id) ?? null) : null,
    })),
  };
}

/**
 * El ítem, solo si pertenece al requerimiento del token y el token está
 * vigente. Es la única forma de llegar a un ítem desde el portal.
 */
export async function itemDelPortal(token: string, itemId: string) {
  if (!FORMATO_TOKEN.test(token) || !uuid(itemId)) return null;
  const [i] = await db
    .select({ item: t.requerimientoItem, requerimientoId: t.requerimiento.id })
    .from(t.requerimientoItem)
    .innerJoin(t.requerimiento, eq(t.requerimiento.id, t.requerimientoItem.requerimientoId))
    .where(and(eq(t.requerimientoItem.id, itemId), eq(t.requerimiento.tokenPortal, token), gt(t.requerimiento.tokenExpiraEn, sql`now()`)));
  return i ?? null;
}

export class ErrorPortal extends Error {
  constructor(public codigo: "sin_acceso" | "aceptado" | "vacio" | "muy_grande" | "comentario_largo") {
    super(codigo);
  }
}

export const MAX_COMENTARIO = 2000;

/** Comentario del revisado sobre un ítem. Queda en `evento`, que es append-only. */
export async function comentar(token: string, itemId: string, texto: string) {
  const i = await itemDelPortal(token, itemId);
  if (!i) throw new ErrorPortal("sin_acceso");
  const limpio = texto.trim();
  if (!limpio) return;
  if (limpio.length > MAX_COMENTARIO) throw new ErrorPortal("comentario_largo");
  await registrarEvento(db, {
    entidad: "requerimiento_item", entidadId: i.item.id, tipo: "comentario_portal",
    actor: i.item.responsableEmail, payload: { comentario: limpio },
  });
}
