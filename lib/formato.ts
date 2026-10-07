// Formatos de datos. Todo lo que sale de acá se muestra en IBM Plex Mono.

const ZONA = "America/Argentina/Buenos_Aires";

const fmtFechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** 14/03/2026 10:22:41 (-03) */
export function fechaHora(d: Date | string): string {
  const fecha = typeof d === "string" ? new Date(d) : d;
  const p = Object.fromEntries(fmtFechaHora.formatToParts(fecha).map((x) => [x.type, x.value]));
  const hora = p.hour === "24" ? "00" : p.hour;
  return `${p.day}/${p.month}/${p.year} ${hora}:${p.minute}:${p.second} (-03)`;
}

/** Fecha de calendario (columna `date`, 'YYYY-MM-DD') → 31/12/2026 */
export function fecha(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const s = typeof d === "string" ? d.slice(0, 10) : hoyISO(d);
  const [a, m, dia] = s.split("-");
  return `${dia}/${m}/${a}`;
}

/** Fecha ISO de hoy (o de `d`) en la zona de Argentina. */
export function hoyISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Días de calendario desde hoy hasta `iso`. Negativo si ya pasó. */
export function diasHasta(iso: string, hoy: string = hoyISO()): number {
  const a = Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** a3f8b21c 9e4d0a77 b5c13e82 … — la huella completa, en bloques de 8. Nunca truncada. */
export function huellaEnBloques(sha256: string): string {
  return sha256.match(/.{1,8}/g)?.join(" ") ?? sha256;
}

export function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2).replace(".", ",")} MB`;
}

export function periodo(desde: string, hasta: string): string {
  return `${fecha(desde)} – ${fecha(hasta)}`;
}

/** 30712345678 → 30-71234567-8 */
export function cuit(c: string): string {
  const d = c.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : c;
}
