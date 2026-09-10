// ARCHIVO: PropuestasBlock.jsx
// RUTA: frontend/src/components/blocks/PropuestasBlock.jsx
// DESCRIPCIÓN: Propuestas personalizadas por cliente: listado, generar, previsualizar y enviar.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import { SearchSelect } from '../ui/SearchSelect';
import DebugTag from '../../ui/DebugTag';

export const PropuestasBlock = () => {
  const [propuestas, setPropuestas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [clienteSel, setClienteSel] = useState('');
  const [generando, setGenerando] = useState(false);
  const [vista, setVista] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.getPropuestas(), api.getClientes()]);
      setPropuestas(Array.isArray(p) ? p : (p.data || []));
      setClientes(Array.isArray(c) ? c : (c.data || []));
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const pag = usePagination(propuestas, (p) => `${p.cliente_nombre || ''} ${p.asunto || ''} ${p.estado}`, 10);

  const generar = async () => {
    if (!clienteSel) return;
    setGenerando(true); setError(null);
    try {
      const creada = await api.generarPropuesta(clienteSel);
      setModalGenerar(false); setClienteSel('');
      setVista(creada);
      cargar();
    } catch (e) { setError(e.message); }
    finally { setGenerando(false); }
  };

  const ver = async (id) => {
    try { setVista(await api.getPropuesta(id)); }
    catch (e) { setError(e.message); }
  };

  const enviar = async (id) => {
    if (!window.confirm('¿Enviar esta propuesta por mail al cliente?')) return;
    try { await api.enviarPropuesta(id); cargar(); }
    catch (e) { setError(e.message); }
  };

  const borrar = async (id) => {
    if (!window.confirm('¿Borrar esta propuesta? (solo se pueden borrar las que no fueron enviadas)')) return;
    try { await api.deletePropuesta(id); cargar(); }
    catch (e) { setError(e.message); }
  };

  const exportarCsv = () => {
    const cols = ['ID', 'Cliente', 'Estado', 'Libros', 'Asunto', 'Generada', 'Enviada'];
    const rows = propuestas.map(p => ({
      ID: p.id_propuesta,
      Cliente: p.cliente_nombre || '',
      Estado: p.estado,
      Libros: p.total_libros,
      Asunto: p.asunto || '',
      Generada: p.fecha_generacion ? new Date(p.fecha_generacion).toLocaleDateString('es-AR') : '',
      Enviada: p.enviado_en ? new Date(p.enviado_en).toLocaleDateString('es-AR') : ''
    }));
    const esc = v => { const s = String(v ?? '').replace(/"/g, '""'); return (s.includes(';') || s.includes('"') || s.includes('\n')) ? `"${s}"` : s; };
    const csv = [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'propuestas.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <DebugTag name="PropuestasBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📚 Propuestas personalizadas</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportarCsv} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>⬇ Exportar CSV</button>
          <button onClick={() => { setClienteSel(''); setModalGenerar(true); }} style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Generar propuesta</button>
        </div>
      </div>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>Propuestas de lectura armadas con el Asistente a partir de las temáticas de cada cliente (Toma todas las palbras en ese campo como referencia), solo con libros en stock.</p>

      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>{error}</div>}

      <input
        placeholder="Buscar propuesta (cliente, asunto, estado)..."
        value={pag.query}
        onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
        style={{ width: '100%', maxWidth: '360px', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />

      {loading ? <p>Cargando...</p> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', background: '#fff' }}>
            <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '10px', textAlign: 'left' }}>ID</th><th style={{ padding: '10px', textAlign: 'left' }}>Cliente</th><th style={{ padding: '10px', textAlign: 'left' }}>Estado</th><th style={{ padding: '10px', textAlign: 'left' }}>Libros</th><th style={{ padding: '10px', textAlign: 'left' }}>Asunto</th><th style={{ padding: '10px', textAlign: 'left' }}>Fecha</th><th style={{ padding: '10px', textAlign: 'left' }}>Acciones</th></tr></thead>
            <tbody>{pag.pageItems.map(p => (
              <tr key={p.id_propuesta} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>#{p.id_propuesta}</td>
                <td style={{ padding: '10px' }}>{p.cliente_nombre || '-'}</td>
                <td style={{ padding: '10px' }}><span style={{ background: p.estado === 'enviada' ? '#e8f5e9' : '#fff3e0', color: p.estado === 'enviada' ? '#2e7d32' : '#ed6c02', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{p.estado}</span></td>
                <td style={{ padding: '10px' }}>{p.total_libros}</td>
                <td style={{ padding: '10px' }}>{p.asunto || '—'}</td>
                <td style={{ padding: '10px' }}>{new Date(p.fecha_generacion).toLocaleDateString('es-AR')}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => ver(p.id_propuesta)} style={{ marginRight: '6px', padding: '4px 8px', cursor: 'pointer' }}>Ver</button>
                  {p.estado === 'borrador' && <button onClick={() => enviar(p.id_propuesta)} style={{ padding: '4px 8px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enviar</button>}
                  {p.estado === 'borrador' && <button onClick={() => borrar(p.id_propuesta)} style={{ marginLeft: '6px', padding: '4px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Borrar</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
          <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
        </>
      )}

      {modalGenerar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModalGenerar(false)}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Generar propuesta</h3>
            <label style={{ display: 'block', marginBottom: '16px' }}>Cliente
              <SearchSelect
                options={clientes.map(c => ({ value: c.id_cliente, label: `${c.nombre}${c.email ? ' - ' + c.email : ''}` }))}
                value={clienteSel}
                onChange={(v) => setClienteSel(v)}
                placeholder="Seleccionar cliente..."
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalGenerar(false)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={generar} disabled={generando || !clienteSel} style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {generando ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vista && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setVista(null)}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '640px', maxWidth: '94%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Propuesta #{vista.id_propuesta} — {vista.cliente_nombre}</h3>
              <button onClick={() => setVista(null)} style={{ cursor: 'pointer' }}>Cerrar</button>
            </div>
            <p style={{ fontWeight: 600, margin: '10px 0 4px' }}>{vista.asunto}</p>
            <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #eee', fontSize: '0.9rem', marginBottom: '16px' }}>{vista.cuerpo}</div>
            <h4 style={{ marginBottom: '6px' }}>Libros ({vista.detalle?.length || 0})</h4>
            {(vista.detalle || []).map(d => (
              <div key={d.id_detalle} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', fontSize: '0.85rem' }}>
                <strong>{d.titulo}</strong> — {d.autor || ''} <span style={{ color: '#777' }}>({d.editorial || ''})</span> {d.es_novedad ? '🆕' : ''}
                {d.motivo && <div style={{ color: '#555', marginTop: '2px' }}>{d.motivo}</div>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setVista(null)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cerrar</button>
              {vista.estado === 'borrador' && <button onClick={() => { enviar(vista.id_propuesta); setVista(null); }} style={{ padding: '8px 14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enviar por mail</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropuestasBlock;
