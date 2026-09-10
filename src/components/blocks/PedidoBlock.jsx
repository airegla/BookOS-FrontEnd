// ARCHIVO: PedidoBlock.jsx
// RUTA: frontend/src/components/blocks/PedidoBlock.jsx
// DESCRIPCIÓN: Alta rápida de pedidos con cantidad/observaciones, edición (EAN13/cant/obs,
//              solo Pendiente) y badge de intentos (X/3) en las listas.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { usePagination } from '../../hooks/usePagination';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Pagination } from '../ui/Pagination';
import { SearchSelect } from '../ui/SearchSelect';
import { ESTADOS_PEDIDO } from '../../constants';
import DebugTag from '../../ui/DebugTag';

const colorEstado = (estado) => {
  switch (estado) {
    case 'Pendiente': return '#ed6c02';
    case 'Solicitado': return '#1976d2';
    case 'Ingresado': return '#2e7d32';
    case 'Notificado': return '#00838f';
    case 'Agotado': return '#c62828';
    case 'Cancelado': return '#757575';
    default: return '#666';
  }
};

// Badge "Intentos: X/3" (rojo si >= 2).
const IntentosBadge = ({ intentos, max = 3 }) => {
  const n = parseInt(intentos, 10) || 0;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold',
      color: '#fff', background: n >= max - 1 ? '#c62828' : '#8e24aa', whiteSpace: 'nowrap'
    }}>
      Intentos: {n}/{max}
    </span>
  );
};

export const PedidoBlock = ({ libroPrecargado, onClearPrecarga }) => {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [idClienteSelect, setIdClienteSelect] = useState('');
  const [ean13Legacy, setEan13Legacy] = useState('');
  const [cantidadAlta, setCantidadAlta] = useState(1);
  const [obsAlta, setObsAlta] = useState('');
  const [eanInput, setEanInput] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [showAlta, setShowAlta] = useState(false);
  const [editPedido, setEditPedido] = useState(null); // { id, ean13, cantidad, observaciones }
  const pag = usePagination(pedidos, (p) => `${p.cliente?.nombre || ''} ${p.ean13_legacy} ${p.titulo || ''} ${p.autor || ''} ${p.editorial || ''} ${p.estado} ${p.observaciones || ''}`, 8);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (libroPrecargado) {
      const ean = (libroPrecargado.ean13_legacy || libroPrecargado.EAN13 || '').toString().trim();
      if (ean) setEan13Legacy(ean);
    }
  }, [libroPrecargado]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.getPedidos(), api.getClientes()]);
      setPedidos(p); setClientes(c); setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { cargarDatos(); }, []);

  const handleAltaRapida = async (e) => {
    e.preventDefault();
    if (!idClienteSelect ||!ean13Legacy.trim()) return;
    try {
      await api.altaRapidaPedido({ id_cliente: idClienteSelect, ean13_legacy: ean13Legacy.trim(), cantidad: cantidadAlta, observaciones: obsAlta });
      setEan13Legacy(''); setCantidadAlta(1); setObsAlta(''); setShowAlta(false); if (onClearPrecarga) onClearPrecarga(); cargarDatos();
    } catch (e) { setError(e.message); }
  };

  const handleCambiarEstado = async (id, est) => {
    try { await api.updateEstadoPedido(id, est); cargarDatos(); } catch (e) { setError(e.message); }
  };

  const abrirEditar = (p) => {
    setEditPedido({ id: p.id_pedido, ean13: p.ean13_legacy || '', cantidad: p.cantidad ?? 1, observaciones: p.observaciones || '' });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { id, ean13, cantidad, observaciones } = editPedido;
    if (!ean13.trim()) return;
    try {
      await api.updateDatosPedido(id, { cantidad, observaciones });
      await api.updateEan13Pedido(id, ean13.trim());
      setEditPedido(null);
      cargarDatos();
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="PedidoBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestión de Pedidos</h2>
        <button onClick={() => setShowAlta(true)} style={{ padding: '8px 14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Crear pedido</button>
      </div>
      {libroPrecargado && <div style={{ padding: '10px 12px', backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: '6px', margin: '12px 0', fontSize: '0.9rem' }}>Precargado: <strong>{libroPrecargado.Titulo}</strong> — EAN13: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{ean13Legacy}</span>. Solo elegí el cliente.</div>}
      {error && <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

      {showAlta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAlta(false)}>
          <form onSubmit={handleAltaRapida} className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Alta Rápida de Pedido</h3>
            <label style={{ display: 'block', marginBottom: '10px' }}>Cliente *
              <SearchSelect
                options={clientes.map(c => ({ value: c.id_cliente, label: `${c.nombre} (ID: ${c.id_cliente})` }))}
                value={idClienteSelect}
                onChange={(v) => setIdClienteSelect(v)}
                placeholder="Seleccionar cliente..."
              />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>EAN13 *
              <input type="text" value={ean13Legacy} onChange={(e) => setEan13Legacy(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Cantidad
              <input type="number" min="1" value={cantidadAlta} onChange={(e) => setCantidadAlta(Math.max(1, parseInt(e.target.value, 10) || 1))} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '16px' }}>Observaciones
              <textarea rows={2} value={obsAlta} onChange={(e) => setObsAlta(e.target.value)} placeholder="Ej: regalo, dedicado, urgente, color de tapa..." style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAlta(false)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Crear Pedido</button>
            </div>
          </form>
        </div>
      )}

      {editPedido && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditPedido(null)}>
          <form onSubmit={guardarEdicion} className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Editar pedido #{editPedido.id}</h3>
            <p style={{ fontSize: '0.8rem', color: '#b26a00', margin: '0 0 12px' }}>Solo pedidos en estado Pendiente (mismo criterio que el EAN13).</p>
            <label style={{ display: 'block', marginBottom: '10px' }}>EAN13 *
              <input type="text" value={editPedido.ean13} onChange={(e) => setEditPedido({ ...editPedido, ean13: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Cantidad
              <input type="number" min="1" value={editPedido.cantidad} onChange={(e) => setEditPedido({ ...editPedido, cantidad: Math.max(1, parseInt(e.target.value, 10) || 1) })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '16px' }}>Observaciones
              <textarea rows={2} value={editPedido.observaciones || ''} onChange={(e) => setEditPedido({ ...editPedido, observaciones: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditPedido(null)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </form>
        </div>
      )}

      {loading? <p>Cargando...</p> : (
        <>
          <input
            placeholder="Buscar pedido (cliente, EAN, título, autor, obs...)"
            value={pag.query}
            onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
            style={{ width: '100%', maxWidth: '360px', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          {isMobile ? (
            <div>
              {pag.pageItems.length === 0 && <p style={{ color: '#999', fontSize: '0.9rem' }}>Sin pedidos.</p>}
              {pag.pageItems.map(p => (
                <div key={p.id_pedido} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '0.95rem' }}>{p.titulo || 'Sin título'}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>{[p.autor, p.editorial].filter(Boolean).join(' — ') || '—'}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', background: colorEstado(p.estado), flexShrink: 0 }}>{p.estado}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#333' }}>
                    <div>👤 <strong>{p.cliente?.nombre || `Cliente #${p.id_cliente}`}</strong> · Pedido #{p.id_pedido}</div>
                    <div style={{ fontFamily: 'monospace', marginTop: 2 }}>EAN: {p.ean13_legacy} {p.cantidad > 1 ? `× ${p.cantidad}` : ''}</div>
                    <div style={{ marginTop: 2 }}><IntentosBadge intentos={p.intentos_solicitud} /></div>
                    {p.observaciones && <div style={{ color: '#666', marginTop: 2, fontStyle: 'italic' }}>🗒️ {p.observaciones}</div>}
                    <div style={{ color: '#999', marginTop: 2 }}>{new Date(p.fecha_creacion).toLocaleDateString('es-AR')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <select value={p.estado} onChange={(e) => handleCambiarEstado(p.id_pedido, e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', background: '#fff' }}>
                      {ESTADOS_PEDIDO.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {p.estado === 'Pendiente' && <button type="button" onClick={() => abrirEditar(p)} style={{ padding: '8px 10px', border: '1px solid #ccc', background: '#fff', borderRadius: '6px', cursor: 'pointer' }} title="Editar EAN13 / cantidad / observaciones">✏️</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ backgroundColor: '#e0e0e0' }}><th style={{ padding: '10px' }}>ID</th><th style={{ padding: '10px' }}>Cliente</th><th style={{ padding: '10px' }}>EAN13</th><th style={{ padding: '10px' }}>Cant</th><th style={{ padding: '10px' }}>Título</th><th style={{ padding: '10px' }}>Autor</th><th style={{ padding: '10px' }}>Editorial</th><th style={{ padding: '10px' }}>Observaciones</th><th style={{ padding: '10px' }}>Intentos</th><th style={{ padding: '10px' }}>Fecha</th><th style={{ padding: '10px' }}>Estado</th><th style={{ padding: '10px' }}>Cambiar</th></tr></thead>
          <tbody>{pag.pageItems.map(p => (<tr key={p.id_pedido} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px' }}>#{p.id_pedido}</td>
            <td style={{ padding: '10px' }}>{p.cliente?.nombre || p.id_cliente}</td>
            <td style={{ padding: '10px', fontFamily: 'monospace' }}>{p.ean13_legacy}</td>
            <td style={{ padding: '10px' }}>{p.cantidad || 1}</td>
            <td style={{ padding: '10px', fontSize: '0.85rem' }}>{p.titulo || '—'}</td>
            <td style={{ padding: '10px', fontSize: '0.85rem' }}>{p.autor || '—'}</td>
            <td style={{ padding: '10px', fontSize: '0.85rem' }}>{p.editorial || '—'}</td>
            <td style={{ padding: '10px', fontSize: '0.8rem', color: '#666', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.observaciones || ''}>{p.observaciones || '—'}</td>
            <td style={{ padding: '10px' }}><IntentosBadge intentos={p.intentos_solicitud} /></td>
            <td style={{ padding: '10px' }}>{new Date(p.fecha_creacion).toLocaleDateString()}</td>
            <td style={{ padding: '10px' }}>{p.estado}</td>
            <td style={{ padding: '10px' }}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><select value={p.estado} onChange={(e) => handleCambiarEstado(p.id_pedido, e.target.value)}>{ESTADOS_PEDIDO.map(s => <option key={s} value={s}>{s}</option>)}</select>{p.estado === 'Pendiente' && <button type="button" onClick={() => abrirEditar(p)} title="Editar EAN13 / cantidad / observaciones" style={{ cursor: 'pointer', padding: '2px 8px' }}>✏️</button>}</div></td>
          </tr>))}</tbody>
        </table>
          )}
        <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
        </>
      )}
    </div>
  );
};