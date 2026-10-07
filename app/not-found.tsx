import Link from "next/link";
import { Marca } from "@/components/Marca";

export default function NoEncontrado() {
  return (
    <main className="contenedor" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="pila" style={{ maxWidth: 460, textAlign: "center" }}>
        <div><Marca /></div>
        <h1>No encontramos esta página</h1>
        <p className="secundario">Puede que el link esté incompleto, o que lo que buscás pertenezca a otra cuenta.</p>
        <div><Link href="/app" className="btn btn-secundario">Ir a Mis expedientes</Link></div>
      </div>
    </main>
  );
}
