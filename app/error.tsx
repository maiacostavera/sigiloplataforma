"use client";

// Un error inesperado nunca muestra un stack trace: solo qué hacer.
export default function ErrorInesperado({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="contenedor" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div className="pila" style={{ maxWidth: 480 }}>
        <h1>Algo salió mal</h1>
        <p className="secundario">
          No se pudo completar la operación. Lo que ya estaba guardado sigue intacto: ninguna evidencia ni conclusión se pierde por un error de pantalla.
        </p>
        {error.digest && <p className="secundario" style={{ fontSize: 13 }}>Código para soporte: <span className="dato">{error.digest}</span></p>}
        <div className="fila">
          <button className="btn btn-primario" onClick={reset}>Reintentar</button>
          <a href="/app" className="btn btn-secundario">Ir a Mis expedientes</a>
        </div>
      </div>
    </main>
  );
}
