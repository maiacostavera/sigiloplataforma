import { defineConfig } from "drizzle-kit";

// Solo para `drizzle-kit studio`. Las migraciones están escritas a mano en
// /drizzle y se aplican con `npm run db:migrar`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/esquema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_DUENO ?? "" },
});
