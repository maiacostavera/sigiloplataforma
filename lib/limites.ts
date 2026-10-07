// Tamaño máximo que se acepta en un envío del portal.
//
// La norma del producto es 50 MB por archivo. Pero Vercel corta cualquier
// request de más de 4,5 MB antes de que llegue a la aplicación, así que ahí el
// límite efectivo es por envío (todos los archivos juntos) y por defecto 4 MB.
// Se puede fijar con LIMITE_ENVIO_MB.
const porDefecto = process.env.VERCEL ? 4 : 50;
const configurado = Number(process.env.LIMITE_ENVIO_MB);

export const LIMITE_MB = Number.isFinite(configurado) && configurado > 0 ? Math.min(configurado, 50) : porDefecto;
export const MAX_BYTES = LIMITE_MB * 1024 * 1024;
