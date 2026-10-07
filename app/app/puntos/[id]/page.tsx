import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { puntoDelRevisor } from "@/lib/acceso";
import { periodo } from "@/lib/formato";

export const metadata: Metadata = { title: "Punto de programa" };

export default async function Punto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await puntoDelRevisor(r.id, id);
  if (!x) notFound();
  const { punto: p, revision: v, sujeto: s } = x;
  return (
    <div style={{ maxWidth: 820 }}>
      <p className="migas">
        <Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link> / <Link href={`/app/revisiones/${v.id}`} className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</Link>
      </p>
      <div className="encabezado">
        <div>
          <p className="rotulo dato">{p.codigo}</p>
          <h1>{p.titulo}</h1>
        </div>
        <Link href={`/app/puntos/${p.id}/editar`} className="btn btn-secundario">Editar punto</Link>
      </div>
      <section className="pila">
        <div>
          <h2 className="rotulo" style={{ marginBottom: 4 }}>Qué verificar</h2>
          <p style={{ maxWidth: 680 }}>{p.texto}</p>
        </div>
        <div>
          <h2 className="rotulo" style={{ marginBottom: 4 }}>Origen normativo</h2>
          <p className="dato">{p.origenNormativo}</p>
        </div>
      </section>
    </div>
  );
}
