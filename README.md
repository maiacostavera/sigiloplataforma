# Sigilo

*Cada evidencia, sellada y con fecha.*

Plataforma de trabajo para revisores externos independientes (REI) ante la UIF.
No es un gestor de tareas: es un expediente con cadena de custodia. Toda
evidencia queda con su huella SHA-256 y la fecha del servidor, y la base
rechaza cualquier intento de modificarla o borrarla.

## Qué hace

| Pantalla | Ruta |
|---|---|
| Login | `/login` |
| Mis expedientes (vence en menos de 30 días arriba) | `/app` |
| Expediente: revisiones año por año | `/app/sujetos/[id]` |
| Revisión: Programa / Requerimientos / Observaciones | `/app/revisiones/[id]` |
| Punto de programa: evidencias, conclusión, historial, observaciones | `/app/puntos/[id]` |
| Requerimiento: ítems, link del portal, aceptar o rechazar | `/app/requerimientos/[id]` |
| **Evidencia: la pantalla del sello** | `/app/evidencias/[id]` |
| **Portal del sujeto obligado** (público, por token) | `/portal/[token]` |
| Vencimientos de todos los clientes | `/app/vencimientos` |
| Expediente para la UIF (ZIP) | botón en la revisión |

## Levantarlo en local

Requisitos: Node 20 o superior y PostgreSQL 14 o superior.

### 1. La base

Un rol dueño (solo para migraciones) y la base:

```sql
create role sigilo_dueno login password 'elegí-una' createrole createdb;
create database sigilo owner sigilo_dueno;
```

`createrole` hace falta porque la migración crea el rol `app_sigilo`, que es
con el que se conecta la aplicación. `createdb`, solo para los tests.

### 2. La aplicación

```bash
npm install
cp .env.example .env     # completá AUTH_SECRET y las URLs de la base
npm run db:migrar        # como dueño: tablas, vistas, triggers y permisos
npm run db:seed          # revisor de prueba
npm run dev
```

Abrí http://localhost:3000 e ingresá con `SEED_EMAIL` / `SEED_CLAVE`.

### 3. Tests

```bash
npm test
```

Recrean una base `sigilo_test` y prueban:

- **inmutabilidad**: UPDATE y DELETE sobre `evidencia`, `conclusion`,
  `observacion` y `evento` fallan, como `app_sigilo` y como dueño; una
  corrección con `reemplaza_a` deja vigente solo la nueva;
- **portal**: un token da acceso a un único requerimiento; un `item_id` de
  otro requerimiento, de la misma revisión o de otro revisor, no existe;
- **recepción**: huella, fila, evento y estado, en ese orden; limpieza del
  storage si falla la base; límite de 50 MB;
- **emisión**: el informe solo se habilita con todas las conclusiones y sus
  evidencias;
- **expediente**: el ZIP verifica con `sha256sum -c` y el HTML no tiene
  JavaScript ni recursos externos.

## Variables de entorno

Ver `.env.example`. Las principales:

| Variable | Para qué |
|---|---|
| `AUTH_SECRET` | firma de la sesión |
| `DATABASE_URL` | conexión **como `app_sigilo`**. Nunca el dueño |
| `DATABASE_URL_DUENO` | solo migraciones y tests |
| `STORAGE_DRIVER` | `local` (carpeta `ALMACEN_DIR`) o `s3` |
| `S3_*` | bucket S3-compatible (AWS, R2, MinIO…) |

## Desplegarlo

Cualquier hosting de Node con Postgres sirve (por ejemplo Vercel + Neon o
Supabase + Cloudflare R2):

1. Crear la base y el rol dueño como en el paso 1.
2. `DATABASE_URL_DUENO=… npm run db:migrar` desde tu máquina.
3. `alter role app_sigilo password '…';` con una contraseña real.
4. Configurar las variables (`STORAGE_DRIVER=s3` y las `S3_*`) y desplegar.
5. `DATABASE_URL=… SEED_EMAIL=… SEED_CLAVE=… npm run db:seed` para el primer revisor.

## Inmutabilidad

Las migraciones están en `/drizzle`, en SQL escrito a mano. Las tablas
inmutables están protegidas dos veces:

- **`revoke update, delete`** para `app_sigilo`: es lo que de verdad lo impide.
- **trigger `no_tocar`**: falla con un mensaje claro aunque se conecte el dueño.

La aplicación se conecta como `app_sigilo`. Si se la conecta como el dueño o
como superusuario, la primera protección deja de existir.

## El programa de trabajo

`/data/programas/<sector>.json`. Los `___` de `origen_normativo` son a
propósito: ninguna cita normativa entra sin haberla leído en el texto de la
resolución.
