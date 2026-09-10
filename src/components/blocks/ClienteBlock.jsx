// ARCHIVO: ClienteBlock.jsx
// RUTA: frontend/src/components/blocks/ClienteBlock.jsx
// DESCRIPCIÓN: Componente UI para alta, edición, listado y eliminación de clientes con sus temáticas de interés.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { SearchMultiSelect } from '../ui/SearchMultiSelect';
import { usePagination } from '../../hooks/usePagination';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Pagination } from '../ui/Pagination';
import DebugTag from '../../ui/DebugTag';

export const ClienteBlock = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    id_cliente: null,
    nombre: '',
    telefono: '',
    email: '',
    notas_preferencias: '',
    tematicasIds: []
  });
  const [historial, setHistorial] = useState(null);
  const [tematicas, setTematicas] = useState([]);
  const [modalCliente, setModalCliente] = useState(null);
  const pag = usePagination(clientes, (c) => `${c.nombre} ${c.email} ${c.telefono} ${(c.tematicas || []).map(t => t.nombre_tematica || '').join(' ')}`);
  const isMobile = useIsMobile();

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const data = await api.getClientes();
      setClientes(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    api.getTematicas().then(setTematicas).catch(() => {});
  }, []);

  const guardarCliente = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    const payload = {
      nombre: formData.nombre,
      telefono: formData.telefono,
      email: formData.email,
      notas_preferencias: formData.notas_preferencias || '',
      tematicasIds: formData.tematicasIds || []
    };

    try {
      if (modalCliente === 'crear') await api.createCliente(payload);
      else await api.updateCliente(modalCliente.id, payload);
      setModalCliente(null);
      limpiarFormulario();
      cargarClientes();
    } catch (err) {
      setError(err.message || 'Error al guardar el cliente');
    }
  };

  const abrirCrearCliente = () => {
    limpiarFormulario();
    setModalCliente('crear');
  };

  const abrirEditarCliente = (cliente) => {
    setFormData({
      id_cliente: cliente.id_cliente,
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      notas_preferencias: cliente.notas_preferencias || '',
      tematicasIds: cliente.tematicas ? cliente.tematicas.map(t => t.id_tematica) : []
    });
    setModalCliente({ modo: 'editar', id: cliente.id_cliente });
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    try {
      await api.deleteCliente(id);
      cargarClientes();
    } catch (err) {
      setError(err.message || 'Error al eliminar cliente');
    }
  };

  const limpiarFormulario = () => {
    setFormData({ id_cliente: null, nombre: '', telefono: '', email: '', notas_preferencias: '', tematicasIds: [] });
  };

  const verHistorial = async (cliente) => {
    setHistorial({ cliente, loading: true, data: null, error: null });
    try {
      const data = await api.getHistorial(cliente.id_cliente);
      setHistorial({ cliente, loading: false, data, error: null });
    } catch (err) {
      setHistorial({ cliente, loading: false, data: null, error: err.message });
    }
  };

  const borrarPropuesta = async (id) => {
    if (!window.confirm('¿Borrar esta propuesta? (solo se pueden borrar las que no fueron enviadas)')) return;
    try {
      await api.deletePropuesta(id);
      if (historial?.cliente) verHistorial(historial.cliente);
    } catch (err) {
      setError(err.message || 'Error al borrar la propuesta');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="ClienteBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Gestión de Clientes</h2>
        <button onClick={abrirCrearCliente} style={{ padding: '8px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Nuevo cliente</button>
      </div>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tabla de Clientes */}
      {loading ? (
        <p>Cargando clientes...</p>
      ) : (
        <>
          <input
            placeholder="Buscar cliente..."
            value={pag.query}
            onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
            style={{ width: '100%', maxWidth: '320px', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          {isMobile ? (
            <div>
              {pag.pageItems.length === 0 && <p style={{ color: '#999', fontSize: '0.9rem' }}>Sin clientes.</p>}
              {pag.pageItems.map(c => (
                <div key={c.id_cliente} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '1rem' }}>{c.nombre}</strong>
                    <span style={{ color: '#999', fontSize: '0.75rem' }}>#{c.id_cliente}</span>
                  </div>
                  {c.email && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 2 }}>✉️ {c.email}</div>}
                  {c.telefono && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 2 }}>📞 {c.telefono}</div>}
                  <div style={{ fontSize: '0.8rem', color: '#777', marginTop: 6 }}>
                    {c.tematicas && c.tematicas.length > 0
                      ? c.tematicas.map(t => t.nombre_tematica || `ID:${t.id_tematica}`).join(', ')
                      : 'Sin temáticas'}
                  </div>
                  {c.notas_preferencias && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4, fontStyle: 'italic' }}>🗒️ {c.notas_preferencias}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => verHistorial(c)} style={{ flex: 1, padding: '8px', background: '#0288d1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Historial</button>
                    <button onClick={() => abrirEditarCliente(c)} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => handleEliminar(c.id_cliente)} style={{ padding: '8px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#e0e0e0', borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '10px' }}>ID</th>
              <th style={{ padding: '10px' }}>Nombre</th>
              <th style={{ padding: '10px' }}>Teléfono</th>
              <th style={{ padding: '10px' }}>Email</th>
              <th style={{ padding: '10px' }}>Temáticas</th>
              <th style={{ padding: '10px' }}>Notas</th>
              <th style={{ padding: '10px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pag.pageItems.map((c) => (
              <tr key={c.id_cliente} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{c.id_cliente}</td>
                <td style={{ padding: '10px', fontWeight: '500' }}>{c.nombre}</td>
                <td style={{ padding: '10px' }}>{c.telefono || '-'}</td>
                <td style={{ padding: '10px' }}>{c.email || '-'}</td>
                <td style={{ padding: '10px' }}>
                  {c.tematicas && c.tematicas.length > 0
                    ? c.tematicas.map(t => t.nombre_tematica || `ID:${t.id_tematica}`).join(', ')
                    : 'Ninguna'}
                </td>
                <td style={{ padding: '10px', fontSize: '0.8rem', color: '#666', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.notas_preferencias || ''}>{c.notas_preferencias || '-'}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => verHistorial(c)} style={{ marginRight: '6px', padding: '4px 8px', cursor: 'pointer', backgroundColor: '#0288d1', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    Historial
                  </button>
                  <button onClick={() => abrirEditarCliente(c)} style={{ marginRight: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(c.id_cliente)} style={{ padding: '4px 8px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
        <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
        </>
      )}

      {modalCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModalCliente(null)}>
          <form onSubmit={guardarCliente} className="modal-card" style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modalCliente === 'crear' ? 'Nuevo Cliente' : 'Editar Cliente'}</h3>
            <label style={{ display: 'block', marginBottom: '10px' }}>Nombre *
              <input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Teléfono
              <input value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Email
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Notas de Preferencias y Perfil Comercial
              <textarea
                rows={3}
                maxLength={800}
                value={formData.notas_preferencias || ''}
                onChange={(e) => setFormData({ ...formData, notas_preferencias: e.target.value })}
                placeholder="Autoras/es favoritos, géneros, regalos, lo que sabés del cliente..."
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#999' }}>Se usa para perfilar el cliente (recomendaciones/propuestas). {(formData.notas_preferencias || '').length}/800</span>
            </label>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '4px' }}>Temáticas de interés</label>
              <SearchMultiSelect
                options={tematicas.map(t => ({ value: t.id, label: t.nombre }))}
                value={formData.tematicasIds || []}
                onChange={(ids) => setFormData({ ...formData, tematicasIds: ids })}
                placeholder="Seleccionar temáticas..."
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModalCliente(null)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{modalCliente === 'crear' ? 'Guardar' : 'Actualizar'}</button>
            </div>
          </form>
        </div>
      )}

      {historial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setHistorial(null)}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', maxWidth: '920px', width: '92%', maxHeight: '82vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>Historial de {historial.cliente?.nombre}</h3>
              <button onClick={() => setHistorial(null)} style={{ cursor: 'pointer' }}>Cerrar</button>
            </div>
            {historial.loading && <p>Cargando historial...</p>}
            {historial.error && <p style={{ color: '#c62828' }}>{historial.error}</p>}
            {historial.data && (
              <>
                <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#555' }}>
                  Temáticas: {historial.data.cliente.tematicas?.length ? historial.data.cliente.tematicas.map(t => t.nombre_tematica || t.id_tematica).join(', ') : 'Ninguna'}
                </p>
                {historial.data.cliente.notas_preferencias && (
                  <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>🗒️ {historial.data.cliente.notas_preferencias}</p>
                )}
                <h4 style={{ marginBottom: '6px' }}>Pedidos ({historial.data.pedidos.length})</h4>
                {historial.data.pedidos.length === 0 ? <p style={{ color: '#999', fontSize: '0.85rem' }}>Sin pedidos.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                    <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '6px', textAlign: 'left' }}>ID</th><th style={{ padding: '6px', textAlign: 'left' }}>EAN13</th><th style={{ padding: '6px', textAlign: 'left' }}>Título</th><th style={{ padding: '6px', textAlign: 'left' }}>Autor</th><th style={{ padding: '6px', textAlign: 'left' }}>Editorial</th><th style={{ padding: '6px', textAlign: 'left' }}>Estado</th><th style={{ padding: '6px', textAlign: 'left' }}>Fecha</th></tr></thead>
                    <tbody>{historial.data.pedidos.map(p => (
                      <tr key={p.id_pedido} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px' }}>#{p.id_pedido}</td>
                        <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.ean13_legacy}</td>
                        <td style={{ padding: '6px' }}>{p.titulo || '—'}</td>
                        <td style={{ padding: '6px' }}>{p.autor || '—'}</td>
                        <td style={{ padding: '6px' }}>{p.editorial || '—'}</td>
                        <td style={{ padding: '6px' }}>{p.estado}</td>
                        <td style={{ padding: '6px' }}>{new Date(p.fecha_creacion).toLocaleDateString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
                <h4 style={{ marginBottom: '6px' }}>Recomendaciones registradas ({historial.data.recomendaciones.length})</h4>
                {historial.data.recomendaciones.length === 0 ? <p style={{ color: '#999', fontSize: '0.85rem' }}>Sin recomendaciones.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '6px', textAlign: 'left' }}>EAN13</th><th style={{ padding: '6px', textAlign: 'left' }}>Fecha</th></tr></thead>
                    <tbody>{historial.data.recomendaciones.map(r => (
                      <tr key={r.id_registro} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px', fontFamily: 'monospace' }}>{r.ean13_recomendado}</td>
                        <td style={{ padding: '6px' }}>{new Date(r.fecha_notificacion).toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
                <h4 style={{ marginBottom: '6px', marginTop: '16px' }}>Propuestas ({historial.data.propuestas?.length || 0})</h4>
                {!historial.data.propuestas || historial.data.propuestas.length === 0 ? <p style={{ color: '#999', fontSize: '0.85rem' }}>Sin propuestas.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '6px', textAlign: 'left' }}>#</th><th style={{ padding: '6px', textAlign: 'left' }}>Fecha</th><th style={{ padding: '6px', textAlign: 'left' }}>Estado</th><th style={{ padding: '6px', textAlign: 'left' }}>Libros</th><th style={{ padding: '6px', textAlign: 'left' }}>Asunto</th><th style={{ padding: '6px', textAlign: 'left' }}>Acciones</th></tr></thead>
                    <tbody>{historial.data.propuestas.map(pr => (
                      <tr key={pr.id_propuesta} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px' }}>#{pr.id_propuesta}</td>
                        <td style={{ padding: '6px' }}>{new Date(pr.fecha_generacion).toLocaleDateString()}</td>
                        <td style={{ padding: '6px' }}>{pr.estado}</td>
                        <td style={{ padding: '6px' }}>{pr.total_libros}</td>
                        <td style={{ padding: '6px' }}>{pr.asunto || '—'}</td>
                        <td style={{ padding: '6px' }}>
                          {pr.estado === 'borrador' && (
                            <button type="button" onClick={() => borrarPropuesta(pr.id_propuesta)} style={{ padding: '3px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Borrar</button>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};