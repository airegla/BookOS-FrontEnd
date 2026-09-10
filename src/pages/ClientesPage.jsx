// BookOS - ClientesPage.jsx
// ruta: bookos/frontend/src/pages/ClientesPage.jsx
// descripcion: ABM de clientes y visualizacion de su grafo de interacciones
//   (EVITA_AUTOR / PREFIERE_EDITORIAL / RECHAZO_IMPLICITO) inferido sin clics.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { clientesApi } from '../api/api';
import { useAppContext } from '../AppContext';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [grafo, setGrafo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async () => {
    try {
      const res = await clientesApi.listar();
      setClientes(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const abrirNuevo = () => { setEditando(null); setForm({}); setModal(true); };
  const abrirEditar = (c) => { setEditando(c); setForm(c); setModal(true); };

  const guardar = async () => {
    try {
      if (editando) await clientesApi.actualizar(editando.id, form);
      else await clientesApi.crear(form);
      setModal(false);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const verGrafo = async (cliente) => {
    try {
      const res = await clientesApi.interacciones(cliente.id);
      setGrafo({ cliente, interacciones: res.data || [] });
      setContextoActual({ clienteId: cliente.id, nombre: cliente.nombre });
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const eliminar = async (cliente) => {
    try {
      await clientesApi.eliminar(cliente.id);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'documento', titulo: 'Documento' },
    { clave: 'acciones', titulo: '', render: (c) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => verGrafo(c)}>Grafo</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => abrirEditar(c)}>Editar</button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(c)}>Eliminar</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ClientesPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Clientes</h2>
        <button type="button" className="btn btn-primary" onClick={abrirNuevo}>Nuevo cliente</button>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}
      <p className="text-xs text-muted mb-3">El grafo se infiere del comportamiento (rechazos, preferencias), sin pedirle nada al vendedor.</p>
      <Table columnas={columnas} filas={clientes} vacio="Sin clientes" />

      <Modal abierto={modal} onClose={() => setModal(false)} titulo={editando ? 'Editar cliente' : 'Nuevo cliente'} ancho="420px"
        footer={<button type="button" className="btn btn-primary" onClick={guardar}>Guardar</button>}
      >
        <Input label="Nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <Input label="Documento" value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
      </Modal>

      <Modal abierto={Boolean(grafo)} onClose={() => setGrafo(null)} titulo={grafo ? `Grafo de ${grafo.cliente.nombre}` : ''} ancho="640px"
        footer={
          grafo ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { pedirConsulta(`¿Que me podes decir de ${grafo.cliente.nombre}? Mira sus interacciones.`); }}>Preguntar al Secretario</button>
              <button type="button" className="btn btn-primary" onClick={() => setGrafo(null)}>Cerrar</button>
            </>
          ) : null
        }
      >
        {grafo && grafo.interacciones.length === 0 && (
          <p className="text-sm text-muted">Sin interacciones registradas todavia: el grafo se alimenta solo con el uso.</p>
        )}
        {grafo && grafo.interacciones.length > 0 && (
          <table className="table-os">
            <thead><tr><th>Relacion</th><th>Entidad</th><th>Peso</th><th>Origen</th></tr></thead>
            <tbody>
              {grafo.interacciones.map((i) => (
                <tr key={i.id}>
                  <td><span className="agente-badge">{i.relacion}</span></td>
                  <td>{i.entidad}</td>
                  <td>{Number(i.peso).toFixed(2)}</td>
                  <td className="text-xs text-muted">{i.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
