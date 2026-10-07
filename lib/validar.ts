// Validación de formularios. Los errores se muestran tal cual al usuario.

export class ErrorDeValidacion extends Error {}

export type Estado = { error?: string; ok?: string } | null;

export function texto(fd: FormData, campo: string, etiqueta: string, opc: { min?: number; max?: number; opcional?: boolean } = {}) {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v) {
    if (opc.opcional) return "";
    throw new ErrorDeValidacion(`Completá ${etiqueta}.`);
  }
  if (opc.min && v.length < opc.min) throw new ErrorDeValidacion(`${capital(etiqueta)} tiene que tener al menos ${opc.min} caracteres.`);
  if (opc.max && v.length > opc.max) throw new ErrorDeValidacion(`${capital(etiqueta)} no puede superar ${opc.max} caracteres.`);
  return v;
}

export function fechaISO(fd: FormData, campo: string, etiqueta: string, opc: { opcional?: boolean } = {}) {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v && opc.opcional) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new ErrorDeValidacion(`Indicá ${etiqueta} con una fecha válida.`);
  return v;
}

export function email(fd: FormData, campo: string, etiqueta: string) {
  const v = texto(fd, campo, etiqueta).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ErrorDeValidacion(`${capital(etiqueta)} no parece un mail válido.`);
  return v;
}

/** CUIT: 11 dígitos con dígito verificador correcto. Se guarda sin guiones. */
export function cuit(fd: FormData, campo: string) {
  const v = String(fd.get(campo) ?? "").replace(/\D/g, "");
  if (v.length !== 11) throw new ErrorDeValidacion("El CUIT tiene que tener 11 dígitos.");
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(v[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 9;
  if (dv !== Number(v[10])) throw new ErrorDeValidacion("El dígito verificador del CUIT no coincide. Revisalo.");
  return v;
}

export function uuid(v: unknown): string | null {
  const s = String(v ?? "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Envuelve una server action: convierte errores de validación y de la base en mensajes legibles. */
export function accion<A extends unknown[]>(fn: (...a: A) => Promise<Estado | void>) {
  return async (...a: A): Promise<Estado> => {
    try {
      return (await fn(...a)) ?? null;
    } catch (e) {
      if (e instanceof ErrorDeValidacion) return { error: e.message };
      const pg = e as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
      const codigo = pg.code ?? pg.cause?.code;
      if (codigo === "23505") return { error: mensajeDuplicado(pg.constraint_name ?? pg.cause?.constraint_name) };
      throw e; // redirecciones de Next y errores inesperados siguen su curso
    }
  };
}

function mensajeDuplicado(c?: string) {
  if (c?.includes("sujeto_obligado")) return "Ya tenés un sujeto obligado con ese CUIT.";
  if (c?.includes("punto_programa")) return "Ya hay un punto con ese código en esta revisión.";
  return "Ese dato ya existe y no se puede repetir.";
}
