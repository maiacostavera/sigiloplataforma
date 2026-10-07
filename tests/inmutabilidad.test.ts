// Si este test no pasa, Sigilo no sirve para nada.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { armarEscenario, comoApp, comoDueno } from "./ayudas";

let app: postgres.Sql;
let dueno: postgres.Sql;
let esc: Awaited<ReturnType<typeof armarEscenario>>;

beforeAll(async () => {
  app = comoApp();
  dueno = comoDueno();
  esc = await armarEscenario(app);
});
afterAll(async () => {
  await app.end();
  await dueno.end();
});

async function insertarEvidencia(sql: postgres.Sql) {
  const [e] = await sql`insert into evidencia (requerimiento_item_id, nombre_archivo, content_type, bytes, storage_key, sha256, origen, subido_por)
    values (${esc.itemId}, 'manual.pdf', 'application/pdf', 1234, ${`k-${crypto.randomUUID()}`}, ${"a".repeat(64)}, 'portal', 'compliance@casadecambiox.com.ar')
    returning id, recibido_en`;
  return e;
}

describe("evidencia es append-only", () => {
  it("insertar una evidencia funciona y la fecha la pone el servidor", async () => {
    const e = await insertarEvidencia(app);
    expect(e.id).toBeTruthy();
    expect(Math.abs(new Date(e.recibido_en).getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("UPDATE como app_sigilo falla", async () => {
    const e = await insertarEvidencia(app);
    await expect(app`update evidencia set nombre_archivo = 'otro.pdf' where id = ${e.id}`).rejects.toThrow(/permission denied/);
  });

  it("DELETE como app_sigilo falla", async () => {
    const e = await insertarEvidencia(app);
    await expect(app`delete from evidencia where id = ${e.id}`).rejects.toThrow(/permission denied/);
  });

  it("UPDATE y DELETE fallan también como dueño de la base (trigger)", async () => {
    const e = await insertarEvidencia(app);
    await expect(dueno`update evidencia set sha256 = ${"b".repeat(64)} where id = ${e.id}`).rejects.toThrow(/append-only/);
    await expect(dueno`delete from evidencia where id = ${e.id}`).rejects.toThrow(/append-only/);
    const [sigue] = await app`select sha256 from evidencia where id = ${e.id}`;
    expect(sigue.sha256).toBe("a".repeat(64));
  });
});

describe("conclusion, observacion y evento son append-only", () => {
  it("una corrección con reemplaza_a funciona y conclusion_vigente devuelve solo la nueva", async () => {
    const [c1] = await app`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id)
      values (${esc.puntoId}, 'cumple_parcialmente', 'El manual existe pero no tiene acta de aprobación.', ${esc.revisorId}) returning id`;
    const [c2] = await app`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id, reemplaza_a)
      values (${esc.puntoId}, 'cumple', 'Se recibió el acta de aprobación del directorio.', ${esc.revisorId}, ${c1.id}) returning id`;
    const vig = await app`select id, resultado from conclusion_vigente where punto_programa_id = ${esc.puntoId}`;
    expect(vig).toHaveLength(1);
    expect(vig[0].id).toBe(c2.id);
    expect(vig[0].resultado).toBe("cumple");
    const todas = await app`select id from conclusion where punto_programa_id = ${esc.puntoId}`;
    expect(todas).toHaveLength(2);
  });

  it("UPDATE y DELETE sobre conclusion fallan", async () => {
    const [c] = await app`select id from conclusion limit 1`;
    await expect(app`update conclusion set resultado = 'no_cumple' where id = ${c.id}`).rejects.toThrow();
    await expect(app`delete from conclusion where id = ${c.id}`).rejects.toThrow();
    await expect(dueno`update conclusion set resultado = 'no_cumple' where id = ${c.id}`).rejects.toThrow(/append-only/);
  });

  it("un fundamento de menos de 20 caracteres lo rechaza la base", async () => {
    await expect(app`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id)
      values (${esc.puntoId}, 'cumple', '   corto   ', ${esc.revisorId})`).rejects.toThrow(/check/);
  });

  it("UPDATE y DELETE sobre observacion fallan", async () => {
    const [o] = await app`insert into observacion (revision_id, punto_programa_id, texto, recomendacion)
      values (${esc.revisionId}, ${esc.puntoId}, 'Falta acta.', 'Aprobar el manual en directorio.') returning id`;
    await expect(app`update observacion set estado = 'subsanada' where id = ${o.id}`).rejects.toThrow();
    await expect(app`delete from observacion where id = ${o.id}`).rejects.toThrow();
    await expect(dueno`delete from observacion where id = ${o.id}`).rejects.toThrow(/append-only/);
  });

  it("UPDATE y DELETE sobre evento fallan", async () => {
    const [ev] = await app`insert into evento (entidad, entidad_id, tipo, actor) values ('revision', ${esc.revisionId}, 'prueba', 'test') returning id`;
    await expect(app`update evento set tipo = 'otro' where id = ${ev.id}`).rejects.toThrow();
    await expect(app`delete from evento where id = ${ev.id}`).rejects.toThrow();
    await expect(dueno`update evento set tipo = 'otro' where id = ${ev.id}`).rejects.toThrow(/append-only/);
  });

  it("conclusion_evidencia no se puede borrar como app_sigilo", async () => {
    const e = await insertarEvidencia(app);
    const [c] = await app`select id from conclusion_vigente where punto_programa_id = ${esc.puntoId}`;
    await app`insert into conclusion_evidencia (conclusion_id, evidencia_id) values (${c.id}, ${e.id})`;
    await expect(app`delete from conclusion_evidencia where conclusion_id = ${c.id}`).rejects.toThrow(/permission denied/);
  });
});

describe("la app no es superusuario", () => {
  it("app_sigilo no es superusuario ni dueño de las tablas", async () => {
    const [r] = await app`select rolsuper from pg_roles where rolname = current_user`;
    expect(r.rolsuper).toBe(false);
    const [o] = await app`select tableowner from pg_tables where tablename = 'evidencia'`;
    expect(o.tableowner).not.toBe("app_sigilo");
  });
});
