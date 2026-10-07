import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { requerimientoDelRevisor } from "@/lib/acceso";
import { evidenciasDeItems, itemsDeRequerimiento, notasDeItems } from "@/lib/consultas";
import { diasHasta, fecha, fechaHora, periodo, tamano } from "@/lib/formato";
import { EstadoItem } from "@/components/Estados";
import { CopiarTexto } from "@/components/CopiarTexto";
import { aceptarItem, marcarEnviado, rechazarItem } from "@/app/app/acciones";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { IconoArchivo } from "@/components/Iconos";

export const metadata: Metadata = { title: "Requerimiento" };

export default async function Requerimiento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await requerimientoDelRevisor(r.id, id);
  if (!x) notFound();
  const { requerimiento: q, revision: v, sujeto: s } = x;
  const items = await itemsDeRequerimiento(q.id);
  const ids = items.map((x) => x.item.id);
  const [evidencias, notas] = await Promise.all([evidenciasDeItems(ids), notasDeItems(ids)]);
  const vencido = q.tokenExpiraEn.getTime() < Date.now();

  return (
    <>
      <p className="migas">
        <Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link> / <Link href={`/app/revisiones/${v.id}/requerimientos`} className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</Link>
      </p>
      <div className="encabezado">
        <div>
          <p className="rotulo">Requerimiento <span className="dato">Nº {String(q.numero).padStart(3, "0")}</span></p>
          <h1>{q.titulo || s.razonSocial}</h1>
        </div>
        <div className="fila">
          <CopiarTexto ruta={`/portal/${q.tokenPortal}`} etiqueta="Copiar link del portal" />
          {!q.enviadoEn && (
            <form action={marcarEnviado.bind(null, q.id)}>
              <button className="btn btn-primario">Marcar como enviado</button>
            </form>
          )}
        </div>
      </div>

      <dl className="ficha-datos" style={{ marginBottom: 24 }}>
        <div><dt className="rotulo">Creado</dt><dd className="dato">{fechaHora(q.creadoEn)}</dd></div>
        <div><dt className="rotulo">Enviado</dt><dd className="dato">{q.enviadoEn ? fechaHora(q.enviadoEn) : "Sin enviar"}</dd></div>
        <div>
          <dt className="rotulo">El link vence</dt>
          <dd className="dato" style={vencido ? { color: "var(--vencido)" } : undefined}>{fechaHora(q.tokenExpiraEn)}{vencido ? " · vencido" : ""}</dd>
        </div>
      </dl>

      <div className="tabla-marco">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Punto</th>
              <th scope="col">Qué se pidió</th>
              <th scope="col">Responsable</th>
              <th scope="col">Vence</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ item: i, punto: p }) => {
              const evs = evidencias.filter((e) => e.requerimientoItemId === i.id);
              const ns = notas.filter((n) => n.itemId === i.id && n.tipo !== "item_aceptado");
              const detalle = evs.length > 0 || ns.length > 0 || i.estado === "respondido";
              return [
                <tr key={i.id} className={detalle ? "con-detalle" : undefined}>
                  <td className="dato" style={{ whiteSpace: "nowrap" }}><Link href={`/app/puntos/${p.id}`}>{p.codigo}</Link></td>
                  <td>{i.descripcion}</td>
                  <td className="dato secundario" style={{ fontSize: 13 }}>{i.responsableEmail}</td>
                  <td className="dato">{fecha(i.venceEn)}</td>
                  <td><EstadoItem estado={i.estado} vencido={diasHasta(i.venceEn) < 0} /></td>
                </tr>,
                detalle && (
                  <tr key={`${i.id}-d`} className="detalle">
                    <td />
                    <td colSpan={4}>
                      {evs.length > 0 && (
                        <ul className="evidencias">
                          {evs.map((e) => (
                            <li key={e.id}>
                              <IconoArchivo />
                              <Link href={`/app/evidencias/${e.id}`}>{e.nombreArchivo}</Link>
                              <span className="dato secundario">{tamano(e.bytes)} · {fechaHora(e.recibidoEn)} · {e.sha256.slice(0, 8)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {ns.map((n, k) => (
                        <p key={k} className="nota">
                          <span className="rotulo">{n.tipo === "comentario_portal" ? "Comentario del responsable" : "Rechazado"}</span>{" "}
                          {n.tipo === "comentario_portal" ? String((n.payload as { comentario?: string }).comentario ?? "") : n.motivo}{" "}
                          <span className="dato secundario">{fechaHora(n.cuando)}</span>
                        </p>
                      ))}
                      {i.estado === "respondido" && (
                        <div className="fila" style={{ alignItems: "flex-start", marginTop: 8 }}>
                          <FormAccion accion={aceptarItem.bind(null, i.id)}>
                            <BotonEnviar chico>Aceptar</BotonEnviar>
                          </FormAccion>
                          <FormAccion accion={rechazarItem.bind(null, i.id)} className="rechazo">
                            <label htmlFor={`m-${i.id}`} className="rotulo" style={{ alignSelf: "center" }}>Qué falta</label>
                            <input id={`m-${i.id}`} name="motivo" type="text" className="entrada" style={{ minHeight: 30, padding: "4px 10px", fontSize: 14 }} />
                            <BotonEnviar chico variante="secundario">Rechazar</BotonEnviar>
                          </FormAccion>
                        </div>
                      )}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
