import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { faltantes, resumenPrograma } from "@/lib/conclusiones";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { Resultado } from "@/components/Estados";
import { IconoAbajo, IconoArriba } from "@/components/Iconos";
import { agregarPunto, emitirInforme, moverPunto } from "@/app/app/acciones";
import { CamposPunto } from "./CamposPunto";

export default async function Programa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const puntos = await resumenPrograma(id);
  const concluidos = puntos.filter((p) => p.conclusion_id).length;
  const falta = faltantes(puntos);
  const emitido = x.revision.estado === "informe_emitido";

  return (
    <div className="pila-6">
      <div className="fila" style={{ justifyContent: "space-between" }}>
        <p>
          <span className="dato" style={{ fontSize: 18, fontWeight: 600 }}>{concluidos}</span> de{" "}
          <span className="dato" style={{ fontSize: 18, fontWeight: 600 }}>{puntos.length}</span> puntos concluidos
        </p>
      </div>

      {puntos.length === 0 ? (
        <div className="vacio"><p>Esta revisión no tiene puntos de programa. Agregá el primero abajo.</p></div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                {!emitido && <th scope="col" style={{ width: 72 }}>Orden</th>}
                <th scope="col">Código</th>
                <th scope="col">Punto</th>
                <th scope="col">Resultado</th>
                <th scope="col" className="num">Evidencias</th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((p, i) => (
                <tr key={p.id}>
                  {!emitido && (
                    <td>
                      <div className="fila" style={{ gap: 2, flexWrap: "nowrap" }}>
                        <form action={moverPunto.bind(null, p.id, "arriba")}>
                          <button className="btn-icono" disabled={i === 0} aria-label={`Subir ${p.codigo}`}><IconoArriba /></button>
                        </form>
                        <form action={moverPunto.bind(null, p.id, "abajo")}>
                          <button className="btn-icono" disabled={i === puntos.length - 1} aria-label={`Bajar ${p.codigo}`}><IconoAbajo /></button>
                        </form>
                      </div>
                    </td>
                  )}
                  <td className="dato" style={{ whiteSpace: "nowrap" }}>{p.codigo}</td>
                  <td>
                    <Link href={`/app/puntos/${p.id}`}>{p.titulo}</Link>
                    <p className="secundario dato" style={{ fontSize: 12, marginTop: 2 }}>{p.origen_normativo}</p>
                  </td>
                  <td><Resultado resultado={p.resultado} /></td>
                  <td className="num dato" title="vinculadas a la conclusión / recibidas">{p.vinculadas} / {p.recibidas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel" aria-labelledby="t-emision">
        <div className="panel-cabeza"><h2 id="t-emision" style={{ fontSize: 16 }}>Emisión del informe</h2></div>
        <div className="panel-cuerpo pila">
          {emitido ? (
            <p className="ok">El informe de esta revisión fue emitido. Las conclusiones quedaron cerradas.</p>
          ) : falta.length > 0 ? (
            <>
              <p>Para emitir, cada punto necesita una conclusión con fundamento y al menos una evidencia vinculada. Falta:</p>
              <ul className="faltantes">
                {falta.map((f, k) => (
                  <li key={k}>
                    {f.puntoId ? <Link href={`/app/puntos/${f.puntoId}`} className="dato">{f.codigo}</Link> : <span className="dato">{f.codigo}</span>}{" "}
                    <span>{f.titulo}</span> — <span className="secundario">{f.problema}</span>
                  </li>
                ))}
              </ul>
              <div><button className="btn btn-primario" disabled aria-disabled="true">Emitir informe</button></div>
            </>
          ) : (
            <FormAccion accion={emitirInforme.bind(null, id)} confirmar="Al emitir el informe, las conclusiones quedan cerradas. ¿Emitir?">
              <p style={{ marginBottom: 16 }}>Todos los puntos tienen conclusión, fundamento y evidencia. Se puede emitir.</p>
              <BotonEnviar>Emitir informe</BotonEnviar>
            </FormAccion>
          )}
        </div>
      </section>

      {!emitido && (
        <details className="panel">
          <summary className="panel-cabeza" style={{ cursor: "pointer", fontWeight: 600 }}>Agregar un punto al programa</summary>
          <div className="panel-cuerpo">
            <FormAccion accion={agregarPunto.bind(null, id)} className="pila">
              <CamposPunto sugerido={`PT-${String(puntos.length + 1).padStart(2, "0")}`} />
              <div><BotonEnviar>Agregar punto</BotonEnviar></div>
            </FormAccion>
          </div>
        </details>
      )}
    </div>
  );
}
