import postgres from "postgres";
import { migrar } from "../scripts/migrar.mts";
import { urlsDeTest } from "./urls";

export default async function preparar() {
  const { dueno, mantenimiento } = urlsDeTest();
  const nombre = new URL(dueno).pathname.slice(1);
  const sql = postgres(mantenimiento, { max: 1, onnotice: () => {} });
  await sql.unsafe(`drop database if exists "${nombre}" with (force)`);
  await sql.unsafe(`create database "${nombre}"`);
  await sql.end();
  await migrar(dueno);
}
