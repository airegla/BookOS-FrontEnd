// BookOS - CtaCtePage.jsx
// ruta: bookos/frontend/src/pages/CtaCtePage.jsx
// descripcion: cuenta corriente unificada (clientes y proveedores comparten la
//   misma tabla). Estado de cuenta, recibos, anulacion y observacion de
//   comportamiento del Secretario (LLM estudia los movimientos y se semanticiza).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Paginador from '../ui/Paginador';
import DebugTag from '../ui/DebugTag';
import SelectBuscador from '../ui/SelectBuscador';
import { ctaCteApi, clientesApi, proveedoresApi } from '../api/api';
import { useAppContext } from '../AppContext';

const METODOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

// Busqueda en el servidor: la tabla de maestros nunca se precarga entera.
async function buscarClientes(q) {
  const res = await clientesApi.listar({ search: q, limit: 20 });
  return (res.data || []).filter((c) => c.id !== 1).map((c) => ({ id: c.id, etiqueta: c.nombre, detalle: c.telefono || c.documento || '' }));
}

async function buscarProveedores(q) {
  const res = await proveedoresApi.listar({ search: q, limit: 20 });
  return (res.data || []).map((p) => ({ id: p.id, etiqueta: p.nombre }));
}

export default function CtaCtePage({ lado = 'cliente' }) {
  const [tipo, setTipo] = useState(lado);
  const [clienteNombre, setClienteNombre] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [cuenta, setCuenta] = useState({ movimientos: [], saldoActual: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [comportamiento, setComportamiento] = useState(null);
  const [estudiando, setEstudiando] = useState(false);

  // recibo
  const [reciboAbierto, setReciboAbierto] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [obs, setObs] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  const seleccionado = tipo === 'cliente' ? clienteId : proveedorId;

  const cargar = async (t = tipo, cId = clienteId, pId = proveedorId, p = page) => {
    if (t === 'cliente' && !cId) { setCuenta({ movimientos: [], saldoActual: 0 }); return; }
    if (t === 'proveedor' && !pId) { setCuenta({ movimientos: [], saldoActual: 0 }); return; }
    try {
      const res = await ctaCteApi.estadoCuenta(t === 'cliente' ? { clienteId: cId, page: p, limit: 20 } : { proveedorId: pId, page: p, limit: 20 });
      const data = res.data || { movimientos: [], saldoActual: 0 };
      setCuenta(data);
      setTotal(data.total || (data.movimientos || []).length);
      setMensaje('');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => {
    setPage(1);
    cargar(tipo, clienteId, proveedorId, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, clienteId, proveedorId]);

  useEffect(() => {
    if (page > 1) cargar(tipo, clienteId, proveedorId, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      setMensaje(`Recibo ${res.data.numero || `#${res.data.reciboId}`} registrado ✓`);
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
              <SelectBuscador
                valor={clienteId || null}
                etiquetaValor={clienteNombre}
                placeholder="Buscar cliente..."
                buscar={buscarClientes}
                onSeleccionar={(it) => { setClienteId(it ? it.id : ''); setClienteNombre(it ? it.etiqueta : ''); setComportamiento(null); }}
              />
            ) : (
              <SelectBuscador
                valor={proveedorId || null}
                etiquetaValor={proveedorNombre}
                placeholder="Buscar proveedor..."
                buscar={buscarProveedores}
                onSeleccionar={(it) => { setProveedorId(it ? it.id : ''); setProveedorNombre(it ? it.etiqueta : ''); setComportamiento(null); }}
              />
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
      <Paginador page={page} total={total} limite={20} onCambiar={setPage} etiqueta="movimientos" />

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
