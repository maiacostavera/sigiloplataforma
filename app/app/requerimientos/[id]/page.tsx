import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { requerimientoDelRevisor } from "@/lib/acceso";
import { itemsDeRequerimiento } from "@/lib/consultas";
import { diasHasta, fecha, fechaHora, periodo } from "@/lib/formato";
import { EstadoItem } from "@/components/Estados";
import { CopiarTexto } from "@/components/CopiarTexto";
import { marcarEnviado } from "@/app/app/acciones";

export const metadata: Metadata = { title: "Requerimiento" };

export default async function Requerimiento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await requerimientoDelRevisor(r.id, id);
  if (!x) notFound();
  const { requerimiento: q, revision: v, sujeto: s } = x;
  const items = await itemsDeRequerimiento(q.id);
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
            {items.map(({ item: i, punto: p }) => (
              <tr key={i.id}>
                <td className="dato" style={{ whiteSpace: "nowrap" }}><Link href={`/app/puntos/${p.id}`}>{p.codigo}</Link></td>
                <td>{i.descripcion}</td>
                <td className="dato secundario" style={{ fontSize: 13 }}>{i.responsableEmail}</td>
                <td className="dato">{fecha(i.venceEn)}</td>
                <td><EstadoItem estado={i.estado} vencido={diasHasta(i.venceEn) < 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
