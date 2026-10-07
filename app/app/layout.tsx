import { Cabecera } from "@/components/Cabecera";
import { revisorActual } from "@/lib/sesion";

export default async function LayoutRevisor({ children }: { children: React.ReactNode }) {
  const r = await revisorActual();
  return (
    <>
      <Cabecera email={r.email} />
      <main className="contenedor pagina">{children}</main>
    </>
  );
}
