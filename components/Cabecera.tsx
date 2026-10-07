import Link from "next/link";
import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { Marca } from "./Marca";
import { SelectorTema } from "./SelectorTema";
import { IconoSalir } from "./Iconos";
import { NavPrincipal } from "./NavPrincipal";

export async function Cabecera({ email }: { email: string }) {
  const tema = (await cookies()).get("tema")?.value === "dark" ? "dark" : "light";
  async function salir() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <header className="cabecera">
      <div className="contenedor cabecera-fila">
        <Link href="/app" style={{ textDecoration: "none" }} aria-label="Sigilo, inicio"><Marca /></Link>
        <NavPrincipal />
        <div className="fila" style={{ gap: 8 }}>
          <span className="dato secundario" style={{ fontSize: 13 }}>{email}</span>
          <SelectorTema inicial={tema} />
          <form action={salir}>
            <button className="btn btn-secundario btn-chico" aria-label="Salir" title="Salir"><IconoSalir /></button>
          </form>
        </div>
      </div>
    </header>
  );
}
