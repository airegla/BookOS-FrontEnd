// BookOS - ProveedoresPage.jsx
// ruta: bookos/frontend/src/pages/ProveedoresPage.jsx
// descripcion: ABM de proveedores (regla bookerp: no se puede borrar si tiene
//   compras asociadas).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { proveedoresApi } from '../api/api';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const res = await proveedoresApi.listar();
      setProveedores(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const abrirNuevo = () => { setEditando(null); setForm({ activo: true }); setModal(true); };
  const abrirEditar = (p) => { setEditando(p); setForm(p); setModal(true); };

  const guardar = async () => {
    try {
      if (editando) await proveedoresApi.actualizar(editando.id, form);
      else await proveedoresApi.crear(form);
      setModal(false);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const eliminar = async (p) => {
    try {
      await proveedoresApi.eliminar(p.id);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'cuit', titulo: 'CUIT' },
    { clave: 'telefono', titulo: 'Telefono' },
    { clave: 'acciones', titulo: '', render: (p) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => abrirEditar(p)}>Editar</button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(p)}>Eliminar</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ProveedoresPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Proveedores</h2>
        <button type="button" className="btn btn-primary" onClick={abrirNuevo}>Nuevo proveedor</button>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}
      <Table columnas={columnas} filas={proveedores} vacio="Sin proveedores" />

      <Modal abierto={modal} onClose={() => setModal(false)} titulo={editando ? 'Editar proveedor' : 'Nuevo proveedor'} ancho="420px"
        footer={<button type="button" className="btn btn-primary" onClick={guardar}>Guardar</button>}
      >
        <Input label="Nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <Input label="CUIT" value={form.cuit || ''} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
        <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Telefono" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
      </Modal>
    </div>
  );
}
