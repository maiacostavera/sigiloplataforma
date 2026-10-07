import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { revisionPorId } from "@/lib/consultas";
import { cuit, fecha, periodo } from "@/lib/formato";
import { avisoDeHueco } from "@/lib/periodos";
import { EstadoRevision } from "@/components/Estados";
import { Dias } from "@/components/Dias";
import { Pestanas } from "@/components/Pestanas";
import { IconoPaquete } from "@/components/Iconos";

export default async function LayoutRevision({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const { revision: v, sujeto: s } = x;
  const anterior = v.revisionAnteriorId ? await revisionPorId(v.revisionAnteriorId) : null;
  const aviso = anterior ? avisoDeHueco(anterior.periodoHasta, v.periodoDesde) : null;

  return (
    <>
      <p className="migas"><Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link></p>
      <div className="encabezado" style={{ marginBottom: 16 }}>
        <div>
          <p className="rotulo">Revisión</p>
          <h1>{s.razonSocial}</h1>
        </div>
        <div className="fila">
          <EstadoRevision estado={v.estado} />
          <a href={`/app/revisiones/${v.id}/expediente`} className="btn btn-secundario" download title="Descarga un ZIP con todas las evidencias, el expediente en HTML y las huellas para verificar">
            <IconoPaquete />Expediente para la UIF
          </a>
        </div>
      </div>
      <dl className="ficha-datos" style={{ marginBottom: 24 }}>
        <div><dt className="rotulo">CUIT</dt><dd className="dato">{cuit(s.cuit)}</dd></div>
        <div><dt className="rotulo">Período</dt><dd className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</dd></div>
        <div><dt className="rotulo">Fecha de informe</dt><dd className="dato">{fecha(v.fechaInforme)}</dd></div>
        {v.estado !== "informe_emitido" && <div><dt className="rotulo">Faltan</dt><dd><Dias hasta={v.fechaInforme} /></dd></div>}
        <div><dt className="rotulo">Resolución</dt><dd className="dato">{s.resolucionAplicable}</dd></div>
      </dl>
      {aviso && <p className="aviso" style={{ marginBottom: 24 }}><strong>Hueco con la revisión anterior.</strong> {aviso}</p>}
      <Pestanas
        base={`/app/revisiones/${v.id}`}
        items={[
          { ruta: "", texto: "Programa" },
          { ruta: "/requerimientos", texto: "Requerimientos" },
          { ruta: "/observaciones", texto: "Observaciones" },
        ]}
      />
      {children}
    </>
  );
}
