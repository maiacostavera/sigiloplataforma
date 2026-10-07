import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { armarEscenario, comoApp } from "./ayudas";
import { recibirDelPortal, MAX_BYTES } from "@/lib/recepcion";
import { ErrorPortal } from "@/lib/portal";
import { _memoria } from "@/lib/almacen";

let sql: postgres.Sql;
let a: Awaited<ReturnType<typeof armarEscenario>>;
let b: Awaited<ReturnType<typeof armarEscenario>>;
let token: string;

beforeAll(async () => {
  sql = comoApp();
  a = await armarEscenario(sql);
  b = await armarEscenario(sql);
  token = randomBytes(32).toString("base64url");
  await sql`update requerimiento set token_portal = ${token} where id = ${a.requerimientoId}`;
});
afterAll(() => sql.end());

const archivo = (contenido: string | Uint8Array, nombre = "manual.pdf", tipo = "application/pdf") =>
  new File([contenido as BlobPart], nombre, { type: tipo });

describe("recepción de evidencias", () => {
  it("calcula el SHA-256, guarda el objeto, inserta la fila, escribe el evento y pasa el ítem a respondido", async () => {
    const contenido = "%PDF-1.7 manual de prevención 2026";
    const esperado = createHash("sha256").update(contenido).digest("hex");
    const [r] = await recibirDelPortal(token, a.itemId, [archivo(contenido, "manual-prevencion-2026.pdf")], "");

    expect(r.sha256).toBe(esperado);
    const [e] = await sql`select * from evidencia where id = ${r.id}`;
    expect(e.sha256).toBe(esperado);
    expect(Number(e.bytes)).toBe(Buffer.byteLength(contenido));
    expect(e.nombre_archivo).toBe("manual-prevencion-2026.pdf");
    expect(e.origen).toBe("portal");
    expect(e.subido_por).toBe("compliance@casadecambiox.com.ar");
    expect(e.storage_key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(Buffer.from(_memoria.get(e.storage_key)!).toString()).toBe(contenido);

    const [ev] = await sql`select * from evento where entidad = 'evidencia' and entidad_id = ${r.id}`;
    expect(ev.tipo).toBe("evidencia_recibida");
    expect(ev.payload.sha256).toBe(esperado);

    const [it] = await sql`select estado from requerimiento_item where id = ${a.itemId}`;
    expect(it.estado).toBe("respondido");
  });

  it("varios archivos en un envío dan varias evidencias", async () => {
    const r = await recibirDelPortal(token, a.itemId, [archivo("uno", "a.txt", "text/plain"), archivo("dos", "b.txt", "text/plain")], "van dos");
    expect(r).toHaveLength(2);
    expect(r[0].sha256).not.toBe(r[1].sha256);
  });

  it("un ítem ajeno no recibe nada y no deja objetos en el storage", async () => {
    const antes = _memoria.size;
    await expect(recibirDelPortal(token, b.itemId, [archivo("intruso")], "")).rejects.toBeInstanceOf(ErrorPortal);
    expect(_memoria.size).toBe(antes);
    const [{ n }] = await sql`select count(*)::int as n from evidencia where requerimiento_item_id = ${b.itemId}`;
    expect(n).toBe(0);
  });

  it("rechaza archivos de más de 50 MB sin leerlos", async () => {
    const grande = { name: "enorme.zip", size: MAX_BYTES + 1, type: "application/zip", arrayBuffer: () => { throw new Error("no debería leerse"); } } as unknown as File;
    await expect(recibirDelPortal(token, a.itemId, [grande], "")).rejects.toMatchObject({ codigo: "muy_grande" });
  });

  it("si falla la base después de subir, borra el objeto del storage", async () => {
    await sql`update requerimiento_item set estado = 'aceptado' where id = ${a.itemId}`;
    const antes = _memoria.size;
    // El ítem está aceptado: recibirDelPortal lo corta antes; forzamos el camino de la transacción.
    const { recibirArchivo } = await import("@/lib/recepcion");
    await expect(recibirArchivo({ id: a.itemId, estado: "respondido", responsableEmail: "x@y.com" }, archivo("tarde"))).rejects.toMatchObject({ codigo: "aceptado" });
    expect(_memoria.size).toBe(antes);
    await sql`update requerimiento_item set estado = 'respondido' where id = ${a.itemId}`;
  });

  it("la fecha de recepción la pone el servidor", async () => {
    const [r] = await recibirDelPortal(token, a.itemId, [archivo("fecha")], "");
    const [e] = await sql`select recibido_en, now() - recibido_en < interval '1 minute' as reciente from evidencia where id = ${r.id}`;
    expect(e.reciente).toBe(true);
  });
});
