import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { revisionDelRevisor } from "@/lib/acceso";
import { requerimientosDeRevision } from "@/lib/consultas";
import { fecha, fechaHora } from "@/lib/formato";
import { IconoMas } from "@/components/Iconos";

export default async function Requerimientos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await revisionDelRevisor(r.id, id);
  if (!x) notFound();
  const lista = await requerimientosDeRevision(id);
  const nuevo = x.revision.estado !== "informe_emitido" && (
    <Link href={`/app/revisiones/${id}/requerimientos/nuevo`} className="btn btn-primario"><IconoMas />Nuevo requerimiento</Link>
  );

  if (lista.length === 0) {
    return (
      <div className="vacio">
        <p>Todavía no mandaste ningún requerimiento en esta revisión.</p>
        {nuevo}
      </div>
    );
  }
  return (
    <div className="pila">
      <div className="fila" style={{ justifyContent: "flex-end" }}>{nuevo}</div>
      <div className="tabla-marco">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Nº</th>
              <th scope="col">Requerimiento</th>
              <th scope="col" className="num">Ítems</th>
              <th scope="col" className="num">Pendientes</th>
              <th scope="col" className="num">Por revisar</th>
              <th scope="col">Próximo vencimiento</th>
              <th scope="col">Enviado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((q) => (
              <tr key={q.id}>
                <td className="dato">{String(q.numero).padStart(3, "0")}</td>
                <td><Link href={`/app/requerimientos/${q.id}`}>{q.titulo || `Requerimiento Nº ${q.numero}`}</Link></td>
                <td className="num dato">{q.items}</td>
                <td className="num dato">{q.pendientes + q.rechazados}</td>
                <td className="num dato">{q.respondidos}</td>
                <td className="dato">{fecha(q.vence_primero)}</td>
                <td className="dato secundario">{q.enviado_en ? fechaHora(q.enviado_en) : "Sin enviar"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
