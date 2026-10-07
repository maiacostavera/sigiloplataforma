// Crea el revisor de prueba. Corre como app_sigilo, igual que la aplicación.
import bcrypt from "bcryptjs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const email = process.env.SEED_EMAIL ?? "revisor@ejemplo.com.ar";
const clave = process.env.SEED_CLAVE ?? "sigilo-demo";
const nombre = process.env.SEED_NOMBRE ?? "Revisor de prueba";

if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const hash = await bcrypt.hash(clave, 12);
await sql`insert into revisor (nombre, email) values (${nombre}, ${email}) on conflict (email) do nothing`;
const [r] = await sql`select id from revisor where email = ${email}`;
await sql`
  insert into revisor_credencial (revisor_id, clave_hash) values (${r.id}, ${hash})
  on conflict (revisor_id) do update set clave_hash = excluded.clave_hash, actualizada_en = now()`;
console.log(`Revisor de prueba: ${email} / ${clave}`);
await sql.end();
