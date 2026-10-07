import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Revisor logueado, o redirección al login. Toda pantalla del revisor arranca acá. */
export async function revisorActual() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  return { id: s.user.id, email: s.user.email, nombre: s.user.name };
}
