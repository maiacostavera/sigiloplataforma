// Los tests corren contra una base aparte, `<base>_test`, recreada en cada corrida.
function aTest(url: string) {
  const u = new URL(url);
  const base = u.pathname.replace(/^\//, "");
  if (!base.endsWith("_test")) u.pathname = `${base}_test`;
  return u.toString();
}

export function urlsDeTest() {
  const dueno = process.env.DATABASE_URL_DUENO;
  const app = process.env.DATABASE_URL;
  if (!dueno || !app) throw new Error("Faltan DATABASE_URL_DUENO y DATABASE_URL para correr los tests.");
  return { dueno: aTest(dueno), app: aTest(app), mantenimiento: dueno };
}
