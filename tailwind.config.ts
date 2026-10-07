import type { Config } from "tailwindcss";

// Sigilo expone SOLO sus tokens. `colors`, `borderRadius`, `fontFamily` y
// `boxShadow` van en `theme` (no en `extend`): eso reemplaza la paleta por
// defecto de Tailwind, así que `bg-slate-900` o `text-indigo-500` no existen.
const t = (nombre: string) => `var(--${nombre})`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      papel: { DEFAULT: t("papel"), 2: t("papel-2"), 3: t("papel-3") },
      tinta: { DEFAULT: t("tinta"), 2: t("tinta-2"), 3: t("tinta-3") },
      linea: { DEFAULT: t("linea"), fuerte: t("linea-fuerte") },
      lacre: { DEFAULT: t("lacre"), 2: t("lacre-2"), tenue: t("lacre-tenue") },
      cumple: t("cumple"),
      parcial: t("parcial"),
      "no-cumple": t("no-cumple"),
      vencido: t("vencido"),
    },
    fontFamily: {
      ui: [t("f-ui")],
      mono: [t("f-mono")],
      doc: [t("f-doc")],
    },
    borderRadius: {
      none: "0",
      1: t("r1"),
      2: t("r2"),
      3: t("r3"),
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      modal: "0 8px 24px rgb(20 24 31 / 0.14)",
    },
    extend: {},
  },
  plugins: [],
};

export default config;
