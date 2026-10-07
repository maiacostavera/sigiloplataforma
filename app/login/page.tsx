import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { Marca } from "@/components/Marca";
import { Sello } from "@/components/Sello";

export const metadata: Metadata = { title: "Ingresar" };

async function ingresar(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      clave: formData.get("clave"),
      redirectTo: "/app",
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=1");
    throw e;
  }
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await auth()) redirect("/app");
  const { error } = await searchParams;
  return (
    <main className="contenedor" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "48px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Sello id="login" tamano={148} titulo="Sello de Sigilo" />
        </div>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Marca />
          <p className="secundario" style={{ marginTop: 6 }}>Cada evidencia, sellada y con fecha.</p>
        </div>
        <form action={ingresar} className="pila">
          {error && (
            <p className="error" role="alert">El mail o la contraseña no coinciden.</p>
          )}
          <div className="campo">
            <label htmlFor="email">Mail</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <input id="clave" name="clave" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primario" style={{ width: "100%" }}>Ingresar</button>
        </form>
      </div>
    </main>
  );
}
