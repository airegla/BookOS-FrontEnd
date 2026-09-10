// ARCHIVO: CatalogoBlock.jsx
// RUTA: frontend/src/components/blocks/CatalogoBlock.jsx
// DESCRIPCIÓN: Vista de administración del catálogo enriquecido: tabla con buscador y
//              paginador, modal para ver/editar, y borrado (se regenera solo si sigue en stock).

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import DebugTag from '../../ui/DebugTag';

const CONFIANZA_COLOR = {
  alta: '#2e7d32',
  media: '#ef6c00',
  baja: '#c62828',
  sin_fuente: '#9e9e9e'
};

export const CatalogoBlock = () => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [edicion, setEdicion] = useState(null);   // { modo: 'ver'|'editar', item }
  const [form, setForm] = useState(null);
  const [msj, setMsj] = useState(null);

  const pag = usePagination(registros, (r) => `${r.titulo} ${r.ean13} ${r.lbr_id} ${r.confianza} ${r.proveedor_generador}`, 10);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCatalogo();
      setRegistros(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirVer = async (item) => {
    setMsj(null);
    try {
      const detalle = await api.getCatalogoItem(item.id);
      setForm(detalle);
      setEdicion({ modo: 'ver', item });
    } catch (e) {
      setError(e.message || 'Error al cargar el detalle');
    }
  };

  const abrirEditar = async (item) => {
    setMsj(null);
    try {
      const detalle = await api.getCatalogoItem(item.id);
      setForm(detalle);
      setEdicion({ modo: 'editar', item });
    } catch (e) {
      setError(e.message || 'Error al cargar el detalle');
    }
  };

  const guardar = async () => {
    setMsj(null);
    try {
      await api.updateCatalogoItem(edicion.item.id, {
        titulo: form.titulo,
        ean13: form.ean13,
        confianza: form.confianza,
        digesto_texto: form.digesto_texto,
        digesto_autor: form.digesto_autor,
        fuente_texto: form.fuente_texto,
        revision_pendiente: form.revision_pendiente ? 1 : 0
      });
      setEdicion(null);
      setMsj('✅ Registro actualizado (el embedding se invalida hasta regenerarse)');
      cargar();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    }
  };

  const borrar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.titulo}" del catálogo enriquecido?`)) return;
    setMsj(null);
    try {
      const r = await api.deleteCatalogoItem(item.id);
      setMsj(r.regenerara
        ? `🗑 Eliminado. Sigue en stock en legacy: se regenerará en la próxima pasada.`
        : '🗑 Eliminado (ya no está en stock en legacy).');
      cargar();
    } catch (e) {
      setError(e.message || 'Error al eliminar');
    }
  };

  const campo = (label, valor) => valor ? <span>{valor}</span> : <span style={{ color: '#bbb' }}>—</span>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <DebugTag name="CatalogoBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🗂 Catálogo enriquecido</h2>
        <button onClick={cargar} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🔄 Recargar</button>
      </div>

      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', margin: '12px 0' }}>{error}</div>}
      {msj && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '4px', margin: '12px 0' }}>{msj}</div>}

      <div style={{ margin: '12px 0' }}>
        <input
          placeholder="Buscar por título, EAN, lbr_id, confianza..."
          value={pag.query}
          onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{registros.length} registros</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th style={th}>ID</th>
                <th style={th}>lbr_id</th>
                <th style={th}>Título</th>
                <th style={th}>EAN13</th>
                <th style={th}>Confianza</th>
                <th style={th}>Proveedor</th>
                <th style={th}>Rev.</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pag.pageItems.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>#{r.id}</td>
                  <td style={td}>{r.lbr_id}</td>
                  <td style={td}>{r.titulo}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{r.ean13}</td>
                  <td style={td}>
                    <span style={{ background: CONFIANZA_COLOR[r.confianza] || '#999', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>{r.confianza}</span>
                  </td>
                  <td style={td}>{r.proveedor_generador}</td>
                  <td style={td}>{r.revision_pendiente ? '⚠️' : ''}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirVer(r)} style={btn}>Ver</button>
                    <button onClick={() => abrirEditar(r)} style={{ ...btn, background: '#1976d2' }}>Editar</button>
                    <button onClick={() => borrar(r)} style={{ ...btn, background: '#c62828' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {pag.pageItems.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, color: '#999' }}>Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
        </>
      )}

      {edicion && form && (
        <div style={overlay} onClick={() => setEdicion(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {edicion.modo === 'ver' ? 'Ver registro' : 'Editar registro'} #{form.id}
            </h3>

            <div style={row}><b>lbr_id:</b> {form.lbr_id}</div>
            <div style={row}><b>Título:</b> {' '}
              {edicion.modo === 'ver' ? campo('', form.titulo) : (
                <input value={form.titulo || ''} onChange={(e) => setForm({ ...form, titulo: e.target.value })} style={input} />
              )}
            </div>
            <div style={row}><b>EAN13:</b> {' '}
              {edicion.modo === 'ver' ? campo('', form.ean13) : (
                <input value={form.ean13 || ''} onChange={(e) => setForm({ ...form, ean13: e.target.value })} style={input} />
              )}
            </div>
            <div style={row}><b>Confianza:</b> {' '}
              {edicion.modo === 'ver' ? campo('', form.confianza) : (
                <select value={form.confianza || 'sin_fuente'} onChange={(e) => setForm({ ...form, confianza: e.target.value })} style={input}>
                  <option value="alta">alta</option>
                  <option value="media">media</option>
                  <option value="baja">baja</option>
                  <option value="sin_fuente">sin_fuente</option>
                </select>
              )}
            </div>
            <div style={row}><b>Proveedor:</b> {form.proveedor_generador || '—'} · <b>Modelo:</b> {form.modelo_generador || '—'}</div>

            <div style={row}>
              <label style={{ display: 'block' }}><b>Digesto texto (sinopsis):</b></label>
              {edicion.modo === 'ver'
                ? <p style={{ whiteSpace: 'pre-wrap', maxHeight: '160px', overflow: 'auto', background: '#fafafa', padding: '8px' }}>{form.digesto_texto || '—'}</p>
                : <textarea rows={6} value={form.digesto_texto || ''} onChange={(e) => setForm({ ...form, digesto_texto: e.target.value })} style={{ ...input, minHeight: '120px' }} />}
            </div>

            <div style={row}>
              <label style={{ display: 'block' }}><b>Digesto autor:</b></label>
              {edicion.modo === 'ver'
                ? <p style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'auto', background: '#fafafa', padding: '8px' }}>{form.digesto_autor || '—'}</p>
                : <textarea rows={3} value={form.digesto_autor || ''} onChange={(e) => setForm({ ...form, digesto_autor: e.target.value })} style={input} />}
            </div>

            <div style={row}><b>Fecha actualización:</b> {form.fecha_actualizacion || '—'}</div>

            {edicion.modo === 'editar' && (
              <label style={{ display: 'block', marginBottom: '12px' }}>
                <input type="checkbox" checked={!!form.revision_pendiente} onChange={(e) => setForm({ ...form, revision_pendiente: e.target.checked })} /> Revision pendiente
              </label>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEdicion(null)} style={btnPlain}>Cerrar</button>
              {edicion.modo === 'editar' && <button onClick={guardar} style={{ ...btn, background: '#1976d2' }}>Guardar</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const th = { padding: '8px', textAlign: 'left' };
const td = { padding: '8px' };
const btn = { padding: '4px 8px', fontSize: '0.72rem', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', background: '#666' };
const btnPlain = { padding: '8px 14px', cursor: 'pointer' };
const input = { width: '100%', padding: '8px', boxSizing: 'border-box' };
const row = { marginBottom: '10px', fontSize: '0.88rem' };
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal = { background: '#fff', borderRadius: '8px', padding: '20px', width: '640px', maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto' };
