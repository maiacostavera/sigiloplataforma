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

// Conexión del dueño. Según cómo se conecte Neon (o Supabase) a Vercel, la
// variable cambia de nombre: se prueban las conocidas, la directa primero.
const CANDIDATAS = [
  "DATABASE_URL_DUENO",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const nombre = CANDIDATAS.find((n) => process.env[n]);
  if (!nombre) {
    const vistas = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|^PG/.test(k));
    console.error("No hay conexión a la base para migrar.");
    console.error(`Se buscó: ${CANDIDATAS.join(", ")}.`);
    console.error(vistas.length ? `Variables de base encontradas: ${vistas.join(", ")}.` : "No hay NINGUNA variable de base: conectá Neon al proyecto (Storage) para el entorno Production.");
    process.exit(1);
  }
  console.log(`Migrando con ${nombre}.`);
  migrar(process.env[nombre]!).then(
    () => console.log("Migraciones aplicadas."),
    (e) => { console.error(e); process.exit(1); },
  );
}
