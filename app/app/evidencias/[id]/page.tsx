import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revisorActual } from "@/lib/sesion";
import { evidenciaDelRevisor } from "@/lib/acceso";
import { fechaHora, huellaEnBloques, periodo, tamano } from "@/lib/formato";
import { Sello } from "@/components/Sello";
import { CopiarTexto } from "@/components/CopiarTexto";
import { IconoDescargar } from "@/components/Iconos";

export const metadata: Metadata = { title: "Evidencia" };

const ORIGEN: Record<string, string> = { portal: "portal del sujeto obligado", mail: "mail", carga_revisor: "carga del revisor" };

export default async function Evidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await revisorActual();
  const x = await evidenciaDelRevisor(r.id, id);
  if (!x) notFound();
  const { evidencia: e, punto: p, requerimiento: q, revision: v, sujeto: s } = x;

  return (
    <>
      <p className="migas">
        <Link href="/app">Mis expedientes</Link> / <Link href={`/app/sujetos/${s.id}`}>{s.razonSocial}</Link> /{" "}
        <Link href={`/app/revisiones/${v.id}`} className="dato">{periodo(v.periodoDesde, v.periodoHasta)}</Link> /{" "}
        <Link href={`/app/requerimientos/${q.id}`}>Requerimiento <span className="dato">Nº {String(q.numero).padStart(3, "0")}</span></Link>
      </p>

      <article className="evidencia">
        <div className="evidencia-sello">
          <Sello id={e.id} sha256={e.sha256} recibidoEn={e.recibidoEn} tamano={280} estampar />
        </div>

        <dl className="ficha">
          <div className="ficha-fila">
            <dt className="rotulo">Archivo</dt>
            <dd>
              <span className="dato ficha-valor">{e.nombreArchivo}</span>
              <span className="dato secundario ficha-extra">{tamano(e.bytes)} · {e.contentType}</span>
            </dd>
            <dd className="ficha-accion">
              <a href={`/app/evidencias/${e.id}/descargar`} className="btn btn-secundario btn-chico"><IconoDescargar />Descargar</a>
            </dd>
          </div>
          <div className="ficha-fila">
            <dt className="rotulo">Huella SHA-256</dt>
            <dd>
              {/* Completa, en dos renglones de cuatro bloques, como el número de serie de un certificado. */}
              <span className="dato ficha-valor ficha-huella">
                <span>{huellaEnBloques(e.sha256.slice(0, 32))}</span> <span>{huellaEnBloques(e.sha256.slice(32))}</span>
              </span>
            </dd>
            <dd className="ficha-accion"><CopiarTexto texto={e.sha256} etiqueta="Copiar" chico /></dd>
          </div>
          <div className="ficha-fila">
            <dt className="rotulo">Recibido</dt>
            <dd><span className="dato ficha-valor">{fechaHora(e.recibidoEn)}</span></dd>
          </div>
          <div className="ficha-fila">
            <dt className="rotulo">Subido por</dt>
            <dd>
              <span className="dato ficha-valor">{e.subidoPor}</span>
              <span className="secundario ficha-extra">vía {ORIGEN[e.origen]}</span>
            </dd>
          </div>
          <div className="ficha-fila">
            <dt className="rotulo">Responde a</dt>
            <dd><Link href={`/app/puntos/${p.id}`} className="ficha-valor"><span className="dato">{p.codigo}</span> · {p.titulo}</Link></dd>
          </div>
          <div className="ficha-fila">
            <dt className="rotulo">Origen normativo</dt>
            <dd><span className="dato ficha-valor">{p.origenNormativo}</span></dd>
          </div>
        </dl>

        <p className="evidencia-pie">Esta evidencia no puede ser modificada ni eliminada. Tampoco por nosotros.</p>
      </article>
    </>
  );
}
