# Sigilo

*Cada evidencia, sellada y con fecha.*

Plataforma de trabajo para revisores externos independientes (REI) ante la UIF.

## Levantarlo en local

Requisitos: Node 20 o superior y PostgreSQL 14 o superior.

### 1. La base

Un rol dueño (solo para migraciones) y la base:

```sql
create role sigilo_dueno login password 'elegí-una' createrole createdb;
create database sigilo owner sigilo_dueno;
```

`createrole` hace falta porque la migración crea el rol `app_sigilo`, que es
con el que se conecta la aplicación. `createdb` solo para los tests.

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

Recrean una base `sigilo_test` y prueban, entre otras cosas, que `evidencia`,
`conclusion`, `observacion` y `evento` no se pueden modificar ni borrar.

## Inmutabilidad

Las migraciones están en `/drizzle`, en SQL escrito a mano. Las tablas
inmutables están protegidas dos veces:

- **`revoke update, delete`** para `app_sigilo`: es lo que de verdad lo impide.
- **trigger `no_tocar`**: falla con un mensaje claro aunque se conecte el dueño.

La aplicación se conecta como `app_sigilo`. Si se la conecta como el dueño o
como superusuario, la primera protección deja de existir.
