type Valores = { codigo?: string; titulo?: string; texto?: string; origenNormativo?: string };

export function CamposPunto({ valores = {}, sugerido }: { valores?: Valores; sugerido?: string }) {
  return (
    <>
      <div className="rejilla rejilla-3">
        <div className="campo">
          <label htmlFor="codigo">Código</label>
          <input id="codigo" name="codigo" type="text" className="dato" required defaultValue={valores.codigo ?? sugerido} />
        </div>
        <div className="campo" style={{ gridColumn: "span 2" }}>
          <label htmlFor="titulo">Título</label>
          <input id="titulo" name="titulo" type="text" required defaultValue={valores.titulo} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="texto">Qué verificar</label>
        <textarea id="texto" name="texto" required defaultValue={valores.texto} />
      </div>
      <div className="campo">
        <label htmlFor="origen_normativo">Origen normativo</label>
        <input id="origen_normativo" name="origen_normativo" type="text" className="dato" required defaultValue={valores.origenNormativo} aria-describedby="origen-ayuda" />
        <span id="origen-ayuda" className="ayuda">Artículo e inciso de la resolución. Citá solo lo que leíste en el texto de la norma.</span>
      </div>
    </>
  );
}
