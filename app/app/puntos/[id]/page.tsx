import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { puntoDelRevisor } from "@/lib/acceso";
import { evidenciasDePunto, historialDeConclusiones, observacionesDePunto } from "@/lib/conclusiones";
import { fecha, fechaHora, periodo, tamano } from "@/lib/formato";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { EstadoObservacion, Resultado, RESULTADO } from "@/components/Estados";
import { crearObservacion, guardarConclusion } from "@/app/app/acciones";

export const metadata: Metadata = { title: "Punto de programa" };

export default async function Punto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await puntoDelRevisor(r.id, id);
  if (!x) notFound();
  const { punto: p, revision: v, sujeto: s } = x;
  const [evidencias, historial, observaciones] = await Promise.all([evidenciasDePunto(p.id), historialDeConclusiones(p.id), observacionesDePunto(p.id)]);
  const vigente = historial.find((c) => c.vigente) ?? null;
  const anteriores = historial.filter((c) => !c.vigente);
  const emitido = v.estado === "informe_emitido";
  const nombreEv = new Map(evidencias.map((e) => [e.evidencia.id, e.evidencia.nombreArchivo]));

  return (
    <div style={{ maxWidth: 860 }}>
      <p className="migas">
        <Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link> /{" "}
        <Link href={`/app/revisiones/${v.id}`} className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</Link>
      </p>
      <div className="encabezado">
        <div>
          <p className="rotulo dato">{p.codigo}</p>
          <h1>{p.titulo}</h1>
        </div>
        <div className="fila">
          <Resultado resultado={vigente?.resultado} />
          {!emitido && <Link href={`/app/puntos/${p.id}/editar`} className="btn btn-secundario btn-chico">Editar punto</Link>}
        </div>
      </div>

      <section className="pila" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="rotulo" style={{ marginBottom: 4 }}>Qué verificar</h2>
          <p style={{ maxWidth: 680 }}>{p.texto}</p>
        </div>
        <div>
          <h2 className="rotulo" style={{ marginBottom: 4 }}>Origen normativo</h2>
          <p className="dato">{p.origenNormativo}</p>
        </div>
      </section>

      <section style={{ marginBottom: 32 }} aria-labelledby="t-ev">
        <h2 id="t-ev" style={{ marginBottom: 12 }}>Evidencias recibidas</h2>
        {evidencias.length === 0 ? (
          <div className="vacio"><p>Todavía no llegó ninguna evidencia para este punto. Se piden desde un requerimiento.</p>
            <Link href={`/app/revisiones/${v.id}/requerimientos/nuevo`} className="btn btn-secundario">Pedir archivos</Link></div>
        ) : (
          <div className="tabla-marco">
            <table className="tabla">
              <thead><tr><th scope="col">Archivo</th><th scope="col">Huella</th><th scope="col">Recibido</th><th scope="col">Req.</th></tr></thead>
              <tbody>
                {evidencias.map(({ evidencia: e, item, numero }) => (
                  <tr key={e.id}>
                    <td><Link href={`/app/evidencias/${e.id}`}>{e.nombreArchivo}</Link><div className="secundario" style={{ fontSize: 13 }}>{item.descripcion} · <span className="dato">{tamano(e.bytes)}</span></div></td>
                    <td className="dato" style={{ fontSize: 13 }}>{e.sha256.slice(0, 8)} {e.sha256.slice(8, 16)}</td>
                    <td className="dato" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{fechaHora(e.recibidoEn)}</td>
                    <td className="dato">{String(numero).padStart(3, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }} aria-labelledby="t-conc">
        <h2 id="t-conc" style={{ marginBottom: 12 }}>{vigente ? (emitido ? "Conclusión" : "Corregir conclusión") : "Conclusión"}</h2>
        {vigente && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-cuerpo pila">
              <div className="fila" style={{ justifyContent: "space-between" }}>
                <Resultado resultado={vigente.resultado} />
                <span className="dato secundario" style={{ fontSize: 13 }}>{fechaHora(vigente.emitidaEn)} · {vigente.autor}</span>
              </div>
              <p className="fundamento">{vigente.fundamento}</p>
              <p className="secundario" style={{ fontSize: 13 }}>
                {vigente.evidencias.length ? <>Sustentada en: {vigente.evidencias.map((eid) => nombreEv.get(eid)).join(", ")}</> : "Sin evidencias vinculadas."}
              </p>
            </div>
          </div>
        )}
        {!emitido && (
          <FormAccion accion={guardarConclusion.bind(null, p.id)} className="pila-6" key={vigente?.id ?? "nueva"}>
            <input type="hidden" name="basada_en" value={vigente?.id ?? ""} />
            <fieldset className="resultados">
              <legend>Resultado</legend>
              {(["cumple", "cumple_parcialmente", "no_cumple"] as const).map((res) => (
                <label key={res} className={`opcion opcion-${res === "cumple" ? "cumple" : res === "no_cumple" ? "no-cumple" : "parcial"}`}>
                  <input type="radio" name="resultado" value={res} defaultChecked={vigente?.resultado === res} required />
                  {RESULTADO[res]}
                </label>
              ))}
            </fieldset>
            <div className="campo">
              <label htmlFor="fundamento">Fundamento</label>
              <textarea id="fundamento" name="fundamento" required minLength={20} rows={8} defaultValue={vigente?.fundamento} aria-describedby="fund-ayuda" />
              <span id="fund-ayuda" className="ayuda">Qué se verificó y por qué se llega a este resultado. Mínimo 20 caracteres.</span>
            </div>
            <fieldset>
              <legend className="etiqueta" style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Evidencias que lo sustentan</legend>
              {evidencias.length === 0 ? (
                <p className="secundario" style={{ fontSize: 14 }}>No hay evidencias para vincular. Podés guardar la conclusión, pero para emitir el informe cada conclusión necesita al menos una.</p>
              ) : (
                <div className="lista-evidencias">
                  {evidencias.map(({ evidencia: e }) => (
                    <label key={e.id}>
                      <input type="checkbox" name="evidencias" value={e.id} defaultChecked={vigente?.evidencias.includes(e.id)} />
                      <span>{e.nombreArchivo} <span className="dato secundario" style={{ fontSize: 12 }}>{e.sha256.slice(0, 8)} · {fechaHora(e.recibidoEn)}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="fila">
              <BotonEnviar>{vigente ? "Guardar corrección" : "Guardar conclusión"}</BotonEnviar>
              {vigente && <span className="secundario" style={{ fontSize: 13 }}>La conclusión actual no se borra: queda en el historial.</span>}
            </div>
          </FormAccion>
        )}
        {anteriores.length > 0 && (
          <details style={{ marginTop: 24 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Historial: {anteriores.length} {anteriores.length === 1 ? "versión anterior" : "versiones anteriores"}</summary>
            <div className="historial" style={{ marginTop: 12 }}>
              {anteriores.map((c) => (
                <article key={c.id}>
                  <div className="fila" style={{ marginBottom: 4 }}>
                    <Resultado resultado={c.resultado} />
                    <span className="dato secundario" style={{ fontSize: 13 }}>{fechaHora(c.emitidaEn)} · {c.autor}</span>
                  </div>
                  <p className="fundamento">{c.fundamento}</p>
                  <p className="secundario" style={{ fontSize: 13, marginTop: 4 }}>{c.evidencias.length ? `Evidencias: ${c.evidencias.map((eid) => nombreEv.get(eid)).join(", ")}` : "Sin evidencias vinculadas."}</p>
                </article>
              ))}
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="t-obs">
        <h2 id="t-obs" style={{ marginBottom: 12 }}>Observaciones</h2>
        {observaciones.length > 0 && (
          <div className="tabla-marco" style={{ marginBottom: 16 }}>
            <table className="tabla">
              <thead><tr><th scope="col">Observación</th><th scope="col">Plazo</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {observaciones.map((o) => (
                  <tr key={o.id}>
                    <td>{o.texto}<div className="secundario" style={{ fontSize: 13, marginTop: 2 }}>Recomendación: {o.recomendacion}</div></td>
                    <td className="dato">{fecha(o.plazo)}</td>
                    <td><EstadoObservacion estado={o.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {vigente?.resultado === "no_cumple" || vigente?.resultado === "cumple_parcialmente" ? (
          <details className="panel" open={vigente.resultado === "no_cumple" && observaciones.length === 0}>
            <summary className="panel-cabeza" style={{ cursor: "pointer", fontWeight: 600 }}>
              {vigente.resultado === "no_cumple" ? "El punto no cumple: crear la observación" : "Crear una observación"}
            </summary>
            <div className="panel-cuerpo">
              <FormAccion accion={crearObservacion.bind(null, p.id)} className="pila">
                <div className="campo">
                  <label htmlFor="obs-texto">Qué está mal</label>
                  <textarea id="obs-texto" name="texto" required rows={4} />
                </div>
                <div className="campo">
                  <label htmlFor="obs-rec">Recomendación</label>
                  <textarea id="obs-rec" name="recomendacion" required rows={3} />
                </div>
                <div className="campo" style={{ maxWidth: 240 }}>
                  <label htmlFor="obs-plazo">Plazo para subsanar</label>
                  <input id="obs-plazo" name="plazo" type="date" />
                </div>
                <div><BotonEnviar>Crear observación</BotonEnviar></div>
              </FormAccion>
            </div>
          </details>
        ) : (
          observaciones.length === 0 && <p className="secundario" style={{ fontSize: 14 }}>Sin observaciones. Si la conclusión es “no cumple”, acá se ofrece crearla.</p>
        )}
      </section>
    </div>
  );
}
