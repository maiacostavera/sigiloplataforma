import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { armarExpediente } from "@/lib/expediente";

// Modo "requerimiento UIF": descarga el expediente sellado completo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!s?.user?.id) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const r = await armarExpediente(s.user.id, id, s.user.email);
  if (!r) return new NextResponse("No existe", { status: 404 });
  return new NextResponse(Buffer.from(r.archivo), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(r.archivo.byteLength),
      "Content-Disposition": `attachment; filename="${r.nombre}"`,
      "Cache-Control": "private, no-store",
      "X-Sigilo-SHA256": r.sha256,
    },
  });
}
