// BookOS - ParametrosPage.jsx
// ruta: bookos/frontend/src/pages/ParametrosPage.jsx
// descripcion: parametros del OS — metodos de pago (bookerp: tipos de pago) y
//   categorias de caja (bookerp: categorias de los movimientos manuales).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import { parametrosApi } from '../api/api';
import { useAppContext } from '../AppContext';

const TABS = [
  { id: 'metodos', label: 'Metodos de pago' },
  { id: 'categorias', label: 'Categorias de caja' },
];

export default function ParametrosPage() {
  const [tab, setTab] = useState('metodos');
  const [filas, setFilas] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  const esMetodos = tab === 'metodos';

  const cargar = async (t = tab) => {
    try {
      const res = t === 'metodos' ? await parametrosApi.metodosPago() : await parametrosApi.categoriasCaja();
      setFilas(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(tab); }, [tab]); // eslint-disable-line
  useEffect(() => { setContextoActual({ vista: 'parametros', tab, total: filas.length }); }, [tab, filas.length]); // eslint-disable-line

  const crear = async () => {
    try {
      if (esMetodos) await parametrosApi.crearMetodoPago({ nombre, descripcion: descripcion || null });
      else await parametrosApi.crearCategoriaCaja({ nombre, descripcion: descripcion || null });
      setMensaje(esMetodos ? 'Metodo de pago creado ✓' : 'Categoria de caja creada ✓');
      setModalAbierto(false); setNombre(''); setDescripcion('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const alternar = async (m) => {
    try {
      if (esMetodos) await parametrosApi.actualizarMetodoPago(m.id, { activo: !m.activo });
      else await parametrosApi.actualizarCategoriaCaja(m.id, { activo: !m.activo });
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const eliminar = async (m) => {
    const etiqueta = esMetodos ? 'el metodo de pago' : 'la categoria';
    if (!window.confirm(`¿Eliminar ${etiqueta} "${m.nombre}"?`)) return;
    try {
      if (esMetodos) await parametrosApi.eliminarMetodoPago(m.id);
      else await parametrosApi.eliminarCategoriaCaja(m.id);
      setMensaje(esMetodos ? 'Metodo de pago eliminado ✓' : 'Categoria eliminada ✓');
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
        <span className="text-xs text-muted">metodos de pago · categorias de caja (bookerp)</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Tengo ${filas.length} ${esMetodos ? 'metodos de pago' : 'categorias de caja'} configurados. ¿Que me sugeris?`)}>Preguntar al Secretario</button>
        <button type="button" className="btn btn-primary text-xs" onClick={() => setModalAbierto(true)}>{esMetodos ? '+ Método de pago' : '+ Categoría de caja'}</button>
      </div>

      <Table columnas={columnas} filas={filas} vacio={esMetodos ? 'Sin metodos de pago' : 'Sin categorias de caja'} exportable exportarNombre={tab === 'metodos' ? 'metodos_pago' : 'categorias_caja'} />

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={esMetodos ? 'Nuevo método de pago' : 'Nueva categoría de caja'} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!nombre} onClick={crear}>Guardar</button>
          </>
        }
      >
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Nombre</span>
          <input className="input-os" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={esMetodos ? 'EFECTIVO, TARJETA...' : 'SUELDOS, FLETES, GASTOS VARIOS...'} />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Descripción</span>
          <input className="input-os" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        {!esMetodos && <p className="text-xs text-muted">Las categorias se sugieren al cargar el concepto de un movimiento manual de caja.</p>}
      </Modal>
    </div>
  );
}
