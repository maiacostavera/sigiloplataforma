// Crea el revisor de prueba. Corre como app_sigilo, igual que la aplicación.
import bcrypt from "bcryptjs";
import postgres from "postgres";

const url = process.env.APP_DATABASE_URL || (process.env.VERCEL ? undefined : process.env.DATABASE_URL);


const email = process.env.SEED_EMAIL ?? "revisor@ejemplo.com.ar";
const clave = process.env.SEED_CLAVE ?? "sigilo-demo";
const nombre = process.env.SEED_NOMBRE ?? "Revisor de prueba";

if (!url) {
  console.error("Falta APP_DATABASE_URL (conexión como app_sigilo).");
  process.exit(1);
}

// Control de seguridad: si la app no se conecta como app_sigilo, el deploy se corta.
{
  const control = postgres(url, { max: 1, prepare: false });
  const [u] = await control`select current_user as usuario, (select rolsuper from pg_roles where rolname = current_user) as super`;
  await control.end();
  if (u.usuario !== "app_sigilo" || u.super) {
    console.error(`La aplicación se conectaría como "${u.usuario}". Tiene que ser app_sigilo: revisá APP_DATABASE_URL.`);
    process.exit(1);
  }
}

// En un deploy solo se siembra si se definieron SEED_EMAIL y SEED_CLAVE.
if (process.env.VERCEL && !(process.env.SEED_EMAIL && process.env.SEED_CLAVE)) {
  console.log("Conexión como app_sigilo: OK. Sin SEED_EMAIL / SEED_CLAVE: no se crea ningún revisor.");
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false });
const hash = await bcrypt.hash(clave, 12);
await sql`insert into revisor (nombre, email) values (${nombre}, ${email}) on conflict (email) do nothing`;
const [r] = await sql`select id from revisor where email = ${email}`;
await sql`
  insert into revisor_credencial (revisor_id, clave_hash) values (${r.id}, ${hash})
  on conflict (revisor_id) do nothing`;
console.log(`Revisor: ${email}${process.env.VERCEL ? "" : ` / ${clave}`} (si ya existía, se conserva su contraseña).`);
await sql.end();
