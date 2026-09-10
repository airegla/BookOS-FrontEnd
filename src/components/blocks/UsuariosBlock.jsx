// ARCHIVO: UsuariosBlock.jsx
// RUTA: frontend/src/components/blocks/UsuariosBlock.jsx
// DESCRIPCIÓN: CRUD de usuarios (admin). Alta/edición en modal.

import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../ui/Pagination';
import DebugTag from '../../ui/DebugTag';

const FORM_VACIO = { usuario: '', password: '', nombre: '', rol: 'vendedor', activo: 1 };

export const UsuariosBlock = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // 'crear' | { modo:'editar', id }
  const [form, setForm] = useState(FORM_VACIO);
  const pag = usePagination(usuarios, (u) => `${u.usuario} ${u.nombre || ''} ${u.rol}`);

  const cargar = async () => {
    setLoading(true);
    try { setUsuarios(await api.getUsuarios()); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => { setForm(FORM_VACIO); setModal('crear'); };
  const abrirEditar = (u) => {
    setForm({ usuario: u.usuario, password: '', nombre: u.nombre || '', rol: u.rol, activo: u.activo });
    setModal({ modo: 'editar', id: u.id_usuario });
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'crear') await api.createUsuario(form);
      else await api.updateUsuario(modal.id, form);
      setModal(null);
      cargar();
    } catch (e) { setError(e.message); }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar el usuario "${u.usuario}"?`)) return;
    try { await api.deleteUsuario(u.id_usuario); cargar(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <DebugTag name="UsuariosBlock.jsx" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>👤 Usuarios</h2>
        <button onClick={abrirCrear} style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Nuevo usuario</button>
      </div>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>{error}</div>}

      {loading ? <p>Cargando...</p> : (
        <>
          <input
            placeholder="Buscar usuario..."
            value={pag.query}
            onChange={(e) => { pag.setQuery(e.target.value); pag.setPage(1); }}
            style={{ width: '100%', maxWidth: '280px', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead><tr style={{ background: '#e0e0e0' }}><th style={{ padding: '10px', textAlign: 'left' }}>ID</th><th style={{ padding: '10px', textAlign: 'left' }}>Usuario</th><th style={{ padding: '10px', textAlign: 'left' }}>Nombre</th><th style={{ padding: '10px', textAlign: 'left' }}>Rol</th><th style={{ padding: '10px', textAlign: 'left' }}>Activo</th><th style={{ padding: '10px', textAlign: 'left' }}>Acciones</th></tr></thead>
          <tbody>
            {pag.pageItems.map(u => (
              <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{u.id_usuario}</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>{u.usuario}</td>
                <td style={{ padding: '10px' }}>{u.nombre || '—'}</td>
                <td style={{ padding: '10px' }}>{u.rol}</td>
                <td style={{ padding: '10px' }}>{u.activo ? '✅' : '❌'}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => abrirEditar(u)} style={{ marginRight: '6px', padding: '4px 8px', cursor: 'pointer' }}>Editar</button>
                  {u.id_usuario !== 1 && <button onClick={() => eliminar(u)} style={{ padding: '4px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={pag.page} totalPages={pag.totalPages} onChange={pag.setPage} />
        </>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
          <form onSubmit={guardar} style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '360px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}</h3>
            <label style={{ display: 'block', marginBottom: '10px' }}>Usuario
              <input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} disabled={modal !== 'crear'} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Contraseña {modal !== 'crear' && <span style={{ color: '#999', fontSize: '0.8rem' }}>(dejar vacío para no cambiar)</span>}
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Nombre
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: '10px' }}>Rol
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} style={{ width: '100%', padding: '8px' }}>
                <option value="vendedor">vendedor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <input type="checkbox" checked={!!form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked ? 1 : 0 })} />
              Activo
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

export default UsuariosBlock;
