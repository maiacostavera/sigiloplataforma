import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { armarEscenario, comoApp } from "./ayudas";
import { actualizarEstadoRevision, faltantes, resumenPrograma } from "@/lib/conclusiones";
import { db } from "@/lib/db";

let sql: postgres.Sql;
let a: Awaited<ReturnType<typeof armarEscenario>>;

beforeAll(async () => {
  sql = comoApp();
  a = await armarEscenario(sql);
});
afterAll(() => sql.end());

describe("condiciones para emitir el informe", () => {
  it("sin conclusión, falta la conclusión", async () => {
    const f = faltantes(await resumenPrograma(a.revisionId));
    expect(f).toEqual([expect.objectContaining({ codigo: "PT-01", problema: "No tiene conclusión." })]);
  });

  it("con conclusión pero sin evidencia vinculada, falta la evidencia", async () => {
    await sql`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id)
      values (${a.puntoId}, 'cumple', 'Se verificó el manual vigente y su aprobación.', ${a.revisorId})`;
    const f = faltantes(await resumenPrograma(a.revisionId));
    expect(f[0].problema).toMatch(/ninguna evidencia/);
  });

  it("una corrección con evidencia completa el programa y la revisión pasa a concluida", async () => {
    const [ev] = await sql`insert into evidencia (requerimiento_item_id, nombre_archivo, content_type, bytes, storage_key, sha256, origen, subido_por)
      values (${a.itemId}, 'manual.pdf', 'application/pdf', 10, ${`k-${crypto.randomUUID()}`}, ${"c".repeat(64)}, 'portal', 'x@y.com') returning id`;
    const [vig] = await sql`select id from conclusion_vigente where punto_programa_id = ${a.puntoId}`;
    const [c] = await sql`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id, reemplaza_a)
      values (${a.puntoId}, 'cumple', 'Se verificó el manual vigente y el acta que lo aprueba.', ${a.revisorId}, ${vig.id}) returning id`;
    await sql`insert into conclusion_evidencia values (${c.id}, ${ev.id})`;
    expect(faltantes(await resumenPrograma(a.revisionId))).toEqual([]);
    await actualizarEstadoRevision(db, a.revisionId, "test");
    const [r] = await sql`select estado from revision where id = ${a.revisionId}`;
    expect(r.estado).toBe("concluida");
  });

  it("si una corrección deja el punto sin evidencia, vuelve a en curso", async () => {
    const [vig] = await sql`select id from conclusion_vigente where punto_programa_id = ${a.puntoId}`;
    await sql`insert into conclusion (punto_programa_id, resultado, fundamento, autor_id, reemplaza_a)
      values (${a.puntoId}, 'cumple_parcialmente', 'Revisado de nuevo: falta la constancia de difusión.', ${a.revisorId}, ${vig.id})`;
    await actualizarEstadoRevision(db, a.revisionId, "test");
    const [r] = await sql`select estado from revision where id = ${a.revisionId}`;
    expect(r.estado).toBe("en_curso");
  });
});
