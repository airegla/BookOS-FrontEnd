// BookOS - VentasPage.jsx
// ruta: bookos/frontend/src/pages/VentasPage.jsx
// descripcion: comprobante de venta en esquema "cabecera + tabla de items".
//   Features bookerp: multi-pago, pendientes/recuperar (PEDIDO/PRESUPUESTO),
//   giftcard (PDF), captura de email/newsletter y F10. Interconectado con el
//   Secretario: inyecta el borrador y escucha instrucciones para operar la vista.

import { useCallback, useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import ItemsEditorBlock from '../blocks/ItemsEditorBlock';
import ImportarCsvBlock from '../blocks/ImportarCsvBlock';
import ImportarDocumentoBlock from '../blocks/ImportarDocumentoBlock';
import BuscadorArticuloBlock from '../blocks/BuscadorArticuloBlock';
import Paginador from '../ui/Paginador';
import { ventasApi, clientesApi, agenteApi, exportacionApi, parametrosApi } from '../api/api';
import { descargarDesdeServidor } from '../utils/exportar';
import { mapearFilas } from '../utils/csv';
import usePersistentWork from '../hooks/usePersistentWork';
import { useAppContext } from '../AppContext';

const TIPOS = ['FACTURA_B', 'FACTURA_C', 'PEDIDO', 'PRESUPUESTO', 'GIFTCARD'];
const METODOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CTA_CTE'];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

function BadgeEstado({ venta }) {
  const color = venta.estado === 'ANULADA' ? 'var(--danger)' : 'var(--success)';
  return (
    <span className="agente-badge" style={{ borderColor: color, color }}>
      {venta.tipo} · {venta.estado}
    </span>
  );
}

export default function VentasPage() {
  const [items, setItems] = usePersistentWork('venta', []);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [tipo, setTipo] = useState('FACTURA_B');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [metodos, setMetodos] = useState(METODOS);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [cobrarAbierto, setCobrarAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [historial, setHistorial] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [page, setPage] = useState(1);
  const [totalHistorial, setTotalHistorial] = useState(0);

  // multi-pago, email, pendientes
  const [pagos, setPagos] = useState([]);
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [pendientesAbierto, setPendientesAbierto] = useState(false);
  const [pendientes, setPendientes] = useState([]);

  const { ultimosRecomendados, setUltimosRecomendados, setContextoActual, pedirConsulta, instruccionVista } = useAppContext();

  const clienteActual = clientes.find((c) => c.id === Number(clienteId));

  useEffect(() => {
    clientesApi.listar().then((res) => setClientes(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    parametrosApi.metodosPago()
      .then((res) => {
        const activos = (res.data || []).filter((m) => m.activo).map((m) => m.nombre);
        if (activos.length) setMetodos(activos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setEnviarEmail(Boolean(clienteActual?.email)); }, [clienteId]); // eslint-disable-line

  const cargarHistorial = async (p = page) => {
    try {
      const res = await ventasApi.listar({ page: p, limit: 30 });
      setHistorial(res.data || []);
      setTotalHistorial(res.pagination ? res.pagination.total : (res.data || []).length);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargarHistorial(page); }, [page]); // eslint-disable-line

  // F10: abrir cobro.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F10') { e.preventDefault(); if (items.length > 0) abrirCobro(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, tipo, clienteId, descuentoGlobal, metodoPago]); // eslint-disable-line

  const agregarItem = useCallback((articulo) => {
    if (!articulo || !articulo.ean13) return;
    setItems((prev) => {
      const existe = prev.find((i) => i.ean13 === articulo.ean13);
      if (existe) return prev.map((i) => (i.ean13 === articulo.ean13 ? { ...i, cantidad: (Number(i.cantidad) || 1) + 1 } : i));
      return [...prev, { ean13: articulo.ean13, titulo: articulo.titulo || articulo.ean13, cantidad: 1, precio: Number(articulo.precio) || 0, descuento: 0 }];
    });
  }, [setItems]);

  const importarItems = (raw) => {
    const filas = mapearFilas(raw, ['ean13', 'titulo', 'cantidad', 'precio']);
    const nuevos = filas
      .filter((f) => f.ean13)
      .map((f) => ({ ean13: String(f.ean13), titulo: f.titulo || String(f.ean13), cantidad: Number(f.cantidad) || 1, precio: Number(f.precio) || 0, descuento: 0 }));
    setItems((prev) => [...prev, ...nuevos]);
    if (nuevos.length) setMensaje(`Importados ${nuevos.length} items ✓`);
  };

  const importarDocumento = (list) => {
    const nuevos = list.filter((i) => i.ean13).map((i) => ({ ean13: i.ean13, titulo: i.titulo || i.ean13, cantidad: i.cantidad, precio: i.precio, descuento: 0 }));
    setItems((prev) => [...prev, ...nuevos]);
    if (nuevos.length) setMensaje(`Importados ${nuevos.length} libros del documento ✓`);
  };

  // El Secretario opera la vista: refrescar historial o agregar item al borrador.
  useEffect(() => {
    if (!instruccionVista || instruccionVista.dominio !== 'ventas') return;
    if (instruccionVista.accion === 'refrescar') {
      cargarHistorial();
      if (instruccionVista.mensaje) setMensaje(instruccionVista.mensaje);
    }
    if (instruccionVista.accion === 'agregar_item') agregarItem(instruccionVista.item);
  }, [instruccionVista]); // eslint-disable-line

  // Inyecta el borrador al Secretario.
  useEffect(() => {
    setContextoActual({
      vista: 'ventas',
      tipo,
      clienteId,
      metodoPago,
      descuentoGlobal,
      items: items.map((i) => ({ ean13: i.ean13, titulo: i.titulo, cantidad: i.cantidad, precio: i.precio, descuento: i.descuento })),
    });
  }, [items, tipo, clienteId, metodoPago, descuentoGlobal]); // eslint-disable-line

  const subtotal = items.reduce((acc, i) => acc + (Number(i.precio) || 0) * (Number(i.cantidad) || 0) * (1 - (Number(i.descuento) || 0) / 100), 0);
  const total = Math.max(0, subtotal - (Number(descuentoGlobal) || 0));
  const sumaPagos = pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0);

  const abrirCobro = () => {
    if ((tipo === 'PEDIDO' || tipo === 'PRESUPUESTO') && !clienteId) {
      setMensaje('⚠️ Pedido/Presupuesto requieren un cliente especifico (no consumidor final).');
      return;
    }
    setPagos([{ metodoPago, monto: total }]);
    setCobrarAbierto(true);
  };

  const setPago = (i, campo, valor) => {
    setPagos((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: campo === 'monto' ? Number(valor) || 0 : valor } : p)));
  };
  const agregarPago = () => setPagos((prev) => [...prev, { metodoPago: 'EFECTIVO', monto: 0 }]);
  const quitarPago = (i) => setPagos((prev) => prev.filter((_, idx) => idx !== i));

  const cobrar = async () => {
    try {
      const payload = {
        articulos: items.map((i) => ({ ean13: i.ean13, cantidad: i.cantidad, descuento: i.descuento || 0 })),
        tipo,
        metodoPago,
        clienteId: clienteId || null,
        descuentoGlobal,
      };
      if (pagos.length > 1) {
        const suma = pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0);
        if (Math.abs(suma - total) > 0.01) { setMensaje(`⚠️ La suma de pagos (${fmt(suma)}) no coincide con el total (${fmt(total)})`); return; }
        payload.pagos = pagos;
      } else if (pagos.length === 1) {
        payload.metodoPago = pagos[0].metodoPago;
      }

      const res = await ventasApi.procesar(payload);
      const ventaId = res.data.ventaId;
      const vendidos = items.map((i) => i.ean13);
      if (clienteId && ultimosRecomendados.length > 0) {
        await agenteApi.outcome({ clienteId, recomendados: ultimosRecomendados, vendidos });
        setUltimosRecomendados([]);
      }

      if (tipo === 'GIFTCARD') {
        const p = await exportacionApi.pdf({
          nombre: `giftcard_${ventaId}`,
          titulo: 'GIFT CARD',
          numero: fmt(res.data.total),
          cliente: 'Presenta esta tarjeta en el local para canjear tu regalo.',
          lineas: [`Codigo de validacion: #${ventaId}`],
        });
        await descargarDesdeServidor(p.data.url).catch(() => {});
      }

      setMensaje(`${res.data.tipo} #${ventaId} por ${fmt(res.data.total)} ✓`);
      setCobrarAbierto(false);
      setItems([]);
      setDescuentoGlobal(0);
      setTipo('FACTURA_B');
      cargarHistorial();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  };

  const cargarPendientes = async () => {
    try {
      const res = await ventasApi.pendientes();
      setPendientes(res.data || []);
      setPendientesAbierto(true);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const recuperarPendiente = (p) => {
    setItems((p.articulos || []).map((a) => ({ ean13: a.ean13, titulo: a.titulo, cantidad: a.cantidad, precio: Number(a.precio) || 0, descuento: 0 })));
    if (p.clienteId) setClienteId(Number(p.clienteId));
    setTipo('FACTURA_B');
    setPendientesAbierto(false);
    setMensaje(`Pedido #${p.id} cargado para facturar ✓`);
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

  const columnasItems = [
    { clave: 'ean13', titulo: 'EAN', editable: true, ancho: 130 },
    { clave: 'titulo', titulo: 'Titulo', editable: true, ancho: 260 },
    { clave: 'cantidad', titulo: 'Cant.', editable: true, tipo: 'number', ancho: 70 },
    { clave: 'precio', titulo: 'Precio', editable: true, tipo: 'number', ancho: 100 },
    { clave: 'descuento', titulo: 'Desc. %', editable: true, tipo: 'number', ancho: 80 },
    { clave: 'subtotal', titulo: 'Subtotal', render: (it) => fmt((Number(it.precio) || 0) * (Number(it.cantidad) || 0) * (1 - (Number(it.descuento) || 0) / 100)) },
  ];

  const columnasHistorial = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'tipo', titulo: 'Comprobante', render: (v) => <BadgeEstado venta={v} /> },
    { clave: 'total', titulo: 'Total', render: (v) => fmt(v.total), valorExport: (v) => Number(v.total) },
    { clave: 'fecha', titulo: 'Fecha', render: (v) => new Date(v.createdAt).toLocaleString('es-AR'), valorExport: (v) => new Date(v.createdAt).toLocaleString('es-AR') },
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
        <span className="text-xs text-muted">factura descuenta stock · pedido/presupuesto exigen cliente · anular restaura · F10 cobrar</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      {/* CABECERA */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Cabecera del comprobante</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Tipo</span>
            <select className="input-os" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Cliente</span>
            <select className="input-os" value={clienteId || ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Consumidor final</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Metodo de pago</span>
            <select className="input-os" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Desc. global ($)</span>
            <input className="input-os" type="number" min="0" value={descuentoGlobal} onChange={(e) => setDescuentoGlobal(Number(e.target.value) || 0)} />
          </label>
        </div>
        {clienteActual?.email && (
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input type="checkbox" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} />
            <span>Capturar email para newsletter (<span className="font-mono text-xs">{clienteActual.email}</span>)</span>
          </label>
        )}
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" className="btn btn-ghost text-xs" onClick={cargarPendientes}>Pendientes</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Estoy armando una ${tipo} con ${items.length} items. Sugerime titulos para completarla.`)}>
            Preguntar al Secretario
          </button>
        </div>
      </div>

      {/* BUSQUEDA (EAN, titulo, autor o editorial — con debounce) */}
      <div className="card p-4 mb-4">
        <BuscadorArticuloBlock etiqueta="Agregar a la venta" onSeleccionar={agregarItem} />
      </div>

      {/* TABLA DE ITEMS */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Items ({items.length})</h3>
          <div className="flex items-center gap-2">
            <ImportarCsvBlock etiqueta="Importar CSV" onCargar={importarItems} />
            <ImportarDocumentoBlock onCargar={importarDocumento} />
            <span className="text-xs text-muted">Editable en linea · persiste al navegar</span>
          </div>
        </div>
        <ItemsEditorBlock
          items={items}
          onChange={setItems}
          onRemove={(i) => setItems(items.filter((_, idx) => idx !== i))}
          columnas={columnasItems}
          vacio="Agrega items desde la busqueda o pidiendo al Secretario"
        />
        <div className="flex justify-end mt-4 gap-6">
          <div className="text-sm">Subtotal: <strong>{fmt(subtotal)}</strong></div>
          <div className="text-sm">Desc. global: <strong>-{fmt(descuentoGlobal)}</strong></div>
          <div className="text-base font-semibold">Total: {fmt(total)}</div>
        </div>
        <div className="flex justify-end mt-3 gap-2">
          <button type="button" className="btn btn-ghost" disabled={items.length === 0} onClick={() => setItems([])}>Vaciar</button>
          <button type="button" className="btn btn-primary" disabled={items.length === 0} onClick={abrirCobro}>Cobrar (F10)</button>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Historial de ventas (documentos)</h3>
      <Table columnas={columnasHistorial} filas={historial} vacio="Sin ventas" exportable exportarNombre="ventas" />
      <Paginador page={page} total={totalHistorial} limite={30} onCambiar={setPage} etiqueta="ventas" />

      {/* COBRO (multi-pago) */}
      <Modal abierto={cobrarAbierto} onClose={() => setCobrarAbierto(false)} titulo={`Cobrar ${tipo}`} ancho="480px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCobrarAbierto(false)}>Volver</button>
            <button type="button" className="btn btn-primary" onClick={cobrar}>Confirmar</button>
          </>
        }
      >
        <p className="text-sm mb-3">Total: <strong>{fmt(total)}</strong> · Suma pagos: {fmt(sumaPagos)}</p>
        {pagos.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <select className="input-os" value={p.metodoPago} onChange={(e) => setPago(i, 'metodoPago', e.target.value)}>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input-os" type="number" min="0" value={p.monto} onChange={(e) => setPago(i, 'monto', e.target.value)} style={{ maxWidth: 130 }} />
            {pagos.length > 1 && <button type="button" className="btn btn-ghost text-xs" onClick={() => quitarPago(i)}>✕</button>}
          </div>
        ))}
        <button type="button" className="btn btn-ghost text-xs" onClick={agregarPago}>+ Agregar pago</button>
        <p className="text-xs text-muted mt-2">
          {tipo === 'PEDIDO' || tipo === 'PRESUPUESTO'
            ? `${tipo} no descuenta stock y requiere cliente seleccionado.`
            : tipo === 'GIFTCARD'
              ? 'La giftcard no descuenta stock; se genera un PDF al confirmar.'
              : 'Al confirmar se descuenta stock y se registra el outcome de las recomendaciones del Secretario.'}
        </p>
      </Modal>

      {/* PENDIENTES */}
      <Modal abierto={pendientesAbierto} onClose={() => setPendientesAbierto(false)} titulo="Pendientes (pedidos / presupuestos)" ancho="560px">
        {pendientes.length === 0 && <p className="text-sm text-muted">Sin comprobantes pendientes.</p>}
        {pendientes.map((p) => (
          <div key={p.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <span className="agente-badge mr-2">{p.tipo}</span>
              <span className="text-sm">#{p.id} · {fmt(p.total)} · {(p.articulos || []).length} items</span>
            </div>
            <button type="button" className="btn btn-primary text-xs" onClick={() => recuperarPendiente(p)}>Cargar en venta</button>
          </div>
        ))}
      </Modal>

      {/* DETALLE */}
      <Modal abierto={Boolean(detalle)} onClose={() => setDetalle(null)} titulo={detalle ? `Venta #${detalle.id}` : ''} ancho="640px"
        footer={
          detalle ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { pedirConsulta(`Analiza la venta #${detalle.id}: ${(detalle.articulos || []).length} items por ${fmt(detalle.total)}. ¿Que ves?`); }}>Preguntar al Secretario</button>
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
                    <td>{fmt(item.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end font-semibold mt-3">Total: {fmt(detalle.total)}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
