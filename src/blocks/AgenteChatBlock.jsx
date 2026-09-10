// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: El Secretario. Panel lateral persistente y contextual: recibe el
//   JSON de lo que estas viendo (remito, venta, cliente) sin que tengas que
//   aclararlo. Soporta marcadores $ y lenguaje natural con streaming SSE.

import { useEffect, useState } from 'react';
import useAgenteStream from '../hooks/useAgenteStream';
import { useAppContext } from '../AppContext';
import DebugTag from '../ui/DebugTag';

// Render legible de los resultados estructurados del agente.
function ResultadoBlock({ resultado }) {
  if (!resultado) return null;
  if (resultado.ruta === 'herramientas' && Array.isArray(resultado.pasos)) {
    return (
      <div className="space-y-2">
        {resultado.pasos.map((p, i) => <ResultadoBlock key={i} resultado={p.resultado} />)}
      </div>
    );
  }
  if (resultado.modo === 'remito_creado') {
    return (
      <div>
        <div className="font-medium">Remito #{resultado.remitoId} · {resultado.proveedor}</div>
        <div className="text-xs text-muted mb-1">criterio: stock ≤ {resultado.criterio.maxStock} · {resultado.criterio.cantidadSugerida}</div>
        {resultado.items.map((a) => (
          <div key={a.ean13} className="text-xs py-0.5 flex justify-between">
            <span>{a.titulo}</span>
            <span className="font-mono">stock {a.stock} → pedir {a.cantidadSugerida}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'sin_reposicion') return <div className="text-xs">{resultado.mensaje}</div>;
  if (resultado.modo === 'faltantes' && Array.isArray(resultado.faltantes)) {
    return (
      <div>
        <div className="font-medium">Remito #{resultado.remitoId} · faltantes</div>
        {resultado.faltantes.length === 0 && <div className="text-xs text-muted">Sin faltantes ✓</div>}
        {resultado.faltantes.map((f) => (
          <div key={f.ean13} className="text-xs py-0.5 flex justify-between">
            <span>{f.titulo}</span>
            <span className="font-mono">stock {f.stockActual} → pedir {f.pedido}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'catalogo' && Array.isArray(resultado.articulos)) {
    return (
      <div>
        {resultado.articulos.slice(0, 8).map((a) => (
          <div key={a.ean13} className="text-xs py-0.5">
            {a.titulo} <span className="text-muted">· {a.autor} · stock {a.stock + a.stockDeposito}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'ayuda' && Array.isArray(resultado.ayuda)) {
    return (
      <div>
        {resultado.ayuda.map((c) => (
          <div key={c.comando} className="text-xs py-0.5">
            <span className="font-mono">{c.comando}</span> <span className="text-muted">— {c.descripcion}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'busqueda' && Array.isArray(resultado.resultados)) {
    return (
      <div>
        {resultado.resultados.slice(0, 6).map((r) => (
          <div key={r.ean13} className="text-xs py-0.5 flex justify-between">
            <span>{r.titulo}</span>
            <span className="font-mono">{(r.score || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'composicion' && Array.isArray(resultado.items)) {
    return (
      <div>
        <div className="text-xs text-muted mb-1">Composicion por {resultado.campo}</div>
        {resultado.items.slice(0, 10).map((i) => (
          <div key={i.tema || i.editorial} className="text-xs py-0.5 flex justify-between">
            <span>{i.tema || i.editorial}</span>
            <span className="font-mono">{i.titulos} titulos · {i.stock} un.</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'resumen' && resultado.items) {
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-medium">{resultado.titulo}</div>
        {Object.entries(resultado.items).map(([clave, valor]) => (
          <div key={clave} className="flex justify-between">
            <span className="text-muted">{clave}</span>
            <span className="font-mono">{typeof valor === 'number' ? valor.toLocaleString('es-AR') : String(valor)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'resumen_ventas' && resultado.items) {
    const { comprobantes, facturado, porTipo } = resultado.items;
    return (
      <div className="text-xs">
        <div className="font-medium">{comprobantes} comprobantes por ${Number(facturado).toLocaleString('es-AR')} ({resultado.dias} dias)</div>
        {Object.entries(porTipo).map(([tipo, d]) => (
          <div key={tipo} className="flex justify-between">
            <span>{tipo}</span>
            <span className="font-mono">{d.comprobantes} · ${Number(d.total).toLocaleString('es-AR')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'resumen_remitos' && resultado.items) {
    const { totalRemitos, unidades, faltantes, ingresosPorMes } = resultado.items;
    return (
      <div className="text-xs">
        <div className="font-medium">{totalRemitos} remitos · {unidades} unidades · {faltantes} faltantes</div>
        {Object.entries(ingresosPorMes).map(([mes, u]) => (
          <div key={mes} className="flex justify-between">
            <span className="font-mono">{mes}</span>
            <span>{u} un.</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'top_vendidos' && Array.isArray(resultado.items)) {
    return (
      <div>
        {resultado.items.slice(0, 8).map((i) => (
          <div key={i.ean13} className="text-xs py-0.5 flex justify-between">
            <span>{i.titulo}</span>
            <span className="font-mono">{i.cantidad} un.</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'memoria' && Array.isArray(resultado.items)) {
    return (
      <div className="text-xs space-y-1">
        {resultado.items.map((m) => (
          <div key={m.id} className="py-0.5">
            <span className="agente-badge mr-1">{m.tipo}</span>
            <span>{m.texto}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'marcadores' && Array.isArray(resultado.marcadores)) {
    return (
      <div>
        {resultado.marcadores.map((m) => (
          <div key={m.id} className="text-xs py-0.5">
            <span className="font-mono">{m.id}</span> <span className="text-muted">— {m.descripcion}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'perfil_cliente') {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">{resultado.cliente.nombre} · doc {resultado.cliente.documento || '—'}</div>
        <div>Interacciones: {resultado.interacciones.length}</div>
        {resultado.interacciones.slice(0, 5).map((i) => (
          <div key={i.id} className="flex justify-between">
            <span className="agente-badge">{i.relacion}</span>
            <span className="font-mono">{i.entidad} · {Number(i.peso).toFixed(2)}</span>
          </div>
        ))}
        <div className="pt-1">Ventas recientes: {resultado.ventas.length}</div>
      </div>
    );
  }
  if (resultado.modo === 'interacciones_cliente' && Array.isArray(resultado.interacciones)) {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">{resultado.cliente.nombre}</div>
        {resultado.interacciones.map((i) => (
          <div key={i.id} className="flex justify-between">
            <span className="agente-badge">{i.relacion}</span>
            <span className="font-mono">{i.entidad} · {Number(i.peso).toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (Array.isArray(resultado)) {
    return <div className="text-xs">{resultado.length} articulos.</div>;
  }
  return <pre className="text-xs overflow-x-auto">{JSON.stringify(resultado, null, 2).slice(0, 1200)}</pre>;
}

export default function AgenteChatBlock() {
  const { mensajes, estado, candidatos, cargando, enviar } = useAgenteStream();
  const { contextoActual, setUltimosRecomendados, consultaAutomatica, pedirConsulta } = useAppContext();
  const [texto, setTexto] = useState('');

  // Consulta programada desde otra vista (ej. "Preguntar al Secretario sobre este remito").
  useEffect(() => {
    if (consultaAutomatica) {
      setTexto('');
      enviar(consultaAutomatica, contextoActual);
      pedirConsulta(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaAutomatica]);

  const alEnviar = async () => {
    const consulta = texto;
    setTexto('');
    await enviar(consulta, contextoActual);
    if (candidatos.length > 0) {
      setUltimosRecomendados(candidatos.map((c) => c.ean13));
    }
  };

  return (
    <aside className="agente-panel">
      <DebugTag nombre="AgenteChatBlock" />
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-semibold text-sm">El Secretario</span>
        {estado && <span className="agente-badge agente-badge-analizando">{estado}</span>}
        {contextoActual && (
          <span className="agente-badge" title={JSON.stringify(contextoActual)}>contexto ✓</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {mensajes.length === 0 && (
          <div className="text-xs text-muted leading-relaxed">
            <p className="mb-2">Te ayudo desde aca. Si estas viendo un remito o un cliente, ya lo se.</p>
            <p className="mb-1 font-mono">Marcadores: $autor X · $editorial X · $titulo X · $materia X · $editoriales · $faltantes_remito ID · $ayuda</p>
          </div>
        )}
        {mensajes.map((m, i) => {
          if (m.rol === 'herramienta') {
            return (
              <div key={i} className="text-xs">
                <span className="agente-badge">🔧 {m.nombre}</span>
              </div>
            );
          }
          return (
            <div key={i} className={`text-sm ${m.rol === 'usuario' ? 'text-right' : ''}`}>
              <div
                className={`inline-block max-w-[85%] px-3 py-2 rounded-[10px] whitespace-pre-wrap text-left ${
                  m.rol === 'usuario' ? 'btn-primary' : ''
                }`}
                style={m.rol !== 'usuario' ? { background: 'var(--bg-soft)', border: '1px solid var(--border)' } : {}}
              >
                {m.resultado ? <ResultadoBlock resultado={m.resultado} /> : m.texto}
              </div>
            </div>
          );
        })}

        {candidatos.length > 0 && (
          <div className="space-y-2">
            {candidatos.slice(0, 6).map((c) => (
              <div key={c.ean13} className="card p-3">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium">{c.titulo}</span>
                  <span className="text-xs text-muted font-mono">{(c.score || 0).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted">{c.autor} · {c.editorial}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="font-mono">{c.ean13}</span>
                  <span>${Number(c.precio).toLocaleString('es-AR')} · stock {c.stock + c.stockDeposito}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <textarea
          className="input-os mb-2 resize-none"
          rows={2}
          placeholder="Preguntale al Secretario o usa un marcador $..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); alEnviar(); } }}
        />
        <button type="button" className="btn btn-primary w-full" disabled={cargando} onClick={alEnviar}>
          {cargando ? 'Pensando...' : 'Enviar'}
        </button>
      </div>
    </aside>
  );
}
