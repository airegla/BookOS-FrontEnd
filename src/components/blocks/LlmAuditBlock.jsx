// ARCHIVO: LlmAuditBlock.jsx
// RUTA: frontend/src/components/blocks/LlmAuditBlock.jsx
// DESCRIPCIÓN: Vista (solo admin) del log de auditoría de llamadas LLM (llm_audit_log):
//              prompt, contexto, respuesta, modelo/proveedor, latencia y errores.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import DebugTag from '../../ui/DebugTag';

export const LlmAuditBlock = () => {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(null);
  const [modulo, setModulo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null);

  const cargar = async () => {
    setError(null);
    try {
      const data = await api.getLlmAudit(100, modulo);
      setFilas(Array.isArray(data) ? data : (data?.logs || []));
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [modulo]);

  const limpiar = async () => {
    if (!window.confirm('¿Borrar el log de auditoría LLM de más de 30 días?')) return;
    try {
      const r = await api.clearLlmAudit(30);
      setMsg(`✅ ${r.borradas || 0} registros borrados`);
      cargar();
    } catch (e) { setError(e.message); }
  };

  const truncar = (s, n = 120) => {
    const t = String(s || '');
    return t.length > n ? t.slice(0, n) + '…' : t;
  };

  const descargarCsv = (fila) => {
    const filas = [['Titulo', 'Autor'], ...(fila.libros || []).map((l) => [l.titulo, l.autor])];
    const csv = filas.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${fila.id}-libros.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="LlmAuditBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🧠 Auditoría LLM</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={modulo} onChange={(e) => setModulo(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="">Todos los módulos</option>
            <option value="asistente">asistente</option>
            <option value="propuesta">propuesta</option>
          </select>
          <button onClick={cargar} style={{ padding: '8px 12px', cursor: 'pointer' }}>🔄 Recargar</button>
          <button onClick={limpiar} style={{ padding: '8px 12px', cursor: 'pointer', color: '#c62828' }}>🗑 Limpiar (&gt;30 días)</button>
        </div>
      </div>
      {msg && <div style={{ background: '#e8f5e9', padding: '8px', borderRadius: '4px', margin: '8px 0' }}>{msg}</div>}
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', margin: '8px 0' }}>{error}</div>}

      {!filas ? <p>Cargando...</p> : (
        filas.length === 0 ? <p style={{ color: '#999' }}>Sin llamadas registradas todavía.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ background: '#e0e0e0' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Módulo</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Proveedor</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Modelo</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>ms</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Prompt</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Respuesta</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Error</th>
            </tr></thead>
            <tbody>
              {filas.map((f) => (
                <React.Fragment key={f.id}>
                  <tr style={{ borderBottom: '1px solid #eee', cursor: 'pointer', background: f.error_msg ? '#fff8f8' : '#fff' }}
                      onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                    <td style={{ padding: '8px' }}>#{f.id}</td>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(f.fecha).toLocaleString('es-AR')}</td>
                    <td style={{ padding: '8px' }}><span style={{ background: f.modulo === 'propuesta' ? '#e8eaf6' : '#e8f5e9', padding: '2px 6px', borderRadius: '8px', fontSize: '0.7rem' }}>{f.modulo}</span></td>
                    <td style={{ padding: '8px' }}>{f.proveedor || '—'}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{truncar(f.modelo_utilizado, 30) || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{f.tiempo_ms ?? '—'}</td>
                    <td style={{ padding: '8px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncar(f.prompt_resumen)}</td>
                    <td style={{ padding: '8px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truncar(f.respuesta_resumen)}</td>
                    <td style={{ padding: '8px', color: '#c62828', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.error_msg || ''}>{truncar(f.error_msg, 60) || '—'}</td>
                  </tr>
                  {expanded === f.id && (
                    <tr style={{ background: '#fafafa' }}>
                      <td colSpan={9} style={{ padding: '12px' }}>
                        <div style={{ marginBottom: '8px' }}><strong>Prompt completo:</strong><pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #eee', padding: '8px', borderRadius: '4px', fontSize: '0.78rem' }}>{f.prompt_enviado || f.prompt_resumen}</pre></div>
                        <div style={{ marginBottom: '8px' }}><strong>Respuesta:</strong><pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #eee', padding: '8px', borderRadius: '4px', fontSize: '0.78rem' }}>{f.respuesta_llm || f.respuesta_resumen}</pre></div>
                        {f.error_msg && <div style={{ color: '#c62828' }}><strong>Error:</strong> {f.error_msg}</div>}
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => setModal(f)} style={{ padding: '6px 12px', cursor: 'pointer' }}>📋 Ver consulta + listado de libros</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '560px', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📋 Consulta #{modal.id}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#666', margin: '8px 0' }}>{new Date(modal.fecha).toLocaleString('es-AR')} · {modal.modulo} · {modal.proveedor || '—'} · {truncar(modal.modelo_utilizado, 30) || '—'}</p>
            <div style={{ marginBottom: '12px' }}>
              <strong>Consulta:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.82rem', margin: '6px 0 0' }}>{modal.consulta || modal.prompt_resumen}</pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong>Libros ({(modal.libros || []).length})</strong>
              <button onClick={() => descargarCsv(modal)} style={{ padding: '6px 12px', cursor: 'pointer' }}>⬇ Descargar CSV</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead><tr style={{ background: '#eee' }}><th style={{ padding: '6px', textAlign: 'left' }}>Título</th><th style={{ padding: '6px', textAlign: 'left' }}>Autor</th></tr></thead>
              <tbody>
                {(modal.libros || []).length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: '8px', color: '#999' }}>Sin listado de libros para esta llamada.</td></tr>
                ) : (modal.libros || []).map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px' }}>{l.titulo}</td><td style={{ padding: '6px', color: '#555' }}>{l.autor}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
