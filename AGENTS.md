# SIGILO

Plataforma de trabajo para revisores externos independientes (REI) inscriptos
ante la UIF argentina. El revisor audita el sistema de prevención de lavado de
dinero de empresas obligadas por ley, y tiene que poder demostrar años después
qué revisó, cuándo, y con qué archivo.

Sigilo = sigillum, el sello. Bajada: "Cada evidencia, sellada y con fecha."

NO es un gestor de tareas. Es un expediente con cadena de custodia.
Todo el valor está en que el rastro no se pueda alterar.

## Stack
Next.js (App Router) + TypeScript + PostgreSQL + Drizzle.
Auth con proveedor externo. Archivos en storage S3-compatible.
Tailwind SOLO con los tokens propios (ver abajo). Sin librerías de UI.

## Invariantes — nunca los rompas, ni para "simplificar"

1. `evidencia`, `conclusion`, `observacion` y `evento` son append-only.
   No escribas UPDATE ni DELETE sobre ellas: la base los rechaza. Si te hace
   falta, estás modelando mal. Una corrección es un INSERT nuevo con
   `reemplaza_a` apuntando a la fila anterior.
2. Todas las fechas de registro las pone Postgres con `default now()`.
   Nunca aceptes una fecha que venga del cliente.
3. El SHA-256 se calcula al recibir el archivo, ANTES de guardarlo.
4. Toda consulta del revisor filtra por `revisor_id`. Siempre.
5. El portal del revisado accede por token: ve UN requerimiento, el suyo, y
   nada más.
6. La app se conecta a Postgres como el rol `app_sigilo`, nunca como superusuario.
7. Todo cambio de estado escribe una fila en `evento`.

## Diseño — papel, tinta y lacre

Tema CLARO por defecto. El usuario imprime y manda capturas.

Colores: SOLO los tokens de /styles/tokens.css. Papel #FAF8F4, tinta #14181F,
lacre #7A1F1C. El lacre es marca y sello únicamente: nunca botones, nunca
estados. Estados con texto + color, nunca solo color.

Fuentes: Instrument Sans (interfaz), IBM Plex Mono (TODO dato: huellas, CUITs,
fechas, códigos, tamaños), Newsreader (solo el expediente generado).

Radios 3/6/10 px. Bordes de 1 px, no sombras difusas.
Tablas antes que tarjetas, salvo en el portal del revisado.

PROHIBIDO, aunque parezca más rápido:
- la paleta por defecto de Tailwind (slate, indigo, gray…)
- shadcn, Radix, MUI, Ant, Bootstrap
- Lucide, Heroicons, Font Awesome (íconos SVG propios, trazo 1.75)
- Chart.js, Recharts, Framer Motion, GSAP, particles.js
- Inter, Roboto
- emojis como íconos
- degradados violeta-azul, vidrio esmerilado, sombras grandes
- textos de relleno con "IA", chispas, o métricas inventadas

Hay UNA sola animación en todo el producto: el estampado del sello en la
pantalla de evidencia. Nada más se mueve.

## Cómo trabajamos

- Una rama por incremento: `feat/NN-descripcion`.
- Commits chicos y en castellano.
- No agregues funciones que no estén pedidas. Si se te ocurre algo bueno,
  anotalo en `despues.md` y seguí.
- Antes de implementar un cambio de diseño, explicámelo y esperá el visto bueno.
- Después de cada incremento: abrilo en el navegador, leé la consola, probá
  el flujo completo, y MEDÍ los elementos en vez de estimarlos a ojo.
- Al terminar, decime qué quedó andando y qué falta.
- Español en la UI, en los nombres de tabla y en los comentarios.
