// Modo "requerimiento UIF": el expediente sellado de una revisión, en un ZIP.
//
//   /evidencias/<codigo-punto>/<nombre-archivo>
//   /expediente.html   autocontenido: CSS y fuentes embebidas, cero JavaScript
//   /verificacion.txt  para `sha256sum -c verificacion.txt`
//
// El HTML es un DOCUMENTO, no la aplicación: tiene que abrir igual dentro de
// diez años, sin internet.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { zipSync, type Zippable } from "fflate";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, t } from "./db";
import { registrarEvento } from "./db/evento";
import { almacen } from "./almacen";
import { selloSvg } from "./sello";
import { cuit, fecha, fechaHora, huellaEnBloques, periodo, tamano } from "./formato";
import { nombreSector } from "./programas";
import { revisionDelRevisor } from "./acceso";

const RESULTADO: Record<string, string> = { cumple: "Cumple", cumple_parcialmente: "Cumple parcialmente", no_cumple: "No cumple" };
const ESTADO_REV: Record<string, string> = { planificada: "Planificada", en_curso: "En curso", concluida: "Concluida", informe_emitido: "Informe emitido" };
const ESTADO_OBS: Record<string, string> = { abierta: "Abierta", subsanada: "Subsanada", no_subsanada: "No subsanada" };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Nombre de archivo seguro dentro del ZIP, sin rutas ni caracteres problemáticos. */
function nombreSeguro(n: string) {
  return n.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "_").replace(/^\.+/, "_").slice(0, 200) || "archivo";
}
function codigoSeguro(c: string) {
  return c.replace(/[^A-Za-z0-9._-]/g, "_") || "punto";
}

async function cargar(revisionId: string) {
  const puntos = await db.select().from(t.puntoPrograma).where(eq(t.puntoPrograma.revisionId, revisionId)).orderBy(asc(t.puntoPrograma.orden), asc(t.puntoPrograma.codigo));
  const pids = puntos.map((p) => p.id);
  const vacio = <T,>() => Promise.resolve([] as T[]);

  const [evidencias, conclusiones, observaciones, requerimientos] = await Promise.all([
    pids.length
      ? db.select({ e: t.evidencia, puntoId: t.requerimientoItem.puntoProgramaId, item: t.requerimientoItem.descripcion, numero: t.requerimiento.numero })
          .from(t.evidencia)
          .innerJoin(t.requerimientoItem, eq(t.requerimientoItem.id, t.evidencia.requerimientoItemId))
          .innerJoin(t.requerimiento, eq(t.requerimiento.id, t.requerimientoItem.requerimientoId))
          .where(inArray(t.requerimientoItem.puntoProgramaId, pids))
          .orderBy(asc(t.evidencia.recibidoEn))
      : vacio<never>(),
    pids.length
      ? db.select({ c: { id: t.conclusionVigente.id, puntoProgramaId: t.conclusionVigente.puntoProgramaId, resultado: t.conclusionVigente.resultado, fundamento: t.conclusionVigente.fundamento, emitidaEn: t.conclusionVigente.emitidaEn }, autor: t.revisor.email }).from(t.conclusionVigente)
          .innerJoin(t.revisor, eq(t.revisor.id, t.conclusionVigente.autorId))
          .where(inArray(t.conclusionVigente.puntoProgramaId, pids))
      : vacio<never>(),
    db.select().from(t.observacionVigente).where(eq(t.observacionVigente.revisionId, revisionId)).orderBy(asc(t.observacionVigente.creadaEn)),
    db.select().from(t.requerimiento).where(eq(t.requerimiento.revisionId, revisionId)),
  ]);
  const cids = conclusiones.map((c) => c.c.id);
  const vinculos = cids.length ? await db.select().from(t.conclusionEvidencia).where(inArray(t.conclusionEvidencia.conclusionId, cids)) : [];
  const versiones = pids.length
    ? await db.select({ puntoId: t.conclusion.puntoProgramaId, n: sql<number>`count(*)::int` }).from(t.conclusion).where(inArray(t.conclusion.puntoProgramaId, pids)).groupBy(t.conclusion.puntoProgramaId)
    : [];

  // Log completo: todo evento cuya entidad pertenece a esta revisión.
  const items = requerimientos.length
    ? await db.select({ id: t.requerimientoItem.id }).from(t.requerimientoItem).where(inArray(t.requerimientoItem.requerimientoId, requerimientos.map((q) => q.id)))
    : [];
  const todasConclusiones = pids.length ? await db.select({ id: t.conclusion.id }).from(t.conclusion).where(inArray(t.conclusion.puntoProgramaId, pids)) : [];
  const todasObs = await db.select({ id: t.observacion.id }).from(t.observacion).where(eq(t.observacion.revisionId, revisionId));
  const ids = [revisionId, ...pids, ...requerimientos.map((q) => q.id), ...items.map((i) => i.id), ...evidencias.map((x) => x.e.id), ...todasConclusiones.map((c) => c.id), ...todasObs.map((o) => o.id)];
  const eventos = await db.select().from(t.evento).where(inArray(t.evento.entidadId, ids)).orderBy(asc(t.evento.id));

  const [{ ahora }] = await db.execute<{ ahora: Date }>(sql`select now() as ahora`).then((r) => [...r]);

  return { puntos, evidencias, conclusiones, vinculos, versiones, observaciones, eventos, ahora: new Date(ahora) };
}

type Datos = Awaited<ReturnType<typeof cargar>> & {
  sujeto: typeof t.sujetoObligado.$inferSelect;
  revision: typeof t.revision.$inferSelect;
  revisor: { nombre: string; email: string };
  rutas: Map<string, string>;
};

async function fuentesEmbebidas() {
  const dir = path.join(process.cwd(), "data", "fuentes");
  const f = async (archivo: string) => (await fs.readFile(path.join(dir, archivo))).toString("base64");
  const [n4, n6, n4i, m4, m5] = await Promise.all([
    f("newsreader-latin-400-normal.woff2"), f("newsreader-latin-600-normal.woff2"), f("newsreader-latin-400-italic.woff2"),
    f("ibm-plex-mono-latin-400-normal.woff2"), f("ibm-plex-mono-latin-500-normal.woff2"),
  ]);
  const ff = (fam: string, peso: number, estilo: string, b64: string) =>
    `@font-face{font-family:'${fam}';font-style:${estilo};font-weight:${peso};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  return [ff("Newsreader", 400, "normal", n4), ff("Newsreader", 600, "normal", n6), ff("Newsreader", 400, "italic", n4i), ff("IBM Plex Mono", 400, "normal", m4), ff("IBM Plex Mono", 500, "normal", m5)].join("\n");
}

const CSS = `
:root{--papel:#FAF8F4;--papel-2:#F3F0E9;--tinta:#14181F;--tinta-2:#4C5462;--linea:#E0DCD2;--linea-fuerte:#C9C3B6;--lacre:#7A1F1C;--cumple:#2D6A4F;--parcial:#8A5E0C;--no-cumple:#B3261E}
*{box-sizing:border-box}
html{background:var(--papel);color:var(--tinta)}
body{margin:0;font-family:'Newsreader',Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55}
.hoja{max-width:860px;margin:0 auto;padding:72px 64px 96px}
.m{font-family:'IBM Plex Mono',ui-monospace,Consolas,monospace;font-size:.82em}
.rotulo{font-family:'IBM Plex Mono',ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2)}
h1{font-size:34px;font-weight:600;line-height:1.15;margin:6px 0 4px}
h2{font-size:23px;font-weight:600;margin:0 0 4px;line-height:1.25}
h3{font-size:17px;font-weight:600;margin:24px 0 8px}
p{margin:0 0 10px}
a{color:inherit}
.portada{display:flex;justify-content:space-between;gap:32px;align-items:flex-start;border-bottom:2px solid var(--tinta);padding-bottom:24px;margin-bottom:28px}
.marca{display:flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--lacre)}
dl.datos{display:grid;grid-template-columns:190px 1fr;gap:6px 16px;margin:0 0 28px}
dl.datos dt{padding-top:3px}
dl.datos dd{margin:0}
.indice{margin:0 0 40px;padding:0;list-style:none;border-top:1px solid var(--linea)}
.indice li{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--linea)}
.indice .r{margin-left:auto}
.punto{border-top:1px solid var(--linea-fuerte);padding-top:28px;margin-top:40px}
.origen{color:var(--tinta-2)}
.estado{display:inline-block;border-left:3px solid var(--linea-fuerte);padding:0 0 0 8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
.cumple{border-color:var(--cumple);color:var(--cumple)}
.cumple_parcialmente,.abierta{border-color:var(--parcial);color:var(--parcial)}
.no_cumple,.no_subsanada{border-color:var(--no-cumple);color:var(--no-cumple)}
.subsanada{border-color:var(--cumple);color:var(--cumple)}
.conclusion{background:var(--papel-2);border-left:3px solid var(--linea-fuerte);padding:14px 18px;margin:12px 0}
.fundamento{white-space:pre-wrap}
table{width:100%;border-collapse:collapse;margin:8px 0 0}
th{text-align:left;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);border-bottom:1px solid var(--tinta);padding:6px 8px}
td{border-bottom:1px solid var(--linea);padding:10px 8px;vertical-align:top;font-size:15px}
.ev td{overflow-wrap:anywhere}
.ev td.s{width:92px;padding-left:0}
.ev svg{width:84px;height:84px;display:block}
.huella{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;word-spacing:.15em;line-height:1.6}
.huella span{display:block;white-space:nowrap}
.log td{font-size:11.5px;padding:5px 6px}
.log td.p{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;color:var(--tinta-2);word-break:break-all}
.nota{color:var(--tinta-2);font-size:14px}
.pie{margin-top:56px;padding-top:16px;border-top:1px solid var(--linea);color:var(--tinta-2);font-size:14px}
.sello-cera{fill:var(--lacre)}.sello-relieve{fill:var(--papel)}.sello-trazo{fill:none;stroke:var(--papel)}
@page{size:A4;margin:22mm 20mm 24mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:'IBM Plex Mono',monospace;font-size:9pt;color:#4C5462}@bottom-left{content:"Sigilo · expediente de revisión";font-family:'IBM Plex Mono',monospace;font-size:9pt;color:#4C5462}}
@media print{html,body{background:#fff}.hoja{max-width:none;padding:0}.punto{break-before:page;border-top:0;margin-top:0;padding-top:0}.ev tr,.log tr,.conclusion{break-inside:avoid}a{text-decoration:none}}
@media (max-width:700px){.hoja{padding:32px 18px}dl.datos{grid-template-columns:1fr}.portada{flex-direction:column}}
`;

const isotipo = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#7A1F1C" d="M12 1.6c2.1-.1 3.6.6 5.2 1.5 1.6.9 2.9 2 3.8 3.8.9 1.7 1.3 3.2 1.3 5.2 0 2.1-.6 3.8-1.6 5.4-1 1.6-2.3 2.8-4 3.6-1.6.8-3 1.3-4.9 1.2-2 0-3.5-.5-5.1-1.4C5 20 3.8 18.8 2.9 17.1 2 15.5 1.7 14 1.7 12c0-2 .4-3.6 1.4-5.2C4 5.1 5.3 3.9 7 3c1.6-.9 3-1.3 5-1.4z"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="#FAF8F4" stroke-width="1.1" opacity=".75"/><path d="M14.6 9.1c-.5-.8-1.4-1.3-2.6-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.6 5.2 4.4 0 1.2-1.1 2.1-2.7 2.1-1.3 0-2.3-.6-2.8-1.5" fill="none" stroke="#FAF8F4" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function huella(h: string) {
  return `<span>${huellaEnBloques(h.slice(0, 32))}</span><span>${huellaEnBloques(h.slice(32))}</span>`;
}

function resumenPayload(p: Record<string, unknown>) {
  const s = JSON.stringify(p);
  return s === "{}" ? "" : s;
}

export function htmlExpediente(d: Datos, fuentes: string): string {
  const { sujeto: s, revision: v } = d;
  const concl = new Map(d.conclusiones.map((c) => [c.c.puntoProgramaId, c]));
  const nVersiones = new Map(d.versiones.map((x) => [x.puntoId, x.n]));

  const indice = d.puntos.map((p) => {
    const c = concl.get(p.id);
    return `<li><a href="#${esc(codigoSeguro(p.codigo))}" class="m">${esc(p.codigo)}</a><span>${esc(p.titulo)}</span><span class="r">${c ? `<span class="estado ${c.c.resultado}">${RESULTADO[c.c.resultado]}</span>` : `<span class="estado">Sin conclusión</span>`}</span></li>`;
  }).join("");

  const puntos = d.puntos.map((p) => {
    const c = concl.get(p.id);
    const vinculadas = new Set(c ? d.vinculos.filter((x) => x.conclusionId === c.c.id).map((x) => x.evidenciaId) : []);
    const evs = d.evidencias.filter((x) => x.puntoId === p.id);
    const obs = d.observaciones.filter((o) => o.puntoProgramaId === p.id);
    const filas = evs.map(({ e, item, numero }) => `
      <tr>
        <td class="s">${selloSvg({ id: e.id, sha256: e.sha256, recibidoEn: e.recibidoEn, tamano: 84 })}</td>
        <td><a href="${esc(d.rutas.get(e.id))}">${esc(e.nombreArchivo)}</a><br><span class="nota">${esc(item)} · Req. <span class="m">Nº ${String(numero).padStart(3, "0")}</span> · <span class="m" style="white-space:nowrap">${tamano(e.bytes)}</span>${vinculadas.has(e.id) ? " · sustenta la conclusión" : ""}</span>
          <div class="huella" style="margin-top:6px">${huella(e.sha256)}</div></td>
        <td class="m" style="white-space:nowrap">${fechaHora(e.recibidoEn)}</td>
        <td class="m">${esc(e.subidoPor)}</td>
      </tr>`).join("");
    const n = nVersiones.get(p.id) ?? 0;
    return `
    <section class="punto" id="${esc(codigoSeguro(p.codigo))}">
      <p class="rotulo">${esc(p.codigo)}</p>
      <h2>${esc(p.titulo)}</h2>
      <p class="origen m">${esc(p.origenNormativo)}</p>
      <p>${esc(p.texto)}</p>
      <h3>Conclusión</h3>
      ${c ? `<div class="conclusion">
        <p><span class="estado ${c.c.resultado}">${RESULTADO[c.c.resultado]}</span> <span class="nota m">${fechaHora(c.c.emitidaEn)} · ${esc(c.autor)}</span></p>
        <p class="fundamento">${esc(c.c.fundamento)}</p>
        ${n > 1 ? `<p class="nota">Versión vigente. Hay ${n - 1} ${n - 1 === 1 ? "versión anterior" : "versiones anteriores"}, conservadas en el registro de eventos.</p>` : ""}
      </div>` : `<p class="nota">Sin conclusión.</p>`}
      <h3>Evidencias</h3>
      ${evs.length ? `<table class="ev"><thead><tr><th>Sello</th><th>Archivo y huella SHA-256</th><th>Recibido</th><th>Subido por</th></tr></thead><tbody>${filas}</tbody></table>` : `<p class="nota">No se recibieron evidencias para este punto.</p>`}
      ${obs.length ? `<h3>Observaciones</h3>${obs.map((o) => `<div class="conclusion"><p><span class="estado ${o.estado}">${ESTADO_OBS[o.estado]}</span>${o.plazo ? ` <span class="nota">Plazo <span class="m">${fecha(o.plazo)}</span></span>` : ""}</p><p>${esc(o.texto)}</p><p class="nota">Recomendación: ${esc(o.recomendacion)}</p></div>`).join("")}` : ""}
    </section>`;
  }).join("");

  const log = d.eventos.map((e) => `<tr><td class="m">${e.id}</td><td class="m" style="white-space:nowrap">${fechaHora(e.ocurridoEn)}</td><td class="m">${esc(e.entidad)}</td><td class="m">${esc(e.tipo)}</td><td class="m">${esc(e.actor)}</td><td class="p">${esc(e.motivo ? `motivo: ${e.motivo} ` : "")}${esc(resumenPayload(e.payload))}</td></tr>`).join("");

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Expediente de revisión · ${esc(s.razonSocial)} · ${esc(periodo(v.periodoDesde, v.periodoHasta))}</title>
<style>${fuentes}\n${CSS}</style>
</head>
<body>
<main class="hoja">
  <header class="portada">
    <div>
      <p class="rotulo">Expediente de revisión externa independiente</p>
      <h1>${esc(s.razonSocial)}</h1>
      <p class="m">Período ${esc(periodo(v.periodoDesde, v.periodoHasta))}</p>
    </div>
    <div class="marca">${isotipo}<span>Sigilo</span></div>
  </header>

  <dl class="datos">
    <dt class="rotulo">Sujeto obligado</dt><dd>${esc(s.razonSocial)}</dd>
    <dt class="rotulo">CUIT</dt><dd class="m">${esc(cuit(s.cuit))}</dd>
    <dt class="rotulo">Sector</dt><dd>${esc(nombreSector(s.sector))}</dd>
    <dt class="rotulo">Resolución aplicable</dt><dd class="m">${esc(s.resolucionAplicable)}</dd>
    <dt class="rotulo">Período revisado</dt><dd class="m">${esc(periodo(v.periodoDesde, v.periodoHasta))}</dd>
    <dt class="rotulo">Fecha de informe</dt><dd class="m">${esc(fecha(v.fechaInforme))}</dd>
    <dt class="rotulo">Estado</dt><dd>${esc(ESTADO_REV[v.estado])}</dd>
    <dt class="rotulo">Revisor</dt><dd>${esc(d.revisor.nombre)} · <span class="m">${esc(d.revisor.email)}</span></dd>
    <dt class="rotulo">Expediente generado</dt><dd class="m">${fechaHora(d.ahora)}</dd>
    <dt class="rotulo">Contenido</dt><dd><span class="m">${d.puntos.length}</span> puntos · <span class="m">${d.evidencias.length}</span> evidencias · <span class="m">${d.eventos.length}</span> eventos</dd>
  </dl>

  <p class="nota">Cada evidencia figura con su huella SHA-256, calculada al recibir el archivo y antes de guardarlo, y con la fecha y hora de recepción registradas por el servidor. El archivo <span class="m">verificacion.txt</span> permite comprobar que ningún archivo cambió: <span class="m">sha256sum -c verificacion.txt</span>.</p>

  <h3>Programa de trabajo</h3>
  <ol class="indice">${indice}</ol>

  ${puntos}

  <section class="punto" id="eventos">
    <p class="rotulo">Registro</p>
    <h2>Log completo de eventos</h2>
    <p class="nota">Registro append-only: ninguna fila de esta tabla puede modificarse ni borrarse.</p>
    <table class="log"><thead><tr><th>#</th><th>Fecha</th><th>Entidad</th><th>Tipo</th><th>Actor</th><th>Detalle</th></tr></thead><tbody>${log}</tbody></table>
  </section>

  <p class="pie">Cada evidencia, sellada y con fecha. — Sigilo</p>
</main>
</body>
</html>`;
}

/** Arma el ZIP del expediente. Devuelve null si la revisión no es del revisor. */
export async function armarExpediente(revisorId: string, revisionId: string, actor: string) {
  const x = await revisionDelRevisor(revisorId, revisionId);
  if (!x) return null;
  const datos = await cargar(revisionId);
  const [revisor] = await db.select({ nombre: t.revisor.nombre, email: t.revisor.email }).from(t.revisor).where(eq(t.revisor.id, revisorId));

  const codigos = new Map(datos.puntos.map((p) => [p.id, codigoSeguro(p.codigo)]));
  const rutas = new Map<string, string>();
  const usadas = new Set<string>();
  const zip: Zippable = {};
  const lineas: string[] = [];

  for (const { e, puntoId } of datos.evidencias) {
    const carpeta = `evidencias/${codigos.get(puntoId)}`;
    const base = nombreSeguro(e.nombreArchivo);
    let ruta = `${carpeta}/${base}`;
    for (let k = 2; usadas.has(ruta.toLowerCase()); k++) {
      const punto = base.lastIndexOf(".");
      ruta = punto > 0 ? `${carpeta}/${base.slice(0, punto)} (${k})${base.slice(punto)}` : `${carpeta}/${base} (${k})`;
    }
    usadas.add(ruta.toLowerCase());
    rutas.set(e.id, ruta);

    const bytes = await almacen().leer(e.storageKey);
    // El archivo tiene que seguir siendo el que se recibió. Si no, no se entrega.
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== e.sha256) throw new Error(`La evidencia ${e.id} no coincide con su huella registrada. El expediente no se generó.`);
    zip[ruta] = [bytes, { level: 0 }];
    lineas.push(`${e.sha256}  ${ruta}`);
  }

  const html = htmlExpediente({ ...datos, sujeto: x.sujeto, revision: x.revision, revisor, rutas }, await fuentesEmbebidas());
  const enc = new TextEncoder();
  zip["expediente.html"] = enc.encode(html);
  zip["verificacion.txt"] = enc.encode(
    `# Huellas SHA-256 de las evidencias de este expediente.\n# Verificar desde esta carpeta con: sha256sum -c verificacion.txt\n${lineas.join("\n")}${lineas.length ? "\n" : ""}`,
  );
  const archivo = zipSync(zip, { level: 6, mtime: datos.ahora });
  const sha = createHash("sha256").update(archivo).digest("hex");
  const nombre = `expediente-${x.sujeto.cuit}-${x.revision.periodoDesde}_${x.revision.periodoHasta}.zip`;

  await registrarEvento(db, {
    entidad: "revision", entidadId: revisionId, tipo: "expediente_generado", actor,
    payload: { archivo: nombre, sha256: sha, evidencias: datos.evidencias.length, eventos: datos.eventos.length },
  });
  return { nombre, archivo, sha256: sha };
}

