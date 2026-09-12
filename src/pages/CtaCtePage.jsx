// BookOS - CtaCtePage.jsx
// ruta: bookos/frontend/src/pages/CtaCtePage.jsx
// descripcion: cuenta corriente unificada (clientes y proveedores comparten la
//   misma tabla). Estado de cuenta, recibos, anulacion y observacion de
//   comportamiento del Secretario (LLM estudia los movimientos y se semanticiza).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import { ctaCteApi, clientesApi, proveedoresApi } from '../api/api';
import { useAppContext } from '../AppContext';

const METODOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export default function CtaCtePage({ lado = 'cliente' }) {
  const [tipo, setTipo] = useState(lado);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [cuenta, setCuenta] = useState({ movimientos: [], saldoActual: 0 });
  const [mensaje, setMensaje] = useState('');
  const [comportamiento, setComportamiento] = useState(null);
  const [estudiando, setEstudiando] = useState(false);

  // recibo
  const [reciboAbierto, setReciboAbierto] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [obs, setObs] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  useEffect(() => {
    clientesApi.listar().then((res) => setClientes(res.data || [])).catch(() => {});
    proveedoresApi.listar().then((res) => setProveedores(res.data || [])).catch(() => {});
  }, []);

  const seleccionado = tipo === 'cliente' ? clienteId : proveedorId;

  const cargar = async (t = tipo, cId = clienteId, pId = proveedorId) => {
    if (t === 'cliente' && !cId) { setCuenta({ movimientos: [], saldoActual: 0 }); return; }
    if (t === 'proveedor' && !pId) { setCuenta({ movimientos: [], saldoActual: 0 }); return; }
    try {
      const res = await ctaCteApi.estadoCuenta(t === 'cliente' ? { clienteId: cId } : { proveedorId: pId });
      setCuenta(res.data || { movimientos: [], saldoActual: 0 });
      setMensaje('');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, clienteId, proveedorId]);

  // Contexto para el Secretario (para que pueda operar esta vista).
  useEffect(() => {
    setContextoActual({
      vista: 'ctacte',
      tipo,
      clienteId: clienteId ? Number(clienteId) : null,
      proveedorId: proveedorId ? Number(proveedorId) : null,
      saldoActual: cuenta.saldoActual,
      movimientos: cuenta.movimientos.length,
    });
  }, [tipo, clienteId, proveedorId, cuenta.saldoActual, cuenta.movimientos.length]); // eslint-disable-line

  const registrarRecibo = async () => {
    try {
      const payload = {
        monto: Number(monto),
        metodoPago,
        observaciones: obs || null,
      };
      if (tipo === 'cliente') payload.clienteId = Number(clienteId);
      else payload.proveedorId = Number(proveedorId);
      const res = await ctaCteApi.registrarRecibo(payload);
      setMensaje(`Recibo #${res.data.reciboId} registrado ✓`);
      setReciboAbierto(false);
      setMonto(''); setObs('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const anular = async (movimientoId) => {
    if (!window.confirm(`¿Anular el recibo (movimiento #${movimientoId})? Se genera NC y revierte la caja.`)) return;
    try {
      await ctaCteApi.anularRecibo(movimientoId);
      setMensaje('Recibo anulado ✓');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const estudiar = async () => {
    setEstudiando(true);
    setComportamiento(null);
    try {
      const res = await ctaCteApi.observar(tipo === 'cliente' ? { clienteId: Number(clienteId) } : { proveedorId: Number(proveedorId) });
      setComportamiento(res.data);
      setMensaje('Observacion de comportamiento generada y semanticizada ✓');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
    finally { setEstudiando(false); }
  };

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'tipoComprobante', titulo: 'Comprobante' },
    { clave: 'debe', titulo: 'Debe', render: (m) => fmt(m.debe), valorExport: (m) => Number(m.debe) },
    { clave: 'haber', titulo: 'Haber', render: (m) => fmt(m.haber), valorExport: (m) => Number(m.haber) },
    { clave: 'saldo', titulo: 'Saldo', render: (m) => fmt(m.saldo), valorExport: (m) => Number(m.saldo) },
    { clave: 'observaciones', titulo: 'Observaciones' },
    { clave: 'fecha', titulo: 'Fecha', render: (m) => new Date(m.createdAt).toLocaleDateString('es-AR'), valorExport: (m) => new Date(m.createdAt).toLocaleDateString('es-AR') },
    { clave: 'acciones', titulo: '', render: (m) => (
      m.tipoComprobante === 'RECIBO' ? (
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anular(m.id)}>Anular</button>
      ) : null
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="CtaCtePage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Cuenta Corriente</h2>
        <span className="text-xs text-muted">unificada: clientes y proveedores · consumidor final no opera</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Tipo</span>
            <select className="input-os" value={tipo} onChange={(e) => { setTipo(e.target.value); setComportamiento(null); }}>
              <option value="cliente">Cliente</option>
              <option value="proveedor">Proveedor</option>
            </select>
          </label>
          <label className="block" style={{ minWidth: 240 }}>
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">{tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</span>
            {tipo === 'cliente' ? (
              <select className="input-os" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setComportamiento(null); }}>
                <option value="">Seleccionar...</option>
                {clientes.filter((c) => c.id !== 1).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            ) : (
              <select className="input-os" value={proveedorId} onChange={(e) => { setProveedorId(e.target.value); setComportamiento(null); }}>
                <option value="">Seleccionar...</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={!seleccionado} onClick={() => setReciboAbierto(true)}>Nuevo recibo</button>
            <button type="button" className="btn btn-ghost" disabled={!seleccionado || estudiando} onClick={estudiar}>
              {estudiando ? 'Estudiando...' : 'Estudiar comportamiento'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!seleccionado} onClick={() => pedirConsulta(`Estoy viendo la cuenta corriente de ${tipo === 'cliente' ? 'cliente' : 'proveedor'} #${seleccionado} (saldo ${fmt(cuenta.saldoActual)}). ¿Que me contas del comportamiento?`)}>
              Preguntar al Secretario
            </button>
          </div>
        </div>

        {comportamiento && (
          <div className="mt-4 p-3 rounded" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
            <div className="text-xs uppercase tracking-widest text-muted mb-1">Observación del Secretario</div>
            <p className="text-sm">{comportamiento.observacion}</p>
            {Array.isArray(comportamiento.tags) && comportamiento.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {comportamiento.tags.map((t) => <span key={t} className="agente-badge">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Movimientos</h3>
        <span className="text-sm">Saldo actual: <strong style={{ color: cuenta.saldoActual >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(cuenta.saldoActual)}</strong></span>
      </div>
      <Table columnas={columnas} filas={cuenta.movimientos} vacio="Selecciona un cliente o proveedor" exportable exportarNombre="cuenta_corriente" />

      <Modal abierto={reciboAbierto} onClose={() => setReciboAbierto(false)} titulo={`Nuevo ${tipo === 'cliente' ? 'cobro' : 'pago'}`} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReciboAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!monto || Number(monto) <= 0} onClick={registrarRecibo}>Guardar</button>
          </>
        }
      >
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Monto</span>
          <input className="input-os" type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Metodo de pago</span>
          <select className="input-os" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Observaciones</span>
          <input className="input-os" value={obs} onChange={(e) => setObs(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
