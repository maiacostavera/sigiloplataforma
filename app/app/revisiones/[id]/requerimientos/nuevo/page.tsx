import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { puntosDeRevision } from "@/lib/consultas";
import { cargarPrograma } from "@/lib/programas";
import { hoyISO } from "@/lib/formato";
import { FormAccion } from "@/components/FormAccion";
import { crearRequerimiento } from "@/app/app/acciones";
import { Armado } from "./Armado";

export const metadata: Metadata = { title: "Nuevo requerimiento" };

export default async function NuevoRequerimiento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const [puntos, prog] = await Promise.all([puntosDeRevision(id), cargarPrograma(x.sujeto.sector)]);
  const sugeridas = new Map(prog?.puntos.map((p) => [p.codigo, p.evidencia_sugerida ?? []]) ?? []);
  const vence = hoyISO(new Date(Date.now() + 15 * 86_400_000));

  return (
    <div className="pila-6">
      <div>
        <h2>Nuevo requerimiento</h2>
        <p className="secundario" style={{ marginTop: 4 }}>Elegí los puntos. Cada uno trae prellenados los archivos que suele pedir; ajustá lo que haga falta.</p>
      </div>
      {puntos.length === 0 ? (
        <div className="vacio"><p>Antes de pedir archivos, cargá al menos un punto en el programa.</p></div>
      ) : (
        <FormAccion accion={crearRequerimiento.bind(null, id)}>
          <Armado venceSugerido={vence} puntos={puntos.map((p) => ({ id: p.id, codigo: p.codigo, titulo: p.titulo, sugeridas: sugeridas.get(p.codigo) ?? [] }))} />
        </FormAccion>
      )}
    </div>
  );
}
