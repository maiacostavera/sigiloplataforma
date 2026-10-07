"use client";

import { useState, type ChangeEvent } from "react";

/**
 * Selector de archivos que avisa ANTES de enviar si se pasa del límite. Sin
 * JavaScript sigue funcionando como un input común y el servidor lo rechaza.
 */
export function EntradaArchivos({ id, ayudaId, maxMb }: { id: string; ayudaId: string; maxMb: number }) {
  const [error, setError] = useState("");
  function cambiar(e: ChangeEvent<HTMLInputElement>) {
    const total = [...(e.target.files ?? [])].reduce((s, f) => s + f.size, 0);
    const msg = total > maxMb * 1024 * 1024
      ? `Lo elegido pesa ${(total / 1024 / 1024).toFixed(1).replace(".", ",")} MB y el máximo es ${maxMb} MB por envío. Mandalo en partes o comprimido.`
      : "";
    e.target.setCustomValidity(msg);
    setError(msg);
  }
  return (
    <>
      <input id={id} name="archivos" type="file" multiple className="entrada-archivo" aria-describedby={ayudaId} aria-invalid={!!error} onChange={cambiar} />
      {error && <span className="error" role="alert">{error}</span>}
    </>
  );
}
