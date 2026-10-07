// Uso: node scripts/hash-clave.mjs 'mi-contraseña'
import bcrypt from "bcryptjs";
const clave = process.argv[2];
if (!clave) { console.error("Uso: node scripts/hash-clave.mjs <contraseña>"); process.exit(1); }
console.log(bcrypt.hashSync(clave, 12));
