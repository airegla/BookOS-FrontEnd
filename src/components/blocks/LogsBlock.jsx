// ARCHIVO: LogsBlock.jsx
// RUTA: frontend/src/components/blocks/LogsBlock.jsx
// DESCRIPCIÓN: Vista de logs de actividad (solo admin). Lee y permite limpiar el log de archivo.

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api';
import DebugTag from '../../ui/DebugTag';

export const LogsBlock = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLogs(300);
      setLogs(data.logs || []);
    } catch (e) {
      setError(e.message || 'Error al cargar logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const limpiar = async () => {
    if (!window.confirm('¿Limpiar todos los logs de actividad?')) return;
    try {
      await api.clearLogs();
      setLogs([]);
    } catch (e) {
      setError(e.message || 'Error al limpiar logs');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <DebugTag name="LogsBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0 }}>📋 Logs de actividad</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={cargar} style={{ padding: '8px 14px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Recargar</button>
          <button onClick={limpiar} style={{ padding: '8px 14px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Limpiar logs</button>
        </div>
      </div>

      {error && <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '12px' }}>{error}</div>}
      {loading && <p style={{ color: '#999' }}>Cargando…</p>}
      {!loading && logs.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>Sin logs todavía.</p>}

      {logs.length > 0 && (
        <div style={{ background: '#111', color: '#e0e0e0', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '70vh', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {logs.map((l, i) => {
            const rest = Object.entries(l || {})
              .filter(([k]) => !['fecha', 'tipo'].includes(k))
              .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(' ');
            return (
              <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #222' }}>
                <span style={{ color: '#888' }}>{(l.fecha || '').slice(11, 19)}</span>{' '}
                <span style={{ color: '#4fc3f7' }}>{l.tipo}</span>{' '}
                <span style={{ color: '#bbb' }}>{rest}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LogsBlock;
