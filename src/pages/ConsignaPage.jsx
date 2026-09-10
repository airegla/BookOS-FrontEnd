// BookOS - ConsignaPage.jsx
// ruta: bookos/frontend/src/pages/ConsignaPage.jsx
// descripcion: flujo de consignacion: liquidaciones, conciliador de sabanas y
//   devoluciones (motor FIFE). Interconectado con el Secretario (contexto + consulta
//   + observaciones LLM de cada documento).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import DebugTag from '../ui/DebugTag';
import ItemsEditorBlock from '../blocks/ItemsEditorBlock';
import ImportarCsvBlock from '../blocks/ImportarCsvBlock';
import ImportarDocumentoBlock from '../blocks/ImportarDocumentoBlock';
import { consignaApi, proveedoresApi, observacionesApi } from '../api/api';
import { mapearFilas } from '../utils/csv';
import { useAppContext } from '../AppContext';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

export default function ConsignaPage() {
  const [tab, setTab] = useState('liquidaciones');
  const [proveedores, setProveedores] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [conciliaciones, setConciliaciones] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);
  const [mensaje, setMensaje] = useState('');

  // liquidacion nueva
  const [liqAbierto, setLiqAbierto] = useState(false);
  const [liqProveedor, setLiqProveedor] = useState('');
  const [liqItems, setLiqItems] = useState([]);
  const [liqDesc, setLiqDesc] = useState(0);
  const [liqObs, setLiqObs] = useState('');

  // conciliador
  const [concAbierto, setConcAbierto] = useState(false);
  const [concProveedor, setConcProveedor] = useState('');
  const [concTexto, setConcTexto] = useState('');
  const [concPrev, setConcPrev] = useState(null);

  // devolucion nueva
  const [devAbierto, setDevAbierto] = useState(false);
  const [devProveedor, setDevProveedor] = useState('');
  const [devItems, setDevItems] = useState([]);
  const [devMotivo, setDevMotivo] = useState('');

  // facturar liquidacion
  const [facturar, setFacturar] = useState(null); // liquidacion
  const [compraId, setCompraId] = useState('');

  // observaciones + detalle
  const [observacion, setObservacion] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const { setContextoActual, pedirConsulta } = useAppContext();

  const nombreProv = (id) => proveedores.find((p) => p.id === Number(id))?.nombre || `#${id}`;

  const cargar = async () => {
    try {
      const [liq, conc, dev] = await Promise.all([
        consignaApi.liquidaciones({ limit: 100 }),
        consignaApi.listarConciliaciones(),
        consignaApi.listarDevoluciones({ limit: 100 }),
      ]);
      setLiquidaciones(liq.data?.filas || liq.data || []);
      setConciliaciones(conc.data || []);
      setDevoluciones(dev.data?.filas || dev.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => {
    proveedoresApi.listar().then((res) => setProveedores(res.data || [])).catch(() => {});
    cargar();
  }, []); // eslint-disable-line

  useEffect(() => {
    setContextoActual({
      vista: 'consigna',
      tab,
      liquidaciones: liquidaciones.length,
      conciliaciones: conciliaciones.length,
      devoluciones: devoluciones.length,
    });
  }, [tab, liquidaciones.length, conciliaciones.length, devoluciones.length]); // eslint-disable-line

  const observar = async (tipo, id) => {
    try {
      const res = await observacionesApi.documento({ tipo, id });
      setObservacion(res.data);
      setMensaje('Observación del Secretario generada ✓');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const importarLiq = (raw) => {
    const filas = mapearFilas(raw, ['ean13', 'titulo', 'cantidad', 'precio']);
    const nuevos = filas.filter((f) => f.ean13).map((f) => ({ ean13: String(f.ean13), titulo: f.titulo || String(f.ean13), cantidad: Number(f.cantidad) || 1, precioUnitario: Number(f.precio) || 0 }));
    setLiqItems((prev) => [...prev, ...nuevos]);
  };

  const importarDev = (raw) => {
    const filas = mapearFilas(raw, ['ean13', 'titulo', 'cantidad']);
    const nuevos = filas.filter((f) => f.ean13).map((f) => ({ ean13: String(f.ean13), titulo: f.titulo || String(f.ean13), cantidad: Number(f.cantidad) || 1 }));
    setDevItems((prev) => [...prev, ...nuevos]);
  };

  const importarLiqDoc = (list) => {
    const nuevos = list.filter((i) => i.ean13).map((i) => ({ ean13: i.ean13, titulo: i.titulo || i.ean13, cantidad: i.cantidad, precioUnitario: i.precio }));
    setLiqItems((prev) => [...prev, ...nuevos]);
  };

  const importarDevDoc = (list) => {
    const nuevos = list.filter((i) => i.ean13).map((i) => ({ ean13: i.ean13, titulo: i.titulo || i.ean13, cantidad: i.cantidad }));
    setDevItems((prev) => [...prev, ...nuevos]);
  };

  // ---- Liquidaciones ----
  const totalLiq = liqItems.reduce((a, i) => a + (Number(i.precioUnitario) || 0) * (Number(i.cantidad) || 0), 0);

  const crearLiquidacion = async () => {
    try {
      await consignaApi.crearLiquidacion({
        proveedorId: Number(liqProveedor),
        totalEstimado: totalLiq,
        porcentajeDescuento: Number(liqDesc) || 0,
        observaciones: liqObs || null,
        detalle: liqItems.map((i) => ({ ean13: i.ean13, titulo: i.titulo || i.ean13, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario) || 0 })),
      });
      setMensaje('Liquidación creada ✓');
      setLiqAbierto(false); setLiqItems([]); setLiqDesc(0); setLiqObs(''); setLiqProveedor('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const confirmarFacturar = async () => {
    try {
      await consignaApi.facturarLiquidacion(facturar.id, Number(compraId));
      setMensaje(`Liquidación #${facturar.id} facturada ✓`);
      setFacturar(null); setCompraId('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  // ---- Conciliador ----
  const parsearFilas = () => concTexto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [codigo, cantidad] = l.split(/[;,\t]/).map((x) => x.trim());
      return { codigo, cantidad: parseInt(cantidad, 10) || 0 };
    })
    .filter((f) => f.codigo);

  const previsualizar = async () => {
    try {
      const res = await consignaApi.previsualizarConciliacion({ proveedorId: Number(concProveedor), filas: parsearFilas() });
      setConcPrev(res.data || []);
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const guardarConciliacion = async () => {
    try {
      const detalle = (concPrev || []).map((r) => ({
        ean13: r.ean13, titulo: r.titulo, stockLocal: r.stockLocal, stockProveedor: r.stockProveedor, diferencia: r.diferencia, accion: r.accion,
      }));
      await consignaApi.guardarConciliacion({ proveedorId: Number(concProveedor), detalle });
      setMensaje('Conciliación guardada ✓');
      setConcAbierto(false); setConcPrev(null); setConcTexto(''); setConcProveedor('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  // ---- Devoluciones ----
  const crearDevolucion = async () => {
    try {
      await consignaApi.registrarDevolucion({
        tipo: 'PROVEEDOR',
        proveedorId: Number(devProveedor),
        motivo: devMotivo || null,
        items: devItems.map((i) => ({ ean13: i.ean13, cantidad: Number(i.cantidad) })),
      });
      setMensaje('Devolución registrada ✓');
      setDevAbierto(false); setDevItems([]); setDevMotivo(''); setDevProveedor('');
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const anularLiquidacion = async (id) => { try { await consignaApi.anularLiquidacion(id); setMensaje('Liquidación anulada ✓'); cargar(); } catch (e) { setMensaje(`⚠️ ${e.message}`); } };
  const anularConciliacion = async (id) => { try { await consignaApi.anularConciliacion(id); setMensaje('Conciliación anulada ✓'); cargar(); } catch (e) { setMensaje(`⚠️ ${e.message}`); } };
  const anularDevolucion = async (id) => { try { await consignaApi.anularDevolucion(id); setMensaje('Devolución anulada ✓'); cargar(); } catch (e) { setMensaje(`⚠️ ${e.message}`); } };

  const colLiqItems = [
    { clave: 'ean13', titulo: 'EAN', editable: true, ancho: 130 },
    { clave: 'titulo', titulo: 'Titulo', editable: true, ancho: 240 },
    { clave: 'cantidad', titulo: 'Cant.', editable: true, tipo: 'number', ancho: 70 },
    { clave: 'precioUnitario', titulo: 'Precio', editable: true, tipo: 'number', ancho: 100 },
  ];

  const colDevItems = [
    { clave: 'ean13', titulo: 'EAN', editable: true, ancho: 150 },
    { clave: 'titulo', titulo: 'Titulo', editable: true, ancho: 260 },
    { clave: 'cantidad', titulo: 'Cant.', editable: true, tipo: 'number', ancho: 80 },
  ];

  const colLiquidaciones = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'proveedor', titulo: 'Proveedor', render: (l) => nombreProv(l.proveedorId) },
    { clave: 'estado', titulo: 'Estado', render: (l) => <span className="agente-badge">{l.estado}</span> },
    { clave: 'totalEstimado', titulo: 'Total', render: (l) => fmt(l.totalEstimado), valorExport: (l) => Number(l.totalEstimado) },
    { clave: 'acciones', titulo: '', render: (l) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => setDetalle({ tipo: 'liquidacion', doc: l })}>Ver</button>
        {l.estado === 'PENDIENTE' && <button type="button" className="btn btn-ghost text-xs" onClick={() => setFacturar(l)}>Facturar</button>}
        {l.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularLiquidacion(l.id)}>Anular</button>}
        <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('liquidacion', l.id)}>🧠</button>
      </div>
    ) },
  ];

  const colConciliaciones = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'proveedor', titulo: 'Proveedor', render: (c) => nombreProv(c.proveedorId) },
    { clave: 'estado', titulo: 'Estado', render: (c) => <span className="agente-badge">{c.estado}</span> },
    { clave: 'acciones', titulo: '', render: (c) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => setDetalle({ tipo: 'conciliacion', doc: c })}>Ver</button>
        {c.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularConciliacion(c.id)}>Anular</button>}
        <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('conciliacion', c.id)}>🧠</button>
      </div>
    ) },
  ];

  const colDevoluciones = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'nroRemito', titulo: 'Nro', render: (d) => <span className="font-mono text-xs">{d.nroRemito}</span> },
    { clave: 'estado', titulo: 'Estado', render: (d) => <span className="agente-badge">{d.estado}</span> },
    { clave: 'motivo', titulo: 'Motivo' },
    { clave: 'acciones', titulo: '', render: (d) => (
      <div className="flex gap-2">
        {d.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularDevolucion(d.id)}>Anular</button>}
        <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('devolucion', d.id)}>🧠</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="ConsignaPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Consignación</h2>
        <span className="text-xs text-muted">liquidaciones · sábanas · devoluciones (FIFE consigna→firme)</span>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          <button type="button" className={`btn ${tab === 'liquidaciones' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('liquidaciones')}>Liquidaciones</button>
          <button type="button" className={`btn ${tab === 'conciliador' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('conciliador')}>Conciliador</button>
          <button type="button" className={`btn ${tab === 'devoluciones' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('devoluciones')}>Devoluciones</button>
        </div>
        <div className="flex-1" />
        <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Estoy en la vista de consignación (${tab}). ¿Que me sugeris?`)}>Preguntar al Secretario</button>
        <button type="button" className="btn btn-primary text-xs" onClick={() => {
          if (tab === 'liquidaciones') setLiqAbierto(true);
          if (tab === 'conciliador') setConcAbierto(true);
          if (tab === 'devoluciones') setDevAbierto(true);
        }}>
          + {tab === 'liquidaciones' ? 'Liquidación' : tab === 'conciliador' ? 'Conciliación' : 'Devolución'}
        </button>
      </div>

      {observacion && (
        <div className="card p-3 mb-4" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Observación del Secretario</div>
          <p className="text-sm">{observacion.observacion}</p>
        </div>
      )}

      {tab === 'liquidaciones' && <Table columnas={colLiquidaciones} filas={liquidaciones} vacio="Sin liquidaciones" exportable exportarNombre="liquidaciones" />}
      {tab === 'conciliador' && <Table columnas={colConciliaciones} filas={conciliaciones} vacio="Sin conciliaciones" exportable exportarNombre="conciliaciones" />}
      {tab === 'devoluciones' && <Table columnas={colDevoluciones} filas={devoluciones} vacio="Sin devoluciones" exportable exportarNombre="devoluciones" />}

      {/* Nueva liquidacion */}
      <Modal abierto={liqAbierto} onClose={() => setLiqAbierto(false)} titulo="Nueva liquidación" ancho="720px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setLiqAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!liqProveedor || liqItems.length === 0} onClick={crearLiquidacion}>Guardar</button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Proveedor</span>
            <select className="input-os" value={liqProveedor} onChange={(e) => setLiqProveedor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Desc. %</span>
            <input className="input-os" type="number" min="0" value={liqDesc} onChange={(e) => setLiqDesc(Number(e.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Observaciones</span>
            <input className="input-os" value={liqObs} onChange={(e) => setLiqObs(e.target.value)} />
          </label>
        </div>
        <ItemsEditorBlock items={liqItems} onChange={setLiqItems} onRemove={(i) => setLiqItems(liqItems.filter((_, idx) => idx !== i))} columnas={colLiqItems} vacio="Agrega renglones con EAN + cantidad + precio" />
        <div className="flex justify-between mt-3">
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-xs" onClick={() => setLiqItems([...liqItems, { ean13: '', titulo: '', cantidad: 1, precioUnitario: 0 }])}>+ Renglón</button>
            <ImportarCsvBlock etiqueta="Importar CSV" onCargar={importarLiq} />
            <ImportarDocumentoBlock etiqueta="Importar documento" onCargar={importarLiqDoc} />
          </div>
          <span className="text-sm">Total: <strong>{fmt(totalLiq)}</strong></span>
        </div>
      </Modal>

      {/* Conciliador */}
      <Modal abierto={concAbierto} onClose={() => setConcAbierto(false)} titulo="Conciliador de sábanas" ancho="720px"
        footer={
          concPrev
            ? <button type="button" className="btn btn-primary" disabled={(concPrev || []).length === 0} onClick={guardarConciliacion}>Guardar conciliación</button>
            : <button type="button" className="btn btn-primary" disabled={!concProveedor || !concTexto.trim()} onClick={previsualizar}>Previsualizar</button>
        }
      >
        <div className="flex gap-3 mb-3">
          <label className="block flex-1">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Proveedor</span>
            <select className="input-os" value={concProveedor} onChange={(e) => setConcProveedor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        </div>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Filas de la sábana (código;cantidad por línea)</span>
          <textarea className="input-os resize-none" rows={6} placeholder={'9789500431859;5\n9789500204378;2'} value={concTexto} onChange={(e) => setConcTexto(e.target.value)} />
        </label>
        {concPrev && (
          <table className="table-os">
            <thead><tr><th>EAN</th><th>Titulo</th><th>Local</th><th>Proveedor</th><th>Acción</th></tr></thead>
            <tbody>
              {concPrev.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{r.ean13 || '—'}</td>
                  <td>{r.titulo}</td>
                  <td>{r.stockLocal}</td>
                  <td>{r.stockProveedor}</td>
                  <td className="font-semibold" style={{ color: r.diferencia > 0 ? 'var(--danger)' : 'var(--success)' }}>{r.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Nueva devolucion */}
      <Modal abierto={devAbierto} onClose={() => setDevAbierto(false)} titulo="Nueva devolución a proveedor" ancho="640px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDevAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!devProveedor || devItems.length === 0} onClick={crearDevolucion}>Guardar</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Proveedor</span>
            <select className="input-os" value={devProveedor} onChange={(e) => setDevProveedor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-muted mb-1">Motivo</span>
            <input className="input-os" value={devMotivo} onChange={(e) => setDevMotivo(e.target.value)} />
          </label>
        </div>
        <ItemsEditorBlock items={devItems} onChange={setDevItems} onRemove={(i) => setDevItems(devItems.filter((_, idx) => idx !== i))} columnas={colDevItems} vacio="Agrega items con EAN + cantidad" />
        <div className="flex gap-2 mt-3">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setDevItems([...devItems, { ean13: '', titulo: '', cantidad: 1 }])}>+ Item</button>
          <ImportarCsvBlock etiqueta="Importar CSV" onCargar={importarDev} />
          <ImportarDocumentoBlock etiqueta="Importar documento" onCargar={importarDevDoc} />
        </div>
      </Modal>

      {/* Facturar */}
      <Modal abierto={Boolean(facturar)} onClose={() => setFacturar(null)} titulo={facturar ? `Facturar liquidación #${facturar.id}` : ''} ancho="420px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFacturar(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!compraId} onClick={confirmarFacturar}>Facturar</button>
          </>
        }
      >
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">ID de compra vinculada</span>
          <input className="input-os" type="number" value={compraId} onChange={(e) => setCompraId(e.target.value)} />
        </label>
      </Modal>

      {/* Detalle */}
      <Modal abierto={Boolean(detalle)} onClose={() => setDetalle(null)} titulo={detalle ? `Detalle #${detalle.doc.id}` : ''} ancho="640px">
        {detalle && detalle.tipo === 'liquidacion' && (
          <table className="table-os">
            <thead><tr><th>Titulo</th><th>EAN</th><th>Cant.</th><th>Precio</th></tr></thead>
            <tbody>
              {(detalle.doc.detalle || []).map((r, i) => (
                <tr key={i}><td>{r.titulo}</td><td className="font-mono text-xs">{r.ean13}</td><td>{r.cantidad}</td><td>{fmt(r.precioUnitario)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {detalle && detalle.tipo === 'conciliacion' && (
          <table className="table-os">
            <thead><tr><th>Titulo</th><th>Local</th><th>Proveedor</th><th>Acción</th></tr></thead>
            <tbody>
              {(detalle.doc.detalle || []).map((r, i) => (
                <tr key={i}><td>{r.titulo}</td><td>{r.stockLocal}</td><td>{r.stockProveedor}</td><td>{r.accion}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
