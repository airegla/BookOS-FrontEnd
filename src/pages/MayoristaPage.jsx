// BookOS - MayoristaPage.jsx
// ruta: bookos/frontend/src/pages/MayoristaPage.jsx
// descripcion: modulo mayorista (bookerp): remitos entre depositos, ventas
//   mayoristas, devoluciones, sabanas y ajustes de consignacion de cliente.
//   Interconectado con el Secretario: inyecta contexto, escucha instrucciones
//   y permite observar cada documento (🧠).

import { useEffect, useState } from 'react';
import DebugTag from '../ui/DebugTag';
import Table from '../ui/Table';
import ImportarDocumentoBlock from '../blocks/ImportarDocumentoBlock';
import { mayoristaApi, clientesApi, depositosApi, observacionesApi } from '../api/api';
import { useAppContext } from '../AppContext';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'remitos', label: 'Remitos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'devoluciones', label: 'Devoluciones' },
  { id: 'sabanas', label: 'Sábanas' },
  { id: 'ajustes', label: 'Ajustes' },
];

const TIPO_REMITO = ['CONSIGNA', 'FIRME', 'TRASLADO_INTERNO'];
const TIPO_VENTA = ['FACTURA_MAYORISTA_FIRME', 'FACTURA_BAJA_CONSIGNA', 'NOTA_CREDITO_MAYORISTA'];
const TIPO_DEV = ['DEVOLUCION_CONSIGNA', 'DEVOLUCION_FIRME'];
const TIPO_AJUSTE = ['INCREMENTO', 'DECREMENTO'];

const TIPO_OBS = { remitos: 'remito_mayorista', ventas: 'venta_mayorista', devoluciones: 'devolucion_mayorista', sabanas: 'sabana', ajustes: 'ajuste_consignacion' };

export default function MayoristaPage() {
  const [tab, setTab] = useState('resumen');
  const [resumen, setResumen] = useState(null);
  const [listas, setListas] = useState({ remitos: [], ventas: [], devoluciones: [], sabanas: [], ajustes: [] });
  const [clientes, setClientes] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [observacion, setObservacion] = useState(null);
  const [borrador, setBorrador] = useState({ items: [] });
  const [itemEan, setItemEan] = useState('');
  const [itemCant, setItemCant] = useState('');
  const [itemPrecio, setItemPrecio] = useState('');
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargarLista = async (t) => {
    try {
      const fn = {
        remitos: mayoristaApi.listarRemitos,
        ventas: mayoristaApi.listarVentas,
        devoluciones: mayoristaApi.listarDevoluciones,
        sabanas: mayoristaApi.listarSabanas,
        ajustes: mayoristaApi.listarAjustes,
      }[t];
      const res = await fn();
      setListas((prev) => ({ ...prev, [t]: res.data || [] }));
    } catch (e) { /* sin datos */ }
  };

  const cargar = async () => {
    try {
      const [r, c, d] = await Promise.all([
        mayoristaApi.resumen(),
        clientesApi.listar(),
        depositosApi.listar(),
      ]);
      setResumen(r.data?.items || r.data || null);
      setClientes(c.data || []);
      setDepositos(d.data || []);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
    cargarLista('remitos'); cargarLista('ventas'); cargarLista('devoluciones');
    cargarLista('sabanas'); cargarLista('ajustes');
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  useEffect(() => { if (tab !== 'resumen') cargarLista(tab); }, [tab]); // eslint-disable-line

  // Inyecta contexto al Secretario.
  useEffect(() => {
    setContextoActual({ vista: 'mayorista', tab, borrador });
  }, [tab, borrador]); // eslint-disable-line

  const setCampo = (campo, valor) => setBorrador({ ...borrador, [campo]: valor });

  const agregarItem = () => {
    if (!itemEan || !itemCant) return;
    const item = { ean13: itemEan, titulo: itemEan, cantidad: Number(itemCant) };
    if (itemPrecio) item.precioUnitario = Number(itemPrecio);
    setBorrador({ ...borrador, items: [...borrador.items, item] });
    setItemEan(''); setItemCant(''); setItemPrecio('');
  };

  const importarDocumento = (list) => {
    const nuevos = list.filter((i) => i.ean13).map((i) => ({ ean13: i.ean13, titulo: i.titulo || i.ean13, cantidad: i.cantidad }));
    setBorrador({ ...borrador, items: [...borrador.items, ...nuevos] });
    if (nuevos.length) setMensaje(`Importados ${nuevos.length} libros ✓`);
  };

  const crear = async () => {
    try {
      const fn = {
        remitos: () => mayoristaApi.crearRemito(borrador),
        ventas: () => mayoristaApi.crearVenta(borrador),
        devoluciones: () => mayoristaApi.crearDevolucion(borrador),
        sabanas: () => mayoristaApi.crearSabana(borrador),
        ajustes: () => mayoristaApi.crearAjuste(borrador),
      }[tab];
      const res = await fn();
      setMensaje(`${TABS.find((t) => t.id === tab).label} #${res.data.id} creado ✓`);
      setBorrador({ items: [] });
      cargarLista(tab);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const observar = async (tipo, id) => {
    try {
      const res = await observacionesApi.documento({ tipo, id });
      setObservacion(res.data);
      setMensaje('Observación del Secretario generada ✓');
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const resumenCards = resumen ? [
    ['Ventas', resumen.ventas], ['Facturado', fmt(resumen.facturado)],
    ['Remitos', resumen.remitos], ['Devoluciones', resumen.devoluciones],
    ['Sábanas', resumen.sabanas], ['Ajustes', resumen.ajustes], ['Depósitos', resumen.depositos],
  ] : [];

  const columnasPorTab = {
    remitos: [
      { clave: 'id', titulo: 'ID' },
      { clave: 'tipoRemito', titulo: 'Tipo' },
      { clave: 'origen', titulo: 'Origen' },
      { clave: 'destino', titulo: 'Destino' },
      { clave: 'estado', titulo: 'Estado' },
    ],
    ventas: [
      { clave: 'id', titulo: 'ID' },
      { clave: 'tipoComprobante', titulo: 'Comprobante' },
      { clave: 'clienteNombre', titulo: 'Cliente' },
      { clave: 'total', titulo: 'Total', render: (v) => fmt(v.total) },
      { clave: 'estado', titulo: 'Estado' },
    ],
    devoluciones: [
      { clave: 'id', titulo: 'ID' },
      { clave: 'tipoComprobante', titulo: 'Comprobante' },
      { clave: 'clienteNombre', titulo: 'Cliente' },
      { clave: 'totalUnidades', titulo: 'Unidades' },
      { clave: 'estado', titulo: 'Estado' },
    ],
    sabanas: [
      { clave: 'id', titulo: 'ID' },
      { clave: 'clienteNombre', titulo: 'Cliente' },
      { clave: 'totalEjemplares', titulo: 'Ejemplares' },
    ],
    ajustes: [
      { clave: 'id', titulo: 'ID' },
      { clave: 'tipoAjuste', titulo: 'Ajuste' },
      { clave: 'clienteNombre', titulo: 'Cliente' },
      { clave: 'estado', titulo: 'Estado' },
    ],
  };

  const filasTab = listas[tab] || [];

  return (
    <div>
      <DebugTag nombre="MayoristaPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mayorista</h2>
        <button type="button" className="btn btn-ghost" onClick={() => pedirConsulta('Dame un resumen del módulo mayorista (ventas, remitos, depósitos, consigna).')}>Preguntar al Secretario</button>
      </div>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab(t.id); setObservacion(null); }}>{t.label}</button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {resumenCards.map(([label, valor]) => (
            <div key={label} className="card p-4">
              <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
              <div className="text-2xl font-bold">{valor}</div>
            </div>
          ))}
        </div>
      )}

      {tab !== 'resumen' && (
        <>
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Nuevo {TABS.find((t) => t.id === tab).label.toLowerCase().replace(/s$/, '')}</h3>
              <ImportarDocumentoBlock onCargar={importarDocumento} etiqueta="Importar documento" />
            </div>

            <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {(tab === 'ventas' || tab === 'devoluciones' || tab === 'sabanas' || tab === 'ajustes') && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-muted mb-1">Cliente</span>
                  <select className="input-os" value={borrador.clienteId || ''} onChange={(e) => setCampo('clienteId', e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </label>
              )}
              {tab === 'remitos' && (
                <>
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-muted mb-1">Depósito origen</span>
                    <select className="input-os" value={borrador.depositoOrigenId || ''} onChange={(e) => setCampo('depositoOrigenId', e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Origen...</option>
                      {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-muted mb-1">Depósito destino</span>
                    <select className="input-os" value={borrador.depositoDestinoId || ''} onChange={(e) => setCampo('depositoDestinoId', e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Destino...</option>
                      {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-muted mb-1">Tipo</span>
                    <select className="input-os" value={borrador.tipoRemito || 'CONSIGNA'} onChange={(e) => setCampo('tipoRemito', e.target.value)}>
                      {TIPO_REMITO.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </>
              )}
              {(tab === 'ventas' || tab === 'devoluciones') && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-muted mb-1">Depósito</span>
                  <select className="input-os" value={borrador.depositoId || ''} onChange={(e) => setCampo('depositoId', e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Depósito...</option>
                    {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </label>
              )}
              {tab === 'sabanas' && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-muted mb-1">Depósito</span>
                  <select className="input-os" value={borrador.depositoId || ''} onChange={(e) => setCampo('depositoId', e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Depósito...</option>
                    {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </label>
              )}
              {tab === 'ajustes' && (
                <>
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-muted mb-1">Depósito</span>
                    <select className="input-os" value={borrador.depositoId || ''} onChange={(e) => setCampo('depositoId', e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Depósito...</option>
                      {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-muted mb-1">Tipo de ajuste</span>
                    <select className="input-os" value={borrador.tipoAjuste || 'INCREMENTO'} onChange={(e) => setCampo('tipoAjuste', e.target.value)}>
                      {TIPO_AJUSTE.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </>
              )}
              {tab === 'ventas' && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-muted mb-1">Comprobante</span>
                  <select className="input-os" value={borrador.tipoComprobante || TIPO_VENTA[0]} onChange={(e) => setCampo('tipoComprobante', e.target.value)}>
                    {TIPO_VENTA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              )}
              {tab === 'devoluciones' && (
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-muted mb-1">Comprobante</span>
                  <select className="input-os" value={borrador.tipoComprobante || TIPO_DEV[0]} onChange={(e) => setCampo('tipoComprobante', e.target.value)}>
                    {TIPO_DEV.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <input className="input-os" placeholder="EAN13" value={itemEan} onChange={(e) => setItemEan(e.target.value)} />
              <input className="input-os" placeholder="Cantidad" type="number" style={{ maxWidth: 100 }} value={itemCant} onChange={(e) => setItemCant(e.target.value)} />
              {(tab === 'ventas' || tab === 'devoluciones') && (
                <input className="input-os" placeholder="Precio unit." type="number" style={{ maxWidth: 120 }} value={itemPrecio} onChange={(e) => setItemPrecio(e.target.value)} />
              )}
              <button type="button" className="btn" onClick={agregarItem}>Agregar</button>
            </div>

            {borrador.items.map((item, i) => (
              <div key={i} className="text-sm py-1 flex justify-between">
                <span className="font-mono">{item.ean13}</span>
                <span>{item.cantidad} u{item.precioUnitario != null && <> × ${Number(item.precioUnitario).toLocaleString('es-AR')}</>}</span>
                <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => setBorrador({ ...borrador, items: borrador.items.filter((_, idx) => idx !== i) })}>Quitar</button>
              </div>
            ))}

            <div className="flex justify-end mt-3">
              <button type="button" className="btn btn-primary" disabled={borrador.items.length === 0} onClick={crear}>Guardar</button>
            </div>
          </div>

          {observacion && (
            <div className="card p-3 mb-4" style={{ borderLeft: '3px solid var(--accent)' }}>
              <div className="text-xs uppercase tracking-widest text-muted mb-1">Observación del Secretario</div>
              <p className="text-sm">{observacion.observacion}</p>
            </div>
          )}

          <Table
            columnas={[...columnasPorTab[tab], { clave: 'acciones', titulo: '', render: (d) => (
              <button type="button" className="btn btn-ghost text-xs" onClick={() => observar(TIPO_OBS[tab], d.id)}>🧠</button>
            ) }]}
            filas={filasTab}
            vacio={`Sin ${tab}`}
          />
        </>
      )}
    </div>
  );
}
