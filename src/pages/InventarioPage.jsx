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

export default function InventarioPage() {
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [mensaje, setMensaje] = useState('');

  const [transferir, setTransferir] = useState(null); // articulo
  const [tCantidad, setTCantidad] = useState('');
  const [tHacia, setTHacia] = useState(true);

  const [ajustar, setAjustar] = useState(null); // articulo
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

  const ejecutarAjuste = async () => {
    try {
      await inventarioApi.ajustar({ ean13: ajustar.ean13, deltaFirme: Number(aFirme) || 0, deltaConsigna: Number(aConsigna) || 0, motivo: aMotivo });
      setMensaje('Ajuste de inventario aplicado ✓');
      setAjustar(null); setAFirme(0); setAConsigna(0); setAMotivo('');
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

      <Modal abierto={Boolean(ajustar)} onClose={() => setAjustar(null)} titulo={ajustar ? `Ajustar ${ajustar.titulo}` : ''} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAjustar(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={ejecutarAjuste}>Aplicar</button>
          </>
        }
      >
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Delta firme (+/-)</span>
          <input className="input-os" type="number" value={aFirme} onChange={(e) => setAFirme(Number(e.target.value) || 0)} />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Delta consigna (+/-)</span>
          <input className="input-os" type="number" value={aConsigna} onChange={(e) => setAConsigna(Number(e.target.value) || 0)} />
        </label>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Motivo</span>
          <input className="input-os" value={aMotivo} onChange={(e) => setAMotivo(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
