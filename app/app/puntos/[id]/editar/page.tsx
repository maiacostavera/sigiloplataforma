import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { puntoDelRevisor } from "@/lib/acceso";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { editarPunto } from "@/app/app/acciones";
import { CamposPunto } from "@/app/app/revisiones/[id]/CamposPunto";

export const metadata: Metadata = { title: "Editar punto" };

export default async function EditarPunto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await puntoDelRevisor(r.id, id);
  if (!x) notFound();
  const p = x.punto;
  return (
    <div style={{ maxWidth: 720 }}>
      <p className="migas"><Link href={`/app/revisiones/${x.revision.id}`}>Programa</Link> / <Link href={`/app/puntos/${p.id}`} className="dato">{p.codigo}</Link></p>
      <h1 style={{ marginBottom: 24 }}>Editar punto</h1>
      <FormAccion accion={editarPunto.bind(null, p.id)} className="pila">
        <CamposPunto valores={p} />
        <div className="fila">
          <BotonEnviar>Guardar cambios</BotonEnviar>
          <Link href={`/app/puntos/${p.id}`} className="btn btn-secundario">Cancelar</Link>
        </div>
      </FormAccion>
    </div>
  );
}
