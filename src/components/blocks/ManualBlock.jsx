import React, { useState } from 'react';

// MANUAL EMPATÍA — BOOK(RM) — El Maltés
// Derivación Semilla v2.0: tono editorial, densidad media, contraste normal
// Paleta: fondo #FBF9F5, superficie #F2ECE1, borde #E2D7C5, principal #1C1917, secundario #625952, acento #274C3C

const TOKENS = {
  fondo: '#FBF9F5',
  superficie: '#F2ECE1',
  borde: '#E2D7C5',
  principal: '#1C1917',
  secundario: '#625952',
  acento: '#274C3C',
  exito: '#2D6A4F',
  alerta: '#C07D2B',
  error: '#9E2A2B',
};

const marcadores = [
  { cmd: '$autor X', que: 'filtra por autor', ej: '$autor borges' },
  { cmd: '$editorial X', que: 'filtra por editorial', ej: '$editorial emecé' },
  { cmd: '$materia X', que: 'filtra por materia (CDU/término)', ej: '$materia cocina' },
  { cmd: '$titulo X', que: 'filtra por título', ej: '$titulo rayuela' },
  { cmd: '$editoriales X', que: 'agrega: en qué editoriales está el título X', ej: '$editoriales rayuela', highlight: true },
  { cmd: '$autor X $editorial Y', que: 'intersección AND de dos campos', ej: '$autor borges $editorial emecé', highlight: true },
  { cmd: '$ayuda', que: 'devuelve este manual inline', ej: '$ayuda' },
];

export function ManualBlock() {
  return ManualBlockInner();
}
function ManualBlockInner() {
  const [toast, setToast] = useState('');
  const copy = (t) => {
    navigator.clipboard.writeText(t);
    setToast(`Copiado: ${t}`);
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div style={{ background: TOKENS.fondo, color: TOKENS.principal, minHeight: '100%', padding: '24px', fontFamily: 'Inter, Source Sans 3, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,ital,wght@6..72,0..1,400;6..72,0..1,600;6..72,1,400&family=Lora:wght@500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .serif { font-family: 'Newsreader', 'Lora', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 820, margin: '0 auto 32px', borderBottom: `1px solid ${TOKENS.borde}`, paddingBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.secundario }} className="mono">
          <span>BOOK(RM) — El Maltés — Rosario</span>
          <span style={{ background: TOKENS.acento, color: '#fff', padding: '3px 8px', borderRadius: 999, fontSize: 9 }}>MANUAL VIVO</span>
        </div>
        <h1 className="serif" style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 600, margin: '18px 0 8px', letterSpacing: '-0.02em' }}>
          MANUAL DE USO — <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Empatía</span>
        </h1>
        <p style={{ color: TOKENS.secundario, fontSize: 14, lineHeight: 1.5, maxWidth: 640 }}>
          Chatbot de búsqueda semántica para el vendedor de mostrador. Prototipo: BOOK(RM), librería <b style={{ color: TOKENS.principal }}>El Maltés</b> (Rosario).
          Este documento es el manual vivo: se actualiza cada vez que se agrega un modo o un marcador.
        </p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 32 }}>

        {/* Qué es */}
        <section>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>1. Qué es</h2>
          <div style={{ background: TOKENS.superficie, border: `1px solid ${TOKENS.borde}`, borderRadius: 8, padding: '16px 18px', fontSize: 14, lineHeight: 1.6 }}>
            Empatía es el asistente de mostrador: recibe una consulta en lenguaje natural (máx. 300 caracteres) y devuelve recomendaciones con <b>stock real por local</b>.
            Además del lenguaje natural, acepta <span className="mono" style={{ background: TOKENS.principal, color: TOKENS.fondo, padding: '1px 6px', borderRadius: 4 }}>$marcadores</span>: rutas puras para consultas exactas e intersecciones que el lenguaje libre no puede expresar sin ambigüedad.
          </div>
        </section>

        {/* Modos */}
        <section>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>2. Modos de operación</h2>
          <div style={{ border: `1px solid ${TOKENS.borde}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px', background: TOKENS.superficie, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.secundario, padding: '10px 14px' }} className="mono">
              <span>Modo</span><span>Comportamiento</span><span>¿Usa LLM?</span>
            </div>
            {[
              { m: 'auto', d: 'clasifica la intención y enruta', llm: 'sí, si cae en venta' },
              { m: 'contenido', d: 'búsqueda semántica directa, digesto completo', llm: 'no' },
              { m: 'venta', d: 'fuerza el flujo con redacción LLM', llm: 'sí' },
            ].map(r => (
              <div key={r.m} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px', padding: '12px 14px', borderTop: `1px solid ${TOKENS.borde}`, fontSize: 14, alignItems: 'center' }}>
                <span className="mono" style={{ background: TOKENS.principal, color: TOKENS.fondo, padding: '2px 8px', borderRadius: 999, width: 'fit-content', fontSize: 12 }}>{r.m}</span>
                <span>{r.d}</span>
                <span style={{ fontSize: 12, color: r.llm === 'no' ? TOKENS.secundario : TOKENS.exito, border: `1px solid ${r.llm === 'no' ? TOKENS.borde : TOKENS.exito}`, padding: '2px 8px', borderRadius: 999, width: 'fit-content' }}>{r.llm}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Lenguaje natural */}
        <section>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>3. Lenguaje natural</h2>
          <div style={{ border: `1px solid ${TOKENS.borde}`, borderRadius: 8, overflow: 'hidden' }}>
            {[
              ['"¿tenés Rayuela?"', 'ficha puntual con sinopsis completa'],
              ['un EAN (10–14 dígitos)', 'ficha exacta por código'],
              ['"libros de Borges"', 'lista todos los libros del autor (stock real)'],
              ['"del estilo de Borges" / "parecido a Borges"', 'busca por biografía de autor (vector autor)'],
              ['"novela policial con detective"', 'recall semántico por sinopsis (vector digesto)'],
              ['"algo liviano para la playa"', 'recall exploratorio (digesto con más peso)'],
              ['"cocina", "Dune", "Anagrama" (1–2 palabras)', 'dato duro: título/autor/editorial/materia'],
            ].map(([q, h], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '11px 14px', borderTop: i ? `1px solid ${TOKENS.borde}` : 'none', background: i % 2 ? TOKENS.fondo : TOKENS.superficie, fontSize: 13.5 }}>
                <span className="mono" style={{ fontStyle: 'italic' }}>{q}</span>
                <span style={{ color: TOKENS.secundario }}>{h}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Marcadores */}
        <section>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>4. Marcadores $ — rutas puras</h2>
          <div style={{ borderLeft: `3px solid ${TOKENS.acento}`, background: TOKENS.superficie, padding: '12px 14px', borderRadius: '0 8px 8px 0', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            <b>Por qué existen:</b> no son un atajo a datos que el recall ya encuentra. Resuelven <b>consultas exactas e intersecciones</b> que la detección natural de §3 no puede resolver sin ambigüedad. El caso fuerte es la <b>intersección</b> (<span className="mono">$autor borges $editorial emecé</span>): un AND entre dos campos que el lenguaje libre no puede expresar sin un LLM de por medio.
            <div style={{ marginTop: 8, fontWeight: 600 }}>Regla de diseño: una consulta es o un comando $ o lenguaje natural — nunca los dos.</div>
          </div>

          <div style={{ border: `1px solid ${TOKENS.borde}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 200px', background: TOKENS.principal, color: TOKENS.fondo, padding: '10px 14px', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="mono">
              <span>Marcador</span><span>Qué hace</span><span>Ejemplo</span>
            </div>
            {marcadores.map(m => (
              <div key={m.cmd} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 200px', padding: '11px 14px', borderTop: `1px solid ${TOKENS.borde}`, background: m.highlight ? '#F0EDE6' : TOKENS.fondo, alignItems: 'center', gap: 12 }}>
                <button onClick={() => copy(m.cmd)} className="mono" style={{ textAlign: 'left', background: TOKENS.acento, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', width: 'fit-content' }}>{m.cmd}</button>
                <span style={{ fontSize: 13 }}>{m.que}</span>
                <span className="mono" style={{ fontSize: 12, color: TOKENS.secundario }}>{m.ej}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }} className="mono">Reglas</div>
              <ol style={{ paddingLeft: 16, color: TOKENS.secundario }}>
                <li><b style={{ color: TOKENS.principal }}>Ruta pura:</b> si empieza con $, se parsea completa como comando.</li>
                <li><b style={{ color: TOKENS.principal }}>Combinables por AND:</b> dos filtros se intersectan.</li>
                <li>Un solo filtro es el caso degenerado; su valor real aparece al combinar dos.</li>
                <li><span className="mono">$editoriales X</span> es la única salida agregada.</li>
                <li>Si un filtro no encuentra resultados, devuelve vacío sin caer al recall.</li>
              </ol>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, background: '#FFF8F0', border: `1px dashed ${TOKENS.borde}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }} className="mono">Qué NO es marcador (a propósito)</div>
              <div style={{ textDecoration: 'line-through', color: TOKENS.secundario }} className="mono">$ean → auto-detecta 10-14 dígitos</div>
              <div style={{ textDecoration: 'line-through', color: TOKENS.secundario }} className="mono">$intencion / $modo → viven en selector UI</div>
              <div style={{ textDecoration: 'line-through', color: TOKENS.secundario }} className="mono">$legacy → mezcla dónde buscar con dato</div>
            </div>
          </div>
        </section>

        {/* Ejemplos */}
        <section>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 12 }}>5. Ejemplos de uso</h2>
          <div style={{ background: TOKENS.principal, color: TOKENS.fondo, borderRadius: 8, padding: 16, fontSize: 12.5, lineHeight: 1.8 }} className="mono">
            <div><span style={{ color: TOKENS.exito }}>$autor borges</span> <span style={{ color: '#8B8A89' }}>→ filtro exacto por autor (sin LLM)</span></div>
            <div><span style={{ color: TOKENS.exito }}>$editorial emecé</span> <span style={{ color: '#8B8A89' }}>→ todo lo de Emecé</span></div>
            <div><span style={{ color: TOKENS.exito }}>$materia cocina</span> <span style={{ color: '#8B8A89' }}>→ libros con esa materia</span></div>
            <div><span style={{ color: TOKENS.exito }}>$editoriales rayuela</span> <span style={{ color: '#8B8A89' }}>→ Alfaguara, Sudamericana, Cátedra… (agregado)</span></div>
            <div><span style={{ color: '#E8C170' }}>$autor borges $editorial emecé</span> <span style={{ color: '#8B8A89' }}>→ intersección: Borges publicado por Emecé</span></div>
            <div><span style={{ color: '#E8C170' }}>$titulo rayuela $editorial sudamericana</span> <span style={{ color: '#8B8A89' }}>→ edición puntual de una editorial</span></div>
          </div>
        </section>

        {/* Config y estado */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
          <div>
            <h2 className="serif" style={{ fontSize: 18, marginBottom: 8 }}>6. Configuración</h2>
            <div style={{ border: `1px solid ${TOKENS.borde}`, borderRadius: 8, padding: 12, fontSize: 12.5, background: TOKENS.superficie }}>
              <div className="mono" style={{ fontSize: 11, color: TOKENS.secundario, marginBottom: 6 }}>backend/src/services/markerRouter.js</div>
              <div>COLUMNAS (marcador → columna) y AYUDA (descripciones). Sumar un marcador = agregar entrada en ambos + su resolver.</div>
              <div style={{ marginTop: 8, color: TOKENS.secundario }}>El manual MANUAL_EMPATIA.md se actualiza a la par.</div>
            </div>
          </div>
          <div>
            <h2 className="serif" style={{ fontSize: 18, marginBottom: 8 }}>7. Estado</h2>
            <div style={{ border: `1px solid ${TOKENS.borde}`, borderRadius: 8, padding: 12, fontSize: 12.5 }}>
              <div>✅ Identidad (24.083 filas) — embeddings regenerados</div>
              <div>✅ Autor biografía (8.142 filas)</div>
              <div>✅ Digesto (sinopsis): embeddings regenerados (24.059 filas)</div>
              <div>✅ Marcadores: backend + frontend</div>
            </div>
          </div>
        </section>

        {/* $semilla_confirmar */}
        <div style={{ borderTop: `1px solid ${TOKENS.borde}`, paddingTop: 16, fontSize: 10.5, color: TOKENS.secundario }} className="mono">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>SEMILLA_ARTISTICA v2.0 — derivación determinista — editorial / media / #274C3C</span>
            <button onClick={() => copy(`tailwind.config: fondo ${TOKENS.fondo}, acento ${TOKENS.acento}`)} style={{ background: TOKENS.principal, color: TOKENS.fondo, border: 'none', padding: '4px 10px', borderRadius: 999, cursor: 'pointer' }}>Copiar tokens</button>
          </div>
        </div>

      </div>

      {toast && <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: TOKENS.principal, color: TOKENS.fondo, padding: '8px 14px', borderRadius: 999, fontSize: 12 }} className="mono">{toast}</div>}
    </div>
  );
}
export default ManualBlock;
