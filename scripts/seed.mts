// Crea el revisor de prueba. Corre como app_sigilo, igual que la aplicación.
import bcrypt from "bcryptjs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

// En un deploy solo se siembra si se definieron SEED_EMAIL y SEED_CLAVE.
if (process.env.VERCEL && !(process.env.SEED_EMAIL && process.env.SEED_CLAVE)) {
  console.log("Sin SEED_EMAIL / SEED_CLAVE: no se crea ningún revisor.");
  process.exit(0);
}
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
  on conflict (revisor_id) do nothing`;
console.log(`Revisor: ${email}${process.env.VERCEL ? "" : ` / ${clave}`} (si ya existía, se conserva su contraseña).`);
await sql.end();
