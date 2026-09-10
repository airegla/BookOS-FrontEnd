// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: El Secretario. Panel lateral persistente y contextual: recibe el
//   JSON de lo que estas viendo (remito, venta, cliente) sin que tengas que
//   aclararlo. Soporta marcadores $ y lenguaje natural con streaming SSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import useAgenteStream from '../hooks/useAgenteStream';
import { useAppContext } from '../AppContext';
import { descargarDesdeServidor, descargarCsv } from '../utils/exportar';
import { parsearCsv } from '../utils/csv';
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
  if (resultado.modo === 'precio' && Array.isArray(resultado.items)) {
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-medium">{resultado.total} titulos {resultado.min != null ? `≥ $${resultado.min}` : ''}{resultado.max != null ? ` ≤ $${resultado.max}` : ''}</div>
        {resultado.items.slice(0, 6).map((a) => (
          <div key={a.ean13} className="py-0.5 flex justify-between">
            <span>{a.titulo}</span>
            <span className="font-mono">${Number(a.precio).toLocaleString('es-AR')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'filtrado' && Array.isArray(resultado.items)) {
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-medium">{resultado.total} titulos por {resultado.campo}="{resultado.valor}"</div>
        {resultado.items.slice(0, 6).map((a) => (
          <div key={a.ean13} className="py-0.5 flex justify-between">
            <span>{a.titulo}</span>
            <span className="font-mono">${Number(a.precio).toLocaleString('es-AR')}</span>
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
  if (resultado.modo === 'csv_exportado' || resultado.modo === 'pdf_generado') {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">📄 {resultado.modo === 'csv_exportado' ? 'CSV' : 'PDF'} listo para descargar</div>
        {resultado.filas != null && <div className="text-muted">{resultado.filas} filas</div>}
        <button type="button" className="btn btn-primary text-xs" onClick={() => descargarDesdeServidor(resultado.url)}>
          Descargar {resultado.archivo}
        </button>
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
  if (resultado.modo === 'estado_cuenta') {
    const movs = Array.isArray(resultado.movimientos) ? resultado.movimientos : [];
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-medium">Estado de cuenta ({resultado.tipo})</div>
        <div>Saldo: ${Number(resultado.saldoActual || 0).toLocaleString('es-AR')} · {movs.length} movimientos</div>
        {movs.slice(-6).map((m) => (
          <div key={m.id} className="flex justify-between">
            <span className="agente-badge">{m.tipoComprobante}</span>
            <span className="font-mono">saldo ${Number(m.saldo || 0).toLocaleString('es-AR')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (resultado.modo === 'comportamiento_observado') {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">🧠 Comportamiento de {resultado.nombre}</div>
        <p>{resultado.observacion}</p>
        {Array.isArray(resultado.tags) && resultado.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resultado.tags.map((t) => <span key={t} className="agente-badge">{t}</span>)}
          </div>
        )}
      </div>
    );
  }
  if (resultado.modo === 'documento_observado') {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">📝 {resultado.tipo} #{resultado.id}</div>
        <p>{resultado.observacion}</p>
      </div>
    );
  }
  if (resultado.modo === 'busqueda_observaciones' && Array.isArray(resultado.resultados)) {
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">Observaciones encontradas</div>
        {resultado.resultados.map((r) => (
          <div key={`${r.tipo}-${r.id}`} className="py-0.5">
            <span className="agente-badge">{r.tipo}</span> {r.etiqueta} <span className="font-mono">{(r.sim || 0).toFixed(2)}</span>
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
  const { contextoActual, setUltimosRecomendados, consultaAutomatica, pedirConsulta, emitirInstruccion, csvAdjunto, setCsvAdjunto } = useAppContext();
  const emitirRef = useRef(emitirInstruccion);
  emitirRef.current = emitirInstruccion;

  // El Secretario "opera sobre la vista": traduce resultados de tools en
  // instrucciones que la pagina activa escucha y aplica (refrescar, cruzar...).
  const onHerramienta = useCallback((resultado) => {
    const r = resultado || {};
    if (r.modo === 'venta_creada') {
      emitirRef.current({ dominio: 'ventas', accion: 'refrescar', mensaje: `Venta #${r.ventaId} registrada por el Secretario ✓` });
    } else if (r.modo === 'venta_anulada') {
      emitirRef.current({ dominio: 'ventas', accion: 'refrescar', mensaje: `Venta #${r.id} anulada ✓` });
    } else if (r.modo === 'remito_creado') {
      emitirRef.current({ dominio: 'remitos', accion: 'refrescar', mensaje: `Remito #${r.remitoId} creado por el Secretario ✓` });
    } else if (r.modo === 'remito_confirmado') {
      emitirRef.current({ dominio: 'remitos', accion: 'refrescar', mensaje: `Remito #${r.remitoId} confirmado (stock ingresado) ✓` });
    } else if (r.modo === 'remito_anulado') {
      emitirRef.current({ dominio: 'remitos', accion: 'refrescar', mensaje: `Remito #${r.remitoId} anulado ✓` });
    } else if (r.modo === 'faltantes') {
      emitirRef.current({ dominio: 'remitos', accion: 'cruzar', data: r });
    }
  }, []);

  const { mensajes, estado, candidatos, cargando, enviar } = useAgenteStream(onHerramienta);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const inputFileRef = useRef(null);

  // Consulta programada desde otra vista (ej. "Preguntar al Secretario sobre este remito").
  useEffect(() => {
    if (consultaAutomatica) {
      setTexto('');
      enviar(consultaAutomatica, { ...contextoActual, csvAdjunto: csvAdjunto || null });
      setCsvAdjunto(null);
      pedirConsulta(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaAutomatica]);

  const alEnviar = async () => {
    const consulta = texto;
    setTexto('');
    await enviar(consulta, { ...contextoActual, csvAdjunto: csvAdjunto || null });
    setCsvAdjunto(null);
    if (candidatos.length > 0) {
      setUltimosRecomendados(candidatos.map((c) => c.ean13));
    }
  };

  const alAdjuntar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { encabezados, filas } = parsearCsv(reader.result);
        setCsvAdjunto({ encabezados, filas: filas.slice(0, 200) });
        setAviso(`CSV adjuntado (${filas.length} filas). Escribí tu mensaje y envialo.`);
      } catch (err) {
        setAviso('No se pudo leer el CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copiarChat = async () => {
    const textoChat = mensajes.map((m) => {
      if (m.rol === 'usuario') return `Vos: ${m.texto}`;
      if (m.rol === 'herramienta') return `🔧 ${m.nombre}`;
      return `Secretario: ${m.texto || (m.resultado ? JSON.stringify(m.resultado) : '')}`;
    }).join('\n\n');
    try {
      await navigator.clipboard.writeText(textoChat || 'Sin conversacion');
      setAviso('Conversacion copiada ✓');
    } catch (err) {
      setAviso('No se pudo copiar (permisos del navegador).');
    }
  };

  const exportarChat = () => {
    const filas = mensajes.map((m) => ({
      rol: m.rol === 'usuario' ? 'vos' : m.rol === 'herramienta' ? 'herramienta' : 'secretario',
      contenido: m.texto || (m.resultado ? JSON.stringify(m.resultado) : (m.nombre || '')),
    }));
    descargarCsv('conversacion_secretario', [{ titulo: 'rol', clave: 'rol' }, { titulo: 'contenido', clave: 'contenido' }], filas);
    setAviso('Conversacion exportada ✓');
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
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    className="btn btn-primary text-xs"
                    onClick={() => emitirInstruccion({ dominio: 'ventas', accion: 'agregar_item', item: { ean13: c.ean13, titulo: c.titulo, precio: c.precio } })}
                  >
                    Agregar a la venta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        {(csvAdjunto || aviso) && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            {csvAdjunto && <span className="agente-badge">📎 {csvAdjunto.filas.length} filas</span>}
            {aviso && <span className="text-muted">{aviso}</span>}
          </div>
        )}
        <div className="flex items-center gap-1 mb-2">
          <input ref={inputFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={alAdjuntar} />
          <button type="button" className="btn btn-ghost text-xs" onClick={() => inputFileRef.current && inputFileRef.current.click()} title="Adjuntar CSV">📎 Adjuntar</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={copiarChat} title="Copiar conversacion">📋 Copiar</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={exportarChat} title="Exportar conversacion a CSV">⬇ Exportar</button>
          {csvAdjunto && <button type="button" className="btn btn-ghost text-xs text-muted" onClick={() => setCsvAdjunto(null)}>Quitar adjunto</button>}
        </div>
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
