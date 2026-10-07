// Aplica las migraciones de /drizzle como DUEÑO de la base (no como app_sigilo).
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export async function migrar(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL_DUENO;
  if (!url) {
    console.error("Falta DATABASE_URL_DUENO.");
    process.exit(1);
  }
  migrar(url).then(
    () => console.log("Migraciones aplicadas."),
    (e) => { console.error(e); process.exit(1); },
  );
}
