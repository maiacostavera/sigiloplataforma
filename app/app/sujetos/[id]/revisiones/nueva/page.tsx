import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { sujetoDelRevisor } from "@/lib/acceso";
import { revisionesDelSujeto } from "@/lib/consultas";
import { periodo } from "@/lib/formato";
import { cargarPrograma } from "@/lib/programas";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { crearRevision } from "@/app/app/acciones";

export const metadata: Metadata = { title: "Nueva revisión" };

function sugerencia(ultimaHasta?: string) {
  // Propone el año calendario siguiente a la última revisión (o el actual).
  const anio = ultimaHasta ? Number(ultimaHasta.slice(0, 4)) + 1 : new Date().getFullYear();
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31`, informe: `${anio + 1}-03-31` };
}

export default async function NuevaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const s = await sujetoDelRevisor(r.id, id);
  if (!s) notFound();
  const anteriores = await revisionesDelSujeto(r.id, s.id);
  const prog = await cargarPrograma(s.sector);
  const sug = sugerencia(anteriores[0]?.periodoHasta);

  return (
    <div style={{ maxWidth: 640 }}>
      <p className="migas"><Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link></p>
      <h1 style={{ marginBottom: 8 }}>Nueva revisión</h1>
      <p className="secundario" style={{ marginBottom: 24 }}>
        {prog ? <>Se va a cargar el programa de trabajo de <span className="dato">{prog.resolucion}</span> con <span className="dato">{prog.puntos.length}</span> puntos. Después podés agregar, editar y reordenar.</> : "No hay programa de trabajo para este sector: vas a cargar los puntos a mano."}
      </p>
      <FormAccion accion={crearRevision.bind(null, s.id)} className="pila-6">
        <fieldset className="rejilla rejilla-2">
          <legend className="etiqueta" style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Período revisado</legend>
          <div className="campo">
            <label htmlFor="periodo_desde">Desde</label>
            <input id="periodo_desde" name="periodo_desde" type="date" required defaultValue={sug.desde} />
          </div>
          <div className="campo">
            <label htmlFor="periodo_hasta">Hasta</label>
            <input id="periodo_hasta" name="periodo_hasta" type="date" required defaultValue={sug.hasta} />
          </div>
        </fieldset>
        <div className="campo" style={{ maxWidth: 300 }}>
          <label htmlFor="fecha_informe">Fecha de informe comprometida</label>
          <input id="fecha_informe" name="fecha_informe" type="date" required defaultValue={sug.informe} />
        </div>
        <div className="campo">
          <label htmlFor="revision_anterior_id">Revisión anterior</label>
          <select id="revision_anterior_id" name="revision_anterior_id" defaultValue={anteriores[0]?.id ?? ""} className="dato">
            <option value="">Ninguna (primera revisión en Sigilo)</option>
            {anteriores.map((a) => <option key={a.id} value={a.id}>{periodo(a.periodoDesde, a.periodoHasta)}</option>)}
          </select>
          <span className="ayuda">Si el período nuevo deja un hueco de más de un año con el anterior, Sigilo te avisa.</span>
        </div>
        <div className="fila">
          <BotonEnviar>Crear revisión</BotonEnviar>
          <Link href={`/app/sujetos/${s.id}`} className="btn btn-secundario">Cancelar</Link>
        </div>
      </FormAccion>
    </div>
  );
}
