"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Pestanas({ base, items }: { base: string; items: { ruta: string; texto: string }[] }) {
  const actual = usePathname();
  return (
    <nav className="pestanas" aria-label="Secciones de la revisión">
      {items.map((i) => {
        const href = base + i.ruta;
        const activa = i.ruta === "" ? actual === base : actual.startsWith(href);
        return <Link key={i.ruta} href={href} aria-current={activa ? "page" : undefined}>{i.texto}</Link>;
      })}
    </nav>
  );
}
