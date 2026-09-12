// BookOS - ConfigPage.jsx
// ruta: bookos/frontend/src/pages/ConfigPage.jsx
// descripcion: configuracion del OS: estado del agente (LLM activo, modelo, presupuesto),
//   toggles en caliente (runtimeConfig) y propuestas del Secretario (cristalizacion v2).
//   Los pesos del ranking viven en Kernel > Pesos (versionados con rollback).

import { useEffect, useState } from 'react';
import Toggle from '../ui/Toggle';
import DebugTag from '../ui/DebugTag';
import { configApi, propuestasApi, auditoriaApi } from '../api/api';

const TOGGLES = ['usa_consignacion', 'usa_deposito', 'debug_mode', 'LLM_ENABLED'];

export default function ConfigPage({ esAdmin }) {
  const [toggles, setToggles] = useState({});
  const [agente, setAgente] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const res = await configApi.obtener();
      setToggles(res.data.toggles || {});
      setAgente(res.data.agente || null);
      if (esAdmin) {
        const props = await propuestasApi.listar(false);
        setPropuestas(props.data || []);
        const rank = await auditoriaApi.ranking(10);
        setRanking(rank.data || []);
      }
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  // Valor efectivo de un toggle: lo guardado manda; LLM_ENABLED cae al estado efectivo del agente.
  const valorToggle = (clave) => {
    const v = toggles[clave];
    if (v === undefined || v === null || v === '') return clave === 'LLM_ENABLED' ? Boolean(agente && agente.llmEnabled) : false;
    return !(v === false || v === 'false' || v === '0');
  };

  const cambiarToggle = async (clave, valor) => {
    await configApi.setToggle(clave, valor);
    setMensaje(`Toggle ${clave} → ${valor ? 'activo' : 'apagado'}`);
    cargar();
  };

  const resolver = async (id, accion) => {
    try {
      const res = accion === 'aprobar' ? await propuestasApi.aprobar(id) : await propuestasApi.rechazar(id);
      const r = res.data && res.data.resultado ? res.data.resultado : res.data;
      setMensaje(`Propuesta ${id} ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}${r && r.aplicada === false ? ` (${r.motivo})` : r && r.marcador ? ` → ${r.marcador}` : ''}`);
      cargar();
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  const pendientes = propuestas.filter((p) => p.estado === 'PENDIENTE');

  return (
    <div>
      <DebugTag nombre="ConfigPage" />
      <h2 className="text-lg font-semibold mb-4">Configuracion</h2>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      {agente && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">Agente (el Secretario)</h3>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span>LLM:</span>
              <span className="agente-badge" style={{ color: agente.llmConfigurado && agente.llmEnabled ? '#15803d' : 'var(--danger)' }}>
                {agente.llmConfigurado ? (agente.llmEnabled ? 'activo' : 'apagado (LLM_ENABLED=false)') : 'sin credencial (DEEPSEEK_API_KEY vacía)'}
              </span>
            </div>
            <div className="text-muted text-xs">modelos: <span className="font-mono">{Array.isArray(agente.modelos) ? agente.modelos.join(', ') : agente.modelos}</span></div>
            <div className="text-muted text-xs">hasta {agente.maxPasos} pasos por turno · presupuesto {agente.presupuestoDia} llamadas/día</div>
            <div className="text-muted text-xs">uso y rutas de hoy: Kernel ▾ → Logs · métricas: /api/agente/metricas</div>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Toggles del OS</h3>
        {TOGGLES.map((clave) => (
          <div key={clave} className="flex justify-between items-center py-2">
            <span className="text-sm">{clave}</span>
            <Toggle activo={valorToggle(clave)} onChange={(v) => cambiarToggle(clave, v)} />
          </div>
        ))}
        <p className="text-xs text-muted mt-2">
          Editables en caliente (runtimeConfig). <span className="font-mono">LLM_ENABLED</span> apaga la redacción
          del agente sin frenar kernel, marcadores ni planificador.
        </p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-2">Pesos del ranking</h3>
        <p className="text-sm text-muted">
          Versionados y editables en <strong>Kernel ▾ → Pesos</strong> (banco de pruebas y rollback incluidos).
          Cada aprobación de pesos crea una versión nueva; la anterior queda reactivable.
        </p>
      </div>

      {esAdmin && propuestas.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3">Propuestas del Secretario ({pendientes.length} pendientes de {propuestas.length})</h3>
          {propuestas.slice(0, 20).map((p) => (
            <div key={p.id} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-sm">
                <span className="agente-badge mr-2">{p.tipo}</span>
                <span>{p.resumen}</span>
                <span className="text-xs text-muted ml-2">{p.estado}</span>
              </div>
              {p.observacion && <div className="text-xs text-muted mt-1">observación: “{p.observacion}”</div>}
              {p.estado === 'PENDIENTE' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" className="btn btn-primary text-xs" onClick={() => resolver(p.id, 'aprobar')}>Aprobar</button>
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => resolver(p.id, 'rechazar')}>Rechazar</button>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-muted mt-2">Panel completo con detalle y comparación: Kernel ▾ → Propuestas.</p>
        </div>
      )}

      {esAdmin && ranking.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Auditoria del ranking (ultimas 10 consultas)</h3>
          {ranking.map((r) => (
            <div key={r.id} className="text-xs py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-mono">{r.fecha ? new Date(r.fecha).toLocaleString('es-AR') : '—'}</span>
              {' '}<strong>{r.intencion}</strong> · "{r.consulta}" · outcome: {r.outcome || 'SIN_SENAL'} · {r.ms} ms
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
