// BookOS - ModeloChicoBlock.jsx
// ruta: bookos/frontend/src/blocks/ModeloChicoBlock.jsx
// descripcion: panel del modelo chico local CON HERRAMIENTAS (laboratorio). Muestra su estado y el
//   de su worker, sus topes editables en caliente, el indice compacto de las 33 herramientas para
//   ajustarlo a mano (descripcion por modulo; las acciones salen del contrato y no se editan desde
//   aca), la semilla corta y el prompt final que recibe el modelo.
//   Regla del laboratorio: lo que el motor usa tiene que poder verse y tocarse desde el front; si
//   algo no esta en esta pantalla, el vectorHumano no puede accederlo.

import { useEffect, useState } from 'react';
import Toggle from '../ui/Toggle';
import { configApi, kernelApi } from '../api/api';

const CLAVE_ACTIVO = 'LLM_CHICO_TOOLS_ENABLED';
const CLAVE_PASOS = 'LLM_CHICO_TOOLS_PASOS';
const CLAVE_CHARS = 'LLM_CHICO_TOOLS_MAX_CHARS';

// Valor efectivo de un toggle guardado (misma normalizacion que el resto del OS).
const activoDe = (v) => !(v === false || v === 'false' || v === '0' || v === '' || v === undefined || v === null);

export default function ModeloChicoBlock() {
  const [estado, setEstado] = useState(null);
  const [toggles, setToggles] = useState({});
  const [catalogo, setCatalogo] = useState([]);
  const [filas, setFilas] = useState([]);
  const [semilla, setSemilla] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [verPrompt, setVerPrompt] = useState(false);

  const cargar = async () => {
    try {
      // El estado del chico trae las filas EFECTIVAS (lo guardado o la semilla): el editor muestra
      // siempre lo que el modelo recibe de verdad, no un borrador aparte.
      const [chico, cfg] = await Promise.all([kernelApi.chicoEstado(), configApi.obtener()]);
      const d = chico.data || {};
      setEstado(d);
      setToggles(cfg.data.toggles || {});
      setCatalogo(cfg.data.catalogo || []);
      setFilas(Array.isArray(d.filas) ? d.filas.map((f) => ({ ...f })) : []);
      setSemilla(d.semilla || '');
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const cambiarToggle = async (clave, valor) => {
    try {
      await configApi.setToggle(clave, valor);
      setAviso(`${clave} → ${valor}`);
      await cargar();
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    }
  };

  const editarDescripcion = (modulo, valor) => {
    setFilas((prev) => prev.map((f) => (f.modulo === modulo ? { ...f, descripcion: valor } : f)));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await kernelApi.chicoGuardar({ indice: filas, semilla });
      const d = r.data || {};
      setAviso(`Guardado: ${d.indice ? `${d.indice.modulos} modulos, ${d.indice.chars} chars (~${d.indice.tokensAprox} tokens)` : 'ok'} · fuente ${d.indice ? d.indice.fuente : '—'}`);
      await cargar();
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const volverASemilla = async () => {
    setGuardando(true);
    try {
      await kernelApi.chicoGuardar({ reset: true });
      setAviso('Indice y semilla vueltos a la semilla del laboratorio');
      await cargar();
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const indice = (estado && estado.indice) || null;
  const worker = (estado && estado.worker) || null;
  const activo = activoDe(toggles[CLAVE_ACTIVO]);
  // Valor EFECTIVO del tope: lo guardado manda; si nunca se toco, el catalogo trae el default que
  // el motor esta usando. Mostrar el input vacio hacia creer que el motor no tenia tope.
  const efectivo = (clave) => {
    const guardado = toggles[clave];
    if (guardado !== undefined && guardado !== null && guardado !== '') return guardado;
    const def = catalogo.find((c) => c.clave === clave);
    return def && def.valor !== undefined && def.valor !== null ? def.valor : '';
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-semibold">Modelo chico con herramientas</h3>
        <span className="agente-badge" style={{ color: activo ? '#15803d' : 'var(--danger)' }}>
          {activo ? 'EL CHAT LO USA' : 'apagado (el chat usa el LLM pago)'}
        </span>
      </div>
      <p className="text-sm text-muted mb-3">
        Modelo local (Qwen2.5-0.5B) con el mismo loop de herramientas que el LLM pago, pero con un contrato
        propio: indice compacto en vez del manual completo y menos pasos. Encendido, el chat lo usa en lugar
        del LLM pago. Requiere el worker levantado (abajo) y ~1,6 GB de RAM libres.
      </p>

      {aviso && <p className="text-sm mb-3">{aviso}</p>}

      {estado && (
        <div className="text-xs text-muted mb-3 space-y-1">
          <div>
            worker: <span className="font-mono">{worker && worker.ok ? `escuchando (${worker.ramMB} MB${worker.cargado ? ', modelo cargado' : ', modelo sin cargar'})` : `apagado${worker && worker.motivo ? ` (${worker.motivo})` : ''}`}</span>
          </div>
          {indice && (
            <div>
              indice: <span className="font-mono">{indice.modulos} modulos · {indice.accionesTotales} acciones · {indice.chars} chars (~{indice.tokensAprox} tokens)</span>
              {' '}· fuente <span className="font-mono">{indice.fuente}</span>
              {' '}· el manual completo serian <span className="font-mono">~{Math.round(indice.charsManualCompleto / 4)} tokens</span>
            </div>
          )}
          <div>prompt completo que recibe: <span className="font-mono">{estado.promptChars} chars (~{Math.round((estado.promptChars || 0) / 4)} tokens)</span></div>
        </div>
      )}

      <div className="mb-3">
        <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm">{CLAVE_ACTIVO}</span>
          <Toggle activo={activo} onChange={(v) => cambiarToggle(CLAVE_ACTIVO, v)} />
        </div>
        <div className="flex justify-between items-center py-2 gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm">{CLAVE_PASOS} <span className="text-xs text-muted">(pasos por turno)</span></span>
          <input
            type="number"
            className="input text-sm"
            style={{ width: 90 }}
            value={efectivo(CLAVE_PASOS)}
            onChange={(e) => setToggles((p) => ({ ...p, [CLAVE_PASOS]: e.target.value }))}
            onBlur={(e) => cambiarToggle(CLAVE_PASOS, Number(e.target.value))}
          />
        </div>
        <div className="flex justify-between items-center py-2 gap-3">
          <span className="text-sm">{CLAVE_CHARS} <span className="text-xs text-muted">(chars por resultado)</span></span>
          <input
            type="number"
            className="input text-sm"
            style={{ width: 90 }}
            value={efectivo(CLAVE_CHARS)}
            onChange={(e) => setToggles((p) => ({ ...p, [CLAVE_CHARS]: e.target.value }))}
            onBlur={(e) => cambiarToggle(CLAVE_CHARS, Number(e.target.value))}
          />
        </div>
      </div>

      <details className="mb-3">
        <summary className="text-sm font-medium cursor-pointer">Semilla corta</summary>
        <p className="text-xs text-muted my-2">
          Lo primero que lee el modelo, en lugar de la semilla del Secretario (que esta escrita para un modelo grande).
        </p>
        <textarea
          className="input text-xs font-mono"
          rows={4}
          style={{ width: '100%' }}
          value={semilla}
          onChange={(e) => setSemilla(e.target.value)}
        />
      </details>

      <details className="mb-3">
        <summary className="text-sm font-medium cursor-pointer">
          Indice de las 33 herramientas ({filas.length} modulos)
        </summary>
        <p className="text-xs text-muted my-2">
          Ajustá la descripcion de cada modulo (pocas palabras). Las acciones NO se editan aca: se leen del
          contrato real de las herramientas, asi el indice no puede desincronizarse de lo que existe.
        </p>
        <div className="space-y-1">
          {filas.map((f) => (
            <div key={f.modulo} className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ width: 130, flexShrink: 0 }}>{f.modulo}</span>
              <input
                type="text"
                className="input text-xs"
                style={{ flex: 1 }}
                value={f.descripcion || ''}
                placeholder="descripcion corta"
                onChange={(e) => editarDescripcion(f.modulo, e.target.value)}
              />
              <span className="text-xs text-muted truncate" style={{ maxWidth: 260 }} title={(f.acciones || []).join(', ')}>
                {(f.acciones || []).length} acc.
              </span>
            </div>
          ))}
        </div>
      </details>

      <div className="flex gap-2 mb-3">
        <button type="button" className="btn btn-primary text-sm" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar ajuste'}
        </button>
        <button type="button" className="btn btn-ghost text-sm" onClick={volverASemilla} disabled={guardando}>
          Volver a la semilla
        </button>
        <button type="button" className="btn text-sm" onClick={() => setVerPrompt((v) => !v)}>
          {verPrompt ? 'Ocultar prompt' : 'Ver prompt exacto'}
        </button>
        <button type="button" className="btn text-sm" onClick={cargar}>Refrescar</button>
      </div>

      {verPrompt && estado && (
        <pre className="text-xs font-mono p-2" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {estado.lineas || ''}
          {'\n\n'}
          {estado.restricciones || ''}
        </pre>
      )}
    </div>
  );
}
