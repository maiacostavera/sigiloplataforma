import postgres from "postgres";
import { urlsDeTest } from "./urls";

export const comoApp = () => postgres(urlsDeTest().app, { max: 2, onnotice: () => {} });
export const comoDueno = () => postgres(urlsDeTest().dueno, { max: 2, onnotice: () => {} });

let n = 0;
/** Arma un revisor con un sujeto, una revisión, un punto, un requerimiento y un ítem. */
export async function armarEscenario(sql: postgres.Sql, sufijo = `${Date.now()}-${n++}`) {
  const [rev] = await sql`insert into revisor (nombre, email) values ('Revisora', ${`r-${sufijo}@ejemplo.com.ar`}) returning id`;
  const [so] = await sql`insert into sujeto_obligado (revisor_id, razon_social, cuit, sector, resolucion_aplicable)
    values (${rev.id}, 'Casa de Cambio X S.A.', ${`30${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`}, 'entidades_cambiarias', 'UIF 14/2023') returning id`;
  const [r] = await sql`insert into revision (sujeto_obligado_id, periodo_desde, periodo_hasta, fecha_informe)
    values (${so.id}, '2026-01-01', '2026-12-31', '2027-03-31') returning id`;
  const [p] = await sql`insert into punto_programa (revision_id, codigo, titulo, texto, origen_normativo, orden)
    values (${r.id}, 'PT-01', 'Manual de prevención', 'Verificar el manual.', 'Res. UIF 14/2023, art. ___ inc. ___', 1) returning id`;
  const [req] = await sql`insert into requerimiento (revision_id, numero, token_portal, token_expira_en)
    values (${r.id}, 1, ${`tok-${sufijo}`}, now() + interval '90 days') returning id, token_portal`;
  const [it] = await sql`insert into requerimiento_item (requerimiento_id, punto_programa_id, descripcion, vence_en, responsable_email)
    values (${req.id}, ${p.id}, 'Manual vigente en PDF', '2026-11-30', 'compliance@casadecambiox.com.ar') returning id`;
  return { revisorId: rev.id as string, sujetoId: so.id as string, revisionId: r.id as string, puntoId: p.id as string, requerimientoId: req.id as string, token: req.token_portal as string, itemId: it.id as string };
}
