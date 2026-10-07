import type { Metadata } from "next";
import Link from "next/link";
import { revisorActual } from "@/lib/sesion";
import { vencimientos } from "@/lib/consultas";
import { diasHasta, fecha, hoyISO } from "@/lib/formato";
import { EstadoItem } from "@/components/Estados";

export const metadata: Metadata = { title: "Vencimientos" };

const FILTROS = [
  { clave: "vencidos", texto: "Vencidos" },
  { clave: "semana", texto: "Vence esta semana" },
  { clave: "todos", texto: "Todos" },
] as const;

const VACIO: Record<string, string> = {
  vencidos: "No hay nada vencido. Todos los pedidos abiertos están en fecha.",
  semana: "No vence nada en los próximos siete días.",
  todos: "Todavía no pediste ningún archivo. Los ítems aparecen acá cuando armás un requerimiento.",
};

export default async function Vencimientos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const r = await revisorActual();
  const { f } = await searchParams;
  const filtro = FILTROS.some((x) => x.clave === f) ? (f as (typeof FILTROS)[number]["clave"]) : "todos";
  const hoy = hoyISO();
  const filas = await vencimientos(r.id, filtro, hoy);

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="rotulo">Todos los sujetos obligados</p>
          <h1>Vencimientos</h1>
        </div>
      </div>
      <nav className="pestanas" aria-label="Filtro">
        {FILTROS.map((x) => (
          <Link key={x.clave} href={x.clave === "todos" ? "/app/vencimientos" : `/app/vencimientos?f=${x.clave}`} aria-current={filtro === x.clave ? "page" : undefined}>{x.texto}</Link>
        ))}
      </nav>
      {filas.length === 0 ? (
        <div className="vacio"><p>{VACIO[filtro]}</p></div>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Sujeto obligado</th>
                <th scope="col">Requerimiento</th>
                <th scope="col">Qué se pidió</th>
                <th scope="col">Vence</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((x) => {
                const abierto = x.estado === "pendiente" || x.estado === "rechazado";
                const d = diasHasta(x.vence_en, hoy);
                return (
                  <tr key={x.item_id}>
                    <td><Link href={`/app/revisiones/${x.revision_id}`}>{x.razon_social}</Link></td>
                    <td><Link href={`/app/requerimientos/${x.requerimiento_id}`} className="dato">Nº {String(x.numero).padStart(3, "0")}</Link></td>
                    <td>{x.descripcion}<div className="dato secundario" style={{ fontSize: 12 }}>{x.responsable_email}</div></td>
                    <td className="dato" style={{ whiteSpace: "nowrap" }}>
                      {fecha(x.vence_en)}
                      {abierto && <div className="secundario" style={{ fontSize: 12, ...(d < 0 ? { color: "var(--vencido)" } : {}) }}>{d < 0 ? `hace ${-d} d` : d === 0 ? "hoy" : `en ${d} d`}</div>}
                    </td>
                    <td><EstadoItem estado={x.estado} vencido={abierto && d < 0} /></td>
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
