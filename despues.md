# Para después

Ideas que aparecieron durante las tres semanas y quedaron afuera a propósito.
No se implementan sin decisión explícita.

## Fuera de alcance por decisión
- Ingesta de evidencias por mail.
- Informe en PDF (enero).
- Multi-tenant y equipos del revisor.
- Recordatorios automáticos y notificaciones (incluido el envío del link por mail).
- Roles finos.
- Firma digital.
- Integraciones por API.

## Surgidas durante la construcción
- Verificar la huella al descargar una evidencia y mostrar "el archivo guardado
  coincide con su huella" en la pantalla del sello (hoy se verifica al armar el
  expediente; si no coincide, el expediente no se genera).
- Generar el ZIP del expediente en streaming: hoy se arma en memoria, lo que
  pone un techo práctico con muchas evidencias de 50 MB.
- Subida desde el portal con barra de progreso (hoy es un POST común, que
  funciona sin JavaScript pero no muestra avance).
- Reenviar el link del portal / regenerar el token cuando vence.
- Carga de evidencias por el propio revisor (`origen = carga_revisor`): el
  esquema y la recepción ya lo soportan, falta la pantalla.
- Mostrar al revisado los comentarios que ya dejó en cada ítem.
- Cargar el programa completo de entidades cambiarias con las citas
  normativas verificadas contra el texto de la Res. UIF 14/2023.
