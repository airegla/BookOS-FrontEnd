// BookOS - ClientesPage.jsx
// ruta: bookos/frontend/src/pages/ClientesPage.jsx
// descripcion: ABM de clientes y visualizacion de su grafo de interacciones
//   (EVITA_AUTOR / PREFIERE_EDITORIAL / RECHAZO_IMPLICITO) inferido sin clics.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { clientesApi, ctaCteApi } from '../api/api';
import { useAppContext } from '../AppContext';

// Condiciones frente al IVA frecuentes (dato heredado del legacy: puede venir texto libre).
const CONDICIONES_IVA = ['Consumidor Final', 'Responsable Inscripto', 'Monotributo', 'Exento', 'No Categorizado'];

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [grafo, setGrafo] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async (q = busqueda) => {
    try {
      const res = await clientesApi.listar({ search: q });
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

  // Ficha completa + cuenta corriente (bookerp: el "Ver" del cliente muestra su estado de cuenta).
  const verFicha = async (cliente) => {
    try {
      const res = await ctaCteApi.estadoCuenta({ clienteId: cliente.id });
      const cuenta = res.data || res;
      setFicha({ cliente, cuenta });
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
    { clave: 'telefono', titulo: 'Telefono' },
    { clave: 'localidad', titulo: 'Localidad' },
    { clave: 'acciones', titulo: '', render: (c) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => verFicha(c)}>Ver</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => verGrafo(c)}>Grafo</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => abrirEditar(c)}>Editar</button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(c)}>Eliminar</button>
      </div>
    ) },
  ];

  const columnasCuenta = [
    { clave: 'fecha', titulo: 'Fecha', render: (m) => new Date(m.fecha).toLocaleDateString('es-AR') },
    { clave: 'tipoComprobante', titulo: 'Comprobante' },
    { clave: 'debe', titulo: 'Debe', render: (m) => (Number(m.debe) ? `$${Number(m.debe).toLocaleString('es-AR')}` : '') },
    { clave: 'haber', titulo: 'Haber', render: (m) => (Number(m.haber) ? `$${Number(m.haber).toLocaleString('es-AR')}` : '') },
    { clave: 'saldo', titulo: 'Saldo', render: (m) => `$${Number(m.saldo).toLocaleString('es-AR')}` },
    { clave: 'vencimiento', titulo: 'Vence', render: (m) => (m.fechaVencimiento ? new Date(m.fechaVencimiento).toLocaleDateString('es-AR') : '') },
  ];

  return (
    <div>
      <DebugTag nombre="ClientesPage" />
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold">Clientes</h2>
        <div className="flex gap-2">
          <input
            className="input-os"
            style={{ maxWidth: 260 }}
            placeholder="Buscar por nombre, documento o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') cargar(busqueda); }}
          />
          <button type="button" className="btn" onClick={() => cargar(busqueda)}>Buscar</button>
          <button type="button" className="btn btn-primary" onClick={abrirNuevo}>Nuevo cliente</button>
        </div>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}
      <p className="text-xs text-muted mb-3">El grafo se infiere del comportamiento (rechazos, preferencias), sin pedirle nada al vendedor.</p>
      <Table columnas={columnas} filas={clientes} vacio="Sin clientes" exportable exportarNombre="clientes" />

      <Modal abierto={modal} onClose={() => setModal(false)} titulo={editando ? 'Editar cliente' : 'Nuevo cliente'} ancho="680px"
        footer={(
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!form.nombre} onClick={guardar}>Guardar</button>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre / Razon social" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Nombre de fantasia" value={form.nombreFantasia || ''} onChange={(e) => setForm({ ...form, nombreFantasia: e.target.value })} />
          <Input label="DNI" value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          <Input label="CUIT" value={form.cuit || ''} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
          <label className="block mb-3">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Condicion IVA</span>
            <input className="input-os" list="dl-cond-iva" value={form.condicionIva || ''} onChange={(e) => setForm({ ...form, condicionIva: e.target.value })} />
            <datalist id="dl-cond-iva">{CONDICIONES_IVA.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <Input label="Telefono" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Localidad" value={form.localidad || ''} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
        </div>
        <Input label="Direccion" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Descuento fijo %" type="number" value={form.descuentoFijo ?? ''} onChange={(e) => setForm({ ...form, descuentoFijo: e.target.value === '' ? null : Number(e.target.value) })} />
          <Input label="Plazo de pago (dias)" type="number" value={form.diasPlazoPago ?? ''} onChange={(e) => setForm({ ...form, diasPlazoPago: e.target.value === '' ? null : Number(e.target.value) })} />
          <div>
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Condicion</span>
            <label className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={Boolean(form.esMayorista)} onChange={(e) => setForm({ ...form, esMayorista: e.target.checked })} /> Mayorista
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo
            </label>
          </div>
        </div>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Observaciones</span>
          <textarea className="input-os resize-none" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </label>
      </Modal>

      <Modal abierto={Boolean(ficha)} onClose={() => setFicha(null)} titulo={ficha ? `Ficha - ${ficha.cliente.nombre}` : ''} ancho="760px"
        footer={
          ficha ? (
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => pedirConsulta(`Que me podes decir de ${ficha.cliente.nombre}? Mira su cuenta corriente.`)}>Preguntar al Secretario</button>
              <button type="button" className="btn btn-primary" onClick={() => setFicha(null)}>Cerrar</button>
            </div>
          ) : null
        }
      >
        {ficha && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
              <div><span className="text-muted">Documento: </span>{ficha.cliente.documento || '-'}</div>
              <div><span className="text-muted">CUIT: </span>{ficha.cliente.cuit || '-'}</div>
              <div><span className="text-muted">Condicion IVA: </span>{ficha.cliente.condicionIva || '-'}</div>
              <div><span className="text-muted">Telefono: </span>{ficha.cliente.telefono || '-'}</div>
              <div><span className="text-muted">Email: </span>{ficha.cliente.email || '-'}</div>
              <div><span className="text-muted">Localidad: </span>{ficha.cliente.localidad || '-'}</div>
              <div className="col-span-2"><span className="text-muted">Direccion: </span>{ficha.cliente.direccion || '-'}</div>
              <div><span className="text-muted">Lista: </span>{ficha.cliente.esMayorista ? `Mayorista${ficha.cliente.descuentoFijo ? ` (-${ficha.cliente.descuentoFijo}%)` : ''}` : 'Minorista'}</div>
              <div><span className="text-muted">Plazo de pago: </span>{ficha.cliente.diasPlazoPago ? `${ficha.cliente.diasPlazoPago} dias` : '-'}</div>
              {ficha.cliente.observaciones && <div className="col-span-2"><span className="text-muted">Observaciones: </span>{ficha.cliente.observaciones}</div>}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Cuenta corriente</h4>
              <div className="text-sm">
                Saldo: <strong style={{ color: Number(ficha.cuenta.saldoActual) > 0 ? 'var(--danger)' : undefined }}>${Number(ficha.cuenta.saldoActual || 0).toLocaleString('es-AR')}</strong>
              </div>
            </div>
            <Table columnas={columnasCuenta} filas={(ficha.cuenta.movimientos || []).slice(-10).reverse()} vacio="Sin movimientos" />
            <p className="text-xs text-muted mt-2">
              Ultimos {Math.min(10, (ficha.cuenta.movimientos || []).length)} de {(ficha.cuenta.movimientos || []).length} movimientos.
              El estado de cuenta completo esta en Cta. corriente cliente.
            </p>
          </>
        )}
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
