// BookOS - VentasPage.jsx
// ruta: bookos/frontend/src/pages/VentasPage.jsx
// descripcion: punto de venta + recupero de documentos. Reglas de bookerp:
//   solo FACTURA_B/C descuenta stock; PEDIDO/PRESUPUESTO exigen cliente;
//   CTA_CTE no aplica a consumidor final; anular restaura stock. El detalle de
//   cada venta se inyecta al Secretario.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { catalogoApi, ventasApi, clientesApi, agenteApi } from '../api/api';
import usePersistentWork from '../hooks/usePersistentWork';
import { useAppContext } from '../AppContext';

const TIPOS = ['FACTURA_B', 'FACTURA_C', 'PEDIDO', 'PRESUPUESTO'];
const METODOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CTA_CTE'];

function BadgeEstado({ venta }) {
  const color = venta.estado === 'ANULADA' ? 'var(--danger)' : 'var(--success)';
  return (
    <span className="agente-badge" style={{ borderColor: color, color }}>
      {venta.tipo} · {venta.estado}
    </span>
  );
}

export default function VentasPage() {
  const [carrito, setCarrito] = usePersistentWork('venta', []);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [tipo, setTipo] = useState('FACTURA_B');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [cobrarAbierto, setCobrarAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Recupero de documentos (historial).
  const [historial, setHistorial] = useState([]);
  const [detalle, setDetalle] = useState(null);

  const { ultimosRecomendados, setUltimosRecomendados, setContextoActual, pedirConsulta } = useAppContext();

  useEffect(() => {
    clientesApi.listar().then((res) => setClientes(res.data || [])).catch(() => {});
  }, []);

  const cargarHistorial = async () => {
    try {
      const res = await ventasApi.listar({ page: 1, limit: 30 });
      setHistorial(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargarHistorial(); }, []); // eslint-disable-line

  const buscar = async () => {
    const res = await catalogoApi.listar({ page: 1, limit: 8, search: busqueda });
    setResultados(res.data || []);
  };

  const agregar = (articulo) => {
    const existente = carrito.find((c) => c.ean13 === articulo.ean13);
    if (existente) {
      setCarrito(carrito.map((c) => c.ean13 === articulo.ean13 ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setCarrito([...carrito, { ean13: articulo.ean13, titulo: articulo.titulo, precio: articulo.precio, cantidad: 1 }]);
    }
  };

  const cobrar = async () => {
    try {
      const res = await ventasApi.procesar({ articulos: carrito, tipo, metodoPago, clienteId: clienteId || null });
      const vendidos = carrito.map((c) => c.ean13);
      if (clienteId && ultimosRecomendados.length > 0) {
        await agenteApi.outcome({ clienteId, recomendados: ultimosRecomendados, vendidos });
        setUltimosRecomendados([]);
      }
      setMensaje(`${res.data.tipo} #${res.data.ventaId} por $${Number(res.data.total).toLocaleString('es-AR')} ✓`);
      setCobrarAbierto(false);
      setCarrito([]);
      cargarHistorial();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  };

  const verDetalle = (venta) => {
    setDetalle(venta);
    setContextoActual({ ventaId: venta.id, tipo: venta.tipo, estado: venta.estado, items: venta.articulos, total: Number(venta.total) });
  };

  const anular = async () => {
    try {
      await ventasApi.anular(detalle.id);
      setMensaje(`Venta #${detalle.id} anulada (stock restaurado) ✓`);
      setDetalle(null);
      cargarHistorial();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => {
    setContextoActual({ vista: 'ventas', items: carrito, clienteId });
  }, [carrito, clienteId]); // eslint-disable-line

  const total = carrito.reduce((acc, c) => acc + c.precio * c.cantidad, 0);

  const columnasHistorial = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'tipo', titulo: 'Comprobante', render: (v) => <BadgeEstado venta={v} /> },
    { clave: 'total', titulo: 'Total', render: (v) => `$${Number(v.total).toLocaleString('es-AR')}` },
    { clave: 'fecha', titulo: 'Fecha', render: (v) => new Date(v.createdAt).toLocaleString('es-AR') },
    { clave: 'acciones', titulo: '', render: (v) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => verDetalle(v)}>Ver</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="VentasPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Ventas</h2>
        <span className="text-xs text-muted">Reglas bookerp: factura descuenta stock · pedido/presupuesto exigen cliente · anular restaura</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="input-os"
          style={{ maxWidth: 260 }}
          placeholder="EAN o titulo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
        />
        <button type="button" className="btn" onClick={buscar}>Buscar</button>
        <select className="input-os" style={{ maxWidth: 220 }} value={clienteId || ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Consumidor final</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="input-os" style={{ maxWidth: 150 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input-os" style={{ maxWidth: 160 }} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          {resultados.map((a) => (
            <div key={a.ean13} className="card p-3 mb-2 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{a.titulo}</div>
                <div className="text-xs text-muted">{a.autor} · stock {a.stock + a.stockDeposito}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono">${Number(a.precio).toLocaleString('es-AR')}</span>
                <button type="button" className="btn btn-primary text-xs" onClick={() => agregar(a)}>Agregar</button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="card p-4">
            <h3 className="font-semibold mb-3">Carrito (persiste al cambiar de pagina)</h3>
            {carrito.map((c) => (
              <div key={c.ean13} className="flex justify-between text-sm py-1">
                <span>{c.cantidad} × {c.titulo}</span>
                <span className="font-mono">${(c.precio * c.cantidad).toLocaleString('es-AR')}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <span>Total</span>
              <span>${total.toLocaleString('es-AR')}</span>
            </div>
            <button type="button" className="btn btn-primary w-full mt-3" disabled={carrito.length === 0} onClick={() => setCobrarAbierto(true)}>
              Cobrar
            </button>
          </div>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Historial de ventas (documentos)</h3>
      <Table columnas={columnasHistorial} filas={historial} vacio="Sin ventas" />

      <Modal abierto={cobrarAbierto} onClose={() => setCobrarAbierto(false)} titulo={`Confirmar ${tipo}`} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCobrarAbierto(false)}>Volver</button>
            <button type="button" className="btn btn-primary" onClick={cobrar}>Confirmar</button>
          </>
        }
      >
        <p className="text-sm">Total: <strong>${total.toLocaleString('es-AR')}</strong> · {metodoPago}</p>
        <p className="text-xs text-muted mt-2">
          {tipo === 'PEDIDO' || tipo === 'PRESUPUESTO'
            ? `${tipo} no descuenta stock y requiere cliente seleccionado.`
            : 'Al confirmar se descuenta stock y se registra el outcome de las recomendaciones del Secretario.'}
        </p>
      </Modal>

      <Modal abierto={Boolean(detalle)} onClose={() => setDetalle(null)} titulo={detalle ? `Venta #${detalle.id}` : ''} ancho="640px"
        footer={
          detalle ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { pedirConsulta(`Analizá la venta #${detalle.id}: ${(detalle.articulos || []).length} items por $${Number(detalle.total).toLocaleString('es-AR')}. ¿Que ves?`); }}>Preguntar al Secretario</button>
              {detalle.estado !== 'ANULADA' && (
                <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={anular}>Anular</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setDetalle(null)}>Cerrar</button>
            </>
          ) : null
        }
      >
        {detalle && (
          <div>
            <div className="flex items-center gap-2 mb-3"><BadgeEstado venta={detalle} /> <span className="text-sm">{new Date(detalle.createdAt).toLocaleString('es-AR')}</span></div>
            <table className="table-os">
              <thead><tr><th>Titulo</th><th>EAN</th><th>Cant.</th><th>Precio</th></tr></thead>
              <tbody>
                {detalle.articulos.map((item) => (
                  <tr key={item.ean13}>
                    <td>{item.titulo}</td>
                    <td className="font-mono text-xs">{item.ean13}</td>
                    <td>{item.cantidad}</td>
                    <td>${Number(item.precio).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end font-semibold mt-3">Total: ${Number(detalle.total).toLocaleString('es-AR')}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
