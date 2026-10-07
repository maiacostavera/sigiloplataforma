"use client";

import { useState } from "react";
import { IconoLuna, IconoSol } from "./Iconos";

/** Tema claro por defecto; oscuro como opción. Se guarda en una cookie para no parpadear. */
export function SelectorTema({ inicial }: { inicial: "light" | "dark" }) {
  const [tema, setTema] = useState(inicial);
  function cambiar() {
    const nuevo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nuevo;
    document.cookie = `tema=${nuevo}; path=/; max-age=31536000; samesite=lax`;
    setTema(nuevo);
  }
  return (
    <button type="button" className="btn btn-secundario btn-chico" onClick={cambiar} aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema oscuro"} title={tema === "dark" ? "Tema claro" : "Tema oscuro"}>
      {tema === "dark" ? <IconoSol /> : <IconoLuna />}
    </button>
  );
}
