"use client";

import { useState } from "react";
import { IconoCopiar, IconoTilde } from "./Iconos";

/** Copia `texto` (o la URL absoluta de `ruta`) al portapapeles. */
export function CopiarTexto({ texto, ruta, etiqueta, chico = false }: { texto?: string; ruta?: string; etiqueta: string; chico?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    const valor = texto ?? `${window.location.origin}${ruta ?? ""}`;
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      window.prompt("Copiá el texto:", valor);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button type="button" className={`btn btn-secundario ${chico ? "btn-chico" : ""}`} onClick={copiar}>
      {copiado ? <IconoTilde /> : <IconoCopiar />}
      <span aria-live="polite">{copiado ? "Copiado" : etiqueta}</span>
    </button>
  );
}
