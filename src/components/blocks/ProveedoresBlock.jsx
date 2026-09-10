// ARCHIVO: ProveedoresBlock.jsx
// RUTA: frontend/src/components/blocks/ProveedoresBlock.jsx
// DESCRIPCIÓN: Vista Proveedores - CRUD proveedores_config (alta/edición en modal). id=1 (Control Empresa) protegido.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import DebugTag from '../../ui/DebugTag';

const FORM_VACIO = { nombre: '', email: '', tipo: 'distribuidora', prv_id_legacy: '', umbral_editorial: 5 };

export const ProveedoresBlock = () => {
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'crear' | { modo:'editar', id }
  const pag = usePagination(proveedores, (p) => `${p.nombre} ${p.email} ${p.tipo} ${p.prv_id_legacy || ''}`);

  const cargar = async () => {
    try { setProveedores(await api.getProveedores()); setError(null); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(FORM_VACIO); setModal('crear'); };
  const abrirEditar = (p) => {
    setForm({ nombre: p.nombre, email: p.email, tipo: p.tipo, prv_id_legacy: p.prv_id_legacy ?? '', umbral_editorial: p.umbral_editorial ?? 5 });
    setModal({ modo: 'editar', id: p.id });
  };

  const guardar = async (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      email: form.email,
      tipo: form.tipo,
      prv_id_legacy: form.prv_id_legacy ? parseInt(form.prv_id_legacy, 10) : null,
      umbral_editorial: parseInt(form.umbral_editorial, 10)
    };
    try {
      if (modal === 'crear') await api.createProveedor(payload);
      else await api.updateProveedor(modal.id, payload);
      setModal(null);
      cargar();
    } catch (e) { setError(e.message); }
  };

  const eliminar = async (p) => {
    if (!window.confirm(`¿Borrar "${p.nombre}"?`)) return;
    try { await api.deleteProveedor(p.id); cargar(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <DebugTag name="ProveedoresBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🏢 Proveedores / Editoriales - Config mails</h2>
        <button onClick={abrirCrear} style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Agregar</button>
      </div>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>Definís a dónde manda n8n. <strong>libreriaelmaltes@gmail.com</strong> es la bandeja de aprobación (id 1, no se puede borrar).</p>
      {error && <div style={{ background: '#ffebee', padding: '8px', color: '#c62828', borderRadius: '4px', marginBottom: '12px' }}>{error}</div>}

      <input
        placeholder="Buscar proveedor..."
        value={pag.query}
        onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
        style={{ width: '100%', maxWidth: '320px', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: '#fff' }}>
        <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '8px', textAlign: 'left' }}>ID</th><th style={{ padding: '8px', textAlign: 'left' }}>Nombre</th><th style={{ padding: '8px', textAlign: 'left' }}>Email</th><th style={{ padding: '8px', textAlign: 'left' }}>Tipo</th><th style={{ padding: '8px', textAlign: 'left' }}>prv_legacy</th><th style={{ padding: '8px', textAlign: 'left' }}>Umbral</th><th style={{ padding: '8px', textAlign: 'left' }}>Acciones</th></tr></thead>
        <tbody>{pag.pageItems.map(p => (
          <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px' }}>{p.id}</td>
            <td style={{ padding: '8px', fontWeight: 600 }}>{p.nombre} {p.id === 1 && '🔒'}</td>
            <td style={{ padding: '8px' }}>{p.email}</td>
            <td style={{ padding: '8px' }}>{p.tipo}</td>
            <td style={{ padding: '8px' }}>{p.prv_id_legacy || '-'}</td>
            <td style={{ padding: '8px' }}>{p.umbral_editorial}</td>
            <td style={{ padding: '8px' }}>
              <button onClick={() => abrirEditar(p)} style={{ marginRight: '6px', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}>Editar</button>
              {p.id !== 1 && <button onClick={() => eliminar(p)} style={{ fontSize: '0.75rem', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Borrar</button>}
            </td>
          </tr>
        ))}</tbody>
      </table>
      <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
          <form onSubmit={guardar} style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal === 'crear' ? 'Nuevo proveedor/editorial' : 'Editar proveedor'}</h3>
            <label style={{ display: 'block', marginBottom: '10px' }}>Nombre
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Email
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Tipo
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={{ width: '100%', padding: '8px' }}>
                <option value="distribuidora">distribuidora</option>
                <option value="editorial">editorial</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>prv_id legacy (opcional)
              <input value={form.prv_id_legacy} onChange={e => setForm({ ...form, prv_id_legacy: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '16px' }}>Umbral editorial
              <input type="number" value={form.umbral_editorial} onChange={e => setForm({ ...form, umbral_editorial: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setModal(null)} style={{ padding: '8px 14px', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProveedoresBlock;