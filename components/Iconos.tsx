// Set de íconos propio. Trazo 1.75, puntas redondeadas, nada más.
import type { SVGProps } from "react";

function Base({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icono" {...p}>
      {children}
    </svg>
  );
}

export const IconoCopiar = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></Base>
);
export const IconoDescargar = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M12 4.5v11" /><path d="m7.5 11 4.5 4.5 4.5-4.5" /><path d="M5 19.5h14" /></Base>
);
export const IconoSubir = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M12 15.5v-11" /><path d="m7.5 9 4.5-4.5L16.5 9" /><path d="M5 19.5h14" /></Base>
);
export const IconoArchivo = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" /><path d="M13.5 3.5v5h5" /></Base>
);
export const IconoTilde = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>
);
export const IconoCruz = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></Base>
);
export const IconoFlecha = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Base>
);
export const IconoMas = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
);
export const IconoSalir = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5" /><path d="M10 16.5 5.5 12 10 7.5" /><path d="M5.5 12h10" /></Base>
);
export const IconoSol = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Base>
);
export const IconoLuna = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></Base>
);
export const IconoArriba = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m6.5 14.5 5.5-5.5 5.5 5.5" /></Base>
);
export const IconoAbajo = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></Base>
);
export const IconoPaquete = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><path d="M4.5 7.5 12 3.5l7.5 4v9L12 20.5l-7.5-4z" /><path d="M4.5 7.5 12 11.5l7.5-4M12 11.5v9" /></Base>
);
