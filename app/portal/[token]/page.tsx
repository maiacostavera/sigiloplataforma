import type { Metadata } from "next";
import { portalPorToken, MAX_COMENTARIO, type ItemPortal } from "@/lib/portal";
import { diasHasta, fecha, fechaHora } from "@/lib/formato";
import { Marca } from "@/components/Marca";

export const metadata: Metadata = {
  title: "Requerimiento",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const ERRORES: Record<string, string> = {
  vacio: "No llegó ningún archivo. Elegí al menos uno y volvé a enviar.",
  muy_grande: "Uno de los archivos supera los 50 MB. Mandalo partido o comprimido.",
  comentario_largo: `El comentario es muy largo. El máximo es ${MAX_COMENTARIO} caracteres.`,
  aceptado: "Este ítem ya fue aceptado. No hace falta mandar nada más.",
};

export default async function PortalRevisado({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string; item?: string; n?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const portal = await portalPorToken(token);

  if (portal.estado !== "ok") {
    return (
      <main className="portal">
        <header className="portal-cabeza"><Marca /></header>
        <div className="portal-cuerpo pila">
          <h1>{portal.estado === "vencido" ? "Este link venció" : "Este link no es válido"}</h1>
          {portal.estado === "vencido" ? (
            <p>
              El link del requerimiento <span className="dato">Nº {String(portal.numero).padStart(3, "0")}</span> para {portal.razonSocial} ya no está activo.
              Escribile a <a href={`mailto:${portal.contacto}`} className="dato">{portal.contacto}</a> para que te mande uno nuevo.
            </p>
          ) : (
            <p>Revisá que el link esté completo: a veces el programa de correo lo corta en dos renglones. Si el problema sigue, pedile a quien te lo mandó que te lo reenvíe.</p>
          )}
        </div>
      </main>
    );
  }

  const { requerimiento: q, items } = portal;
  const faltan = items.filter((i) => i.estado === "pendiente" || i.estado === "rechazado").length;

  return (
    <main className="portal">
      <header className="portal-cabeza">
        <Marca />
        <span className="rotulo">Requerimiento <span className="dato">Nº {String(q.numero).padStart(3, "0")}</span></span>
      </header>
      <div className="portal-cuerpo">
        <p className="rotulo" style={{ marginBottom: 4 }}>{portal.razonSocial}</p>
        <h1 style={{ marginBottom: 8 }}>{q.titulo || "Archivos pedidos para la revisión"}</h1>
        <p className="secundario" style={{ marginBottom: 24 }}>
          {faltan === 0 ? "No queda nada pendiente. Gracias." : <>Quedan <span className="dato">{faltan}</span> de <span className="dato">{items.length}</span> por mandar.</>} Cada archivo queda registrado con fecha y hora de recepción.
        </p>
        <ol className="portal-lista">
          {items.map((i) => (
            <Tarjeta key={i.id} item={i} token={token} ok={sp.ok === i.id ? Number(sp.n ?? 0) : null} error={sp.item === i.id ? ERRORES[sp.error ?? ""] : undefined} />
          ))}
        </ol>
        <p className="secundario" style={{ fontSize: 13, marginTop: 32 }}>
          Este link vence el <span className="dato">{fechaHora(q.expiraEn)}</span>. Dudas: <a href={`mailto:${portal.contacto}`} className="dato">{portal.contacto}</a>
        </p>
      </div>
    </main>
  );
}

function Tarjeta({ item: i, token, ok, error }: { item: ItemPortal; token: string; ok: number | null; error?: string }) {
  const abierto = i.estado === "pendiente" || i.estado === "rechazado";
  const vencido = abierto && diasHasta(i.venceEn) < 0;
  const clase = vencido ? "vencido" : i.estado;
  const palabra = vencido ? "Vencido" : { pendiente: "Pendiente", respondido: "Enviado, en revisión", aceptado: "Aceptado", rechazado: "Hay que volver a mandarlo" }[i.estado];
  return (
    <li id={`item-${i.id}`} className={`tarjeta tarjeta-${clase}`}>
      <p className="rotulo">{i.punto}</p>
      <h2 className="tarjeta-titulo">{i.descripcion}</h2>
      <p className="tarjeta-meta">
        <span className={`estado estado-${clase}`}>{palabra}</span>
        <span>Vence <span className="dato">{fecha(i.venceEn)}</span></span>
      </p>
      {i.motivoRechazo && <p className="tarjeta-motivo"><strong>Qué falta:</strong> {i.motivoRechazo}</p>}
      {i.archivos.length > 0 && (
        <ul className="tarjeta-archivos" aria-label="Archivos ya enviados">
          {i.archivos.map((a, k) => (
            <li key={k}><span className="tarjeta-archivo-nombre">{a.nombre}</span> <span className="dato secundario">{fechaHora(a.recibidoEn)}</span></li>
          ))}
        </ul>
      )}
      {ok !== null && <p className="ok" role="status">{ok > 0 ? `Recibido${ok === 1 ? "" : "s"}: ${ok} archivo${ok === 1 ? "" : "s"}.` : "Comentario recibido."}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {i.estado !== "aceptado" && (
        <form method="post" action={`/portal/${token}/items/${i.id}`} encType="multipart/form-data" className="tarjeta-form">
          <div className="campo">
            <label htmlFor={`c-${i.id}`}>Comentario <span className="secundario" style={{ fontWeight: 400 }}>(opcional)</span></label>
            <textarea id={`c-${i.id}`} name="comentario" rows={2} maxLength={MAX_COMENTARIO} style={{ minHeight: 64 }} />
          </div>
          <button className="btn btn-primario">Enviar</button>
        </form>
      )}
    </li>
  );
}
