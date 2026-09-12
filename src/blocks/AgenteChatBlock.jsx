// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: El Secretario. Panel lateral persistente y contextual: recibe el
//   JSON de lo que estas viendo (remito, venta, cliente) sin que tengas que
//   aclararlo. Renderiza el envelope E5/E6 de las herramientas, las preguntas
//   (confirmacion de escrituras y clarificacion de datos), los adjuntos CSV y
//   las descargas. En pantallas chicas se abre a pantalla completa.

import { useCallback, useEffect, useRef, useState } from 'react';
import useAgenteStream from '../hooks/useAgenteStream';
import { useAppContext } from '../AppContext';
import { descargarDesdeServidor, descargarCsv } from '../utils/exportar';
import DebugTag from '../ui/DebugTag';
import { agenteApi } from '../api/api';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

// Claves habituales donde las tools devuelven listas (E5).
const CLAVES_LISTA = ['items', 'articulos', 'resultados', 'filas', 'movimientos', 'ventas', 'compras',
  'clientes', 'proveedores', 'remitos', 'pedidos', 'devoluciones', 'liquidaciones', 'transferencias',
  'suscripciones', 'usuarios', 'marcadores', 'entradas', 'lotes', 'componentes'];

function primeraLista(data) {
  if (!data || typeof data !== 'object') return null;
  for (const clave of CLAVES_LISTA) {
    if (Array.isArray(data[clave])) return { clave, lista: data[clave] };
  }
  return null;
}

function etiquetaItem(item) {
  if (item == null) return '(sin dato)';
  if (typeof item !== 'object') return String(item);
  return item.titulo || item.nombre || item.descripcion || item.label || item.clave
    || item.email || item.codigo || `#${item.id != null ? item.id : '?'}`;
}

function detalleItem(item) {
  if (item == null || typeof item !== 'object') return '';
  const partes = [];
  if (item.precio != null || item.precioLista != null) partes.push(money(item.precioLista != null ? item.precioLista : item.precio));
  if (item.stock != null || item.stockFirme != null) partes.push(`stock ${item.stockFirme != null ? item.stockFirme : item.stock}`);
  if (item.cantidad != null) partes.push(`${item.cantidad} un.`);
  if (item.total != null && item.precio == null) partes.push(money(item.total));
  if (item.saldo != null) partes.push(`saldo ${money(item.saldo)}`);
  if (item.clasificacion) partes.push(item.clasificacion);
  return partes.join(' · ');
}

function BotonDescarga({ descarga }) {
  if (!descarga) return null;
  const manejar = () => {
    descargarDesdeServidor(`/archivos/${descarga.archivoId}/descarga`, descarga.nombre).catch(() => {});
  };
  return (
    <button type="button" className="btn btn-primary text-xs mt-2" onClick={manejar}>
      ⬇ Descargar {descarga.nombre || 'CSV'}
    </button>
  );
}

// Render legible del envelope E5/E6: { ok, data, meta, avisos, descarga }.
function BloqueEnvelope({ envelope }) {
  if (!envelope) return null;
  if (envelope.ok === false) {
    const e = envelope.error || {};
    return <div className="text-xs">⚠️ {e.mensaje || 'No se pudo completar la operación.'}</div>;
  }
  const data = envelope.data;
  if (data == null) return null;

  if (typeof data !== 'object') return <div className="text-xs">{String(data)}</div>;

  // Modos de los marcadores del kernel (catalogo/filtrado) y listados genericos.
  const lista = primeraLista(data);
  if (lista && lista.lista.length > 0) {
    return (
      <div>
        {data.total != null && <div className="text-xs text-muted mb-1">{data.total} resultado(s)</div>}
        {lista.lista.slice(0, 8).map((item, i) => (
          <div key={i} className="text-xs py-0.5 flex justify-between gap-2">
            <span className="truncate">{etiquetaItem(item)}</span>
            <span className="font-mono whitespace-nowrap">{detalleItem(item)}</span>
          </div>
        ))}
        {lista.lista.length > 8 && <div className="text-xs text-muted">… y {lista.lista.length - 8} más</div>}
        <BotonDescarga descarga={envelope.descarga} />
      </div>
    );
  }

  // Resumen comparativo (archivo_comparar) u objetos de conteo.
  const resumen = data.resumen && typeof data.resumen === 'object' ? data.resumen : null;
  if (resumen) {
    return (
      <div className="text-xs space-y-0.5">
        {Object.entries(resumen).map(([clave, valor]) => (
          <div key={clave} className="flex justify-between">
            <span className="text-muted">{clave}</span>
            <span className="font-mono">{typeof valor === 'number' ? valor.toLocaleString('es-AR') : String(valor)}</span>
          </div>
        ))}
        <BotonDescarga descarga={envelope.descarga} />
      </div>
    );
  }

  // Objeto plano de totales (resúmenes de ventas, remitos, caja...).
  const entradas = Object.entries(data).filter(([, v]) => v == null || typeof v !== 'object');
  if (entradas.length > 0 && !lista) {
    return (
      <div className="text-xs space-y-0.5">
        {entradas.slice(0, 12).map(([clave, valor]) => (
          <div key={clave} className="flex justify-between gap-2">
            <span className="text-muted">{clave}</span>
            <span className="font-mono">{typeof valor === 'number' ? valor.toLocaleString('es-AR') : String(valor == null ? '—' : valor)}</span>
          </div>
        ))}
        <BotonDescarga descarga={envelope.descarga} />
      </div>
    );
  }

  return (
    <>
      <pre className="text-xs overflow-x-auto">{JSON.stringify(data, null, 2).slice(0, 1200)}</pre>
      <BotonDescarga descarga={envelope.descarga} />
    </>
  );
}

// Tarjeta de pregunta del agente: confirmacion de escrituras o clarificacion de datos.
function PreguntaCard({ pregunta, resuelta, onConfirmar, onResponder, onDescartar }) {
  const esConfirmacion = pregunta.tipo === 'confirmacion';
  return (
    <div className="card p-3" style={{ borderColor: 'var(--accent)' }}>
      <div className="text-xs font-semibold mb-1">
        {esConfirmacion ? '🔒 Necesito tu confirmación' : '❓ Me falta un dato'}
      </div>
      <div className="text-xs whitespace-pre-wrap mb-2">{pregunta.texto || '...'}</div>
      {esConfirmacion && pregunta.preview != null && (
        <pre className="text-xs overflow-x-auto mb-2" style={{ maxHeight: 160 }}>
          {typeof pregunta.preview === 'string' ? pregunta.preview : JSON.stringify(pregunta.preview, null, 2).slice(0, 800)}
        </pre>
      )}
      {resuelta ? (
        <div className="text-xs text-muted">Resuelta ✓</div>
      ) : (
        <div className="flex gap-2">
          {esConfirmacion ? (
            <>
              <button type="button" className="btn btn-primary text-xs" onClick={onConfirmar}>Confirmar</button>
              <button type="button" className="btn text-xs" onClick={onDescartar}>Cancelar</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary text-xs" onClick={onResponder}>Responder</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgenteChatBlock() {
  const { contextoActual, setUltimosRecomendados, consultaAutomatica, pedirConsulta, emitirInstruccion, csvAdjunto, setCsvAdjunto } = useAppContext();
  const emitirRef = useRef(emitirInstruccion);
  emitirRef.current = emitirInstruccion;

  // En pantallas chicas el panel se abre a pantalla completa desde un boton flotante.
  const [abierto, setAbierto] = useState(false);
  const textareaRef = useRef(null);
  const inputFileRef = useRef(null);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');
  const [adjunto, setAdjunto] = useState(null);
  const [resueltas, setResueltas] = useState({});

  // La vista activa se refresca cuando el Secretario escribe sobre su dominio.
  const onHerramienta = useCallback((resultado, nombre) => {
    const env = resultado || {};
    if (env.ok === false) return;
    if (/^ventas_(crear|actualizar|confirmar|anular|registrar)/.test(nombre || '')) {
      emitirRef.current({ dominio: 'ventas', accion: 'refrescar', mensaje: `${nombre} ejecutada por el Secretario ✓` });
    } else if (/^remitos_(crear|confirmar|anular|actualizar)/.test(nombre || '')) {
      emitirRef.current({ dominio: 'remitos', accion: 'refrescar', mensaje: `${nombre} ejecutada por el Secretario ✓` });
    }
  }, []);

  const { mensajes, estado, candidatos, textoActual, cargando, enviar, agregarMensaje } = useAgenteStream(onHerramienta);

  // Convierte el csvAdjunto del contexto (sabana pedida desde otra pagina) al
  // formato del chat: { nombre, contenido }.
  const adjuntoDesdeContexto = useCallback(() => {
    if (!csvAdjunto) return null;
    if (csvAdjunto.contenido) return { nombre: csvAdjunto.nombre || 'sabana.csv', contenido: csvAdjunto.contenido };
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const enc = csvAdjunto.encabezados || [];
    const filas = csvAdjunto.filas || [];
    const lineas = [enc.map(esc).join(';'), ...filas.map((f) => enc.map((c) => esc(f[c])).join(';'))];
    return { nombre: 'sabana.csv', contenido: lineas.join('\n') };
  }, [csvAdjunto]);

  // Consulta programada desde otra vista (ej. "Preguntar al Secretario sobre este remito").
  useEffect(() => {
    if (consultaAutomatica) {
      setTexto('');
      enviar(consultaAutomatica, contextoActual, adjuntoDesdeContexto());
      setCsvAdjunto(null);
      setAdjunto(null);
      pedirConsulta(null);
      setAbierto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaAutomatica]);

  const alEnviar = async () => {
    const consulta = texto;
    const adj = adjunto || adjuntoDesdeContexto();
    if (!consulta.trim() && !adj) return;
    setTexto('');
    setAdjunto(null);
    await enviar(consulta.trim() || 'Analizá el archivo adjunto y contame qué tenés.', contextoActual, adj);
    setCsvAdjunto(null);
    if (candidatos.length > 0) {
      setUltimosRecomendados(candidatos.map((c) => c.ean13));
    }
  };

  const alAdjuntar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAviso('El archivo supera 2MB. Probá con una sábana más chica.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAdjunto({ nombre: file.name, contenido: String(reader.result || '') });
      setAviso(`Adjunto listo (${file.name}). Escribí tu mensaje y envialo.`);
    };
    reader.onerror = () => setAviso('No se pudo leer el archivo.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmarPregunta = async (pregunta, clave) => {
    try {
      const res = await agenteApi.confirmar(pregunta.herramienta, pregunta.argumentos);
      const envelope = res.data && res.data.data ? res.data.data : res.data;
      agregarMensaje({ rol: 'agente', texto: '✓ Ejecutado con tu confirmación', resultado: { ruta: 'confirmacion', resultado: envelope } });
      setResueltas((prev) => ({ ...prev, [clave]: true }));
    } catch (err) {
      const mensaje = err.response && err.response.data && err.response.data.message ? err.response.data.message : err.message;
      agregarMensaje({ rol: 'agente', texto: `⚠️ ${mensaje}` });
    }
  };

  const responderPregunta = () => {
    if (textareaRef.current) textareaRef.current.focus();
  };

  const copiarChat = async () => {
    const contenido = mensajes.map((m) => {
      if (m.rol === 'usuario') return `Vos: ${m.texto}`;
      if (m.rol === 'herramienta') return `🔧 ${m.nombre}`;
      if (m.rol === 'pregunta') return `Secretario (${m.pregunta.tipo}): ${m.pregunta.texto || ''}`;
      return `Secretario: ${m.texto || (m.resultado ? JSON.stringify(m.resultado.resultado || m.resultado) : '')}`;
    }).join('\n\n');
    try {
      await navigator.clipboard.writeText(contenido || 'Sin conversacion');
      setAviso('Conversacion copiada ✓');
    } catch (err) {
      setAviso('No se pudo copiar (permisos del navegador).');
    }
  };

  const exportarChat = () => {
    const filas = mensajes.map((m) => ({
      rol: m.rol === 'usuario' ? 'vos' : m.rol === 'herramienta' ? 'herramienta' : m.rol === 'pregunta' ? 'pregunta' : 'secretario',
      contenido: m.texto || (m.resultado ? JSON.stringify(m.resultado.resultado || m.resultado) : (m.pregunta ? m.pregunta.texto : (m.nombre || ''))),
    }));
    descargarCsv('conversacion_secretario', [{ titulo: 'rol', clave: 'rol' }, { titulo: 'contenido', clave: 'contenido' }], filas);
    setAviso('Conversacion exportada ✓');
  };

  const adjuntoPendiente = adjunto || (csvAdjunto ? { nombre: csvAdjunto.nombre || 'sabana.csv' } : null);

  return (
    <>
      <button type="button" className="btn btn-primary agente-toggle" onClick={() => setAbierto(true)} title="Abrir el Secretario">
        💬 Secretario
      </button>
      <aside className={`agente-panel ${abierto ? 'agente-abierto' : ''}`}>
        <DebugTag nombre="AgenteChatBlock" />
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-semibold text-sm">El Secretario</span>
          {estado && <span className="agente-badge agente-badge-analizando">{estado}</span>}
          {contextoActual && (
            <span className="agente-badge" title={JSON.stringify(contextoActual)}>contexto ✓</span>
          )}
          <button type="button" className="btn btn-ghost text-xs ml-auto agente-cerrar" onClick={() => setAbierto(false)} title="Cerrar">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
          {mensajes.length === 0 && (
            <div className="text-xs text-muted leading-relaxed">
              <p className="mb-2">Te ayudo desde aca. Si estas viendo un remito o un cliente, ya lo se.</p>
              <p className="mb-1 font-mono">Marcadores: $autor X · $editorial X · $titulo X · $materia X · $editoriales · $faltantes_remito ID · $ayuda</p>
              <p>Adjuntá un CSV (sábana del proveedor) y pedime que lo compare.</p>
            </div>
          )}
          {mensajes.map((m, i) => {
            if (m.rol === 'herramienta') {
              return (
                <div key={i} className="text-xs">
                  <span className="agente-badge">{m.ok === false ? '⚠️' : '🔧'} {m.nombre}</span>
                </div>
              );
            }
            if (m.rol === 'pregunta') {
              const clave = `${m.pregunta.tipo}-${i}`;
              return (
                <PreguntaCard
                  key={i}
                  pregunta={m.pregunta}
                  resuelta={Boolean(resueltas[clave])}
                  onConfirmar={() => confirmarPregunta(m.pregunta, clave)}
                  onResponder={responderPregunta}
                  onDescartar={() => setResueltas((prev) => ({ ...prev, [clave]: true }))}
                />
              );
            }
            if (m.rol === 'usuario') {
              return (
                <div key={i} className="text-sm text-right">
                  <div className="inline-block max-w-[85%] px-3 py-2 rounded-[10px] whitespace-pre-wrap text-left btn-primary">
                    {m.adjunto && <div className="text-xs opacity-80 mb-1">📎 {m.adjunto}</div>}
                    {m.texto}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="text-sm">
                <div
                  className="inline-block max-w-[92%] px-3 py-2 rounded-[10px] whitespace-pre-wrap text-left"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}
                >
                  {m.resultado ? (
                    <>
                      {m.texto && <div className="mb-1">{m.texto}</div>}
                      {m.resultado.ruta === 'confirmacion' ? (
                        <BloqueEnvelope envelope={m.resultado.resultado} />
                      ) : (
                        <>
                          {m.resultado.marcador && <span className="agente-badge mr-1">{m.resultado.marcador}</span>}
                          {m.resultado.confirmacion && <div className="text-xs text-muted mb-1">Escritura preparada: esperá la confirmación.</div>}
                          <BloqueEnvelope envelope={m.resultado.resultado} />
                          {Array.isArray(m.resultado.siguientes) && m.resultado.siguientes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {m.resultado.siguientes.slice(0, 4).map((s) => (
                                <button
                                  key={String(s)}
                                  type="button"
                                  className="btn text-xs"
                                  onClick={() => enviar(`Ejecutá ${String(s).replace(/_/g, ' ')}`, contextoActual)}
                                >
                                  {String(s).replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : m.texto}
                </div>
              </div>
            );
          })}

          {cargando && textoActual && (
            <div className="text-sm">
              <div
                className="inline-block max-w-[92%] px-3 py-2 rounded-[10px] whitespace-pre-wrap text-left"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}
              >
                {textoActual}
              </div>
            </div>
          )}

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
                    <span>{money(c.precio)} · stock {Number(c.stock || 0) + Number(c.stockDeposito || 0)}</span>
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
          {(adjuntoPendiente || aviso) && (
            <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
              {adjuntoPendiente && <span className="agente-badge">📎 {adjuntoPendiente.nombre}</span>}
              {aviso && <span className="text-muted">{aviso}</span>}
            </div>
          )}
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <input ref={inputFileRef} type="file" accept=".csv,.txt,text/csv,text/plain" style={{ display: 'none' }} onChange={alAdjuntar} />
            <button type="button" className="btn btn-ghost text-xs" onClick={() => inputFileRef.current && inputFileRef.current.click()} title="Adjuntar CSV">📎 Adjuntar</button>
            <button type="button" className="btn btn-ghost text-xs" onClick={copiarChat} title="Copiar conversacion">📋 Copiar</button>
            <button type="button" className="btn btn-ghost text-xs" onClick={exportarChat} title="Exportar conversacion a CSV">⬇ Exportar</button>
            {adjunto && <button type="button" className="btn btn-ghost text-xs text-muted" onClick={() => setAdjunto(null)}>Quitar adjunto</button>}
            {!adjunto && csvAdjunto && <button type="button" className="btn btn-ghost text-xs text-muted" onClick={() => setCsvAdjunto(null)}>Quitar sábana</button>}
          </div>
          <textarea
            ref={textareaRef}
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
    </>
  );
}
