// BookOS - InventarioPage.jsx
// ruta: bookos/frontend/src/pages/InventarioPage.jsx
// descripcion: deposito e inventario: stock por articulo, transferencia
//   local<->deposito y ajuste de inventario (firme/consigna).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import { inventarioApi } from '../api/api';
import { useAppContext } from '../AppContext';

// Tipos FIFE de ajuste (bookerp): cada uno define los deltas; la cantidad siempre es positiva.
// En altas/bajas de consigna el original sigue al actual (el proveedor entrega/retira fisicamente);
// una reclasificacion firme<->consigna NO toca el original.
const TIPOS_AJUSTE = [
  { id: 'ALTA_FIRME', label: 'Alta firme (ingreso)', df: 1, dc: 0, dco: 0 },
  { id: 'BAJA_FIRME', label: 'Baja firme (rotura / perdida)', df: -1, dc: 0, dco: 0 },
  { id: 'ALTA_CONSIGNA', label: 'Alta consigna (reposicion del proveedor)', df: 0, dc: 1, dco: 1 },
  { id: 'BAJA_CONSIGNA', label: 'Baja consigna (retiro del proveedor)', df: 0, dc: -1, dco: -1 },
  { id: 'FIRME_A_CONSIGNA', label: 'Firme -> Consigna (reclasificar)', df: -1, dc: 1, dco: 0 },
  { id: 'CONSIGNA_A_FIRME', label: 'Consigna -> Firme (reclasificar)', df: 1, dc: -1, dco: 0 },
  { id: 'PERSONALIZADO', label: 'Personalizado (deltas a mano)', libre: true },
];

export default function InventarioPage() {
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [mensaje, setMensaje] = useState('');

  const [transferir, setTransferir] = useState(null); // articulo
  const [tCantidad, setTCantidad] = useState('');
  const [tHacia, setTHacia] = useState(true);

  const [ajustar, setAjustar] = useState(null); // articulo
  const [aTipo, setATipo] = useState('ALTA_FIRME');
  const [aCantidad, setACantidad] = useState('');
  const [aFirme, setAFirme] = useState(0);
  const [aConsigna, setAConsigna] = useState(0);
  const [aMotivo, setAMotivo] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async (q = busqueda) => {
    try {
      const res = await inventarioApi.stock({ search: q, limit: 50 });
      setFilas(res.data?.filas || []);
      setTotal(res.data?.total || 0);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(''); }, []); // eslint-disable-line

  useEffect(() => { setContextoActual({ vista: 'inventario', articulos: total }); }, [total]); // eslint-disable-line

  const ejecutarTransferencia = async () => {
    try {
      await inventarioApi.transferir({ ean13: transferir.ean13, cantidad: Number(tCantidad), haciaDeposito: tHacia });
      setMensaje(`Transferencia de ${tCantidad} u aplicada ✓`);
      setTransferir(null); setTCantidad('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const tipoSel = TIPOS_AJUSTE.find((t) => t.id === aTipo) || TIPOS_AJUSTE[0];
  const cantidadAjuste = Math.abs(Number(aCantidad) || 0);

  const ejecutarAjuste = async () => {
    const payload = { ean13: ajustar.ean13, motivo: aMotivo };
    if (tipoSel.libre) {
      payload.deltaFirme = Number(aFirme) || 0;
      payload.deltaConsigna = Number(aConsigna) || 0;
      if (!payload.motivo) payload.motivo = 'Ajuste personalizado';
    } else {
      if (cantidadAjuste <= 0) { setMensaje('⚠️ La cantidad tiene que ser mayor a cero'); return; }
      payload.deltaFirme = tipoSel.df * cantidadAjuste;
      payload.deltaConsigna = tipoSel.dc * cantidadAjuste;
      payload.deltaConsignaOriginal = tipoSel.dco * cantidadAjuste;
      if (!payload.motivo) payload.motivo = `${tipoSel.id}: ${cantidadAjuste} u`;
    }
    try {
      await inventarioApi.ajustar(payload);
      setMensaje(`Ajuste ${tipoSel.libre ? 'personalizado' : tipoSel.id} aplicado ✓`);
      setAjustar(null); setACantidad(''); setAFirme(0); setAConsigna(0); setAMotivo('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'ean13', titulo: 'EAN', render: (a) => <span className="font-mono text-xs">{a.ean13}</span> },
    { clave: 'titulo', titulo: 'Titulo' },
    { clave: 'stock', titulo: 'Firme', render: (a) => a.stock },
    { clave: 'stockDeposito', titulo: 'Depósito', render: (a) => a.stockDeposito },
    { clave: 'stockConsigna', titulo: 'Consigna', render: (a) => a.stockConsigna },
    { clave: 'acciones', titulo: '', render: (a) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => { setTransferir(a); setTHacia(true); }}>Transferir</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => setAjustar(a)}>Ajustar</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="InventarioPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Depósito e Inventario</h2>
        <span className="text-xs text-muted">stock firme · depósito · consigna</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex gap-2 mb-4">
        <input className="input-os" style={{ maxWidth: 320 }} placeholder="EAN o titulo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cargar(busqueda); }} />
        <button type="button" className="btn" onClick={() => cargar(busqueda)}>Buscar</button>
        <div className="flex-1" />
        <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Estoy viendo el inventario (${total} articulos). ¿Que me sugeris reponer o ajustar?`)}>Preguntar al Secretario</button>
      </div>

      <Table columnas={columnas} filas={filas} vacio="Busca un articulo" exportable exportarNombre="inventario" />

      <Modal abierto={Boolean(transferir)} onClose={() => setTransferir(null)} titulo={transferir ? `Transferir ${transferir.titulo}` : ''} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setTransferir(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!tCantidad || Number(tCantidad) <= 0} onClick={ejecutarTransferencia}>Transferir</button>
          </>
        }
      >
        {transferir && <p className="text-sm mb-3">Firme: {transferir.stock} · Depósito: {transferir.stockDeposito}</p>}
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Cantidad</span>
          <input className="input-os" type="number" min="1" value={tCantidad} onChange={(e) => setTCantidad(e.target.value)} />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Dirección</span>
          <select className="input-os" value={tHacia} onChange={(e) => setTHacia(e.target.value === 'true')}>
            <option value="true">Local → Depósito</option>
            <option value="false">Depósito → Local</option>
          </select>
        </label>
      </Modal>

      <Modal abierto={Boolean(ajustar)} onClose={() => setAjustar(null)} titulo={ajustar ? `Ajustar ${ajustar.titulo}` : ''} ancho="460px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAjustar(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!tipoSel.libre && cantidadAjuste <= 0} onClick={ejecutarAjuste}>Aplicar</button>
          </>
        }
      >
        {ajustar && <p className="text-sm mb-3">Firme: {ajustar.stock} · Depósito: {ajustar.stockDeposito} · Consigna: {ajustar.stockConsigna}</p>}
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Tipo de ajuste</span>
          <select className="input-os" value={aTipo} onChange={(e) => setATipo(e.target.value)}>
            {TIPOS_AJUSTE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        {tipoSel.libre ? (
          <>
            <label className="block mb-3">
              <span className="block text-xs uppercase tracking-widest text-muted mb-1">Delta firme (+/-)</span>
              <input className="input-os" type="number" value={aFirme} onChange={(e) => setAFirme(Number(e.target.value) || 0)} />
            </label>
            <label className="block mb-3">
              <span className="block text-xs uppercase tracking-widest text-muted mb-1">Delta consigna (+/-)</span>
              <input className="input-os" type="number" value={aConsigna} onChange={(e) => setAConsigna(Number(e.target.value) || 0)} />
            </label>
          </>
        ) : (
          <>
            <label className="block mb-3">
              <span className="block text-xs uppercase tracking-widest text-muted mb-1">Cantidad</span>
              <input className="input-os" type="number" min="1" value={aCantidad} onChange={(e) => setACantidad(e.target.value)} />
            </label>
            <p className="text-xs text-muted mb-3">
              Aplica: firme {tipoSel.df >= 0 ? '+' : ''}{tipoSel.df * cantidadAjuste} ·
              consigna {tipoSel.dc >= 0 ? '+' : ''}{tipoSel.dc * cantidadAjuste} ·
              original {tipoSel.dco >= 0 ? '+' : ''}{tipoSel.dco * cantidadAjuste}
            </p>
          </>
        )}
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Motivo / nota (opcional)</span>
          <input className="input-os" value={aMotivo} onChange={(e) => setAMotivo(e.target.value)} />
        </label>
        <p className="text-xs text-muted">El ajuste queda en el ledger de stock con su motivo; no modifica comprobantes.</p>
      </Modal>
    </div>
  );
}
