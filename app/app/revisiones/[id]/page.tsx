import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { puntosDeRevision } from "@/lib/consultas";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { IconoAbajo, IconoArriba } from "@/components/Iconos";
import { agregarPunto, moverPunto } from "@/app/app/acciones";
import { CamposPunto } from "./CamposPunto";

export default async function Programa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const puntos = await puntosDeRevision(id);

  return (
    <div className="pila-6">
      {puntos.length === 0 ? (
        <div className="vacio"><p>Esta revisión no tiene puntos de programa. Agregá el primero abajo.</p></div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col" style={{ width: 72 }}>Orden</th>
                <th scope="col">Código</th>
                <th scope="col">Punto</th>
                <th scope="col">Origen normativo</th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((p, i) => (
                <tr key={p.id}>
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
                  <td className="dato" style={{ whiteSpace: "nowrap" }}>{p.codigo}</td>
                  <td>
                    <Link href={`/app/puntos/${p.id}`}>{p.titulo}</Link>
                    <p className="secundario" style={{ fontSize: 13, marginTop: 2, maxWidth: 560 }}>{p.texto}</p>
                  </td>
                  <td className="dato secundario" style={{ fontSize: 13 }}>{p.origenNormativo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="panel">
        <summary className="panel-cabeza" style={{ cursor: "pointer", fontWeight: 600 }}>Agregar un punto al programa</summary>
        <div className="panel-cuerpo">
          <FormAccion accion={agregarPunto.bind(null, id)} className="pila">
            <CamposPunto sugerido={`PT-${String(puntos.length + 1).padStart(2, "0")}`} />
            <div><BotonEnviar>Agregar punto</BotonEnviar></div>
          </FormAccion>
        </div>
      </details>
    </div>
  );
}
