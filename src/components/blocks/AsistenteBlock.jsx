// ARCHIVO: AsistenteBlock.jsx
// RUTA: frontend/src/components/blocks/AsistenteBlock.jsx
// DESCRIPCIÓN: Asistente de Mostrador + alta rápida de cliente sin perder cards

import React, { useState, useEffect } from 'react';
import { useAsistente } from '../../hooks/useAsistente';
import { useIsMobile } from '../../hooks/useIsMobile';
import { RecomendacionCard } from '../ui/RecomendacionCard';
import { SearchSelect } from '../ui/SearchSelect';
import { Pagination } from '../ui/Pagination';
import { api } from '../../api/api.js';
import DebugTag from '../../ui/DebugTag';

export const AsistenteBlock = ({ onSeleccionarParaPedido }) => {
  const [prompt, setPrompt] = useState('');
  const [modo, setModo] = useState('auto'); // auto | contenido | venta
  const { loading, error, resultado, mejorando, consultarAsistente, limpiarResultado } = useAsistente();
  const isMobile = useIsMobile();
  const [paginaEnStock, setPaginaEnStock] = useState(1);

  // alta rápida cliente
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({ nombre:'', email:'', telefono:'' });
  const [showClienteRapido, setShowClienteRapido] = useState(false);

  useEffect(()=>{ 
    api.getClientes().then(setClientes).catch(()=>{});
  }, []);

  useEffect(() => { setPaginaEnStock(1); }, [resultado]);

  const handleAltaClienteRapida = async () => {
    if(!nuevoCliente.nombre) return alert('Nombre requerido');
    try {
      const cli = await api.createCliente(nuevoCliente);
      const cliReal = cli.id_cliente ? cli : (cli.data || cli);
      setClientes(prev=>[...prev, cliReal]);
      setClienteSeleccionado(cliReal.id_cliente);
      setNuevoCliente({ nombre:'', email:'', telefono:'' });
      setShowClienteRapido(false);
    } catch(e) {
      alert('Error: '+e.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    consultarAsistente(prompt, modo);
  };

  const res = resultado || { en_stock: [], a_pedir: [] };
  const fueraCatalogo = res.fuera_catalogo || [];
  const fueraEncontrados = fueraCatalogo.filter((f) => f && f.encontrado);
  const fueraNoEncontrados = fueraCatalogo.filter((f) => f && !f.encontrado);

  const POR_PAGINA = 15;
  const totalPaginasEnStock = Math.max(1, Math.ceil((res.en_stock || []).length / POR_PAGINA));
  const paginaEnStockValida = Math.min(paginaEnStock, totalPaginasEnStock);
  const enStockPagina = (res.en_stock || []).slice((paginaEnStockValida - 1) * POR_PAGINA, paginaEnStockValida * POR_PAGINA);
  const esAyuda = res.modo === 'ayuda';
  const editoriales = res.editoriales || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="AsistenteBlock.jsx" />
      <h2 style={{ marginBottom: '8px' }}>Asistente de Mostrador</h2>
      <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.9rem' }}>
        Ingresá las preferencias o la consulta del cliente. El Asistente generará las recomendaciones y se cruzará el stock en tiempo real con la base de datos legacy.
      </p>

      {/* Cliente rápido (modal) */}
      <div style={{ marginBottom: '16px' }}>
        <button type="button" onClick={() => setShowClienteRapido(true)} style={{ padding: '8px 14px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Cliente rápido</button>
        {clientes.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <SearchSelect
              options={clientes.map(c => ({ value: c.id_cliente, label: `${c.nombre} - ${c.email || ''}` }))}
              value={clienteSeleccionado}
              onChange={(v) => setClienteSeleccionado(v)}
              placeholder="Cliente para pedido..."
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <textarea
          rows={3}
          maxLength={300}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Cliente busca novelas policiales ambientadas en la Patagonia... (máx. 300 caracteres)"
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', marginBottom: '4px' }}
        />
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: prompt.length > 280 ? '#c62828' : '#999', marginBottom: '8px' }}>
          {prompt.length}/300
        </div>
        {/* Ruta de la consulta: para probar el comportamiento del asistente */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px', fontSize: '0.8rem' }}>
          <span style={{ color: '#555' }}>Ruta:</span>
          {[
            { id: 'auto', label: 'Auto' },
            { id: 'contenido', label: 'Contenido (semántico, sin LLM)' },
            { id: 'venta', label: 'Venta (con LLM)' }
          ].map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setModo(op.id)}
              style={{
                padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
                border: modo === op.id ? '1px solid #1a237e' : '1px solid #ccc',
                background: modo === op.id ? '#1a237e' : '#fff',
                color: modo === op.id ? '#fff' : '#555',
                fontWeight: modo === op.id ? 'bold' : 'normal'
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            style={{ padding: '10px 20px', backgroundColor: loading ? '#9e9e9e' : '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Seleccionando propuesta y verificando stock...' : 'Buscar Recomendaciones'}
          </button>
          {(res.en_stock.length > 0 || res.a_pedir.length > 0 || editoriales.length > 0 || esAyuda) && (
            <button type="button" onClick={limpiarResultado} style={{ padding: '10px 16px', backgroundColor: '#757575', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.95rem', cursor: 'pointer' }}>Limpiar</button>
          )}
        </div>
      </form>

      {error && <div style={{ padding: '12px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '16px' }}><strong>Error:</strong> {error}</div>}

      {mejorando && (
        <p style={{ color: '#1a237e', fontSize: '0.85rem', margin: '0 0 12px', background: '#e8eaf6', padding: '8px 10px', borderRadius: '4px' }}>
          ⏳ Mejorando las sugerencias con IA… (ya podés usar el listado mientras tanto)
        </p>
      )}

      {res.modo === 'contenido' && !mejorando && (
        <p style={{ color: '#555', fontSize: '0.85rem', margin: '0 0 12px' }}>🔎 Búsqueda por contenido del catálogo (sin sugerencia de venta).</p>
      )}
      {modo !== 'auto' && (
        <p style={{ color: '#555', fontSize: '0.8rem', margin: '0 0 12px', background: '#f5f5f5', padding: '6px 10px', borderRadius: '4px', display: 'inline-block' }}>
          🛤️ Ruta forzada: {modo === 'contenido' ? 'Contenido (semántico, sin LLM)' : 'Venta (con LLM)'}
        </p>
      )}

      {esAyuda && (
        <div style={{ background: '#e8eaf6', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
          <h3 style={{ marginTop: 0, color: '#1a237e' }}>💡 Comandos de Empatía</h3>
          {res.error && <p style={{ color: '#c62828', fontSize: '0.9rem' }}>{res.error}</p>}
          <ul style={{ lineHeight: '1.9', fontSize: '0.9rem', paddingLeft: '20px' }}>
            {(res.ayuda || []).map((a, i) => (
              <li key={i}><code style={{ background: '#fff', padding: '1px 6px', borderRadius: '3px' }}>{a.m}</code> — {a.d}</li>
            ))}
          </ul>
          <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 0 }}>
            Un marcador es una ruta pura: va al inicio de la consulta y nunca se mezcla con lenguaje libre.
          </p>
        </div>
      )}

      {editoriales.length > 0 && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #e0e0e0', marginBottom: '16px' }}>
          <h3 style={{ color: '#2e7d32', borderBottom: '2px solid #2e7d32', paddingBottom: '8px', marginTop: 0 }}>🏢 Editoriales ({editoriales.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#555', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '6px 8px' }}>Editorial</th>
                <th style={{ padding: '6px 8px' }}>Títulos</th>
                <th style={{ padding: '6px 8px' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {editoriales.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px' }}>{e.editorial}</td>
                  <td style={{ padding: '6px 8px' }}>{e.titulos}</td>
                  <td style={{ padding: '6px 8px' }}>{e.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!esAyuda && editoriales.length === 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: (res.a_pedir.length > 0 && !isMobile) ? '1fr 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          <h3 style={{ color: '#2e7d32', borderBottom: '2px solid #2e7d32', paddingBottom: '8px' }}>En Stock ({res.en_stock.length})</h3>
          {res.en_stock.length === 0 && !loading && <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>Sin resultados en stock local.</p>}
          {enStockPagina.map((libro, index) => (
            <RecomendacionCard key={`stock-${index}`} libro={libro} tipo="en_stock" onAltaRapida={onSeleccionarParaPedido} clienteId={clienteSeleccionado} />
          ))}
          <Pagination page={paginaEnStockValida} totalPages={totalPaginasEnStock} onChange={setPaginaEnStock} />
        </div>
        {res.a_pedir.length > 0 && (
          <div>
            <h3 style={{ color: '#ed6c02', borderBottom: '2px solid #ed6c02', paddingBottom: '8px' }}>A Pedir — sin stock ({res.a_pedir.length})</h3>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '4px 0 12px' }}>Ingresados al catálogo en los últimos 6 meses; probablemente pedibles al proveedor.</p>
            {res.a_pedir.map((libro, index) => (
              <RecomendacionCard key={`pedir-${index}`} libro={libro} tipo="a_pedir" onAltaRapida={onSeleccionarParaPedido} clienteId={clienteSeleccionado} />
            ))}
          </div>
        )}
      </div>
      )}

      {fueraEncontrados.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#2e7d32', borderBottom: '2px solid #2e7d32', paddingBottom: '8px' }}>📌 Libro reconocido — lo encontramos en el catálogo ({fueraEncontrados.length})</h3>
          {fueraEncontrados.map((libro, i) => (
            <RecomendacionCard key={`fuera-encontrado-${i}`} libro={libro} tipo={(libro.stock || 0) > 0 ? 'en_stock' : 'a_pedir'} onAltaRapida={onSeleccionarParaPedido} clienteId={clienteSeleccionado} />
          ))}
        </div>
      )}

      {fueraNoEncontrados.length > 0 && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#fff8e1', border: '1px solid #fbc02d', borderRadius: '6px' }}>
          <h3 style={{ color: '#e65100', marginTop: 0, borderBottom: '2px solid #fbc02d', paddingBottom: '8px' }}>📌 Reconocimos el libro, pero no está en el catálogo</h3>
          <p style={{ color: '#888', fontSize: '0.8rem', margin: '4px 0 12px' }}>Posible referencia detectada por la IA. Conviene consultar disponibilidad con el proveedor.</p>
          {fueraNoEncontrados.map((f, i) => (
            <div key={`fuera-${i}`} style={{ padding: '10px 0', borderBottom: i < fueraNoEncontrados.length - 1 ? '1px solid #f0e0a0' : 'none' }}>
              <div style={{ fontSize: '0.95rem' }}>
                <strong>{f.Titulo}</strong>{f.Autor ? <span style={{ color: '#555' }}> — {f.Autor}</span> : null}
              </div>
              {f.Sinopsis && <p style={{ margin: '6px 0 2px', fontSize: '0.88rem' }}>{f.Sinopsis}</p>}
              {f.PorQue && <p style={{ margin: '2px 0 0', color: '#777', fontSize: '0.82rem', fontStyle: 'italic' }}>Por qué lo reconocemos: {f.PorQue}</p>}
            </div>
          ))}
        </div>
      )}

      {showClienteRapido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowClienteRapido(false)}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '360px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>+ Cliente rápido</h3>
            <input placeholder="Nombre *" value={nuevoCliente.nombre} onChange={e=>setNuevoCliente({...nuevoCliente, nombre:e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }} />
            <input placeholder="Email" value={nuevoCliente.email} onChange={e=>setNuevoCliente({...nuevoCliente, email:e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }} />
            <input placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e=>setNuevoCliente({...nuevoCliente, telefono:e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowClienteRapido(false)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={handleAltaClienteRapida} style={{ background: '#2196f3', color: '#fff', padding: '8px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsistenteBlock;