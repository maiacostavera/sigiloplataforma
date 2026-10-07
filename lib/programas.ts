import fs from "node:fs/promises";
import path from "node:path";

export type PuntoPlantilla = {
  codigo: string;
  titulo: string;
  texto: string;
  origen_normativo: string;
  evidencia_sugerida?: string[];
};

export type Programa = {
  sector: string;
  resolucion: string;
  version: string;
  puntos: PuntoPlantilla[];
};

const CARPETA = path.join(process.cwd(), "data", "programas");

/** Nombres legibles de los sectores. El código es el nombre del archivo. */
const NOMBRES: Record<string, string> = {
  entidades_cambiarias: "Entidades cambiarias",
};

export const nombreSector = (s: string) => NOMBRES[s] ?? s.replace(/_/g, " ");

export async function listarProgramas(): Promise<Programa[]> {
  const archivos = (await fs.readdir(CARPETA)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(archivos.map((f) => leer(f)));
}

async function leer(archivo: string): Promise<Programa> {
  return JSON.parse(await fs.readFile(path.join(CARPETA, archivo), "utf8"));
}

export async function cargarPrograma(sector: string): Promise<Programa | null> {
  if (!/^[a-z0-9_]+$/.test(sector)) return null;
  try {
    return await leer(`${sector}.json`);
  } catch {
    return null;
  }
}

/** Evidencia sugerida para un punto, buscada por código en la plantilla del sector. */
export async function evidenciaSugerida(sector: string, codigo: string): Promise<string[]> {
  const p = await cargarPrograma(sector);
  return p?.puntos.find((x) => x.codigo === codigo)?.evidencia_sugerida ?? [];
}
