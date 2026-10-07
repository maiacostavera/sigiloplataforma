import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { sujetoDelRevisor } from "@/lib/acceso";
import { revisionesDelSujeto } from "@/lib/consultas";
import { cuit, fecha, periodo } from "@/lib/formato";
import { nombreSector } from "@/lib/programas";
import { EstadoRevision } from "@/components/Estados";
import { IconoMas } from "@/components/Iconos";

export const metadata: Metadata = { title: "Expediente" };

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const s = await sujetoDelRevisor(r.id, id);
  if (!s) notFound();
  const revisiones = await revisionesDelSujeto(r.id, s.id);

  return (
    <>
      <p className="migas"><Link href="/app">Mis expedientes</Link></p>
      <div className="encabezado">
        <div>
          <p className="rotulo">Expediente</p>
          <h1>{s.razonSocial}</h1>
        </div>
        <Link href={`/app/sujetos/${s.id}/revisiones/nueva`} className="btn btn-primario"><IconoMas />Nueva revisión</Link>
      </div>

      <dl className="ficha-datos">
        <div><dt className="rotulo">CUIT</dt><dd className="dato">{cuit(s.cuit)}</dd></div>
        <div><dt className="rotulo">Sector</dt><dd>{nombreSector(s.sector)}</dd></div>
        <div><dt className="rotulo">Resolución aplicable</dt><dd className="dato">{s.resolucionAplicable}</dd></div>
      </dl>

      <h2 style={{ margin: "32px 0 12px" }}>Revisiones</h2>
      {revisiones.length === 0 ? (
        <div className="vacio">
          <p>Este sujeto obligado todavía no tiene revisiones. Al crear la primera se carga el programa de trabajo de su sector.</p>
          <Link href={`/app/sujetos/${s.id}/revisiones/nueva`} className="btn btn-primario"><IconoMas />Nueva revisión</Link>
        </div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr><th scope="col">Período revisado</th><th scope="col">Fecha de informe</th><th scope="col">Estado</th><th scope="col">Revisión anterior</th></tr>
            </thead>
            <tbody>
              {revisiones.map((v) => {
                const ant = revisiones.find((x) => x.id === v.revisionAnteriorId);
                return (
                  <tr key={v.id}>
                    <td><Link href={`/app/revisiones/${v.id}`} className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</Link></td>
                    <td className="dato">{fecha(v.fechaInforme)}</td>
                    <td><EstadoRevision estado={v.estado} /></td>
                    <td className="dato secundario">{ant ? periodo(ant.periodoDesde, ant.periodoHasta) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
