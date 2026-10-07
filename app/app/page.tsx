import { revisorActual } from "@/lib/sesion";

export default async function Inicio() {
  const r = await revisorActual();
  return (
    <div className="pila">
      <p className="rotulo">Mis expedientes</p>
      <h1>Hola, <span className="dato">{r.email}</span></h1>
      <p className="secundario">Todavía no hay nada acá. Los expedientes llegan en el próximo incremento.</p>
    </div>
  );
}
