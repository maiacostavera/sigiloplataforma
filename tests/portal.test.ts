// El token da acceso a UN requerimiento. Estos tests intentan salirse de él.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type postgres from "postgres";
import { randomBytes } from "node:crypto";
import { armarEscenario, comoApp } from "./ayudas";
import { comentar, ErrorPortal, itemDelPortal, portalPorToken } from "@/lib/portal";

let sql: postgres.Sql;
let a: Awaited<ReturnType<typeof armarEscenario>>;
let b: Awaited<ReturnType<typeof armarEscenario>>;
let tokenA: string;
let tokenB: string;
let tokenVencido: string;
let itemVencido: string;
let itemOtroReqMismaRevision: string;

const token = () => randomBytes(32).toString("base64url");

beforeAll(async () => {
  sql = comoApp();
  a = await armarEscenario(sql);
  b = await armarEscenario(sql); // otro revisor, otro sujeto, otra revisión
  tokenA = token();
  tokenB = token();
  await sql`update requerimiento set token_portal = ${tokenA} where id = ${a.requerimientoId}`;
  await sql`update requerimiento set token_portal = ${tokenB} where id = ${b.requerimientoId}`;

  // Segundo requerimiento en la MISMA revisión que A.
  const [q2] = await sql`insert into requerimiento (revision_id, numero, token_portal, token_expira_en)
    values (${a.revisionId}, 2, ${token()}, now() + interval '90 days') returning id`;
  const [i2] = await sql`insert into requerimiento_item (requerimiento_id, punto_programa_id, descripcion, vence_en, responsable_email)
    values (${q2.id}, ${a.puntoId}, 'Otro pedido', '2026-12-01', 'otro@ejemplo.com.ar') returning id`;
  itemOtroReqMismaRevision = i2.id;

  // Requerimiento con el link vencido.
  tokenVencido = token();
  const [q3] = await sql`insert into requerimiento (revision_id, numero, token_portal, token_expira_en)
    values (${a.revisionId}, 3, ${tokenVencido}, now() - interval '1 minute') returning id`;
  const [i3] = await sql`insert into requerimiento_item (requerimiento_id, punto_programa_id, descripcion, vence_en, responsable_email)
    values (${q3.id}, ${a.puntoId}, 'Pedido viejo', '2026-01-01', 'viejo@ejemplo.com.ar') returning id`;
  itemVencido = i3.id;
});
afterAll(() => sql.end());

describe("portal por token", () => {
  it("con el token muestra su requerimiento y solo sus ítems", async () => {
    const p = await portalPorToken(tokenA);
    expect(p.estado).toBe("ok");
    if (p.estado !== "ok") return;
    expect(p.requerimiento.id).toBe(a.requerimientoId);
    expect(p.items.map((i) => i.id)).toEqual([a.itemId]);
  });

  it("un token inventado no da acceso a nada", async () => {
    expect((await portalPorToken(token())).estado).toBe("invalido");
    expect((await portalPorToken("x")).estado).toBe("invalido");
    expect((await portalPorToken("' or 1=1 --")).estado).toBe("invalido");
  });

  it("un token vencido no muestra los ítems", async () => {
    const p = await portalPorToken(tokenVencido);
    expect(p.estado).toBe("vencido");
    expect(p).not.toHaveProperty("items");
    expect(await itemDelPortal(tokenVencido, itemVencido)).toBeNull();
  });
});

describe("pasar a mano un item_id ajeno", () => {
  it("el ítem propio se puede leer", async () => {
    const i = await itemDelPortal(tokenA, a.itemId);
    expect(i?.item.id).toBe(a.itemId);
  });

  it("un ítem de otro revisor, con mi token, no existe", async () => {
    expect(await itemDelPortal(tokenA, b.itemId)).toBeNull();
    expect(await itemDelPortal(tokenB, a.itemId)).toBeNull();
  });

  it("un ítem de otro requerimiento de la misma revisión, con mi token, no existe", async () => {
    expect(await itemDelPortal(tokenA, itemOtroReqMismaRevision)).toBeNull();
  });

  it("un id que no es uuid no llega a la base", async () => {
    expect(await itemDelPortal(tokenA, "1 or 1=1")).toBeNull();
  });

  it("comentar sobre un ítem ajeno se rechaza y no escribe nada", async () => {
    const [{ antes }] = await sql`select count(*)::int as antes from evento where entidad_id = ${b.itemId}`;
    await expect(comentar(tokenA, b.itemId, "hola")).rejects.toBeInstanceOf(ErrorPortal);
    const [{ despues }] = await sql`select count(*)::int as despues from evento where entidad_id = ${b.itemId}`;
    expect(despues).toBe(antes);
  });

  it("comentar sobre el ítem propio queda en evento", async () => {
    await comentar(tokenA, a.itemId, "Va el manual aprobado.");
    const [ev] = await sql`select actor, payload from evento where entidad_id = ${a.itemId} and tipo = 'comentario_portal'`;
    expect(ev.actor).toBe("compliance@casadecambiox.com.ar");
    expect(ev.payload.comentario).toBe("Va el manual aprobado.");
  });
});
