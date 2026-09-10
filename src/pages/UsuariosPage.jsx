// BookOS - UsuariosPage.jsx
// ruta: bookos/frontend/src/pages/UsuariosPage.jsx
// descripcion: ABM de usuarios con la regla indegradable visible: el ultimo admin
//   no se puede borrar, desactivar ni degradar (el backend lo bloquea).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { usuariosApi } from '../api/api';

export default function UsuariosPage({ esAdmin }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const res = await usuariosApi.listar();
      setUsuarios(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  if (!esAdmin) {
    return <p className="text-muted">Solo administradores gestionan usuarios.</p>;
  }

  const guardar = async () => {
    try {
      await usuariosApi.crear(form);
      setModal(false);
      setForm({});
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const cambiarRol = async (usuario) => {
    const nuevoRol = usuario.rol === 'admin' ? 'vendedor' : 'admin';
    try {
      await usuariosApi.actualizar(usuario.id, { rol: nuevoRol });
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const eliminar = async (usuario) => {
    try {
      await usuariosApi.eliminar(usuario.id);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'email', titulo: 'Email' },
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'rol', titulo: 'Rol' },
    { clave: 'acciones', titulo: '', render: (u) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => cambiarRol(u)}>
          {u.rol === 'admin' ? 'Degradar' : 'Hacer admin'}
        </button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(u)}>
          Eliminar
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="UsuariosPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>Nuevo usuario</button>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}
      <p className="text-xs text-muted mb-3">Regla indegradable: no se puede eliminar, desactivar ni degradar al ultimo admin.</p>
      <Table columnas={columnas} filas={usuarios} />

      <Modal abierto={modal} onClose={() => setModal(false)} titulo="Nuevo usuario" ancho="420px"
        footer={<button type="button" className="btn btn-primary" onClick={guardar}>Crear</button>}
      >
        <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Rol</span>
          <select className="input-os" value={form.rol || 'vendedor'} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="vendedor">vendedor</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <Input label="Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Modal>
    </div>
  );
}
