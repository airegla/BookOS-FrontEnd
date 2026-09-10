// BookOS - ComprasPage.jsx
// ruta: bookos/frontend/src/pages/ComprasPage.jsx
// descripcion: ingreso de compras a proveedores (candado FIFE firme/consigna),
//   historial/anulacion + pedido a proveedor (bookerp) en modal. El pedido no
//   afecta stock hasta confirmarse (al confirmar genera la compra).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import { comprasApi, proveedoresApi, observacionesApi, catalogoApi, pedidosProveedorApi } from '../api/api';
import usePersistentWork from '../hooks/usePersistentWork';
import { useAppContext } from '../AppContext';

const TIPOS = ['FACTURA', 'FACTURA_CONSIGNA', 'REMITO', 'NOTA_CREDITO'];

export default function ComprasPage() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [borrador, setBorrador] = usePersistentWork('compra', { proveedorId: '', tipoComprobante: 'FACTURA', tipoStockAfectado: 'FIRME', items: [] });
  const [ean, setEan] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [observacion, setObservacion] = useState(null);

  // Pedido a proveedor (modal)
  const [pedidoModal, setPedidoModal] = useState(false);
  const [pedido, setPedido] = useState({ proveedorId: '', tipoStockAfectado: 'FIRME', observaciones: '', items: [] });
  const [pedidoBusqueda, setPedidoBusqueda] = useState('');
  const [pedidoResultados, setPedidoResultados] = useState([]);
  const [pedidoEan, setPedidoEan] = useState('');
  const [pedidoCantidad, setPedidoCantidad] = useState('');
  const [pedidoPrecio, setPedidoPrecio] = useState('');

  const { setContextoActual, pedirConsulta } = useAppContext();

  const observar = async (id) => {
    try {
      const res = await observacionesApi.documento({ tipo: 'compra', id });
      setObservacion(res.data);
      setMensaje('Observación del Secretario generada ✓');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const cargar = async () => {
    try {
      const [prov, comp, ped] = await Promise.all([
        proveedoresApi.listar(),
        comprasApi.listar({ page: 1, limit: 30 }),
        pedidosProveedorApi.listar({ page: 1, limit: 30 }),
      ]);
      setProveedores(prov.data || []);
      setCompras(comp.data || []);
      setPedidos(ped.data || []);
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

  // ---- Pedido a proveedor (bookerp: no afecta stock hasta confirmar) ---------

  const abrirPedido = () => {
    setPedido({ proveedorId: '', tipoStockAfectado: 'FIRME', observaciones: '', items: [] });
    setPedidoBusqueda(''); setPedidoResultados([]);
    setPedidoEan(''); setPedidoCantidad(''); setPedidoPrecio('');
    setPedidoModal(true);
  };

  const buscarLibro = async (e) => {
    const termino = e.target.value;
    setPedidoBusqueda(termino);
    if (termino.trim().length < 2) { setPedidoResultados([]); return; }
    try {
      const res = await catalogoApi.autocomplete(termino);
      setPedidoResultados(res.data || []);
    } catch { setPedidoResultados([]); }
  };

  const seleccionarLibro = (libro) => {
    if (pedido.items.find((d) => d.ean13 === libro.ean13)) return;
    setPedido({ ...pedido, items: [...pedido.items, { ean13: libro.ean13, titulo: libro.titulo, cantidad: 1, precioUnitario: Number(libro.precio || 0) }] });
    setPedidoBusqueda(''); setPedidoResultados([]);
  };

  const agregarPedidoItem = () => {
    if (!pedidoEan || !pedidoCantidad) return;
    setPedido({ ...pedido, items: [...pedido.items, { ean13: pedidoEan, titulo: '', cantidad: Number(pedidoCantidad), precioUnitario: pedidoPrecio ? Number(pedidoPrecio) : 0 }] });
    setPedidoEan(''); setPedidoCantidad(''); setPedidoPrecio('');
  };

  const quitarPedidoItem = (i) => setPedido({ ...pedido, items: pedido.items.filter((_, idx) => idx !== i) });

  const pedidoTotal = () => pedido.items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precioUnitario), 0);

  const crearPedido = async () => {
    if (!pedido.proveedorId) { setMensaje('⚠️ Seleccione un proveedor'); return; }
    if (pedido.items.length === 0) { setMensaje('⚠️ El pedido necesita al menos un item'); return; }
    try {
      await pedidosProveedorApi.crear({
        proveedorId: Number(pedido.proveedorId),
        tipoStockAfectado: pedido.tipoStockAfectado,
        observaciones: pedido.observaciones,
        items: pedido.items,
      });
      setMensaje('Pedido a proveedor creado ✓ (pendiente, no afecta stock)');
      setPedidoModal(false);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const confirmarPedido = async (id) => {
    if (!window.confirm('¿Confirmar este pedido? Genera la compra y recién ahí afecta el stock.')) return;
    try {
      const res = await pedidosProveedorApi.confirmar(id);
      setMensaje(`Pedido #${id} confirmado → Compra #${res.data.compraId} ✓`);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const anularPedido = async (id) => {
    try {
      await pedidosProveedorApi.anular(id);
      setMensaje(`Pedido #${id} anulado ✓`);
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
        <button type="button" className="btn btn-ghost text-xs" onClick={() => observar(c.id)}>🧠</button>
        {c.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anular(c.id)}>Anular</button>}
      </div>
    ) },
  ];

  const columnasPedidos = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'estado', titulo: 'Estado' },
    { clave: 'total', titulo: 'Total', render: (p) => `$${Number(p.total).toLocaleString('es-AR')}` },
    { clave: 'tipoStockAfectado', titulo: 'Stock' },
    { clave: 'items', titulo: 'Items', render: (p) => (p.items || []).length },
    { clave: 'acciones', titulo: '', render: (p) => (
      <div className="flex gap-2">
        {p.estado === 'PENDIENTE' && (
          <>
            <button type="button" className="btn btn-ghost text-xs" onClick={() => confirmarPedido(p.id)}>Confirmar</button>
            <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularPedido(p.id)}>Anular</button>
          </>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ComprasPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Compras</h2>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={abrirPedido}>Pedido a proveedor</button>
          <button type="button" className="btn btn-ghost" onClick={() => pedirConsulta('Dame un resumen de compras de los ultimos 30 dias.')}>Preguntar al Secretario</button>
        </div>
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

      {observacion && (
        <div className="card p-3 mb-4" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Observación del Secretario</div>
          <p className="text-sm">{observacion.observacion}</p>
        </div>
      )}

      <h3 className="font-semibold mb-2">Pedidos a proveedor</h3>
      <Table columnas={columnasPedidos} filas={pedidos} vacio="Sin pedidos a proveedor" />

      <h3 className="font-semibold mb-2 mt-5">Historial de compras</h3>
      <Table columnas={columnas} filas={compras} vacio="Sin compras" />

      <Modal
        abierto={pedidoModal}
        onClose={() => setPedidoModal(false)}
        titulo="Pedido a proveedor"
        ancho="760px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPedidoModal(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!pedido.proveedorId || pedido.items.length === 0} onClick={crearPedido}>Guardar pedido</button>
          </>
        }
      >
        <div className="flex gap-2 flex-wrap mb-3">
          <select className="input-os" style={{ maxWidth: 260 }} value={pedido.proveedorId} onChange={(e) => setPedido({ ...pedido, proveedorId: e.target.value })}>
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="input-os" style={{ maxWidth: 140 }} value={pedido.tipoStockAfectado} onChange={(e) => setPedido({ ...pedido, tipoStockAfectado: e.target.value })}>
            <option value="FIRME">FIRME</option>
            <option value="CONSIGNA">CONSIGNA</option>
          </select>
        </div>

        <div className="relative mb-3">
          <input
            className="input-os"
            placeholder="Buscar libro por título, código, ISBN o autor..."
            value={pedidoBusqueda}
            onChange={buscarLibro}
          />
          {pedidoResultados.length > 0 && (
            <div className="absolute left-0 right-0 card p-1 z-50" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {pedidoResultados.map((libro) => (
                <button key={libro.ean13} type="button" className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[var(--border)]" onClick={() => seleccionarLibro(libro)}>
                  <span className="font-medium">{libro.titulo}</span>
                  <span className="text-xs text-muted block">Cód: {libro.ean13} · ${Number(libro.precio).toLocaleString('es-AR')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <input className="input-os" placeholder="EAN13 (manual)" value={pedidoEan} onChange={(e) => setPedidoEan(e.target.value)} />
          <input className="input-os" placeholder="Cantidad" type="number" style={{ maxWidth: 100 }} value={pedidoCantidad} onChange={(e) => setPedidoCantidad(e.target.value)} />
          <input className="input-os" placeholder="Precio unit." type="number" style={{ maxWidth: 120 }} value={pedidoPrecio} onChange={(e) => setPedidoPrecio(e.target.value)} />
          <button type="button" className="btn" onClick={agregarPedidoItem}>Agregar</button>
        </div>

        {pedido.items.map((item, i) => (
          <div key={`${item.ean13}-${i}`} className="text-sm py-1 flex justify-between items-center">
            <span className="font-mono">{item.ean13}</span>
            <span className="flex-1 px-3 truncate">{item.titulo}</span>
            <span>{item.cantidad} u × ${Number(item.precioUnitario).toLocaleString('es-AR')}</span>
            <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => quitarPedidoItem(i)}>✕</button>
          </div>
        ))}

        <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <Input label="Observaciones" value={pedido.observaciones} onChange={(e) => setPedido({ ...pedido, observaciones: e.target.value })} />
          <div className="text-right">
            <div className="text-xs text-muted">Total</div>
            <div className="font-semibold">${pedidoTotal().toLocaleString('es-AR')}</div>
          </div>
        </div>
        <p className="text-xs text-muted mt-2">El pedido queda PENDIENTE y no afecta stock. Al confirmarlo se genera la compra (candado FIFE).</p>
      </Modal>
    </div>
  );
}
