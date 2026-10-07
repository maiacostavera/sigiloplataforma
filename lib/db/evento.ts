import type { DB, Tx } from ".";
import { evento } from "./esquema";

export type Evento = {
  entidad: string;
  entidadId: string;
  tipo: string;
  actor: string;
  payload?: Record<string, unknown>;
  motivo?: string | null;
};

/** Todo cambio de estado escribe una fila en `evento`. La fecha la pone Postgres. */
export async function registrarEvento(tx: DB | Tx, e: Evento) {
  await tx.insert(evento).values({
    entidad: e.entidad,
    entidadId: e.entidadId,
    tipo: e.tipo,
    actor: e.actor,
    payload: e.payload ?? {},
    motivo: e.motivo ?? null,
  });
}
