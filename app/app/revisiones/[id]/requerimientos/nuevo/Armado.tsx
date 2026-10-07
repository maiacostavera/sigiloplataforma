"use client";

import { useState } from "react";
import { BotonEnviar } from "@/components/FormAccion";
import { IconoCruz, IconoMas } from "@/components/Iconos";

type Punto = { id: string; codigo: string; titulo: string; sugeridas: string[] };
type Item = { clave: number; descripcion: string; vence_en: string; responsable_email: string };

let siguiente = 1;
const nuevoItem = (descripcion = ""): Item => ({ clave: siguiente++, descripcion, vence_en: "", responsable_email: "" });

export function Armado({ puntos, venceSugerido }: { puntos: Punto[]; venceSugerido: string }) {
  const [elegidos, setElegidos] = useState<Record<string, Item[]>>({});
  const [responsable, setResponsable] = useState("");
  const [vence, setVence] = useState(venceSugerido);

  function alternar(p: Punto, marcado: boolean) {
    setElegidos((e) => {
      const n = { ...e };
      if (marcado) n[p.id] = (p.sugeridas.length ? p.sugeridas : [""]).map((s) => nuevoItem(s));
      else delete n[p.id];
      return n;
    });
  }
  function cambiar(pid: string, clave: number, campo: keyof Omit<Item, "clave">, valor: string) {
    setElegidos((e) => ({ ...e, [pid]: e[pid].map((i) => (i.clave === clave ? { ...i, [campo]: valor } : i)) }));
  }
  function quitar(pid: string, clave: number) {
    setElegidos((e) => {
      const resto = e[pid].filter((i) => i.clave !== clave);
      const n = { ...e };
      if (resto.length) n[pid] = resto;
      else delete n[pid];
      return n;
    });
  }
  function agregar(pid: string) {
    setElegidos((e) => ({ ...e, [pid]: [...e[pid], nuevoItem()] }));
  }

  // Lo que queda vacío en un ítem toma el valor por defecto de arriba.
  const items = puntos.flatMap((p) =>
    (elegidos[p.id] ?? []).map((i) => ({
      punto_programa_id: p.id,
      descripcion: i.descripcion,
      vence_en: i.vence_en || vence,
      responsable_email: i.responsable_email || responsable,
    })),
  );

  return (
    <div className="pila-6">
      <div className="rejilla rejilla-3">
        <div className="campo" style={{ gridColumn: "span 1" }}>
          <label htmlFor="titulo">Título <span className="secundario" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="titulo" name="titulo" type="text" />
        </div>
        <div className="campo">
          <label htmlFor="responsable">Responsable por defecto</label>
          <input id="responsable" type="email" className="dato" value={responsable} onChange={(e) => setResponsable(e.target.value)} aria-describedby="defecto-ayuda" />
        </div>
        <div className="campo">
          <label htmlFor="vence">Vencimiento por defecto</label>
          <input id="vence" type="date" value={vence} onChange={(e) => setVence(e.target.value)} aria-describedby="defecto-ayuda" />
        </div>
      </div>
      <p id="defecto-ayuda" className="ayuda secundario" style={{ fontSize: 13, marginTop: 8 }}>
        Cada ítem usa el responsable y el vencimiento por defecto, salvo que le pongas otro.
      </p>

      <fieldset>
        <legend className="rotulo" style={{ marginBottom: 12 }}>Puntos del programa</legend>
        <div className="tabla-marco">
          <table className="tabla">
            <tbody>
              {puntos.map((p) => {
                const its = elegidos[p.id];
                return (
                  <tr key={p.id}>
                    <td style={{ width: 28 }}>
                      <input type="checkbox" id={`p-${p.id}`} checked={!!its} onChange={(e) => alternar(p, e.target.checked)} style={{ width: 16, height: 16, marginTop: 3, accentColor: "var(--tinta)" }} />
                    </td>
                    <td>
                      <label htmlFor={`p-${p.id}`} style={{ cursor: "pointer" }}>
                        <span className="dato" style={{ marginRight: 8 }}>{p.codigo}</span>
                        <strong style={{ fontWeight: 600 }}>{p.titulo}</strong>
                      </label>
                      {its && (
                        <div className="pila" style={{ marginTop: 12 }}>
                          {its.map((i, k) => (
                            <div key={i.clave} className="item-armado">
                              <div className="campo">
                                <label htmlFor={`d-${i.clave}`}>Qué se pide{its.length > 1 ? ` (${k + 1})` : ""}</label>
                                <input id={`d-${i.clave}`} type="text" value={i.descripcion} onChange={(e) => cambiar(p.id, i.clave, "descripcion", e.target.value)} />
                              </div>
                              <div className="campo">
                                <label htmlFor={`v-${i.clave}`}>Vence</label>
                                <input id={`v-${i.clave}`} type="date" value={i.vence_en || vence} onChange={(e) => cambiar(p.id, i.clave, "vence_en", e.target.value)} />
                              </div>
                              <div className="campo">
                                <label htmlFor={`m-${i.clave}`}>Responsable</label>
                                <input id={`m-${i.clave}`} type="email" className="dato" value={i.responsable_email || responsable} onChange={(e) => cambiar(p.id, i.clave, "responsable_email", e.target.value)} />
                              </div>
                              <button type="button" className="btn-icono" onClick={() => quitar(p.id, i.clave)} aria-label={`Quitar ítem ${k + 1} de ${p.codigo}`} style={{ alignSelf: "end", marginBottom: 5 }}>
                                <IconoCruz />
                              </button>
                            </div>
                          ))}
                          <div>
                            <button type="button" className="btn btn-secundario btn-chico" onClick={() => agregar(p.id)}><IconoMas />Pedir otro archivo para {p.codigo}</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>

      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="fila">
        <BotonEnviar>Crear requerimiento{items.length ? ` con ${items.length} ${items.length === 1 ? "ítem" : "ítems"}` : ""}</BotonEnviar>
      </div>
    </div>
  );
}
