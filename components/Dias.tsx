import { diasHasta } from "@/lib/formato";

/** "en 174 días", "hoy", "vencida hace 3 días". */
export function Dias({ hasta }: { hasta: string }) {
  const d = diasHasta(hasta);
  if (d === 0) return <span className="dato">hoy</span>;
  if (d < 0) return <span className="dato" style={{ color: "var(--vencido)" }}>vencida hace {-d} {-d === 1 ? "día" : "días"}</span>;
  return <span className="dato">{d} {d === 1 ? "día" : "días"}</span>;
}
