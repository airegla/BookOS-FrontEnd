// BookOS - ConfigPage.jsx
// ruta: bookos/frontend/src/pages/ConfigPage.jsx
// descripcion: toggles del OS, pesos semanticos versionados y propuestas del
//   Secretario (cristalizacion: aprobar/rechazar con un click).

import { useEffect, useState } from 'react';
import Toggle from '../ui/Toggle';
import DebugTag from '../ui/DebugTag';
import { configApi, propuestasApi, auditoriaApi } from '../api/api';

export default function ConfigPage({ esAdmin }) {
  const [toggles, setToggles] = useState({});
  const [pesos, setPesos] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const res = await configApi.obtener();
      setToggles(res.data.toggles || {});
      setPesos(res.data.pesos);
      if (esAdmin) {
        const props = await propuestasApi.listar(false);
        setPropuestas(props.data || []);
        const rank = await auditoriaApi.ranking(10);
        setRanking(rank.data || []);
      }
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const cambiarToggle = async (clave, valor) => {
    await configApi.setToggle(clave, valor);
    setMensaje(`Toggle ${clave} -> ${valor}`);
    cargar();
  };

  const aprobar = async (id) => {
    await propuestasApi.aprobar(id);
    setMensaje('Propuesta aprobada: cristalizada como regla dura ✓');
    cargar();
  };

  const rechazar = async (id) => {
    await propuestasApi.rechazar(id);
    setMensaje('Propuesta rechazada.');
    cargar();
  };

  return (
    <div>
      <DebugTag nombre="ConfigPage" />
      <h2 className="text-lg font-semibold mb-4">Configuracion</h2>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Toggles del OS</h3>
        {['usa_consignacion', 'usa_deposito', 'debug_mode'].map((clave) => (
          <div key={clave} className="flex justify-between items-center py-2">
            <span className="text-sm">{clave}</span>
            <Toggle activo={Boolean(toggles[clave])} onChange={(v) => cambiarToggle(clave, v)} />
          </div>
        ))}
      </div>

      {pesos && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">Pesos semanticos (version {pesos.version})</h3>
          <pre className="text-xs overflow-x-auto">{JSON.stringify({ intencion: pesos.intencion, almohadilla: pesos.almohadilla }, null, 2)}</pre>
        </div>
      )}

      {esAdmin && propuestas.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">Propuestas del Secretario (cristalizacion)</h3>
          {propuestas.map((p) => (
            <div key={p.id} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-sm">
                <span className="agente-badge mr-2">{p.tipo}</span>
                <span>{p.payload.descripcion || p.payload.motivo || JSON.stringify(p.payload).slice(0, 120)}</span>
              </div>
              {p.estado === 'propuesto' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" className="btn btn-primary text-xs" onClick={() => aprobar(p.id)}>Aprobar</button>
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => rechazar(p.id)}>Rechazar</button>
                </div>
              )}
              {p.estado !== 'propuesto' && <span className="text-xs text-muted">{p.estado}</span>}
            </div>
          ))}
        </div>
      )}

      {esAdmin && ranking.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Auditoria del ranking (ultimas 10 consultas)</h3>
          {ranking.map((r) => (
            <div key={r.id} className="text-xs py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-mono">{new Date(r.createdAt).toLocaleString('es-AR')}</span>
              {' '}<strong>{r.intencion}</strong> · "{r.consulta}" · outcome: {r.outcome || 'pendiente'}
              <div className="text-muted">top: {Array.isArray(r.ordenFinal) ? r.ordenFinal.slice(0, 3).join(', ') : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
