// BookOS - ModeloLocalPage.jsx
// ruta: bookos/frontend/src/pages/ModeloLocalPage.jsx
// descripcion: pantalla del MODELO LOCAL (Kernel > Modelo local). Reune lo que antes estaba repartido
//   entre Sistema > Config y Kernel > Agente: el panel del modelo chico con herramientas (toggles de
//   encendido y modo, topes, semilla, indice y prompt exacto) y el control de los workers locales,
//   que son los dos procesos de modelo que corren en la maquina.
//   Regla del laboratorio: lo que el motor usa tiene que poder verse y tocarse desde el front; si
//   algo no esta en una pantalla, el vectorHumano no puede accederlo.

import { useCallback, useEffect, useState } from 'react';
import DebugTag from '../ui/DebugTag';
import ModeloChicoBlock from '../blocks/ModeloChicoBlock';
import { kernelApi } from '../api/api';

// Los dos workers de modelo local. El del chico (3011) atiende el chat cuando su toggle esta
// encendido; el de embeddings (3010) es el motor de la busqueda semantica del kernel (sin el, la
// busqueda degrada a sparse).
const WORKERS = [
  { tipo: 'llmChico', nombre: 'Modelo chico (3011)', detalle: 'loop de herramientas del chat' },
  { tipo: 'embeddings', nombre: 'Embeddings (3010)', detalle: 'motor de la busqueda semantica del kernel' },
];

export default function ModeloLocalPage({ esAdmin }) {
  const [workers, setWorkers] = useState({});
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    try {
      const ws = await kernelApi.workersEstado();
      setWorkers(ws.data && ws.data.workers ? ws.data.workers : ws.data || {});
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  }, []);

  useEffect(() => { if (esAdmin) cargar(); }, [esAdmin, cargar]);

  const controlar = async (tipo, accion) => {
    try {
      const res = await kernelApi.workersControl(tipo, accion);
      const data = res.data && res.data.resultado ? res.data.resultado : res.data;
      setMensaje(`${tipo} ${accion} → ${data && data.ok !== false ? 'ok' : 'error'}`);
      await cargar();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  };

  if (!esAdmin) {
    return (
      <div>
        <DebugTag nombre="ModeloLocalPage" />
        <h2 className="text-lg font-semibold mb-4">Modelo local</h2>
        <p className="text-sm text-muted">El ajuste del modelo local es del administrador.</p>
      </div>
    );
  }

  return (
    <div>
      <DebugTag nombre="ModeloLocalPage" />
      <h2 className="text-lg font-semibold mb-1">Modelo local</h2>
      <p className="text-sm text-muted mb-4">
        El modelo chico corre en esta maquina, en el worker del puerto 3011, y solo se usa si sus dos
        interruptores estan encendidos. El registro de sus llamadas (latencia, tokens estimados y
        errores por proveedor) esta en <strong>Kernel ▾ Salud</strong>; su medicion contra el banco de
        pruebas, en <strong>Kernel ▾ Banco de pruebas</strong>.
      </p>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <ModeloChicoBlock />

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Workers locales</h3>
          <button type="button" className="btn btn-ghost text-xs" onClick={cargar}>Refrescar</button>
        </div>
        <div className="grid gap-2">
          {WORKERS.map(({ tipo, nombre, detalle }) => {
            const estado = workers[tipo] || {};
            const activo = estado.ok === true || estado.activo === true;
            return (
              <div key={tipo} className="flex justify-between items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {nombre}{' '}
                    <span className="text-xs font-normal" style={{ color: activo ? '#15803d' : 'var(--danger)' }}>
                      {activo ? 'escuchando' : 'apagado'}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {detalle} · puerto {estado.puerto || '—'} · pid {estado.pid || '—'}
                    {estado.ramMB ? ` · ${estado.ramMB} MB` : ''}
                    {estado.cargado === false && activo ? ' · modelo sin cargar' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => controlar(tipo, 'levantar')}>Levantar</button>
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => controlar(tipo, 'reiniciar')}>Reiniciar</button>
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => controlar(tipo, 'parar')}>Parar</button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">
          El worker de embeddings tiene ademas su arranque automatico: si
          <span className="font-mono"> EMBEDDINGS_WORKER_AUTO</span> esta encendido, el API lo levanta
          solo al arrancar. El del modelo chico se levanta bajo demanda (carga el modelo la primera vez
          que se le pide una respuesta).
        </p>
      </div>
    </div>
  );
}
