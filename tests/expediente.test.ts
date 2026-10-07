import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { armarEscenario, comoApp } from "./ayudas";
import { recibirDelPortal } from "@/lib/recepcion";
import { armarExpediente } from "@/lib/expediente";

let sql: postgres.Sql;
let a: Awaited<ReturnType<typeof armarEscenario>>;
let b: Awaited<ReturnType<typeof armarEscenario>>;
const contenidos = ["%PDF manual", "%PDF acta"];

beforeAll(async () => {
  sql = comoApp();
  a = await armarEscenario(sql);
  b = await armarEscenario(sql);
  const token = randomBytes(32).toString("base64url");
  await sql`update requerimiento set token_portal = ${token} where id = ${a.requerimientoId}`;
  // Dos archivos con el mismo nombre: no se pueden pisar dentro del ZIP.
  await recibirDelPortal(token, a.itemId, contenidos.map((c) => new File([c], "manual.pdf", { type: "application/pdf" })), "");
});
afterAll(() => sql.end());

describe("expediente para la UIF", () => {
  it("otro revisor no puede generarlo", async () => {
    expect(await armarExpediente(b.revisorId, a.revisionId, "intruso")).toBeNull();
  });

  it("arma el ZIP con evidencias, expediente.html y verificacion.txt coherentes", async () => {
    const r = await armarExpediente(a.revisorId, a.revisionId, "test");
    expect(r).not.toBeNull();
    const zip = unzipSync(r!.archivo);
    const nombres = Object.keys(zip).sort();
    expect(nombres).toEqual(["evidencias/PT-01/manual (2).pdf", "evidencias/PT-01/manual.pdf", "expediente.html", "verificacion.txt"]);

    const lineas = strFromU8(zip["verificacion.txt"]).split("\n").filter((l) => l && !l.startsWith("#"));
    expect(lineas).toHaveLength(2);
    for (const l of lineas) {
      const [hash, ruta] = l.split("  ");
      expect(createHash("sha256").update(zip[ruta]).digest("hex")).toBe(hash);
    }
  });

  it("el HTML es autocontenido: sin JavaScript ni recursos externos", async () => {
    const r = await armarExpediente(a.revisorId, a.revisionId, "test");
    const html = strFromU8(unzipSync(r!.archivo)["expediente.html"]);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(src|href)\s*=\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/url\(\s*["']?https?:/i);
    expect(html).toContain("@font-face");
    expect(html).toContain("Casa de Cambio X S.A.");
  });

  it("deja constancia en el log", async () => {
    const [ev] = await sql`select payload from evento where entidad_id = ${a.revisionId} and tipo = 'expediente_generado' order by id desc limit 1`;
    expect(ev.payload.evidencias).toBe(2);
  });
});
