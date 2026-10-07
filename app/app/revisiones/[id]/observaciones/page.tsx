import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { observacionesDeRevision, pendientesDeArrastre } from "@/lib/conclusiones";
import { puntosDeRevision } from "@/lib/consultas";
import { fecha } from "@/lib/formato";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { EstadoObservacion } from "@/components/Estados";
import { arrastrarObservacion, cambiarEstadoObservacion } from "@/app/app/acciones";

export default async function Observaciones({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const anteriorId = x.revision.revisionAnteriorId;
  const [obs, arrastre, puntos] = await Promise.all([
    observacionesDeRevision(id),
    anteriorId ? pendientesDeArrastre(id, anteriorId) : Promise.resolve([]),
    puntosDeRevision(id),
  ]);

  return (
    <div className="pila-6">
      {arrastre.length > 0 && (
        <section className="panel" aria-labelledby="t-arr">
          <div className="panel-cabeza"><h2 id="t-arr" style={{ fontSize: 16 }}>Observaciones abiertas de la revisión anterior</h2></div>
          <div className="panel-cuerpo pila">
            <p className="secundario" style={{ fontSize: 14 }}>Traelas a esta revisión para registrar si se subsanaron. Quedan vinculadas a la original.</p>
            {arrastre.map((o) => {
              const sugerido = puntos.find((p) => p.codigo === o.codigo)?.id ?? "";
              return (
                <FormAccion key={o.id} accion={arrastrarObservacion.bind(null, id, o.id)} className="arrastre">
                  <div>
                    <p><span className="dato">{o.codigo}</span> · {o.titulo}</p>
                    <p className="secundario" style={{ fontSize: 14 }}>{o.texto}</p>
                  </div>
                  <div className="fila" style={{ alignItems: "flex-end" }}>
                    <div className="campo">
                      <label htmlFor={`pp-${o.id}`}>Punto en esta revisión</label>
                      <select id={`pp-${o.id}`} name="punto_programa_id" defaultValue={sugerido} className="dato">
                        <option value="">Elegí…</option>
                        {puntos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.titulo}</option>)}
                      </select>
                    </div>
                    <BotonEnviar variante="secundario">Traer a esta revisión</BotonEnviar>
                  </div>
                </FormAccion>
              );
            })}
          </div>
        </section>
      )}

      {obs.length === 0 ? (
        <div className="vacio">
          <p>Esta revisión no tiene observaciones. Se crean desde la conclusión de un punto que no cumple.</p>
          <Link href={`/app/revisiones/${id}`} className="btn btn-secundario">Ir al programa</Link>
        </div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr><th scope="col">Punto</th><th scope="col">Observación</th><th scope="col">Plazo</th><th scope="col">Estado</th><th scope="col"><span className="solo-lector">Acciones</span></th></tr>
            </thead>
            <tbody>
              {obs.map((o) => (
                <tr key={o.id}>
                  <td className="dato" style={{ whiteSpace: "nowrap" }}><Link href={`/app/puntos/${o.punto_programa_id}`}>{o.codigo}</Link></td>
                  <td>
                    {o.texto}
                    <div className="secundario" style={{ fontSize: 13, marginTop: 2 }}>Recomendación: {o.recomendacion}</div>
                    {o.observacion_origen_id && (
                      <div className="secundario" style={{ fontSize: 13, marginTop: 2 }}>Arrastrada de la revisión cerrada al <span className="dato">{fecha(o.origen_periodo_hasta)}</span>.</div>
                    )}
                  </td>
                  <td className="dato">{fecha(o.plazo)}</td>
                  <td><EstadoObservacion estado={o.estado} /></td>
                  <td>
                    {o.estado === "abierta" ? (
                      <div className="pila" style={{ gap: 4 }}>
                        {o.observacion_origen_id && <span className="secundario" style={{ fontSize: 13 }}>¿Se subsanó?</span>}
                        <div className="fila" style={{ gap: 6, flexWrap: "nowrap" }}>
                          <form action={cambiarEstadoObservacion.bind(null, o.id, "subsanada")}><button className="btn btn-secundario btn-chico">Subsanada</button></form>
                          <form action={cambiarEstadoObservacion.bind(null, o.id, "no_subsanada")}><button className="btn btn-secundario btn-chico">No subsanada</button></form>
                        </div>
                      </div>
                    ) : (
                      <form action={cambiarEstadoObservacion.bind(null, o.id, "abierta")}><button className="btn-texto" style={{ fontSize: 13 }}>Reabrir</button></form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
