# Sigilo

*Cada evidencia, sellada y con fecha.*

Plataforma de trabajo para revisores externos independientes (REI) ante la UIF.

## Levantarlo en local

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env          # completá AUTH_SECRET y el hash de la clave
node scripts/hash-clave.mjs 'tu-contraseña'
npm run dev
```

Abrí http://localhost:3000 e ingresá con el mail y la contraseña de prueba.
