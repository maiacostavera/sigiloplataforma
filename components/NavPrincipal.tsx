"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/app", texto: "Mis expedientes" },
];

export function NavPrincipal() {
  const ruta = usePathname();
  const otros = enlaces.filter((e) => e.href !== "/app");
  return (
    <nav className="nav" aria-label="Principal">
      {enlaces.map((e) => {
        // "Mis expedientes" abarca todo /app salvo las otras secciones del menú.
        const activo = e.href === "/app" ? !otros.some((o) => ruta.startsWith(o.href)) : ruta.startsWith(e.href);
        return (
          <Link key={e.href} href={e.href} aria-current={activo ? "page" : undefined}>{e.texto}</Link>
        );
      })}
    </nav>
  );
}
