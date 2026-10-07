// El sello de Sigilo. Se arma como texto SVG para poder usarlo igual en la
// aplicación y en el expediente autocontenido (que no tiene JavaScript).
//
// Colores por clase (.sello-cera, .sello-relieve, .sello-trazo): los define
// la hoja de estilos de cada lugar donde se estampa.

import { fechaHora } from "./formato";

type DatosSello = {
  /** Identificador único en la página (para los id de los textPath). */
  id: string;
  sha256?: string;
  recibidoEn?: Date | string;
  /** Texto del anillo exterior si no hay huella (por ejemplo, en el login). */
  leyenda?: string;
  leyendaInterior?: string;
  tamano?: number;
  titulo?: string;
};

/** Generador pseudoaleatorio determinístico: el mismo archivo da siempre el mismo sello. */
function semilla(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/** Contorno de cera: un círculo con irregularidad mínima. */
function contornoCera(cx: number, cy: number, r: number, rnd: () => number): string {
  const ondas = [
    { k: 3, a: 1.1 + rnd() * 0.6, f: rnd() * Math.PI * 2 },
    { k: 7, a: 0.6 + rnd() * 0.5, f: rnd() * Math.PI * 2 },
    { k: 13, a: 0.35 + rnd() * 0.3, f: rnd() * Math.PI * 2 },
    { k: 29, a: 0.2, f: rnd() * Math.PI * 2 },
  ];
  // Una gota de cera desbordada, chica, en un lugar al azar.
  const gotaAng = rnd() * Math.PI * 2;
  const pasos = 144;
  const pts: string[] = [];
  for (let i = 0; i < pasos; i++) {
    const t = (i / pasos) * Math.PI * 2;
    let rr = r;
    for (const o of ondas) rr += o.a * Math.sin(o.k * t + o.f);
    const d = Math.atan2(Math.sin(t - gotaAng), Math.cos(t - gotaAng));
    rr += 3.2 * Math.exp(-(d * d) / 0.012);
    pts.push(`${(cx + rr * Math.cos(t)).toFixed(2)},${(cy + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(" ")} Z`;
}

function circuloTexto(id: string, cx: number, cy: number, r: number) {
  // Arranca arriba a la izquierda y gira en sentido horario.
  return `<path id="${id}" d="M ${cx} ${cy} m ${-r} 0 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0" fill="none"/>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function selloSvg(d: DatosSello): string {
  const tam = d.tamano ?? 220;
  const rnd = semilla(d.sha256 ?? d.id);
  const id = d.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const exterior = d.sha256
    ? `SHA-256 · ${d.sha256.slice(0, 8)} ${d.sha256.slice(8, 16)} · SELLADO · SIGILO ·`
    : (d.leyenda ?? "CADA EVIDENCIA, SELLADA Y CON FECHA · SIGILO ·");
  const interior = d.recibidoEn
    ? `RECIBIDO ${fechaHora(d.recibidoEn)} ·`
    : (d.leyendaInterior ?? "SIGILLUM · SIGILLUM · SIGILLUM ·");
  const rExt = 74;
  const rInt = 53;
  const largoExt = (2 * Math.PI * rExt * 0.985).toFixed(1);
  const largoInt = (2 * Math.PI * rInt * 0.975).toFixed(1);
  const giro = (rnd() * 8 - 4).toFixed(2); // un sello nunca cae derecho
  const titulo = d.titulo ?? (d.sha256 ? `Sello de la evidencia ${d.sha256}` : "Sello de Sigilo");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${tam}" height="${tam}" role="img" aria-label="${esc(titulo)}">
<title>${esc(titulo)}</title>
<defs>${circuloTexto(`se-${id}`, 100, 100, rExt)}${circuloTexto(`si-${id}`, 100, 100, rInt)}</defs>
<g transform="rotate(${giro} 100 100)">
<path class="sello-cera" d="${contornoCera(100, 100, 94, rnd)}"/>
<circle class="sello-trazo" cx="100" cy="100" r="86" stroke-width="1.4" opacity=".7"/>
<circle class="sello-trazo" cx="100" cy="100" r="63.5" stroke-width="1" opacity=".6"/>
<circle class="sello-trazo" cx="100" cy="100" r="42" stroke-width="1.4" opacity=".7"/>
<text class="sello-relieve" font-family="'IBM Plex Mono', ui-monospace, Consolas, monospace" font-size="10.5" font-weight="500" letter-spacing="0">
<textPath href="#se-${id}" textLength="${largoExt}" lengthAdjust="spacing">${esc(exterior)}</textPath></text>
<text class="sello-relieve" font-family="'IBM Plex Mono', ui-monospace, Consolas, monospace" font-size="7.6" font-weight="500" opacity=".92">
<textPath href="#si-${id}" textLength="${largoInt}" lengthAdjust="spacing">${esc(interior)}</textPath></text>
<text class="sello-relieve" x="100" y="111" text-anchor="middle" font-family="'Newsreader', Georgia, 'Times New Roman', serif" font-size="38" font-weight="600">S</text>
<path class="sello-trazo" d="M84 120 H116" stroke-width="1" opacity=".7"/>
<text class="sello-relieve" x="100" y="129.5" text-anchor="middle" font-family="'IBM Plex Mono', ui-monospace, Consolas, monospace" font-size="6" letter-spacing="1.6" opacity=".9">SIGILO</text>
</g>
</svg>`;
}
