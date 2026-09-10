// BookOS - RemitosPage.jsx
// ruta: bookos/frontend/src/pages/RemitosPage.jsx
// descripcion: ingreso de remitos + cruce de faltantes. Al abrir un remito se
//   inyecta su JSON al Secretario; tambien se puede cruzar con $faltantes_remito.

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { remitosApi } from '../api/api';
import usePersistentWork from '../hooks/usePersistentWork';
import { useAppContext } from '../AppContext';

export default function RemitosPage() {
  const [remitos, setRemitos] = useState([]);
  const [borrador, setBorrador, limpiarBorrador] = usePersistentWork('remito', { proveedor: '', items: [] });
  const [itemEan, setItemEan] = useState('');
  const [itemCantidad, setItemCantidad] = useState('');
  const [itemCosto, setItemCosto] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [verRemito, setVerRemito] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const { setContextoActual, pedirConsulta } = useAppContext();

  const cargar = async () => {
    const res = await remitosApi.listar({ page: 1, limit: 50 });
    setRemitos(res.data || []);
  };

  useEffect(() => { cargar(); }, []);

  const agregarItem = () => {
    if (!itemEan || !itemCantidad) return;
    setBorrador({
      ...borrador,
      items: [...borrador.items, {
        ean13: itemEan,
        titulo: itemEan,
        cantidad: Number(itemCantidad),
        costo: itemCosto ? Number(itemCosto) : null,
      }],
    });
    setItemEan(''); setItemCantidad(''); setItemCosto('');
  };

  const crear = async () => {
    try {
      const res = await remitosApi.crear({ proveedor: borrador.proveedor, items: borrador.items });
      setMensaje(`Remito #${res.data.id} creado ✓`);
      limpiarBorrador();
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const ver = (remito) => {
    setVerRemito(remito);
    setContextoActual({ remitoId: remito.id, items: remito.items, estado: remito.estado });
  };

  const cruzar = async (id) => {
    try {
      const res = await remitosApi.cruzar(id);
      setDetalle(res.data);
      setContextoActual({ remitoId: id, items: res.data.remito.items, faltantes: res.data.faltantes });
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const columnas = [
    { clave: 'id', titulo: 'ID' },
    { clave: 'proveedor', titulo: 'Proveedor' },
    { clave: 'estado', titulo: 'Estado' },
    { clave: 'acciones', titulo: '', render: (r) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => ver(r)}>Ver</button>
        <button type="button" className="btn btn-primary text-xs" onClick={() => cruzar(r.id)}>Cruzar faltantes</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="RemitosPage" />
      <h2 className="text-lg font-semibold mb-4">Remitos</h2>

      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Ingreso de remito (borrador persistente)</h3>
        <Input label="Proveedor" value={borrador.proveedor} onChange={(e) => setBorrador({ ...borrador, proveedor: e.target.value })} />
        <div className="flex gap-2 mb-3">
          <input className="input-os" placeholder="EAN13" value={itemEan} onChange={(e) => setItemEan(e.target.value)} />
          <input className="input-os" placeholder="Cantidad" type="number" value={itemCantidad} onChange={(e) => setItemCantidad(e.target.value)} style={{ maxWidth: 100 }} />
          <input className="input-os" placeholder="Costo (opc.)" type="number" value={itemCosto} onChange={(e) => setItemCosto(e.target.value)} style={{ maxWidth: 120 }} />
          <button type="button" className="btn" onClick={agregarItem}>Agregar</button>
        </div>
        {borrador.items.map((item) => (
          <div key={item.ean13 + item.cantidad} className="text-sm py-1 flex justify-between">
            <span className="font-mono">{item.ean13}</span>
            <span>{item.cantidad} u {item.costo ? `· costo $${item.costo}` : ''}</span>
          </div>
        ))}
        <button type="button" className="btn btn-primary mt-3" disabled={!borrador.proveedor || borrador.items.length === 0} onClick={crear}>
          Guardar remito
        </button>
      </div>

      <Table columnas={columnas} filas={remitos} vacio="Sin remitos" />

      <Modal abierto={Boolean(verRemito)} onClose={() => setVerRemito(null)} titulo={verRemito ? `Remito #${verRemito.id}` : ''} ancho="640px"
        footer={
          verRemito ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { pedirConsulta(`Este es el remito #${verRemito.id} de ${verRemito.proveedor} (estado ${verRemito.estado}). ¿Que hay que pedir?`); }}>Preguntar al Secretario</button>
              <button type="button" className="btn btn-primary" onClick={() => { cruzar(verRemito.id); setVerRemito(null); }}>Cruzar faltantes</button>
              <button type="button" className="btn btn-ghost" onClick={() => setVerRemito(null)}>Cerrar</button>
            </>
          ) : null
        }
      >
        {verRemito && (
          <div>
            <div className="text-sm mb-3">
              <span className="agente-badge">{verRemito.estado}</span>
              {' '}Proveedor: <strong>{verRemito.proveedor}</strong> · {new Date(verRemito.createdAt).toLocaleString('es-AR')}
            </div>
            <table className="table-os">
              <thead><tr><th>EAN13</th><th>Titulo</th><th>Cantidad</th></tr></thead>
              <tbody>
                {(verRemito.items || []).map((item) => (
                  <tr key={item.ean13}>
                    <td className="font-mono text-xs">{item.ean13}</td>
                    <td>{item.titulo}</td>
                    <td>{item.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal abierto={Boolean(detalle)} onClose={() => setDetalle(null)} titulo="Cruce de faltantes" ancho="640px">
        {detalle && detalle.faltantes.length === 0 && (
          <p className="text-sm text-muted">Sin faltantes: todo el remito esta cubierto por el stock.</p>
        )}
        {detalle && detalle.faltantes.length > 0 && (
          <table className="table-os">
            <thead>
              <tr><th>EAN13</th><th>Titulo</th><th>Recibido</th><th>Stock</th><th>Pedir</th></tr>
            </thead>
            <tbody>
              {detalle.faltantes.map((f) => (
                <tr key={f.ean13}>
                  <td className="font-mono text-xs">{f.ean13}</td>
                  <td>{f.titulo}</td>
                  <td>{f.recibido}</td>
                  <td>{f.stockActual}</td>
                  <td className="font-semibold" style={{ color: 'var(--danger)' }}>{f.pedido}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
