// BookOS - MayoristaPage.jsx
// ruta: bookos/frontend/src/pages/MayoristaPage.jsx
// descripcion: modulo mayorista (F-12). Patron de 3 bloques (cabecera / tabla / chat del
//   Secretario). Estado: E7 — remitos completos (consigna/firme/traslado con sábana del cliente y
//   anulación); E8 — facturación completa: factura firme (mueve stock, o genérica solo-CC si ya se
//   movió con remito en firme), baja de consigna (con el disponible de la sábana a la vista y la
//   REGLA DURA) y NC libre; E9 — devoluciones (vuelve de consigna con el tope de la sábana o de
//   firme con NC por el valorizado; el acuse PDF+CSV se genera al registrar). Todos los historiales
//   con Ver/CSV/PDF/Mail/Anular/🧠, paginador server-side y buscador con debounce. Pedidos y
//   sábanas/ajustes llegan en sus etapas (E10-E11) y por ahora muestran su historial con el aviso
//   de la etapa.

import { useEffect, useRef, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Paginador from '../ui/Paginador';
import TablaItemsPaginada from '../ui/TablaItemsPaginada';
import SelectBuscador from '../ui/SelectBuscador';
import MayoristaCabeceraBlock from '../blocks/MayoristaCabeceraBlock';
import MayoristaTablaBlock from '../blocks/MayoristaTablaBlock';
import { mayoristaApi, depositosApi, observacionesApi } from '../api/api';
import { buscarMayoristas } from '../utils/selectores';
import { descargarDesdeServidor } from '../utils/exportar';
import { useAppContext } from '../AppContext';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'remitos', label: 'Remitos' },
  { id: 'ventas', label: 'Facturación' },
  { id: 'devoluciones', label: 'Devoluciones' },
  { id: 'pedidos', label: 'Pedidos de devolución' },
  { id: 'sabanas', label: 'Sábanas' },
  { id: 'ajustes', label: 'Ajustes' },
];

// Cada solapa dice en qué etapa llega su escritura (lo que ya funciona es el historial).
const ETAPA_ESCRITURA = {
  pedidos: 'E10 — pedidos de devolución + conciliación',
  sabanas: 'E11 — emisión y envío de sábanas',
  ajustes: 'E11 — ajustes a la sábana del cliente',
};

const CABECERA_VACIA = { cliente: null, depositoOrigenId: '', depositoDestinoId: '', tipoRemito: 'CONSIGNA', observaciones: '' };
const FACTURA_VACIA = { cliente: null, tipoComprobante: 'FACTURA_MAYORISTA_FIRME', mueveStock: true, depositoOrigenId: '', descuentoGlobal: 0, monto: '', descuentoFijo: null, observaciones: '' };
const DEVOLUCION_VACIA = { cliente: null, tipoComprobante: 'DEVOLUCION_CONSIGNA', depositoId: '', totalValorizado: '', descuentoFijo: null, observaciones: '' };
// Historiales con paginador server-side (los demas listados se paginan en su etapa).
const PAGINADOS = ['remitos', 'ventas', 'devoluciones'];
const LIMITE = 20;

export default function MayoristaPage() {
  const [tab, setTab] = useState('resumen');
  const [resumen, setResumen] = useState(null);
  const [listas, setListas] = useState({ remitos: [], ventas: [], devoluciones: [], pedidos: [], sabanas: [], ajustes: [] });
  const [depositos, setDepositos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [observacion, setObservacion] = useState(null);
  const [pags, setPags] = useState({ remitos: 1, ventas: 1, devoluciones: 1 });
  const [busq, setBusq] = useState({ remitos: '', ventas: '', devoluciones: '' });
  const [totales, setTotales] = useState({ remitos: 0, ventas: 0, devoluciones: 0 });
  const timers = useRef({});
  const [verRemito, setVerRemito] = useState(null);
  const [cab, setCab] = useState(CABECERA_VACIA);
  const [items, setItems] = useState([]);
  const [fact, setFact] = useState(FACTURA_VACIA);
  const [itemsFact, setItemsFact] = useState([]);
  const [sabana, setSabana] = useState(null);
  const [verVenta, setVerVenta] = useState(null);
  const [dev, setDev] = useState(DEVOLUCION_VACIA);
  const [itemsDev, setItemsDev] = useState([]);
  const [sabanaDev, setSabanaDev] = useState(null);
  const [verDev, setVerDev] = useState(null);
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargarLista = async (t, { page = null, buscar = null } = {}) => {
    try {
      const fn = {
        remitos: mayoristaApi.listarRemitos,
        ventas: mayoristaApi.listarVentas,
        devoluciones: mayoristaApi.listarDevoluciones,
        pedidos: mayoristaApi.listarPedidos,
        sabanas: mayoristaApi.listarSabanas,
        ajustes: mayoristaApi.listarAjustes,
      }[t];
      const esPag = PAGINADOS.includes(t);
      const p = page || (esPag ? pags[t] : 1);
      const b = buscar !== null ? buscar : (esPag ? busq[t] : '');
      const res = esPag
        ? await fn({ page: p, limit: LIMITE, buscar: b || undefined })
        : await fn({ limite: 100 });
      const filas = res.data || [];
      setListas((prev) => ({ ...prev, [t]: filas }));
      if (esPag) {
        setPags((prev) => ({ ...prev, [t]: p }));
        setBusq((prev) => ({ ...prev, [t]: b }));
        setTotales((prev) => ({ ...prev, [t]: res.pagination ? res.pagination.total : filas.length }));
      }
    } catch (e) { /* sin datos todavia */ }
  };

  // Buscador del historial con debounce (el backend pagina y filtra).
  const buscarEn = (t, valor) => {
    setBusq((prev) => ({ ...prev, [t]: valor }));
    clearTimeout(timers.current[t]);
    timers.current[t] = setTimeout(() => cargarLista(t, { page: 1, buscar: valor }), 350);
  };

  const cargar = async () => {
    const [r, d] = await Promise.allSettled([mayoristaApi.resumen(), depositosApi.listar()]);
    if (r.status === 'fulfilled') setResumen(r.value.data || null);
    if (d.status === 'fulfilled') setDepositos(d.value.data || []);
    if (r.status === 'rejected' || d.status === 'rejected') setMensaje('⚠️ El módulo mayorista respondió con errores: revisá el backend');
    ['remitos', 'ventas', 'devoluciones', 'pedidos', 'sabanas', 'ajustes'].forEach(cargarLista);
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  // Inyecta contexto al Secretario (lo que ve y lo que esta armando).
  useEffect(() => {
    setContextoActual({
      vista: 'mayorista',
      tab,
      borrador: tab === 'remitos' ? { cliente: cab.cliente ? cab.cliente.nombre : null, tipoRemito: cab.tipoRemito, origen: cab.depositoOrigenId, items: items.length, unidades: items.reduce((a, i) => a + Number(i.cantidad || 0), 0) } : undefined,
      borradorFactura: tab === 'ventas' ? { cliente: fact.cliente ? fact.cliente.nombre : null, tipo: fact.tipoComprobante, mueveStock: fact.mueveStock, items: itemsFact.length } : undefined,
      borradorDevolucion: tab === 'devoluciones' ? { cliente: dev.cliente ? dev.cliente.nombre : null, tipo: dev.tipoComprobante, items: itemsDev.length } : undefined,
    });
  }, [tab, cab, items, fact, itemsFact, dev, itemsDev]); // eslint-disable-line

  const setCampo = (campo, valor) => setCab((prev) => ({ ...prev, [campo]: valor }));
  const setCampoFact = (campo, valor) => setFact((prev) => ({ ...prev, [campo]: valor }));
  const setCampoDev = (campo, valor) => setDev((prev) => ({ ...prev, [campo]: valor }));

  // ---- Documento por documento (CSV / PDF / Mail / Anular): el mismo flujo para todos los documentos ----
  const docApi = (tipoDoc) => (tipoDoc === 'remito'
    ? { csv: mayoristaApi.csvRemito, pdf: mayoristaApi.pdfRemito, mail: mayoristaApi.mailRemito, anular: mayoristaApi.anularRemito }
    : tipoDoc === 'venta'
      ? { csv: mayoristaApi.csvVenta, pdf: mayoristaApi.pdfVenta, mail: mayoristaApi.mailVenta, anular: mayoristaApi.anularVenta }
      : { csv: mayoristaApi.csvDevolucion, pdf: mayoristaApi.pdfDevolucion, mail: mayoristaApi.mailDevolucion, anular: mayoristaApi.anularDevolucion });

  const reimprimir = async (r, formato, tipoDoc = 'remito') => {
    try {
      const res = await docApi(tipoDoc)[formato](r.id);
      const desc = res.data || {};
      await descargarDesdeServidor(`/archivos/${desc.archivoId}/descarga`, desc.nombre);
      setMensaje(`${formato.toUpperCase()} de ${r.numero || r.numeroComprobante} descargado ✓`);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const enviarMail = async (r, tipoDoc = 'remito') => {
    const numero = r.numero || r.numeroComprobante;
    if (!window.confirm(`¿Enviar ${numero} por mail al cliente? (adjunta PDF + CSV)`)) return;
    try {
      const res = await docApi(tipoDoc).mail(r.id);
      setMensaje(res.data && res.data.enviado ? `${numero} enviado a ${res.data.a}${res.data.redirigido ? ' (MODO PRUEBA)' : ''} ✓` : `El mail no salió: ${(res.data && res.data.motivo) || 'sin detalle'}`);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const anularDoc = async (r, tipoDoc = 'remito') => {
    const numero = r.numero || r.numeroComprobante;
    if (!window.confirm(`¿Anular ${numero}? Se revierte el stock por el ledger y se contra-asienta la CC si tiene.`)) return;
    try {
      const res = await docApi(tipoDoc).anular(r.id);
      const avisos = (res.data.avisos || []).length ? ` — avisos: ${res.data.avisos.join(' · ')}` : '';
      setMensaje(`${numero} anulado ✓${avisos}`);
      cargarLista(tipoDoc === 'remito' ? 'remitos' : tipoDoc === 'venta' ? 'ventas' : 'devoluciones');
      mayoristaApi.resumen().then((r2) => setResumen(r2.data || null)).catch(() => null);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  // ---- Remitos (E7) ----
  const destinoDelRemito = () => {
    if (cab.tipoRemito === 'TRASLADO_INTERNO') return cab.depositoDestinoId;
    return cab.cliente && cab.cliente.deposito ? cab.cliente.deposito.id : '';
  };

  const crearRemito = async () => {
    const destino = destinoDelRemito();
    if (cab.tipoRemito !== 'TRASLADO_INTERNO' && !cab.cliente) { setMensaje('⚠️ Elegí el cliente mayorista'); return; }
    if (cab.tipoRemito !== 'TRASLADO_INTERNO' && cab.cliente && !cab.cliente.deposito) { setMensaje('⚠️ Ese cliente no tiene depósito espejo: marcalo como mayorista en su ficha'); return; }
    if (!cab.depositoOrigenId) { setMensaje('⚠️ Elegí el depósito de origen'); return; }
    if (!destino) { setMensaje('⚠️ Falta el destino'); return; }
    if (!items.length) { setMensaje('⚠️ Agregá renglones'); return; }
    try {
      const res = await mayoristaApi.crearRemito({
        depositoOrigenId: Number(cab.depositoOrigenId),
        depositoDestinoId: Number(destino),
        tipoRemito: cab.tipoRemito,
        observaciones: cab.observaciones || null,
        items: items.map((i) => ({ ean13: i.ean13, cantidad: Number(i.cantidad), tipoStock: i.tipoStock || 'CONSIGNA' })),
      });
      const d = res.data || {};
      const avisos = (d.avisos || []).length ? ` — avisos: ${d.avisos.join(' · ')}` : '';
      setMensaje(`Remito ${d.numero} emitido ✓${avisos}`);
      setCab(CABECERA_VACIA);
      setItems([]);
      cargarLista('remitos');
      mayoristaApi.resumen().then((r2) => setResumen(r2.data || null)).catch(() => null);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const verDetalleRemito = async (r) => {
    try {
      const res = await mayoristaApi.obtenerRemito(r.id);
      setVerRemito(res.data);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  // ---- Facturación (E8) ----
  // La sabana del cliente (su deposito espejo) para mostrar el disponible por titulo en la baja de
  // consigna: el operario ve de antemano el tope duro (§4.2.1) y evita el 409.
  const cargarSabana = async (cliente) => {
    if (!cliente || !cliente.deposito) { setSabana(null); return; }
    try {
      const res = await depositosApi.stock(cliente.deposito.id);
      const mapa = {};
      (res.data || []).forEach((f) => { mapa[f.articuloId] = Number(f.consignaActual || 0); });
      setSabana(mapa);
    } catch (e) { setSabana(null); }
  };

  const elegirClienteFact = (c) => {
    setFact((prev) => ({ ...prev, cliente: c || null, descuentoFijo: c && c.descuentoFijo != null ? Number(c.descuentoFijo) : null }));
    if (fact.tipoComprobante === 'FACTURA_BAJA_CONSIGNA') cargarSabana(c);
  };

  const cambiarTipoFact = (tipo) => {
    setFact((prev) => ({ ...prev, tipoComprobante: tipo }));
    if (tipo === 'FACTURA_BAJA_CONSIGNA') cargarSabana(fact.cliente); else setSabana(null);
  };

  const subtotalFact = itemsFact.reduce((a, i) => a + (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0) * (1 - (Number(i.descuentoLinea) || 0) / 100), 0);
  const totalFact = Math.max(0, subtotalFact - (Number(fact.descuentoGlobal) || 0));

  const crearVenta = async () => {
    if (!fact.cliente) { setMensaje('⚠️ Elegí el cliente mayorista'); return; }
    const esNC = fact.tipoComprobante === 'NOTA_CREDITO_MAYORISTA';
    const esGenerica = fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock;
    if (esNC && !(Number(fact.monto) > 0)) { setMensaje('⚠️ La nota de crédito necesita un monto'); return; }
    if (esGenerica && !String(fact.observaciones || '').trim()) { setMensaje('⚠️ La factura genérica necesita decir a qué corresponde'); return; }
    if (!esNC && !esGenerica && !itemsFact.length) { setMensaje('⚠️ Agregá renglones'); return; }
    try {
      const payload = {
        clienteId: fact.cliente.id,
        tipoComprobante: fact.tipoComprobante,
        observaciones: fact.observaciones || null,
        ...(esNC || esGenerica
          ? { monto: Number(fact.monto) }
          : {
            items: itemsFact.map((i) => ({ ean13: i.ean13, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario) || 0, descuentoLinea: i.descuentoLinea })),
            descuentoGlobal: Number(fact.descuentoGlobal) || 0,
          }),
        ...(fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME'
          ? { mueveStock: fact.mueveStock, depositoOrigenId: fact.mueveStock && fact.depositoOrigenId ? Number(fact.depositoOrigenId) : null }
          : {}),
      };
      const res = await mayoristaApi.crearVenta(payload);
      const d = res.data || {};
      const avisos = (d.avisos || []).length ? ` — avisos: ${d.avisos.join(' · ')}` : '';
      setMensaje(`${d.numeroComprobante} emitido ✓ (total $${Number(d.total).toLocaleString('es-AR')})${avisos}`);
      setFact(FACTURA_VACIA);
      setItemsFact([]);
      setSabana(null);
      cargarLista('ventas');
      mayoristaApi.resumen().then((r2) => setResumen(r2.data || null)).catch(() => null);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const verDetalleVenta = async (v) => {
    try {
      const res = await mayoristaApi.obtenerVenta(v.id);
      setVerVenta(res.data);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  // ---- Devoluciones (E9) ----
  // La sabana del cliente tambien se muestra aca: para la devolucion de consigna es el tope duro
  // (no se puede devolver mas de lo que tiene consignado).
  const cargarSabanaDev = async (cliente) => {
    if (!cliente || !cliente.deposito) { setSabanaDev(null); return; }
    try {
      const res = await depositosApi.stock(cliente.deposito.id);
      const mapa = {};
      (res.data || []).forEach((f) => { mapa[f.articuloId] = Number(f.consignaActual || 0); });
      setSabanaDev(mapa);
    } catch (e) { setSabanaDev(null); }
  };

  const elegirClienteDev = (c) => {
    setDev((prev) => ({ ...prev, cliente: c || null, descuentoFijo: c && c.descuentoFijo != null ? Number(c.descuentoFijo) : null }));
    cargarSabanaDev(c);
  };

  const subtotalDev = itemsDev.reduce((a, i) => a + (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0), 0);

  const crearDevolucion = async () => {
    if (!dev.cliente) { setMensaje('⚠️ Elegí el cliente mayorista'); return; }
    if (!dev.depositoId) { setMensaje('⚠️ Elegí el depósito al que vuelven los libros'); return; }
    if (!itemsDev.length) { setMensaje('⚠️ Agregá renglones'); return; }
    try {
      const res = await mayoristaApi.crearDevolucion({
        clienteId: dev.cliente.id,
        tipoComprobante: dev.tipoComprobante,
        depositoId: Number(dev.depositoId),
        items: itemsDev.map((i) => ({ ean13: i.ean13, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario) || 0 })),
        totalValorizado: dev.tipoComprobante === 'DEVOLUCION_FIRME' && dev.totalValorizado !== '' ? Number(dev.totalValorizado) : null,
        observaciones: dev.observaciones || null,
      });
      const d = res.data || {};
      setMensaje(`${d.numero} registrada ✓ (acuse generado${d.acuse ? ': PDF + CSV' : ''})${d.totalValorizado ? ` · NC de $${Number(d.totalValorizado).toLocaleString('es-AR')} en la CC` : ''}`);
      setDev(DEVOLUCION_VACIA);
      setItemsDev([]);
      setSabanaDev(null);
      cargarLista('devoluciones');
      mayoristaApi.resumen().then((r2) => setResumen(r2.data || null)).catch(() => null);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const verDetalleDev = async (v) => {
    try {
      const res = await mayoristaApi.obtenerDevolucion(v.id);
      setVerDev(res.data);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const observar = async (tipo, id) => {
    try {
      const res = await observacionesApi.documento({ tipo, id });
      setObservacion(res.data);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const colRemitos = [
    { clave: 'numero', titulo: 'Nro', render: (r) => <span className="font-mono text-xs">{r.numero}</span> },
    { clave: 'tipoRemito', titulo: 'Tipo' },
    { clave: 'origen', titulo: 'Origen', render: (r) => (r.origen ? r.origen.nombre : '—') },
    { clave: 'destino', titulo: 'Destino', render: (r) => (r.destino ? r.destino.nombre : '—') },
    { clave: 'unidades', titulo: 'Unidades' },
    { clave: 'estado', titulo: 'Estado', render: (r) => <span className="agente-badge">{r.estado}</span> },
    {
      clave: 'acciones',
      titulo: '',
      render: (r) => (
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => verDetalleRemito(r)}>Ver</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(r, 'csv', 'remito')}>CSV</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(r, 'pdf', 'remito')}>PDF</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => enviarMail(r, 'remito')}>Mail</button>
          {r.estado !== 'ANULADO' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularDoc(r, 'remito')}>Anular</button>}
          <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('remito_mayorista', r.id)}>🧠</button>
        </div>
      ),
    },
  ];

  // Facturación (E8): el historial con las mismas acciones por documento + la marca de genérica.
  const colVentas = [
    { clave: 'numeroComprobante', titulo: 'Nro', render: (v) => <span className="font-mono text-xs">{v.numeroComprobante}</span> },
    {
      clave: 'tipoComprobante',
      titulo: 'Tipo',
      render: (v) => (v.tipoComprobante === 'FACTURA_BAJA_CONSIGNA' ? 'Baja de consigna' : v.tipoComprobante === 'NOTA_CREDITO_MAYORISTA' ? 'NC libre' : `Firme${v.mueveStock ? '' : ' (genérica)'}`),
    },
    { clave: 'cliente', titulo: 'Cliente', render: (v) => (v.cliente ? v.cliente.nombre : '—') },
    { clave: 'total', titulo: 'Total', render: (v) => `$${Number(v.total).toLocaleString('es-AR')}` },
    { clave: 'vencimiento', titulo: 'Vence', render: (v) => (v.fechaVencimiento ? new Date(v.fechaVencimiento).toLocaleDateString('es-AR') : '—') },
    { clave: 'estado', titulo: 'Estado', render: (v) => <span className="agente-badge">{v.estado}</span> },
    {
      clave: 'acciones',
      titulo: '',
      render: (v) => (
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => verDetalleVenta(v)}>Ver</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(v, 'csv', 'venta')}>CSV</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(v, 'pdf', 'venta')}>PDF</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => enviarMail(v, 'venta')}>Mail</button>
          {v.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularDoc(v, 'venta')}>Anular</button>}
          <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('venta_mayorista', v.id)}>🧠</button>
        </div>
      ),
    },
  ];

  const tipoObs = (t) => (t === 'pedidos' ? 'pedido_devolucion' : t === 'sabanas' ? 'sabana' : 'ajuste_consignacion');

  // Devoluciones (E9): vuelven de la sabana (consigna) o de lo comprado (firme, con NC).
  const colDevoluciones = [
    { clave: 'numero', titulo: 'Nro', render: (d) => <span className="font-mono text-xs">{d.numero}</span> },
    { clave: 'tipoComprobante', titulo: 'Tipo', render: (d) => (d.tipoComprobante === 'DEVOLUCION_CONSIGNA' ? 'Vuelve de consigna' : 'Vuelve de firme') },
    { clave: 'cliente', titulo: 'Cliente', render: (d) => (d.cliente ? d.cliente.nombre : '—') },
    { clave: 'deposito', titulo: 'Vuelven a', render: (d) => (d.deposito ? d.deposito.nombre : '—') },
    { clave: 'unidades', titulo: 'Unidades', render: (d) => d.totalUnidades },
    { clave: 'totalValorizado', titulo: 'Valorizado', render: (d) => (Number(d.totalValorizado) ? `$${Number(d.totalValorizado).toLocaleString('es-AR')}` : '—') },
    { clave: 'estado', titulo: 'Estado', render: (d) => <span className="agente-badge">{d.estado}</span> },
    {
      clave: 'acciones',
      titulo: '',
      render: (d) => (
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => verDetalleDev(d)}>Ver</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(d, 'csv', 'devolucion')}>CSV</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(d, 'pdf', 'devolucion')}>Acuse PDF</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => enviarMail(d, 'devolucion')}>Mail</button>
          {d.estado !== 'ANULADA' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularDoc(d, 'devolucion')}>Anular</button>}
          <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('devolucion_mayorista', d.id)}>🧠</button>
        </div>
      ),
    },
  ];

  const colSimple = (t) => [
    { clave: 'id', titulo: 'ID' },
    { clave: 'numero', titulo: 'Nro', render: (d) => <span className="font-mono text-xs">{d.numero || d.numeroComprobante || `#${d.id}`}</span> },
    { clave: 'cliente', titulo: 'Cliente', render: (d) => (d.cliente ? d.cliente.nombre : '—') },
    { clave: 'estado', titulo: 'Estado', render: (d) => <span className="agente-badge">{d.estado}</span> },
    {
      clave: 'acciones',
      titulo: '',
      render: (d) => <button type="button" className="btn btn-ghost text-xs" onClick={() => observar(tipoObs(t), d.id)}>🧠</button>,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl">Mayorista</h2>
          <p className="text-xs text-muted">depósito espejo por cliente (su sábana) · remitos · facturación · devoluciones</p>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => pedirConsulta(`Estoy en el módulo mayorista (${tab}). ¿Que me sugeris?`)}>Preguntar al Secretario</button>
      </div>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      {observacion && (
        <div className="card p-3 mb-4" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Observación del Secretario</div>
          <p className="text-sm">{observacion.observacion}</p>
        </div>
      )}

      {tab === 'resumen' && resumen && (
        <div className="form-grid">
          <div className="card p-3">
            <div className="text-xs uppercase tracking-widest text-muted mb-1">Clientes mayoristas</div>
            <p className="text-2xl">{resumen.clientesMayoristas}</p>
            <p className="text-xs text-muted">
              con sábana en {resumen.depositosEspejo.conConsigna} de {resumen.depositosEspejo.activos} espejos activos · {resumen.depositosEspejo.unidadesConsigna} unidades en consigna
            </p>
          </div>
          <div className="card p-3">
            <div className="text-xs uppercase tracking-widest text-muted mb-1">Documentos</div>
            <p className="text-sm">Remitos: <strong>{resumen.documentos.remitos}</strong> · Facturas: <strong>{resumen.documentos.ventas}</strong> · Devoluciones: <strong>{resumen.documentos.devoluciones}</strong></p>
            <p className="text-sm">Pedidos: <strong>{resumen.documentos.pedidosDevolucion}</strong> · Sábanas: <strong>{resumen.documentos.sabanas}</strong> · Ajustes: <strong>{resumen.documentos.ajustesConsignacion}</strong></p>
          </div>
        </div>
      )}
      {tab === 'resumen' && !resumen && <p className="text-sm text-muted">Sin datos del módulo todavía.</p>}

      {tab === 'remitos' && (
        <>
          <div className="card p-3 mb-4">
            <h3 className="text-sm uppercase tracking-widest text-muted mb-2">Nuevo remito</h3>
            <MayoristaCabeceraBlock valor={cab} onCambio={setCampo} depositos={depositos} />
            <div className="mt-3">
              <MayoristaTablaBlock items={items} onItems={setItems} />
            </div>
            <div className="flex justify-end mt-3">
              <button type="button" className="btn btn-primary" onClick={crearRemito} disabled={!items.length}>Emitir remito</button>
            </div>
          </div>
          <Table columnas={colRemitos} filas={listas.remitos} vacio="Sin remitos mayoristas" exportable exportarNombre="remitos_mayorista" />
          <div className="flex items-center gap-2 mt-2">
            <input className="input-os" style={{ maxWidth: 260 }} placeholder="Buscar por número o cliente..." value={busq.remitos} onChange={(e) => buscarEn('remitos', e.target.value)} />
          </div>
          <Paginador page={pags.remitos} total={totales.remitos} limite={LIMITE} onCambiar={(p) => cargarLista('remitos', { page: p })} etiqueta="remitos" />
        </>
      )}

      {tab === 'ventas' && (
        <>
          <div className="card p-3 mb-4">
            <h3 className="text-sm uppercase tracking-widest text-muted mb-2">Emitir comprobante</h3>
            <div className="flex gap-3 flex-wrap mb-3 items-end">
              <div style={{ minWidth: 240 }}>
                <span className="field-label">Cliente mayorista</span>
                <SelectBuscador
                  valor={fact.cliente ? fact.cliente.id : null}
                  etiquetaValor={fact.cliente ? fact.cliente.nombre : ''}
                  placeholder="Buscar cliente mayorista..."
                  buscar={buscarMayoristas}
                  onSeleccionar={elegirClienteFact}
                />
              </div>
              <div>
                <span className="field-label">Comprobante</span>
                <select className="input-os" style={{ maxWidth: 250 }} value={fact.tipoComprobante} onChange={(e) => cambiarTipoFact(e.target.value)}>
                  <option value="FACTURA_MAYORISTA_FIRME">Factura FIRME</option>
                  <option value="FACTURA_BAJA_CONSIGNA">Factura baja de consigna (rendición)</option>
                  <option value="NOTA_CREDITO_MAYORISTA">Nota de crédito (libre)</option>
                </select>
              </div>
              {(fact.tipoComprobante === 'NOTA_CREDITO_MAYORISTA' || (fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock)) && (
                <label className="flex items-center gap-1 text-xs text-muted">
                  Monto $
                  <input className="input-os" type="number" min="0" style={{ maxWidth: 120 }} value={fact.monto} onChange={(e) => setCampoFact('monto', e.target.value)} />
                </label>
              )}
              {fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && (
                <>
                  <label className="flex items-center gap-1 text-xs text-muted" title="Sin marcar = factura genérica: solo asienta la cuenta corriente (la mercadería ya se movió con un remito en firme).">
                    <input type="checkbox" checked={fact.mueveStock} onChange={(e) => setCampoFact('mueveStock', e.target.checked)} />
                    Mueve stock {fact.mueveStock ? '' : '· genérica (solo CC)'}
                  </label>
                  {fact.mueveStock && (
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Sale de (opcional)
                      <select className="input-os" style={{ maxWidth: 190 }} value={fact.depositoOrigenId} onChange={(e) => setCampoFact('depositoOrigenId', e.target.value)}>
                        <option value="">— solo stock global —</option>
                        {depositos.filter((d) => !d.clienteId && d.activo).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </label>
                  )}
                </>
              )}
              {fact.tipoComprobante !== 'NOTA_CREDITO_MAYORISTA' && !(fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock) && (
                <label className="flex items-center gap-1 text-xs text-muted">
                  Ajuste / desc. global $
                  <input className="input-os" type="number" min="0" style={{ maxWidth: 110 }} value={fact.descuentoGlobal} onChange={(e) => setCampoFact('descuentoGlobal', Number(e.target.value) || 0)} />
                </label>
              )}
            </div>
            {fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock ? (
              <div className="mb-3">
                <span className="field-label">A qué corresponde (obligatorio)</span>
                <input
                  className="input-os"
                  placeholder="Ej.: factura de la mercadería ya remitida con el remito R-0000020"
                  value={fact.observaciones}
                  onChange={(e) => setCampoFact('observaciones', e.target.value)}
                />
              </div>
            ) : (
              <input className="input-os mb-3" placeholder="Observaciones (opcional)" value={fact.observaciones} onChange={(e) => setCampoFact('observaciones', e.target.value)} />
            )}
            {fact.tipoComprobante !== 'NOTA_CREDITO_MAYORISTA' && !(fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock) && (
              <MayoristaTablaBlock
                items={itemsFact}
                onItems={setItemsFact}
                conTipoStock={false}
                conPrecio
                descuentoDefault={fact.descuentoFijo}
                sabana={fact.tipoComprobante === 'FACTURA_BAJA_CONSIGNA' ? sabana : null}
              />
            )}
            <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
              <p className="text-xs text-muted">
                {fact.tipoComprobante === 'FACTURA_BAJA_CONSIGNA'
                  ? 'La columna Sábana es lo que el cliente tiene consignado: no se puede facturar más (regla dura).'
                  : fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME'
                    ? (fact.mueveStock ? 'Mueve el stock físico (firme primero, resto consigna): igual que un remito en firme, pero asienta la CC.' : 'Genérica: no mueve stock, solo la cuenta corriente (para lo ya movido con un remito en firme).')
                    : 'La NC acredita la cuenta corriente del cliente.'}
              </p>
              {fact.tipoComprobante !== 'NOTA_CREDITO_MAYORISTA' && !(fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock) && (
                <p className="text-sm">Subtotal: <strong>${subtotalFact.toLocaleString('es-AR')}</strong> · Total: <strong>${totalFact.toLocaleString('es-AR')}</strong></p>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={crearVenta}
                disabled={!fact.cliente
                  || ((fact.tipoComprobante === 'NOTA_CREDITO_MAYORISTA' || (fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock)) ? !(Number(fact.monto) > 0) : !itemsFact.length)
                  || (fact.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && !fact.mueveStock && !String(fact.observaciones || '').trim())}
              >
                Emitir comprobante
              </button>
            </div>
          </div>
          <Table columnas={colVentas} filas={listas.ventas} vacio="Sin comprobantes mayoristas" exportable exportarNombre="ventas_mayorista" />
          <div className="flex items-center gap-2 mt-2">
            <input className="input-os" style={{ maxWidth: 260 }} placeholder="Buscar por número o cliente..." value={busq.ventas} onChange={(e) => buscarEn('ventas', e.target.value)} />
          </div>
          <Paginador page={pags.ventas} total={totales.ventas} limite={LIMITE} onCambiar={(p) => cargarLista('ventas', { page: p })} etiqueta="comprobantes" />
        </>
      )}

      {tab === 'devoluciones' && (
        <>
          <div className="card p-3 mb-4">
            <h3 className="text-sm uppercase tracking-widest text-muted mb-2">Registrar devolución</h3>
            <div className="flex gap-3 flex-wrap mb-3 items-end">
              <div style={{ minWidth: 240 }}>
                <span className="field-label">Cliente mayorista</span>
                <SelectBuscador
                  valor={dev.cliente ? dev.cliente.id : null}
                  etiquetaValor={dev.cliente ? dev.cliente.nombre : ''}
                  placeholder="Buscar cliente mayorista..."
                  buscar={buscarMayoristas}
                  onSeleccionar={elegirClienteDev}
                />
              </div>
              <div>
                <span className="field-label">Devolución</span>
                <select className="input-os" style={{ maxWidth: 280 }} value={dev.tipoComprobante} onChange={(e) => setCampoDev('tipoComprobante', e.target.value)}>
                  <option value="DEVOLUCION_CONSIGNA">Vuelve de consigna (logística, sin CC)</option>
                  <option value="DEVOLUCION_FIRME">Vuelve de firme (NC: achica el saldo)</option>
                </select>
              </div>
              <label className="flex items-center gap-1 text-xs text-muted">
                Vuelven a
                <select className="input-os" style={{ maxWidth: 190 }} value={dev.depositoId} onChange={(e) => setCampoDev('depositoId', e.target.value)}>
                  <option value="">— Elegir —</option>
                  {depositos.filter((d) => !d.clienteId && d.activo).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </label>
              {dev.tipoComprobante === 'DEVOLUCION_FIRME' && (
                <label className="flex items-center gap-1 text-xs text-muted" title="Importe de la NC que acredita la cuenta corriente. Si lo dejás vacío se sugiere la suma de los renglones.">
                  NC / valorizado $
                  <input className="input-os" type="number" min="0" style={{ maxWidth: 120 }} placeholder={subtotalDev ? subtotalDev.toLocaleString('es-AR') : '0'} value={dev.totalValorizado} onChange={(e) => setCampoDev('totalValorizado', e.target.value)} />
                </label>
              )}
            </div>
            <input className="input-os mb-3" placeholder="Observaciones (opcional: a qué corresponden los libros que vuelven)" value={dev.observaciones} onChange={(e) => setCampoDev('observaciones', e.target.value)} />
            <MayoristaTablaBlock
              items={itemsDev}
              onItems={setItemsDev}
              conTipoStock={false}
              conPrecio
              sabana={dev.tipoComprobante === 'DEVOLUCION_CONSIGNA' ? sabanaDev : null}
            />
            <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
              <p className="text-xs text-muted">
                {dev.tipoComprobante === 'DEVOLUCION_CONSIGNA'
                  ? 'Vuelven libros de la sábana del cliente (la columna Sábana es el tope: no se puede devolver más de lo consignado). No mueve la cuenta corriente.'
                  : 'Vuelven libros que el cliente ya compró (no los vendió): entran como firmes y el valorizado genera la NC que achica su saldo.'}
                {' '}Al registrar se genera el <strong>acuse</strong> (PDF + CSV) para informar al cliente lo recibido y conciliar diferencias.
              </p>
              <button type="button" className="btn btn-primary" onClick={crearDevolucion} disabled={!dev.cliente || !dev.depositoId || !itemsDev.length}>
                Registrar devolución
              </button>
            </div>
          </div>
          <Table columnas={colDevoluciones} filas={listas.devoluciones} vacio="Sin devoluciones mayoristas" exportable exportarNombre="devoluciones_mayorista" />
          <div className="flex items-center gap-2 mt-2">
            <input className="input-os" style={{ maxWidth: 260 }} placeholder="Buscar por número o cliente..." value={busq.devoluciones} onChange={(e) => buscarEn('devoluciones', e.target.value)} />
          </div>
          <Paginador page={pags.devoluciones} total={totales.devoluciones} limite={LIMITE} onCambiar={(p) => cargarLista('devoluciones', { page: p })} etiqueta="devoluciones" />
        </>
      )}

      {['pedidos', 'sabanas', 'ajustes'].includes(tab) && (
        <>
          <p className="text-xs text-muted mb-2">
            La escritura de esta solapa llega en {ETAPA_ESCRITURA[tab]}. Mientras tanto se ve el historial real.
          </p>
          <Table columnas={colSimple(tab)} filas={listas[tab]} vacio="Sin documentos todavía" exportable exportarNombre={`mayorista_${tab}`} />
        </>
      )}

      {/* Ver remito */}
      <Modal abierto={!!verRemito} onClose={() => setVerRemito(null)} titulo={verRemito ? `Remito ${verRemito.numero}` : ''} ancho="720px">
        {verRemito && (
          <>
            <p className="text-sm mb-2">
              {verRemito.tipoRemito} · {verRemito.origen ? verRemito.origen.nombre : '—'} → {verRemito.destino ? verRemito.destino.nombre : '—'} · {verRemito.estado}
            </p>
            <TablaItemsPaginada
              items={verRemito.items}
              headers={[<th key="ean">EAN</th>, <th key="tit">Título</th>, <th key="cant">Cantidad</th>, <th key="sd">Sale de</th>]}
              fila={(i, idx) => (
                <tr key={idx}>
                  <td className="font-mono text-xs">{i.barras || '—'}</td>
                  <td>{i.titulo || i.descripcion}</td>
                  <td>{i.cantidad}</td>
                  <td>{i.tipoStock === 'FIRME' ? 'Firme' : 'Consigna'}</td>
                </tr>
              )}
            />
            {verRemito.observaciones && <p className="text-xs text-muted mt-2">{verRemito.observaciones}</p>}
          </>
        )}
      </Modal>

      {/* Ver comprobante de facturación */}
      <Modal abierto={!!verVenta} onClose={() => setVerVenta(null)} titulo={verVenta ? `${verVenta.tipoComprobante} ${verVenta.numeroComprobante}` : ''} ancho="760px">
        {verVenta && (
          <>
            <p className="text-sm mb-2">
              {verVenta.cliente ? verVenta.cliente.nombre : '—'} · {verVenta.estado}
              {verVenta.tipoComprobante === 'FACTURA_MAYORISTA_FIRME' && (verVenta.mueveStock ? ' · movió stock' : ' · genérica (solo CC)')}
              {verVenta.deposito ? ` · ${verVenta.deposito.nombre}` : ''}
            </p>
            <p className="text-xs text-muted mb-2">
              Emitido: {new Date(verVenta.fechaEmision).toLocaleDateString('es-AR')}
              {verVenta.fechaVencimiento ? ` · Vence: ${new Date(verVenta.fechaVencimiento).toLocaleDateString('es-AR')}` : ''}
            </p>
            {verVenta.items.length > 0 && (
              <TablaItemsPaginada
                items={verVenta.items}
                headers={[<th key="ean">EAN</th>, <th key="tit">Título</th>, <th key="cant">Cant.</th>, <th key="pr">Precio</th>, <th key="ds">Desc.</th>, <th key="sub">Subtotal</th>]}
                fila={(i, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs">{i.barras || '—'}</td>
                    <td>{i.titulo || i.descripcion}</td>
                    <td>{i.cantidad}</td>
                    <td>${i.precioUnitario.toLocaleString('es-AR')}</td>
                    <td>{i.descuentoLinea == null ? '—' : `${i.descuentoLinea}%`}</td>
                    <td>${i.subtotal.toLocaleString('es-AR')}</td>
                  </tr>
                )}
              />
            )}
            <div className="flex justify-end gap-4 text-sm mt-3">
              <span>Subtotal: <strong>${verVenta.subtotal.toLocaleString('es-AR')}</strong></span>
              <span>Desc. global: <strong>-${verVenta.descuentoGlobal.toLocaleString('es-AR')}</strong></span>
              <span>Total: <strong>${verVenta.total.toLocaleString('es-AR')}</strong></span>
            </div>
            {verVenta.observaciones && <p className="text-xs text-muted mt-2">{verVenta.observaciones}</p>}
          </>
        )}
      </Modal>

      {/* Ver devolución (acuse de recepción) */}
      <Modal abierto={!!verDev} onClose={() => setVerDev(null)} titulo={verDev ? `Acuse de recepción ${verDev.numero}` : ''} ancho="760px">
        {verDev && (
          <>
            <p className="text-sm mb-2">
              {verDev.tipoComprobante === 'DEVOLUCION_CONSIGNA' ? 'Vuelve de consigna (logística, sin CC)' : 'Vuelve de firme (con NC)'}
              {' · '}{verDev.cliente ? verDev.cliente.nombre : '—'} · {verDev.estado}
              {verDev.deposito ? ` · vuelven a ${verDev.deposito.nombre}` : ''}
            </p>
            <p className="text-xs text-muted mb-2">
              Fecha: {new Date(verDev.fecha).toLocaleDateString('es-AR')} · {verDev.totalUnidades} unidades
              {Number(verDev.totalValorizado) ? ` · valorizado $${Number(verDev.totalValorizado).toLocaleString('es-AR')} (NC en la CC)` : ''}
            </p>
            <TablaItemsPaginada
              items={verDev.items}
              headers={[<th key="ean">EAN</th>, <th key="tit">Título</th>, <th key="cant">Cant.</th>, <th key="pr">Precio</th>, <th key="sub">Subtotal</th>]}
              fila={(i, idx) => (
                <tr key={idx}>
                  <td className="font-mono text-xs">{i.barras || '—'}</td>
                  <td>{i.titulo || i.descripcion}</td>
                  <td>{i.cantidad}</td>
                  <td>${i.precioUnitario.toLocaleString('es-AR')}</td>
                  <td>${i.subtotal.toLocaleString('es-AR')}</td>
                </tr>
              )}
            />
            <p className="text-xs text-muted mt-2">Se deja constancia de los libros recibidos. Si hay diferencias con lo devuelto, comunicarse para conciliarlas.</p>
            {verDev.observaciones && <p className="text-xs text-muted mt-1">{verDev.observaciones}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
