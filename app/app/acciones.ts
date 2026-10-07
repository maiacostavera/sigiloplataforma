"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, t } from "@/lib/db";
import { registrarEvento } from "@/lib/db/evento";
import { revisorActual } from "@/lib/sesion";
import { itemDelRevisor, observacionDelRevisor, puntoDelRevisor, requerimientoDelRevisor, revisionDelRevisor, sujetoDelRevisor } from "@/lib/acceso";
import { DIAS_VIGENCIA_TOKEN, nuevoToken } from "@/lib/token";
import { actualizarEstadoRevision, evidenciasDePunto, faltantes, resumenPrograma } from "@/lib/conclusiones";
import { cargarPrograma, listarProgramas } from "@/lib/programas";
import { accion, cuit, ErrorDeValidacion, fechaISO, texto, uuid, type Estado } from "@/lib/validar";

// ---------- sujetos obligados ----------

export const crearSujeto = accion(async (_prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const razonSocial = texto(fd, "razon_social", "la razón social", { max: 200 });
  const c = cuit(fd, "cuit");
  const sector = texto(fd, "sector", "el sector");
  const programas = await listarProgramas();
  const prog = programas.find((p) => p.sector === sector);
  if (!prog) throw new ErrorDeValidacion("Elegí un sector de la lista.");
  const resolucion = texto(fd, "resolucion_aplicable", "la resolución aplicable", { max: 100 });

  const id = await db.transaction(async (tx) => {
    const [s] = await tx.insert(t.sujetoObligado).values({
      revisorId: r.id, razonSocial, cuit: c, sector, resolucionAplicable: resolucion,
    }).returning({ id: t.sujetoObligado.id });
    await registrarEvento(tx, { entidad: "sujeto_obligado", entidadId: s.id, tipo: "sujeto_creado", actor: r.email, payload: { razon_social: razonSocial, cuit: c, sector, resolucion_aplicable: resolucion } });
    return s.id;
  });
  redirect(`/app/sujetos/${id}`);
});

// ---------- revisiones ----------

export const crearRevision = accion(async (sujetoId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const sujeto = await sujetoDelRevisor(r.id, sujetoId);
  if (!sujeto) throw new ErrorDeValidacion("El sujeto obligado no existe.");
  const desde = fechaISO(fd, "periodo_desde", "el inicio del período")!;
  const hasta = fechaISO(fd, "periodo_hasta", "el fin del período")!;
  const informe = fechaISO(fd, "fecha_informe", "la fecha de informe comprometida")!;
  if (hasta <= desde) throw new ErrorDeValidacion("El fin del período tiene que ser posterior al inicio.");

  const anteriorId = uuid(fd.get("revision_anterior_id"));
  if (anteriorId) {
    const [ant] = await db.select({ id: t.revision.id }).from(t.revision)
      .where(and(eq(t.revision.id, anteriorId), eq(t.revision.sujetoObligadoId, sujeto.id)));
    if (!ant) throw new ErrorDeValidacion("La revisión anterior no corresponde a este sujeto obligado.");
  }

  const programa = await cargarPrograma(sujeto.sector);

  const id = await db.transaction(async (tx) => {
    const [rev] = await tx.insert(t.revision).values({
      sujetoObligadoId: sujeto.id, periodoDesde: desde, periodoHasta: hasta, fechaInforme: informe, revisionAnteriorId: anteriorId,
    }).returning({ id: t.revision.id });
    await registrarEvento(tx, { entidad: "revision", entidadId: rev.id, tipo: "revision_creada", actor: r.email, payload: { periodo_desde: desde, periodo_hasta: hasta, fecha_informe: informe, revision_anterior_id: anteriorId } });

    if (programa && programa.puntos.length) {
      const puntos = await tx.insert(t.puntoPrograma).values(programa.puntos.map((p, i) => ({
        revisionId: rev.id, codigo: p.codigo, titulo: p.titulo, texto: p.texto, origenNormativo: p.origen_normativo, orden: i + 1,
      }))).returning({ id: t.puntoPrograma.id, codigo: t.puntoPrograma.codigo });
      await registrarEvento(tx, { entidad: "revision", entidadId: rev.id, tipo: "programa_cargado", actor: r.email, payload: { sector: programa.sector, resolucion: programa.resolucion, version: programa.version, puntos: puntos.map((p) => p.codigo) } });
    }
    return rev.id;
  });
  redirect(`/app/revisiones/${id}`);
});

// ---------- puntos del programa ----------

const puntoParaEvento = (d: ReturnType<typeof datosPunto>) => ({ codigo: d.codigo, titulo: d.titulo, texto: d.texto, origen_normativo: d.origenNormativo });

function datosPunto(fd: FormData) {
  return {
    codigo: texto(fd, "codigo", "el código", { max: 20 }).toUpperCase(),
    titulo: texto(fd, "titulo", "el título", { max: 200 }),
    texto: texto(fd, "texto", "qué verificar", { max: 4000 }),
    origenNormativo: texto(fd, "origen_normativo", "el origen normativo", { max: 300 }),
  };
}

export const agregarPunto = accion(async (revisionId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const rev = await revisionDelRevisor(r.id, revisionId);
  if (!rev) throw new ErrorDeValidacion("La revisión no existe.");
  if (rev.revision.estado === "informe_emitido") throw new ErrorDeValidacion("El informe ya fue emitido: el programa no se puede cambiar.");
  const datos = datosPunto(fd);
  await db.transaction(async (tx) => {
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${t.puntoPrograma.orden}), 0)` }).from(t.puntoPrograma).where(eq(t.puntoPrograma.revisionId, revisionId));
    const [p] = await tx.insert(t.puntoPrograma).values({ ...datos, revisionId, orden: Number(max) + 1 }).returning({ id: t.puntoPrograma.id });
    await registrarEvento(tx, { entidad: "punto_programa", entidadId: p.id, tipo: "punto_agregado", actor: r.email, payload: { ...puntoParaEvento(datos), revision_id: revisionId } });
  });
  redirect(`/app/revisiones/${revisionId}`);
});

export const editarPunto = accion(async (puntoId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const p = await puntoDelRevisor(r.id, puntoId);
  if (!p) throw new ErrorDeValidacion("El punto no existe.");
  if (p.revision.estado === "informe_emitido") throw new ErrorDeValidacion("El informe ya fue emitido: el programa no se puede cambiar.");
  const datos = datosPunto(fd);
  await db.transaction(async (tx) => {
    await tx.update(t.puntoPrograma).set(datos).where(eq(t.puntoPrograma.id, puntoId));
    await registrarEvento(tx, {
      entidad: "punto_programa", entidadId: puntoId, tipo: "punto_editado", actor: r.email,
      payload: { antes: { codigo: p.punto.codigo, titulo: p.punto.titulo, texto: p.punto.texto, origen_normativo: p.punto.origenNormativo }, despues: puntoParaEvento(datos) },
    });
  });
  redirect(`/app/puntos/${puntoId}`);
});

export async function moverPunto(puntoId: string, direccion: "arriba" | "abajo") {
  const r = await revisorActual();
  const p = await puntoDelRevisor(r.id, puntoId);
  if (!p || p.revision.estado === "informe_emitido") return;
  const revisionId = p.revision.id;
  await db.transaction(async (tx) => {
    const puntos = await tx.select({ id: t.puntoPrograma.id, orden: t.puntoPrograma.orden }).from(t.puntoPrograma)
      .where(eq(t.puntoPrograma.revisionId, revisionId)).orderBy(asc(t.puntoPrograma.orden), asc(t.puntoPrograma.codigo));
    const i = puntos.findIndex((x) => x.id === puntoId);
    const j = direccion === "arriba" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= puntos.length) return;
    [puntos[i], puntos[j]] = [puntos[j], puntos[i]];
    // Se renumera todo: así el orden queda siempre 1..n aunque hubiera huecos.
    for (const [k, x] of puntos.entries()) {
      if (x.orden !== k + 1) await tx.update(t.puntoPrograma).set({ orden: k + 1 }).where(eq(t.puntoPrograma.id, x.id));
    }
    await registrarEvento(tx, { entidad: "punto_programa", entidadId: puntoId, tipo: "punto_reordenado", actor: r.email, payload: { direccion, orden_nuevo: j + 1 } });
  });
  revalidatePath(`/app/revisiones/${revisionId}`);
}

// ---------- requerimientos ----------

type ItemEntrada = { punto_programa_id: string; descripcion: string; vence_en: string; responsable_email: string };

export const crearRequerimiento = accion(async (revisionId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const rev = await revisionDelRevisor(r.id, revisionId);
  if (!rev) throw new ErrorDeValidacion("La revisión no existe.");
  if (rev.revision.estado === "informe_emitido") throw new ErrorDeValidacion("La revisión ya tiene el informe emitido.");
  const titulo = texto(fd, "titulo", "el título", { opcional: true, max: 200 }) || null;

  let items: ItemEntrada[];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    throw new ErrorDeValidacion("No se pudieron leer los ítems. Volvé a intentar.");
  }
  if (!Array.isArray(items) || items.length === 0) throw new ErrorDeValidacion("Elegí al menos un punto y pedí al menos un archivo.");

  const puntos = await db.select({ id: t.puntoPrograma.id, codigo: t.puntoPrograma.codigo }).from(t.puntoPrograma).where(eq(t.puntoPrograma.revisionId, revisionId));
  const validos = new Map(puntos.map((p) => [p.id, p.codigo]));
  const limpios = items.map((it, i) => {
    const n = `El ítem ${i + 1}`;
    const codigo = validos.get(String(it.punto_programa_id));
    if (!codigo) throw new ErrorDeValidacion(`${n} no corresponde a un punto de esta revisión.`);
    const descripcion = String(it.descripcion ?? "").trim();
    if (!descripcion) throw new ErrorDeValidacion(`${n} (${codigo}) no dice qué archivo se pide.`);
    const vence = String(it.vence_en ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vence) || Number.isNaN(Date.parse(vence))) throw new ErrorDeValidacion(`${n} (${codigo}) no tiene fecha de vencimiento.`);
    const mail = String(it.responsable_email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new ErrorDeValidacion(`${n} (${codigo}) no tiene un mail de responsable válido.`);
    return { puntoProgramaId: String(it.punto_programa_id), descripcion: descripcion.slice(0, 1000), venceEn: vence, responsableEmail: mail };
  });

  const id = await db.transaction(async (tx) => {
    const [{ siguiente }] = await tx.select({ siguiente: sql<number>`coalesce(max(${t.requerimiento.numero}), 0) + 1` })
      .from(t.requerimiento).where(eq(t.requerimiento.revisionId, revisionId));
    const [q] = await tx.insert(t.requerimiento).values({
      revisionId, numero: Number(siguiente), titulo, tokenPortal: nuevoToken(),
      tokenExpiraEn: sql`now() + make_interval(days => ${DIAS_VIGENCIA_TOKEN})` as unknown as Date,
    }).returning({ id: t.requerimiento.id, numero: t.requerimiento.numero });
    // Uno por uno y con clock_timestamp(): now() es el mismo para toda la
    // transacción y se perdería el orden en que el revisor armó los ítems.
    const creados: { id: string }[] = [];
    for (const x of limpios) {
      const [c] = await tx.insert(t.requerimientoItem).values({ ...x, requerimientoId: q.id, creadoEn: sql`clock_timestamp()` as unknown as Date }).returning({ id: t.requerimientoItem.id });
      creados.push(c);
    }
    await registrarEvento(tx, { entidad: "requerimiento", entidadId: q.id, tipo: "requerimiento_creado", actor: r.email, payload: { numero: q.numero, titulo, items: creados.length, revision_id: revisionId } });
    if (rev.revision.estado === "planificada") {
      await tx.update(t.revision).set({ estado: "en_curso" }).where(eq(t.revision.id, revisionId));
      await registrarEvento(tx, { entidad: "revision", entidadId: revisionId, tipo: "estado_cambiado", actor: r.email, payload: { de: "planificada", a: "en_curso" }, motivo: `Requerimiento Nº ${q.numero}` });
    }
    return q.id;
  });
  redirect(`/app/requerimientos/${id}`);
});

export async function marcarEnviado(requerimientoId: string) {
  const r = await revisorActual();
  const q = await requerimientoDelRevisor(r.id, requerimientoId);
  if (!q || q.requerimiento.enviadoEn) return;
  await db.transaction(async (tx) => {
    await tx.update(t.requerimiento).set({ enviadoEn: sql`now()` as unknown as Date }).where(eq(t.requerimiento.id, requerimientoId));
    await registrarEvento(tx, { entidad: "requerimiento", entidadId: requerimientoId, tipo: "requerimiento_enviado", actor: r.email, payload: { numero: q.requerimiento.numero } });
  });
  revalidatePath(`/app/requerimientos/${requerimientoId}`);
}

// ---------- revisión de ítems ----------

export const aceptarItem = accion(async (itemId: string, _prev: Estado, _fd: FormData) => {
  const r = await revisorActual();
  const i = await itemDelRevisor(r.id, itemId);
  if (!i) throw new ErrorDeValidacion("El ítem no existe.");
  if (i.item.estado !== "respondido") throw new ErrorDeValidacion("Solo se puede aceptar un ítem respondido.");
  await db.transaction(async (tx) => {
    await tx.update(t.requerimientoItem).set({ estado: "aceptado" }).where(eq(t.requerimientoItem.id, itemId));
    await registrarEvento(tx, { entidad: "requerimiento_item", entidadId: itemId, tipo: "item_aceptado", actor: r.email, payload: { de: i.item.estado, a: "aceptado" } });
  });
  revalidatePath(`/app/requerimientos/${i.requerimiento.id}`);
  return null;
});

export const rechazarItem = accion(async (itemId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const i = await itemDelRevisor(r.id, itemId);
  if (!i) throw new ErrorDeValidacion("El ítem no existe.");
  if (i.item.estado !== "respondido") throw new ErrorDeValidacion("Solo se puede rechazar un ítem respondido.");
  const motivo = texto(fd, "motivo", "qué falta o qué hay que mandar", { max: 1000 });
  await db.transaction(async (tx) => {
    await tx.update(t.requerimientoItem).set({ estado: "rechazado" }).where(eq(t.requerimientoItem.id, itemId));
    await registrarEvento(tx, { entidad: "requerimiento_item", entidadId: itemId, tipo: "item_rechazado", actor: r.email, payload: { de: i.item.estado, a: "rechazado" }, motivo });
  });
  revalidatePath(`/app/requerimientos/${i.requerimiento.id}`);
  return null;
});

// ---------- conclusiones ----------

const RESULTADOS = ["cumple", "cumple_parcialmente", "no_cumple"] as const;

export const guardarConclusion = accion(async (puntoId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const p = await puntoDelRevisor(r.id, puntoId);
  if (!p) throw new ErrorDeValidacion("El punto no existe.");
  if (p.revision.estado === "informe_emitido") throw new ErrorDeValidacion("El informe de esta revisión ya fue emitido. Las conclusiones no se pueden cambiar.");
  const resultado = String(fd.get("resultado") ?? "") as (typeof RESULTADOS)[number];
  if (!RESULTADOS.includes(resultado)) throw new ErrorDeValidacion("Elegí el resultado: cumple, cumple parcialmente o no cumple.");
  const fundamento = texto(fd, "fundamento", "el fundamento", { max: 20000 });
  if (fundamento.length < 20) throw new ErrorDeValidacion("El fundamento tiene que tener al menos 20 caracteres. Sin fundamento no hay conclusión.");
  const elegidas = [...new Set(fd.getAll("evidencias").map(String))];
  const basadaEn = uuid(fd.get("basada_en"));

  const validas = new Set((await evidenciasDePunto(puntoId)).map((e) => e.evidencia.id));
  if (elegidas.some((id) => !validas.has(id))) throw new ErrorDeValidacion("Una de las evidencias marcadas no corresponde a este punto.");

  await db.transaction(async (tx) => {
    // Bloquea el punto: dos correcciones simultáneas no pueden partir de la misma conclusión.
    await tx.select({ id: t.puntoPrograma.id }).from(t.puntoPrograma).where(eq(t.puntoPrograma.id, puntoId)).for("update");
    const vigentes = await tx.select({ id: t.conclusionVigente.id }).from(t.conclusionVigente).where(eq(t.conclusionVigente.puntoProgramaId, puntoId));
    const actual = vigentes[0]?.id ?? null;
    if (actual !== basadaEn) throw new ErrorDeValidacion("La conclusión cambió mientras la editabas. Recargá la página y revisala antes de guardar.");

    const [c] = await tx.insert(t.conclusion).values({ puntoProgramaId: puntoId, resultado, fundamento, autorId: r.id, reemplazaA: actual }).returning({ id: t.conclusion.id });
    if (elegidas.length) await tx.insert(t.conclusionEvidencia).values(elegidas.map((evidenciaId) => ({ conclusionId: c.id, evidenciaId })));
    await registrarEvento(tx, {
      entidad: "conclusion", entidadId: c.id, tipo: actual ? "conclusion_corregida" : "conclusion_emitida", actor: r.email,
      payload: { punto_programa_id: puntoId, codigo: p.punto.codigo, resultado, evidencias: elegidas, reemplaza_a: actual },
    });
    await actualizarEstadoRevision(tx, p.revision.id, r.email);
  });
  revalidatePath(`/app/puntos/${puntoId}`);
  return { ok: "Conclusión guardada." };
});

// ---------- observaciones ----------

export const crearObservacion = accion(async (puntoId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const p = await puntoDelRevisor(r.id, puntoId);
  if (!p) throw new ErrorDeValidacion("El punto no existe.");
  const textoObs = texto(fd, "texto", "qué está mal", { max: 5000 });
  const recomendacion = texto(fd, "recomendacion", "la recomendación", { max: 5000 });
  const plazo = fechaISO(fd, "plazo", "el plazo", { opcional: true });
  await db.transaction(async (tx) => {
    const [o] = await tx.insert(t.observacion).values({ revisionId: p.revision.id, puntoProgramaId: puntoId, texto: textoObs, recomendacion, plazo }).returning({ id: t.observacion.id });
    await registrarEvento(tx, { entidad: "observacion", entidadId: o.id, tipo: "observacion_creada", actor: r.email, payload: { punto_programa_id: puntoId, codigo: p.punto.codigo, plazo } });
  });
  revalidatePath(`/app/puntos/${puntoId}`);
  return { ok: "Observación creada." };
});

/** Cambiar el estado de una observación es insertar una fila nueva que la reemplaza. */
export async function cambiarEstadoObservacion(observacionId: string, estado: "subsanada" | "no_subsanada" | "abierta") {
  const r = await revisorActual();
  const o = await observacionDelRevisor(r.id, observacionId);
  if (!o || !["subsanada", "no_subsanada", "abierta"].includes(estado)) return;
  await db.transaction(async (tx) => {
    const [vig] = await tx.select({ id: t.observacionVigente.id }).from(t.observacionVigente).where(eq(t.observacionVigente.id, observacionId));
    if (!vig) return; // ya fue reemplazada
    const v = o.observacion;
    const [n] = await tx.insert(t.observacion).values({
      revisionId: v.revisionId, puntoProgramaId: v.puntoProgramaId, texto: v.texto, recomendacion: v.recomendacion, plazo: v.plazo,
      estado, observacionOrigenId: v.observacionOrigenId, reemplazaA: v.id,
    }).returning({ id: t.observacion.id });
    await registrarEvento(tx, { entidad: "observacion", entidadId: n.id, tipo: "observacion_estado", actor: r.email, payload: { de: v.estado, a: estado, reemplaza_a: v.id } });
  });
  revalidatePath(`/app/revisiones/${o.revision.id}/observaciones`);
}

/** Trae a esta revisión una observación abierta de la anterior, vinculada a su origen. */
export const arrastrarObservacion = accion(async (revisionId: string, observacionId: string, _prev: Estado, fd: FormData) => {
  const r = await revisorActual();
  const rev = await revisionDelRevisor(r.id, revisionId);
  const o = await observacionDelRevisor(r.id, observacionId);
  if (!rev || !o || o.revision.id !== rev.revision.revisionAnteriorId) throw new ErrorDeValidacion("La observación no corresponde a la revisión anterior.");
  const puntoId = uuid(fd.get("punto_programa_id"));
  const [punto] = puntoId ? await db.select().from(t.puntoPrograma).where(and(eq(t.puntoPrograma.id, puntoId), eq(t.puntoPrograma.revisionId, revisionId))) : [];
  if (!punto) throw new ErrorDeValidacion("Elegí a qué punto de esta revisión corresponde.");
  await db.transaction(async (tx) => {
    const [n] = await tx.insert(t.observacion).values({
      revisionId, puntoProgramaId: punto.id, texto: o.observacion.texto, recomendacion: o.observacion.recomendacion, plazo: o.observacion.plazo,
      observacionOrigenId: o.observacion.id,
    }).returning({ id: t.observacion.id });
    await registrarEvento(tx, { entidad: "observacion", entidadId: n.id, tipo: "observacion_arrastrada", actor: r.email, payload: { observacion_origen_id: o.observacion.id, codigo: punto.codigo } });
  });
  revalidatePath(`/app/revisiones/${revisionId}/observaciones`);
  return null;
});

// ---------- emisión del informe ----------

export const emitirInforme = accion(async (revisionId: string, _prev: Estado, _fd: FormData) => {
  const r = await revisorActual();
  const rev = await revisionDelRevisor(r.id, revisionId);
  if (!rev) throw new ErrorDeValidacion("La revisión no existe.");
  if (rev.revision.estado === "informe_emitido") return null;
  const f = faltantes(await resumenPrograma(revisionId));
  if (f.length) throw new ErrorDeValidacion(`Todavía no se puede emitir: ${f.map((x) => `${x.codigo} ${x.problema.toLowerCase()}`).join(" ")}`);
  await db.transaction(async (tx) => {
    await tx.update(t.revision).set({ estado: "informe_emitido" }).where(eq(t.revision.id, revisionId));
    await registrarEvento(tx, { entidad: "revision", entidadId: revisionId, tipo: "informe_emitido", actor: r.email, payload: { de: rev.revision.estado, a: "informe_emitido" } });
  });
  revalidatePath(`/app/revisiones/${revisionId}`);
  return { ok: "Informe emitido." };
});
