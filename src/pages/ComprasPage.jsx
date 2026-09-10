// BookOS - ComprasPage.jsx
// ruta: bookos/frontend/src/pages/ComprasPage.jsx
// descripcion: ingreso de compras a proveedores (candado FIFE firme/consigna),
//   historial y anulacion.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { comprasApi, proveedoresApi } from '../api/api';
import usePersistentWork from '../hooks/usePersistentWork';
import { useAppContext } from '../AppContext';

const TIPOS = ['FACTURA', 'FACTURA_CONSIGNA', 'REMITO', 'NOTA_CREDITO'];

export default function ComprasPage() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [borrador, setBorrador] = usePersistentWork('compra', { proveedorId: '', tipoComprobante: 'FACTURA', tipoStockAfectado: 'FIRME', items: [] });
  const [ean, setEan] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [mensaje, setMensaje] = useState('');
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async () => {
    try {
      const [prov, comp] = await Promise.all([proveedoresApi.listar(), comprasApi.listar({ page: 1, limit: 30 })]);
      setProveedores(prov.data || []);
      setCompras(comp.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const agregarItem = () => {
    if (!ean || !cantidad) return;
    setBorrador({ ...borrador, items: [...borrador.items, { ean13: ean, cantidad: Number(cantidad), precioUnitario: precio ? Number(precio) : 0 }] });
    setEan(''); setCantidad(''); setPrecio('');
  };

  const crear = async () => {
    try {
      const res = await comprasApi.crear({
        proveedorId: borrador.proveedorId ? Number(borrador.proveedorId) : null,
        tipoComprobante: borrador.tipoComprobante,
        tipoStockAfectado: borrador.tipoStockAfectado,
        items: borrador.items,
      });
      setMensaje(`Compra #${res.data.compraId} por $${Number(res.data.importeTotal).toLocaleString('es-AR')} ✓ (stock ${borrador.tipoStockAfectado} actualizado)`);
      setBorrador({ proveedorId: '', tipoComprobante: 'FACTURA', tipoStockAfectado: 'FIRME', items: [] });
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const anular = async (id) => {
    try {
      await comprasApi.anular(id);
      setMensaje(`Compra #${id} anulada (stock revertido) ✓`);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'tipoComprobante', titulo: 'Comprobante' },
    { clave: 'importeTotal', titulo: 'Importe', render: (c) => `$${Number(c.importeTotal).toLocaleString('es-AR')}` },
    { clave: 'estado', titulo: 'Estado' },
    { clave: 'acciones', titulo: '', render: (c) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => { setContextoActual({ compraId: c.id, tipo: c.tipoComprobante, items: c.items }); }}>Ver</button>
        {c.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anular(c.id)}>Anular</button>}
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ComprasPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Compras</h2>
        <button type="button" className="btn btn-ghost" onClick={() => pedirConsulta('Dame un resumen de compras de los ultimos 30 dias.')}>Preguntar al Secretario</button>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Nueva compra</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          <select className="input-os" style={{ maxWidth: 240 }} value={borrador.proveedorId} onChange={(e) => setBorrador({ ...borrador, proveedorId: e.target.value })}>
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="input-os" style={{ maxWidth: 180 }} value={borrador.tipoComprobante} onChange={(e) => setBorrador({ ...borrador, tipoComprobante: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input-os" style={{ maxWidth: 120 }} value={borrador.tipoStockAfectado} onChange={(e) => setBorrador({ ...borrador, tipoStockAfectado: e.target.value })}>
            <option value="FIRME">FIRME</option>
            <option value="CONSIGNA">CONSIGNA</option>
          </select>
        </div>
        <div className="flex gap-2 mb-3">
          <input className="input-os" placeholder="EAN13" value={ean} onChange={(e) => setEan(e.target.value)} />
          <input className="input-os" placeholder="Cantidad" type="number" style={{ maxWidth: 100 }} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <input className="input-os" placeholder="Precio unit." type="number" style={{ maxWidth: 120 }} value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <button type="button" className="btn" onClick={agregarItem}>Agregar</button>
        </div>
        {borrador.items.map((item) => (
          <div key={item.ean13} className="text-sm py-1 flex justify-between">
            <span className="font-mono">{item.ean13}</span>
            <span>{item.cantidad} u × ${Number(item.precioUnitario).toLocaleString('es-AR')}</span>
          </div>
        ))}
        <button type="button" className="btn btn-primary mt-3" disabled={borrador.items.length === 0} onClick={crear}>Guardar compra</button>
        <p className="text-xs text-muted mt-2">Candado FIFE: FACTURA firme no afecta CONSIGNA · FACTURA_CONSIGNA no suma FIRME.</p>
      </div>

      <h3 className="font-semibold mb-2">Historial</h3>
      <Table columnas={columnas} filas={compras} vacio="Sin compras" />
    </div>
  );
}
