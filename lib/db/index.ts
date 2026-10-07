import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as esquema from "./esquema";

// La app se conecta SIEMPRE como `app_sigilo`. Nunca como el dueño de la base:
// si no, los revoke de 05_permisos.sql no protegen nada.
function crear(url: string) {
  const sql = postgres(url, {
    // En Vercel cada función abre sus propias conexiones: pocas, y que se cierren solas.
    max: process.env.VERCEL ? 3 : 10,
    idle_timeout: 20,
    // Sin sentencias preparadas: así funciona detrás de un pooler (Neon, Supabase, PgBouncer).
    prepare: false,
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema: esquema }) };
}

/**
 * URL de la app: APP_DATABASE_URL. En Vercel no se acepta DATABASE_URL como
 * respaldo, porque la integración de Neon la carga con el usuario dueño.
 */
export function urlApp() {
  return process.env.APP_DATABASE_URL || (process.env.VERCEL ? undefined : process.env.DATABASE_URL);
}

type Conexion = ReturnType<typeof crear>;
const g = globalThis as unknown as { __sigilo?: Conexion };

function conexion(): Conexion {
  if (!g.__sigilo) {
    const url = urlApp();
    if (!url) throw new Error("Falta APP_DATABASE_URL (conexión como app_sigilo).");
    g.__sigilo = crear(url);
  }
  return g.__sigilo;
}

export type DB = Conexion["db"];
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export const db = new Proxy({} as DB, {
  get: (_t, prop) => Reflect.get(conexion().db, prop),
});

export { crear as crearConexion };
export * as t from "./esquema";
