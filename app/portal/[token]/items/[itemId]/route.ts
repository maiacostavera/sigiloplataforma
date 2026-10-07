import { NextResponse, type NextRequest } from "next/server";
import { ErrorPortal } from "@/lib/portal";
import { recibirDelPortal } from "@/lib/recepcion";

// Recibe el formulario de una tarjeta del portal. Funciona sin JavaScript:
// es un POST común y responde con una redirección de vuelta al portal.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await params;
  const volver = (q: string) => NextResponse.redirect(new URL(`/portal/${token}?${q}#item-${itemId}`, req.url), 303);
  try {
    const fd = await req.formData();
    const archivos = fd.getAll("archivos").filter((x): x is File => x instanceof File);
    const recibidas = await recibirDelPortal(token, itemId, archivos, String(fd.get("comentario") ?? ""));
    return volver(`ok=${itemId}&n=${recibidas.length}`);
  } catch (e) {
    if (e instanceof ErrorPortal) {
      if (e.codigo === "sin_acceso") return NextResponse.redirect(new URL(`/portal/${token}`, req.url), 303);
      return volver(`error=${e.codigo}&item=${itemId}`);
    }
    throw e;
  }
}
