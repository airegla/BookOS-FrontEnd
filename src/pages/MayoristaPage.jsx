// BookOS - MayoristaPage.jsx
// ruta: bookos/frontend/src/pages/MayoristaPage.jsx
// descripcion: modulo mayorista (F-12). Patron de 3 bloques (cabecera / tabla / chat del
//   Secretario). Estado: E7 — remitos completos (consigna/firme/traslado con sábana del cliente y
//   anulación); facturación, devoluciones, pedidos, sábanas y ajustes llegan en sus etapas (E8-E11)
//   y por ahora muestran su historial con el aviso de la etapa.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import MayoristaCabeceraBlock from '../blocks/MayoristaCabeceraBlock';
import MayoristaTablaBlock from '../blocks/MayoristaTablaBlock';
import { mayoristaApi, depositosApi, observacionesApi } from '../api/api';
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
  ventas: 'E8 — facturación mayorista (firme / baja de consigna / NC)',
  devoluciones: 'E9 — acuses de devolución del cliente',
  pedidos: 'E10 — pedidos de devolución + conciliación',
  sabanas: 'E11 — emisión y envío de sábanas',
  ajustes: 'E11 — ajustes a la sábana del cliente',
};

const CABECERA_VACIA = { cliente: null, depositoOrigenId: '', depositoDestinoId: '', tipoRemito: 'CONSIGNA', observaciones: '' };

export default function MayoristaPage() {
  const [tab, setTab] = useState('resumen');
  const [resumen, setResumen] = useState(null);
  const [listas, setListas] = useState({ remitos: [], ventas: [], devoluciones: [], pedidos: [], sabanas: [], ajustes: [] });
  const [depositos, setDepositos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [observacion, setObservacion] = useState(null);
  const [verRemito, setVerRemito] = useState(null);
  const [cab, setCab] = useState(CABECERA_VACIA);
  const [items, setItems] = useState([]);
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargarLista = async (t) => {
    try {
      const fn = {
        remitos: mayoristaApi.listarRemitos,
        ventas: mayoristaApi.listarVentas,
        devoluciones: mayoristaApi.listarDevoluciones,
        pedidos: mayoristaApi.listarPedidos,
        sabanas: mayoristaApi.listarSabanas,
        ajustes: mayoristaApi.listarAjustes,
      }[t];
      const res = await fn({ limite: 100 });
      setListas((prev) => ({ ...prev, [t]: res.data || [] }));
    } catch (e) { /* sin datos todavia */ }
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
    });
  }, [tab, cab, items]); // eslint-disable-line

  const setCampo = (campo, valor) => setCab((prev) => ({ ...prev, [campo]: valor }));

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

  const anularRemito = async (r) => {
    if (!window.confirm(`¿Anular el remito ${r.numero}? Se revierte el stock por el ledger.`)) return;
    try {
      const res = await mayoristaApi.anularRemito(r.id);
      const avisos = (res.data.avisos || []).length ? ` — avisos: ${res.data.avisos.join(' · ')}` : '';
      setMensaje(`Remito ${r.numero} anulado ✓${avisos}`);
      cargarLista('remitos');
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const observar = async (tipo, id) => {
    try {
      const res = await observacionesApi.documento({ tipo, id });
      setObservacion(res.data);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  // Reimprimir el documento (CSV/PDF del servidor) y mandarlo por mail al cliente del espejo.
  const reimprimir = async (r, formato) => {
    try {
      const res = formato === 'csv' ? await mayoristaApi.csvRemito(r.id) : await mayoristaApi.pdfRemito(r.id);
      const desc = res.data || {};
      await descargarDesdeServidor(`/archivos/${desc.archivoId}/descarga`, desc.nombre);
      setMensaje(`${formato.toUpperCase()} del remito ${r.numero} descargado ✓`);
    } catch (e) { setMensaje(`⚠️ ${e.message}`); }
  };

  const enviarMail = async (r) => {
    if (!window.confirm(`¿Enviar el remito ${r.numero} por mail al cliente? (adjunta PDF + CSV)`)) return;
    try {
      const res = await mayoristaApi.mailRemito(r.id);
      setMensaje(res.data && res.data.enviado ? `Remito ${r.numero} enviado a ${res.data.a}${res.data.redirigido ? ' (MODO PRUEBA)' : ''} ✓` : `El mail no salió: ${(res.data && res.data.motivo) || 'sin detalle'}`);
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
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(r, 'csv')}>CSV</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => reimprimir(r, 'pdf')}>PDF</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => enviarMail(r)}>Mail</button>
          {r.estado !== 'ANULADO' && <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => anularRemito(r)}>Anular</button>}
          <button type="button" className="btn btn-ghost text-xs" onClick={() => observar('remito_mayorista', r.id)}>🧠</button>
        </div>
      ),
    },
  ];

  const tipoObs = (t) => (t === 'ventas' ? 'venta_mayorista' : t === 'devoluciones' ? 'devolucion_mayorista' : t === 'pedidos' ? 'pedido_devolucion' : t === 'sabanas' ? 'sabana' : 'ajuste_consignacion');

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
        </>
      )}

      {['ventas', 'devoluciones', 'pedidos', 'sabanas', 'ajustes'].includes(tab) && (
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
            <table className="table-os">
              <thead><tr><th>EAN</th><th>Título</th><th>Cantidad</th><th>Sale de</th></tr></thead>
              <tbody>
                {verRemito.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs">{i.barras || '—'}</td>
                    <td>{i.titulo || i.descripcion}</td>
                    <td>{i.cantidad}</td>
                    <td>{i.tipoStock === 'FIRME' ? 'Firme' : 'Consigna'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {verRemito.observaciones && <p className="text-xs text-muted mt-2">{verRemito.observaciones}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
