import { randomBytes } from "node:crypto";

/** Token del portal: 32 bytes aleatorios, url-safe. */
export const nuevoToken = () => randomBytes(32).toString("base64url");

export const DIAS_VIGENCIA_TOKEN = 90;
