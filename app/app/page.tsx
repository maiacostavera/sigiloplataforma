import type { Metadata } from "next";
import Link from "next/link";
import { revisorActual } from "@/lib/sesion";
import { misExpedientes } from "@/lib/consultas";
import { cuit, diasHasta, fecha, periodo } from "@/lib/formato";
import { nombreSector } from "@/lib/programas";
import { EstadoRevision } from "@/components/Estados";
import { Dias } from "@/components/Dias";
import { IconoMas } from "@/components/Iconos";

export const metadata: Metadata = { title: "Mis expedientes" };

export default async function MisExpedientes() {
  const r = await revisorActual();
  const filas = await misExpedientes(r.id);
  const activa = (f: (typeof filas)[number]) => f.fecha_informe && f.estado !== "informe_emitido";
  const urgentes = filas.filter((f) => activa(f) && diasHasta(f.fecha_informe!) < 30);

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="rotulo">Revisor</p>
          <h1>Mis expedientes</h1>
        </div>
        <Link href="/app/sujetos/nuevo" className="btn btn-primario"><IconoMas />Nuevo sujeto obligado</Link>
      </div>

      {urgentes.length > 0 && (
        <section aria-labelledby="t-urgentes">
          <h2 id="t-urgentes" className="rotulo" style={{ marginBottom: 12 }}>Informe en menos de 30 días</h2>
          <div className="urgentes">
            {urgentes.map((f) => {
              const d = diasHasta(f.fecha_informe!);
              return (
                <Link key={f.sujeto_id} href={`/app/revisiones/${f.revision_id}`} className={`urgente ${d < 0 ? "vencida" : ""}`}>
                  <span className="dias" aria-hidden="true">{Math.abs(d)}</span>
                  <span>
                    <strong style={{ display: "block" }}>{f.razon_social}</strong>
                    <span className="secundario" style={{ fontSize: 14 }}>
                      {d < 0 ? <>Informe vencido hace <span className="dato">{-d}</span> {-d === 1 ? "día" : "días"}</> : d === 0 ? "El informe vence hoy" : <>{d === 1 ? "Falta 1 día" : <>Faltan <span className="dato">{d}</span> días</>} para el informe</>}
                    </span>
                    <span className="dato secundario" style={{ display: "block", fontSize: 13 }}>Fecha de informe {fecha(f.fecha_informe)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {filas.length === 0 ? (
        <div className="vacio">
          <p>Todavía no cargaste ningún sujeto obligado. Empezá por el primero: con eso ya podés abrir su revisión.</p>
          <Link href="/app/sujetos/nuevo" className="btn btn-primario"><IconoMas />Nuevo sujeto obligado</Link>
        </div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Sujeto obligado</th>
                <th scope="col">CUIT</th>
                <th scope="col">Período</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha de informe</th>
                <th scope="col" className="num">Días para el informe</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.sujeto_id}>
                  <td>
                    <Link href={f.revision_id ? `/app/revisiones/${f.revision_id}` : `/app/sujetos/${f.sujeto_id}`}>{f.razon_social}</Link>
                    <div className="secundario" style={{ fontSize: 13 }}>{nombreSector(f.sector)} · <Link href={`/app/sujetos/${f.sujeto_id}`}>expediente</Link></div>
                  </td>
                  <td className="dato">{cuit(f.cuit)}</td>
                  <td className="dato">{f.periodo_desde ? periodo(f.periodo_desde, f.periodo_hasta!) : "—"}</td>
                  <td>{f.estado ? <EstadoRevision estado={f.estado} /> : <span className="secundario">Sin revisión</span>}</td>
                  <td className="dato">{fecha(f.fecha_informe)}</td>
                  <td className="num">{activa(f) ? <Dias hasta={f.fecha_informe!} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
