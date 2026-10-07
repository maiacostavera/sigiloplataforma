# Cambios

## 1.0.0 — 07/10/2026

Primera versión completa de Sigilo.

- **Cimientos:** Next.js, tokens de papel, tinta y lacre, las tres fuentes y login.
- **Esquema:** tablas, vistas, inmutabilidad en la base (revoke + trigger) y rol `app_sigilo`.
- **Expedientes:** sujetos obligados, revisiones con aviso de hueco y programa de trabajo.
- **Requerimientos:** armado con evidencia sugerida y token del portal a 90 días.
- **Portal del sujeto obligado:** acceso por token a un único requerimiento.
- **Evidencia:** recepción con SHA-256 antes de guardar y la pantalla del sello.
- **Conclusiones:** correcciones append-only con historial, observaciones y emisión del informe.
- **Vencimientos y expediente para la UIF:** ZIP con HTML autocontenido y `verificacion.txt`.
- **Deploy en Vercel:** migraciones en el build y control de que la app conecte como `app_sigilo`.
