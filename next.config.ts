import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Los programas de trabajo y las fuentes del expediente se leen del disco en
  // tiempo de ejecución: tienen que viajar con las funciones al desplegar.
  outputFileTracingIncludes: { "/**": ["./data/**/*"] },
  async headers() {
    return [
      {
        // El token va en la URL: que no se filtre por el Referer ni se indexe.
        source: "/portal/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default config;
