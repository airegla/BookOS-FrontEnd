// BookOS - ConfigPage.jsx
// ruta: bookos/frontend/src/pages/ConfigPage.jsx
// descripcion: configuracion del OS: estado del agente (LLM activo, modelo, presupuesto),
//   toggles en caliente (runtimeConfig) y propuestas del Secretario (cristalizacion v2).
//   Las pantallas del nucleo NO viven aca: los pesos del ranking estan en Kernel > Pesos y > Banco
//   de pruebas, y el panel del modelo chico con sus workers en Kernel > Modelo local.

import { useEffect, useState } from 'react';
import Toggle from '../ui/Toggle';
import DebugTag, { activarDebug } from '../ui/DebugTag';
import { configApi, propuestasApi, auditoriaApi } from '../api/api';

export default function ConfigPage({ esAdmin }) {
  // Los interruptores del OS salen del CATALOGO del backend (grupo 'sistema'). Antes eran una lista
  // hardcodeada aca y una clave nueva del backend no aparecia nunca en la pantalla.
  const [catalogo, setCatalogo] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const res = await configApi.obtener();
      setCatalogo((res.data.catalogo || []).filter((t) => t.grupo === 'sistema'));
      if (esAdmin) {
        const props = await propuestasApi.listar(false);
        setPropuestas(props.data || []);
        const rank = await auditoriaApi.ranking(10);
        setRanking(rank.data || []);
      }
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  // El catalogo ya trae el valor EFECTIVO (DB > default). Adivinar el default en el front era el
  // bug: LLM_ENABLED se veia apagado sin estarlo, porque su default es true y no habia fila.
  const activoDe = (t) => !(t.valor === false || t.valor === 'false' || t.valor === '0' || t.valor === '');

  const cambiarToggle = async (clave, valor) => {
    await configApi.setToggle(clave, valor);
    // debug_mode es del FRONT: se aplica al instante y sin recargar. Los demas son del backend y
    // rigen en la proxima operacion que los consulte.
    if (clave === 'debug_mode') activarDebug(valor);
    setMensaje(`Toggle ${clave} → ${valor ? 'activo' : 'apagado'}`);
    cargar();
  };

  const cambiarNumero = async (clave, valor) => {
    await configApi.setToggle(clave, valor);
    setMensaje(`Toggle ${clave} → ${valor}`);
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

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-2">El agente</h3>
        <p className="text-sm text-muted">
          El Secretario y el Asistente de ventas comparten motor y configuración: estado del LLM, prompt
          (completo o híbrido), pasos del loop y el inventario de herramientas viven en
          <strong> Kernel ▾ → Agente</strong>.
        </p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3">Interruptores del OS</h3>
        <div className="space-y-3">
          {catalogo.map((t) => (
            <div key={t.clave}>
              <div className="flex items-center gap-3">
                {t.tipo === 'bool' ? (
                  <>
                    <Toggle activo={activoDe(t)} onChange={(v) => cambiarToggle(t.clave, v)} />
                    <span className="text-sm font-mono">{t.clave}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-mono">{t.clave}</span>
                    <input
                      type="number"
                      className="input-os"
                      style={{ maxWidth: 120 }}
                      defaultValue={t.valor}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (String(v) !== String(t.valor)) cambiarNumero(t.clave, v);
                      }}
                    />
                  </>
                )}
              </div>
              <p className="text-xs text-muted mt-1">{t.descripcion}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          Editables en caliente (runtimeConfig) y leidos del catalogo del backend (grupo
          <span className="font-mono"> sistema</span>): una clave nueva del backend aparece sola.
          Los del <strong>agente</strong> viven en Kernel ▾ → Agente y los del <strong>CRM</strong> en
          CRM ▾ → Config CRM.
        </p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-2">Núcleo (kernel)</h3>
        <p className="text-sm text-muted">
          Todo lo del núcleo semántico vive en el menú <strong>Kernel ▾</strong>: <strong>Pesos</strong> (el
          ranking y su rollback), <strong>Banco de pruebas</strong> (ranking y modelo chico),
          <strong> Modelo local</strong> (el modelo chico con herramientas, su semilla, su índice y los
          workers locales), <strong>Memoria</strong>, <strong>Salud</strong>, <strong>Cola</strong> y
          <strong> Logs</strong>.
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
