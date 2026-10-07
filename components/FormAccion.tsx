"use client";

import { createContext, useActionState, useContext, startTransition, type FormEvent } from "react";
import type { Estado } from "@/lib/validar";

const Pendiente = createContext(false);

type Props = {
  accion: (prev: Estado, fd: FormData) => Promise<Estado>;
  children: React.ReactNode;
  className?: string;
  /** Pregunta de confirmación antes de enviar. */
  confirmar?: string;
  "aria-label"?: string;
};

/**
 * Formulario que llama a una server action y muestra el error arriba, con
 * role="alert". No resetea los campos si hay error: el que escribió un
 * fundamento de doscientas palabras no lo pierde.
 */
export function FormAccion({ accion, children, className, confirmar, ...resto }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmar && !window.confirm(confirmar)) return;
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => enviar(fd));
  }
  return (
    <form onSubmit={alEnviar} className={className} aria-label={resto["aria-label"]} noValidate>
      {estado?.error && <p className="error" role="alert" style={{ marginBottom: 16 }}>{estado.error}</p>}
      {estado?.ok && <p className="ok" role="status" style={{ marginBottom: 16 }}>{estado.ok}</p>}
      <Pendiente.Provider value={pendiente}>{children}</Pendiente.Provider>
    </form>
  );
}

export function BotonEnviar({ children, variante = "primario", chico = false, name, value }: { children: React.ReactNode; variante?: "primario" | "secundario"; chico?: boolean; name?: string; value?: string }) {
  const pendiente = useContext(Pendiente);
  return (
    <button type="submit" name={name} value={value} className={`btn btn-${variante} ${chico ? "btn-chico" : ""}`} disabled={pendiente} aria-busy={pendiente}>
      {children}
    </button>
  );
}
