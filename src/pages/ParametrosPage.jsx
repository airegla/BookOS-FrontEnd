// BookOS - ParametrosPage.jsx
// ruta: bookos/frontend/src/pages/ParametrosPage.jsx
// descripcion: parametros del OS — metodos de pago (bookerp: tipos de pago).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import { parametrosApi } from '../api/api';
import { useAppContext } from '../AppContext';

export default function ParametrosPage() {
  const [metodos, setMetodos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async () => {
    try {
      const res = await parametrosApi.metodosPago();
      setMetodos(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line
  useEffect(() => { setContextoActual({ vista: 'parametros', metodosPago: metodos.length }); }, [metodos.length]); // eslint-disable-line

  const crear = async () => {
    try {
      await parametrosApi.crearMetodoPago({ nombre, descripcion: descripcion || null });
      setMensaje('Metodo de pago creado ✓');
      setModalAbierto(false); setNombre(''); setDescripcion('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const alternar = async (m) => {
    try {
      await parametrosApi.actualizarMetodoPago(m.id, { activo: !m.activo });
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar el metodo de pago "${m.nombre}"?`)) return;
    try {
      await parametrosApi.eliminarMetodoPago(m.id);
      setMensaje('Metodo de pago eliminado ✓');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'descripcion', titulo: 'Descripción' },
    { clave: 'activo', titulo: 'Estado', render: (m) => <span className="agente-badge">{m.activo ? 'ACTIVO' : 'INACTIVO'}</span> },
    { clave: 'acciones', titulo: '', render: (m) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => alternar(m)}>{m.activo ? 'Desactivar' : 'Activar'}</button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(m)}>Eliminar</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ParametrosPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Parámetros</h2>
        <span className="text-xs text-muted">métodos de pago (bookerp: tipos de pago)</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex justify-end gap-2 mb-4">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Tengo ${metodos.length} metodos de pago configurados. ¿Que me sugeris?`)}>Preguntar al Secretario</button>
        <button type="button" className="btn btn-primary text-xs" onClick={() => setModalAbierto(true)}>+ Método de pago</button>
      </div>

      <Table columnas={columnas} filas={metodos} vacio="Sin metodos de pago" exportable exportarNombre="metodos_pago" />

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo="Nuevo método de pago" ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!nombre} onClick={crear}>Guardar</button>
          </>
        }
      >
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Nombre</span>
          <input className="input-os" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="EFECTIVO, TARJETA..." />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Descripción</span>
          <input className="input-os" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
