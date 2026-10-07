// Storage de archivos. En producción, S3-compatible. En desarrollo, una
// carpeta local. En tests, memoria.
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface Almacen {
  guardar(clave: string, datos: Uint8Array, contentType: string): Promise<void>;
  leer(clave: string): Promise<Uint8Array>;
  borrar(clave: string): Promise<void>;
}

function s3(): Almacen {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("Falta S3_BUCKET.");
  const cliente = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
      : undefined,
  });
  return {
    async guardar(clave, datos, contentType) {
      // IfNoneMatch: nunca se pisa un objeto existente.
      await cliente.send(new PutObjectCommand({ Bucket: bucket, Key: clave, Body: datos, ContentType: contentType, IfNoneMatch: "*" }));
    },
    async leer(clave) {
      const r = await cliente.send(new GetObjectCommand({ Bucket: bucket, Key: clave }));
      return r.Body!.transformToByteArray();
    },
    async borrar(clave) {
      await cliente.send(new DeleteObjectCommand({ Bucket: bucket, Key: clave }));
    },
  };
}

function local(): Almacen {
  // El directorio es configurable: se excluye del análisis estático de archivos de Next.
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.ALMACEN_DIR ?? "almacen");
  const ruta = (clave: string) => {
    const r = path.join(/*turbopackIgnore: true*/ dir, clave);
    if (!r.startsWith(dir + path.sep)) throw new Error("Clave de storage inválida.");
    return r;
  };
  return {
    async guardar(clave, datos) {
      await fs.mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
      await fs.writeFile(/*turbopackIgnore: true*/ ruta(clave), datos, { flag: "wx" }); // wx: falla si ya existe
    },
    leer: async (clave) => new Uint8Array(await fs.readFile(/*turbopackIgnore: true*/ ruta(clave))),
    borrar: (clave) => fs.rm(/*turbopackIgnore: true*/ ruta(clave), { force: true }),
  };
}

const memoria = new Map<string, Uint8Array>();
function enMemoria(): Almacen {
  return {
    async guardar(clave, datos) {
      if (memoria.has(clave)) throw new Error("La clave ya existe.");
      memoria.set(clave, datos);
    },
    async leer(clave) {
      const d = memoria.get(clave);
      if (!d) throw new Error("No existe.");
      return d;
    },
    async borrar(clave) {
      memoria.delete(clave);
    },
  };
}
export const _memoria = memoria;

let actual: Almacen | null = null;
export function almacen(): Almacen {
  if (!actual) {
    const driver = process.env.STORAGE_DRIVER ?? "local";
    actual = driver === "s3" ? s3() : driver === "memoria" ? enMemoria() : local();
  }
  return actual;
}
