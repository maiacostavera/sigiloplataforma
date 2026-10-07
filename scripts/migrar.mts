// Aplica las migraciones de /drizzle como DUEÑO de la base (no como app_sigilo).
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export async function migrar(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    // Si hay contraseña para app_sigilo, se crea el rol con ella antes de migrar
    // (la migración 0005 lo saltea si ya existe) o se le actualiza. Así nunca
    // queda la contraseña 'cambiar' en producción, y funciona en proveedores
    // que exigen contraseñas fuertes al crear roles (Neon).
    const clave = process.env.APP_SIGILO_CLAVE;
    if (clave) {
      const [{ existe }] = await sql`select exists (select 1 from pg_roles where rolname = 'app_sigilo') as existe`;
      const literal = `'${clave.replace(/'/g, "''")}'`;
      await sql.unsafe(existe ? `alter role app_sigilo with login password ${literal}` : `create role app_sigilo login password ${literal}`);
    }
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // En Vercel con Neon, DATABASE_URL_UNPOOLED es la conexión directa del dueño.
  const url = process.env.DATABASE_URL_DUENO || process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    console.error("Falta DATABASE_URL_DUENO.");
    process.exit(1);
  }
  migrar(url).then(
    () => console.log("Migraciones aplicadas."),
    (e) => { console.error(e); process.exit(1); },
  );
}
