// Recepción de evidencias. El orden de los pasos es parte del producto:
//   1. leer en memoria  2. SHA-256  3. storage  4. fila en evidencia
//   5. evento  6. ítem a 'respondido'
// La fecha de recepción la pone Postgres. La huella se calcula ANTES de guardar.
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, t } from "./db";
import { registrarEvento } from "./db/evento";
import { almacen } from "./almacen";
import { comentar, ErrorPortal, itemDelPortal } from "./portal";

import { MAX_BYTES } from "./limites";
export { MAX_BYTES };

export type Recibida = { id: string; sha256: string; bytes: number; nombre: string };

function extension(nombre: string) {
  const m = /\.([A-Za-z0-9]{1,10})$/.exec(nombre);
  return m ? `.${m[1].toLowerCase()}` : "";
}

function nombreLimpio(nombre: string) {
  // Sin rutas ni caracteres de control. El nombre original se conserva tal cual en lo demás.
  const base = nombre.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255) || "archivo";
}

/** Recibe un archivo para un ítem ya autorizado. */
export async function recibirArchivo(item: { id: string; estado: string; responsableEmail: string }, archivo: File, origen: "portal" | "carga_revisor" = "portal", subidoPor = item.responsableEmail): Promise<Recibida> {
  if (archivo.size > MAX_BYTES) throw new ErrorPortal("muy_grande");
  if (archivo.size === 0) throw new ErrorPortal("vacio");

  // 1. leer en memoria
  const datos = new Uint8Array(await archivo.arrayBuffer());
  if (datos.byteLength > MAX_BYTES) throw new ErrorPortal("muy_grande");
  if (datos.byteLength === 0) throw new ErrorPortal("vacio");

  // 2. huella, antes de guardar nada
  const sha256 = createHash("sha256").update(datos).digest("hex");

  // 3. storage, con clave única
  const nombre = nombreLimpio(archivo.name);
  const contentType = archivo.type || "application/octet-stream";
  const storageKey = `${randomUUID()}${extension(nombre)}`;
  await almacen().guardar(storageKey, datos, contentType);

  try {
    return await db.transaction(async (tx) => {
      // 4. la fila, con la fecha del servidor
      const [e] = await tx.insert(t.evidencia).values({
        requerimientoItemId: item.id, nombreArchivo: nombre, contentType, bytes: datos.byteLength,
        storageKey, sha256, origen, subidoPor,
      }).returning({ id: t.evidencia.id });
      // 5. el evento
      await registrarEvento(tx, {
        entidad: "evidencia", entidadId: e.id, tipo: "evidencia_recibida", actor: subidoPor,
        payload: { requerimiento_item_id: item.id, nombre_archivo: nombre, bytes: datos.byteLength, sha256, storage_key: storageKey, origen },
      });
      // 6. el ítem pasa a respondido
      const [actual] = await tx.select({ estado: t.requerimientoItem.estado }).from(t.requerimientoItem).where(eq(t.requerimientoItem.id, item.id)).for("update");
      if (actual.estado === "aceptado") throw new ErrorPortal("aceptado");
      if (actual.estado !== "respondido") {
        await tx.update(t.requerimientoItem).set({ estado: "respondido" }).where(eq(t.requerimientoItem.id, item.id));
        await registrarEvento(tx, {
          entidad: "requerimiento_item", entidadId: item.id, tipo: "estado_cambiado", actor: subidoPor,
          payload: { de: actual.estado, a: "respondido" },
        });
      }
      return { id: e.id, sha256, bytes: datos.byteLength, nombre };
    });
  } catch (err) {
    // Si algo falla después de subir, el objeto no puede quedar huérfano.
    await almacen().borrar(storageKey).catch(() => {});
    throw err;
  }
}

/** Lo que manda una tarjeta del portal: archivos y, opcionalmente, un comentario. */
export async function recibirDelPortal(token: string, itemId: string, archivos: File[], comentario: string) {
  const i = await itemDelPortal(token, itemId);
  if (!i) throw new ErrorPortal("sin_acceso");
  if (i.item.estado === "aceptado") throw new ErrorPortal("aceptado");
  const reales = archivos.filter((a) => !(a.size === 0 && !a.name));
  if (reales.length === 0 && !comentario.trim()) throw new ErrorPortal("vacio");
  if (reales.reduce((s, a) => s + a.size, 0) > MAX_BYTES) throw new ErrorPortal("muy_grande");

  const recibidas: Recibida[] = [];
  for (const a of reales) recibidas.push(await recibirArchivo(i.item, a));
  if (comentario.trim()) await comentar(token, itemId, comentario);
  return recibidas;
}
