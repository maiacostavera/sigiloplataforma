"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [{ href: "/app", texto: "Mis expedientes" }];

export function NavPrincipal() {
  const ruta = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {enlaces.map((e) => {
        const activo = e.href === "/app" ? ruta === "/app" : ruta.startsWith(e.href);
        return (
          <Link key={e.href} href={e.href} aria-current={activo ? "page" : undefined}>{e.texto}</Link>
        );
      })}
    </nav>
  );
}
