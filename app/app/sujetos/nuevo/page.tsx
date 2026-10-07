import type { Metadata } from "next";
import Link from "next/link";
import { listarProgramas, nombreSector } from "@/lib/programas";
import { FormAccion, BotonEnviar } from "@/components/FormAccion";
import { crearSujeto } from "../../acciones";

export const metadata: Metadata = { title: "Nuevo sujeto obligado" };

export default async function NuevoSujeto() {
  const programas = await listarProgramas();
  return (
    <div style={{ maxWidth: 640 }}>
      <p className="migas"><Link href="/app">Mis expedientes</Link></p>
      <h1 style={{ marginBottom: 24 }}>Nuevo sujeto obligado</h1>
      <FormAccion accion={crearSujeto} className="pila-6">
        <div className="campo">
          <label htmlFor="razon_social">Razón social</label>
          <input id="razon_social" name="razon_social" type="text" required autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="cuit">CUIT</label>
          <input id="cuit" name="cuit" type="text" inputMode="numeric" className="dato" required autoComplete="off" aria-describedby="cuit-ayuda" style={{ maxWidth: 220 }} />
          <span id="cuit-ayuda" className="ayuda">Con o sin guiones. Se verifica el dígito verificador.</span>
        </div>
        <div className="rejilla rejilla-2">
          <div className="campo">
            <label htmlFor="sector">Sector</label>
            <select id="sector" name="sector" required defaultValue={programas[0]?.sector}>
              {programas.map((p) => <option key={p.sector} value={p.sector}>{nombreSector(p.sector)}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="resolucion_aplicable">Resolución aplicable</label>
            <input id="resolucion_aplicable" name="resolucion_aplicable" type="text" className="dato" required defaultValue={programas[0]?.resolucion} />
          </div>
        </div>
        <div className="fila">
          <BotonEnviar>Crear sujeto obligado</BotonEnviar>
          <Link href="/app" className="btn btn-secundario">Cancelar</Link>
        </div>
      </FormAccion>
    </div>
  );
}
