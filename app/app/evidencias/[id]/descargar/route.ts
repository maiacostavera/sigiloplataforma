import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { evidenciaDelRevisor } from "@/lib/acceso";
import { almacen } from "@/lib/almacen";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!s?.user?.id) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const x = await evidenciaDelRevisor(s.user.id, id);
  if (!x) return new NextResponse("No existe", { status: 404 });
  const e = x.evidencia;
  const datos = await almacen().leer(e.storageKey);
  return new NextResponse(Buffer.from(datos), {
    headers: {
      "Content-Type": e.contentType,
      "Content-Length": String(datos.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(e.nombreArchivo)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "X-Sigilo-SHA256": e.sha256,
    },
  });
}
