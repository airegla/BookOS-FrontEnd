// ARCHIVO: RadarBlock.jsx
// RUTA: frontend/src/components/blocks/RadarBlock.jsx
// DESCRIPCIÓN: Radar FIX - muestra todo, con debug y botón recargar.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import DebugTag from '../../ui/DebugTag';
import { useIsMobile } from '../../hooks/useIsMobile';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';

export const RadarBlock = () => {
  const [pedidos, setPedidos] = useState([]);
  const [radar, setRadar] = useState([]);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificandoId, setNotificandoId] = useState(null);
  const [ultimoEnvio, setUltimoEnvio] = useState(null);
  const [filtro, setFiltro] = useState('');
  const isMobile = useIsMobile();

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pedidosData, radarData, recsData] = await Promise.all([
        api.getPedidos().catch(e => { console.error('pedidos', e); return []; }),
        api.getRadarIngresos().catch(() => []),
        api.getRecomendaciones().catch(() => [])
      ]);
      // Backend puede devolver {pedidos: []} o []
      const listaPedidos = Array.isArray(pedidosData)? pedidosData : (pedidosData.pedidos || pedidosData.data || []);
      const listaRadar = Array.isArray(radarData)? radarData : (radarData.data || []);
      console.log('[Radar] pedidos', listaPedidos.length, 'radar', listaRadar.length);
      setPedidos(listaPedidos);
      setRadar(listaRadar);
      setRecomendaciones(Array.isArray(recsData)? recsData : (recsData.data || []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const q = filtro.trim().toLowerCase();
  const pedidosFiltrados = q
    ? pedidos.filter(p => `${p.cliente?.nombre || ''} ${p.ean13_legacy} ${p.titulo || ''} ${p.estado}`.toLowerCase().includes(q))
    : pedidos;

  const solicitados = pedidosFiltrados.filter(p => p.estado === 'Solicitado');
  const ingresados = pedidosFiltrados.length ? pedidosFiltrados.filter(p => p.estado === 'Ingresado') : radar;
  const notificados = pedidosFiltrados.filter(p => p.estado === 'Notificado').slice(0, 300);
  const pendientes = pedidosFiltrados.filter(p => p.estado === 'Pendiente');

  // Paginación independiente por sección (el Pagination no se muestra si hay <= 1 página).
  const radarSearch = (p) => `${p.cliente?.nombre || ''} ${p.ean13_legacy || p.ean13 || ''} ${p.titulo || ''} ${p.estado} #${p.id_pedido || p.id || ''}`;
  const PAG = 8;
  const pagPend = usePagination(pendientes, radarSearch, PAG);
  const pagSoli = usePagination(solicitados, radarSearch, PAG);
  const pagIngr = usePagination(ingresados, radarSearch, PAG);
  const pagNoti = usePagination(notificados, radarSearch, PAG);

  const handleMarcarIngresado = async (id) => { await api.updateEstadoPedido(id, 'Ingresado'); cargar(); };
  const handleNotificar = async (id) => {
    setNotificandoId(id);
    try {
      const result = await api.notificarIngreso(id);
      setUltimoEnvio(result);
      cargar();
    } catch (e) { setError(e.message); }
    finally { setNotificandoId(null); }
  };

  const descargarCsv = async (estado) => {
    try {
      const csv = await api.exportPedidosCsv(estado);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos_${estado || 'todos'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  const Tabla = ({ lista, tipo }) => {
    if (!lista || lista.length === 0) return <p style={{ color: '#999', fontSize: '0.9rem' }}>Sin pedidos en {tipo}. {tipo==='Pendiente' && 'Creá uno en pestaña Pedidos.'}</p>;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '8px', textAlign: 'left' }}>ID</th><th>Cliente</th><th>EAN13</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>
          {lista.map(p => (
            <tr key={p.id_pedido || p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>#{p.id_pedido || p.id}</td>
              <td style={{ padding: '8px' }}>{p.cliente?.nombre || p.nombre_cliente || '-'}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.ean13_legacy || p.ean13 || '-'}</td>
              <td style={{ padding: '8px' }}><span style={{ background: '#eee', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>{p.estado}</span></td>
              <td style={{ padding: '8px' }}>
                {p.estado === 'Pendiente' && <span style={{ fontSize: '0.75rem', color: '#999' }}>Esperando envío proveedor</span>}
                {p.estado === 'Solicitado' && <button onClick={() => handleMarcarIngresado(p.id_pedido)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px' }}>→ Ingresado</button>}
                {p.estado === 'Ingresado' && <button disabled={notificandoId===p.id_pedido} onClick={() => handleNotificar(p.id_pedido)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px' }}>{notificandoId===p.id_pedido? 'Enviando...' : '📧 Notificar'}</button>}
                {p.estado === 'Notificado' && <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.75rem' }}>Avisado</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  // Sección con su tabla paginada. Sin estado propio: recibe la paginación desde el padre.
  const Seccion = ({ titulo, color, lista, pag }) => (
    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0', minWidth: 0 }}>
      <h3 style={{ marginTop: 0, color: color || '#333' }}>{titulo} ({lista.length})</h3>
      <Tabla lista={pag.pageItems} tipo={titulo} />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
      </div>
    </div>
  );
  const [accion, setAccion] = useState(null);       // nombre de la acción corriendo
  const [resultadoAccion, setResultadoAccion] = useState(null);

  const resumenAccion = (nombre, r) => {
    switch (nombre) {
      case 'despachar': return `Pedidos despachados: ${r.pedidos_despachados} | Grupos: ${r.grupos} | Expirados a Agotado: ${r.expirados}`;
      case 'verificar': return `Revisados: ${r.revisados} | Pasaron a Ingresado: ${r.actualizados}`;
      case 'notificarIngresos': return `Grupos: ${r.grupos} | Mails enviados: ${r.enviados} | Sin email (marcados Notificado): ${r.sin_email}`;
      case 'notificarAgotados': return `Grupos: ${r.grupos} | Mails enviados: ${r.enviados} | Sin email: ${r.sin_email}`;
      default: return JSON.stringify(r).slice(0, 200);
    }
  };

  const ejecutarAccion = async (nombre, fn) => {
    setAccion(nombre);
    setResultadoAccion(null);
    setError(null);
    try {
      const r = await fn();
      setResultadoAccion({ nombre, texto: resumenAccion(nombre, r) });
      cargar();
    } catch (e) { setError(e.message); }
    finally { setAccion(null); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="RadarBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📨 Radar / Avisos</h2>
        <button onClick={cargar} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🔄 Recargar</button>
      </div>
      {/* Acciones manuales (V3) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
        <button disabled={!!accion} onClick={() => ejecutarAccion('despachar', () => api.despacharPendientes())} style={{ padding: '8px 12px', background: '#6a1b9a', color: '#fff', border: 'none', borderRadius: '4px', cursor: accion ? 'not-allowed' : 'pointer' }}>🚀 Despachar Pendientes a Proveedores</button>
        <button disabled={!!accion} onClick={() => ejecutarAccion('verificar', () => api.verificarIngresos())} style={{ padding: '8px 12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: accion ? 'not-allowed' : 'pointer' }}>📦 Verificar Ingresos</button>
        <button disabled={!!accion} onClick={() => ejecutarAccion('notificarIngresos', () => api.notificarIngresos())} style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: accion ? 'not-allowed' : 'pointer' }}>📧 Notificar Ingresos (consolidado)</button>
        <button disabled={!!accion} onClick={() => ejecutarAccion('notificarAgotados', () => api.notificarAgotados())} style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: accion ? 'not-allowed' : 'pointer' }}>⚠️ Notificar Agotados</button>
        {accion && <span style={{ color: '#555', fontSize: '0.85rem' }}>Procesando...</span>}
      </div>
      {resultadoAccion && <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '0.85rem' }}>✅ {resultadoAccion.texto}</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
        <input
          placeholder="Filtrar (cliente, EAN, título, estado)..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={() => descargarCsv('Pendiente')} style={{ padding: '8px 10px', fontSize: '0.8rem' }}>⬇ CSV Pendientes</button>
        <button onClick={() => descargarCsv('Solicitado')} style={{ padding: '8px 10px', fontSize: '0.8rem' }}>⬇ CSV Solicitados</button>
        <button onClick={() => descargarCsv('Notificado')} style={{ padding: '8px 10px', fontSize: '0.8rem' }}>⬇ CSV Notificados</button>
      </div>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>{error} — revisá backend en http://localhost:3000/api/pedidos</div>}
      {ultimoEnvio && <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '0.85rem' }}>✅ Mail a {ultimoEnvio.cliente?.nombre} — {ultimoEnvio.email?.to} {ultimoEnvio.email?.previewUrl && <a href={ultimoEnvio.email.previewUrl} target="_blank">Ver preview</a>}</div>}
      {loading? <p>Cargando...</p> : (
        <>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Total pedidos: {pedidos.length} | Pendiente: {pendientes.length} | Solicitado: {solicitados.length} | Ingresado: {ingresados.length} | Notificado: {notificados.length}</p>
          {/* Una sección tras otra en mobile (evita romper el ancho); 2 columnas en desktop. */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <Seccion titulo="Pendiente" color="#ef6c00" lista={pendientes} pag={pagPend} />
            <Seccion titulo="Solicitado" color="#ef6c00" lista={solicitados} pag={pagSoli} />
            <Seccion titulo="Ingresado" color="#2e7d32" lista={ingresados} pag={pagIngr} />
            <Seccion titulo="Notificado" color="#333" lista={notificados} pag={pagNoti} />
          </div>
        </>
      )}
    </div>
  );
};