// Control de continuidad entre revisiones. La norma no permite que el período
// revisado esté a más de un año del período del informe anterior.

function sumarAnio(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a + 1, m - 1, d));
  return f.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/** Devuelve el aviso a mostrar, o null si el período nuevo está en regla. */
export function avisoDeHueco(anteriorHasta: string, nuevoDesde: string): string | null {
  const hueco = diasEntre(anteriorHasta, nuevoDesde) - 1;
  if (nuevoDesde > sumarAnio(anteriorHasta)) {
    return `Entre el fin del período anterior y el inicio de este hay ${hueco} días sin revisar: más de un año. La norma no permite que el período revisado esté a más de un año del período del informe anterior.`;
  }
  return null;
}
