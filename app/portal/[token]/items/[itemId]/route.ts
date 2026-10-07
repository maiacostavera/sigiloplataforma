import { NextResponse, type NextRequest } from "next/server";
import { comentar, ErrorPortal } from "@/lib/portal";

// Recibe el formulario de una tarjeta del portal. Funciona sin JavaScript:
// es un POST común y responde con una redirección de vuelta al portal.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await params;
  const volver = (q: string) => NextResponse.redirect(new URL(`/portal/${token}?${q}#item-${itemId}`, req.url), 303);
  try {
    const fd = await req.formData();
    await comentar(token, itemId, String(fd.get("comentario") ?? ""));
    return volver(`ok=${itemId}`);
  } catch (e) {
    if (e instanceof ErrorPortal) {
      if (e.codigo === "sin_acceso") return NextResponse.redirect(new URL(`/portal/${token}`, req.url), 303);
      return volver(`error=${e.codigo}&item=${itemId}`);
    }
    throw e;
  }
}
