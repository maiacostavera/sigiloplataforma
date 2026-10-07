// Estados: siempre la palabra escrita, con borde de color. Nunca solo color.

const REVISION: Record<string, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  concluida: "Concluida",
  informe_emitido: "Informe emitido",
};
export function EstadoRevision({ estado }: { estado: string }) {
  const clase = estado === "informe_emitido" || estado === "concluida" ? "estado-cumple" : estado === "en_curso" ? "estado-respondido" : "estado-pendiente";
  return <span className={`estado ${clase}`}>{REVISION[estado] ?? estado}</span>;
}

const ITEM: Record<string, string> = {
  pendiente: "Pendiente",
  respondido: "Respondido",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};
export function EstadoItem({ estado, vencido = false }: { estado: string; vencido?: boolean }) {
  if (vencido && (estado === "pendiente" || estado === "rechazado")) {
    return <span className="estado estado-vencido">Vencido</span>;
  }
  return <span className={`estado estado-${estado}`}>{ITEM[estado] ?? estado}</span>;
}

export const RESULTADO: Record<string, string> = {
  cumple: "Cumple",
  cumple_parcialmente: "Cumple parcialmente",
  no_cumple: "No cumple",
};
export function Resultado({ resultado }: { resultado: string | null | undefined }) {
  if (!resultado) return <span className="estado estado-pendiente">Sin conclusión</span>;
  const clase = resultado === "cumple" ? "estado-cumple" : resultado === "no_cumple" ? "estado-no-cumple" : "estado-parcial";
  return <span className={`estado ${clase}`}>{RESULTADO[resultado]}</span>;
}

const OBS: Record<string, string> = { abierta: "Abierta", subsanada: "Subsanada", no_subsanada: "No subsanada" };
export function EstadoObservacion({ estado }: { estado: string }) {
  const clase = estado === "subsanada" ? "estado-cumple" : estado === "no_subsanada" ? "estado-no-cumple" : "estado-parcial";
  return <span className={`estado ${clase}`}>{OBS[estado] ?? estado}</span>;
}
