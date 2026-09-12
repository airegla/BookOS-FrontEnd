// BookOS - PesosPage.jsx
// ruta: bookos/frontend/src/pages/PesosPage.jsx
// descripcion: panel de Pesos del kernel. Edita los pesos vigentes (admin), guardarlos crea
//   una version nueva que pasa a gobernar el ranking; cualquier version anterior puede
//   reactivarse (rollback). El banco de pruebas mide antes/despues con la serie fija.

import { useCallback, useEffect, useState } from 'react';
import DebugTag from '../ui/DebugTag';
import { kernelApi } from '../api/api';

const INTENCIONES = ['tecnico', 'autor', 'exploratorio'];

// Convierte el payload del kernel a la forma editable (strings para los inputs).
function aFormulario(pesos) {
  if (!pesos) return null;
  return {
    sem: {
      tecnico: { ...pesos.sem.tecnico },
      autor: { ...pesos.sem.autor },
      exploratorio: { ...pesos.sem.exploratorio },
    },
    alfa: String(pesos.alfa), beta: String(pesos.beta), gamma: String(pesos.gamma),
    delta: String(pesos.delta), epsilon: String(pesos.epsilon),
    epsilonCoocurrencia: String(pesos.epsilonCoocurrencia), zeta: String(pesos.zeta),
    recallPorCampo: String(pesos.umbrales.recallPorCampo), recallTotal: String(pesos.umbrales.recallTotal),
  };
}

function aPayload(form) {
  const num = (v) => Number(String(v).replace(',', '.'));
  return {
    sem: {
      tecnico: { id: num(form.sem.tecnico.id), dig: num(form.sem.tecnico.dig), aut: num(form.sem.tecnico.aut) },
      autor: { id: num(form.sem.autor.id), dig: num(form.sem.autor.dig), aut: num(form.sem.autor.aut) },
      exploratorio: { id: num(form.sem.exploratorio.id), dig: num(form.sem.exploratorio.dig), aut: num(form.sem.exploratorio.aut) },
    },
    alfa: num(form.alfa), beta: num(form.beta), gamma: num(form.gamma), delta: num(form.delta),
    epsilon: num(form.epsilon), epsilonCoocurrencia: num(form.epsilonCoocurrencia), zeta: num(form.zeta),
    umbrales: { recallPorCampo: num(form.recallPorCampo), recallTotal: num(form.recallTotal) },
  };
}

export default function PesosPage({ esAdmin }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [aviso, setAviso] = useState('');
  const [corriendo, setCorriendo] = useState(false);
  const [observacion, setObservacion] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await kernelApi.pesos();
      setData(res.data);
      setForm(aFormulario(res.data.vigente));
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (clave, valor) => setForm((f) => ({ ...f, [clave]: valor }));
  const setSem = (intencion, componente, valor) =>
    setForm((f) => ({ ...f, sem: { ...f.sem, [intencion]: { ...f.sem[intencion], [componente]: valor } } }));

  const guardar = async () => {
    if (!window.confirm('Guardar estos pesos como versión nueva y activarla. ¿Confirmás?')) return;
    try {
      const res = await kernelApi.pesosGuardar({ pesos: aPayload(form), nota: 'Edición manual desde el panel' });
      setAviso(`✓ ${res.message}`);
      await cargar();
    } catch (err) {
      const msg = err.response && err.response.data ? err.response.data.message : err.message;
      setAviso(`⚠️ ${msg}`);
    }
  };

  const activar = async (id) => {
    if (!window.confirm(`Reactivar la versión ${id} (rollback). ¿Confirmás?`)) return;
    try {
      const res = await kernelApi.pesosActivar(id);
      setAviso(`✓ ${res.message}`);
      await cargar();
    } catch (err) {
      const msg = err.response && err.response.data ? err.response.data.message : err.message;
      setAviso(`⚠️ ${msg}`);
    }
  };

  const correrBanco = async () => {
    setCorriendo(true);
    setAviso('Corriendo el banco de pruebas (serie fija + evaluación LLM, hasta 3 ciclos)…');
    try {
      const res = await kernelApi.bancoCorrer({ observacion: observacion || null });
      const r = res.data || {};
      setAviso(r.ok === false
        ? `Banco: ${r.motivo}`
        : `Banco: métrica ${r.base} → ${r.mejor} (mejora ${r.mejora}, ciclos ${r.ciclos}, ${r.llamadasLlm} llamadas)${r.propuestaId ? ` · propuesta #${r.propuestaId} creada` : ' · sin mejora: no se propone nada'}`);
      await cargar();
    } catch (err) {
      const msg = err.response && err.response.data ? err.response.data.message : err.message;
      setAviso(`⚠️ ${msg}`);
    } finally {
      setCorriendo(false);
    }
  };

  if (!form || !data) {
    return <div><DebugTag nombre="PesosPage" /><p className="text-sm text-muted">Cargando pesos… {aviso}</p></div>;
  }

  const campo = (etiqueta, clave, paso = 0.01, ayuda = null) => (
    <label className="block" title={ayuda || ''}>
      <span className="block text-xs uppercase tracking-widest text-muted mb-1">{etiqueta}</span>
      <input className="input-os" type="number" step={paso} min={0} value={form[clave]} onChange={(e) => set(clave, e.target.value)} />
    </label>
  );

  return (
    <div>
      <DebugTag nombre="PesosPage" />
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold">Pesos del ranking</h2>
        <span className="agente-badge">versión vigente {data.vigente.version}</span>
      </div>
      <p className="text-sm text-muted mb-4">
        score = α·sem + β·sparse + γ·grafo + δ·negocio + ε·flujo + ζ·empatía. Guardar crea una versión nueva
        (la anterior queda para rollback); el banco de pruebas mide antes/después con la serie fija.
      </p>
      {aviso && <p className="text-sm mb-3">{aviso}</p>}

      <div className="card p-4 mb-4">
        <div className="text-sm font-medium mb-2">Similitud semántica por intención (se normaliza a 1)</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {INTENCIONES.map((intencion) => (
            <div key={intencion} className="p-2" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="text-xs font-mono mb-2">{intencion}</div>
              <div className="grid grid-cols-3 gap-2">
                {['id', 'dig', 'aut'].map((c) => (
                  <label key={c} className="block">
                    <span className="block text-xs text-muted mb-1">{c}</span>
                    <input className="input-os" type="number" step={0.05} min={0} max={1}
                      value={form.sem[intencion][c]} onChange={(e) => setSem(intencion, c, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="text-sm font-medium mb-2">Términos y umbrales</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {campo('α sem', 'alfa', 0.05, 'peso global de la similitud semántica (0.5–1.5)')}
          {campo('β sparse', 'beta', 0.01, 'matches de keywords en digestos (0–0.2)')}
          {campo('γ grafo', 'gamma', 0.01, 'reglas del grafo de negocio (0–0.5)')}
          {campo('δ negocio', 'delta', 0.01, 'stock, rotación, pedibilidad (0–0.3)')}
          {campo('ε flujo', 'epsilon', 0.01, 'sell-through de materia (0–0.2)')}
          {campo('ε coocurrencia', 'epsilonCoocurrencia', 0.01, 'coocurrencia de ventas (0–0.15)')}
          {campo('ζ empatía', 'zeta', 0.01, 'contexto de pantalla/cliente (0–0.3)')}
          {campo('recall por campo', 'recallPorCampo', 1, '20–120')}
          {campo('recall total', 'recallTotal', 1, '60–400')}
        </div>
        {esAdmin && (
          <div className="flex items-center gap-2 mt-3">
            <button type="button" className="btn btn-primary text-sm" onClick={guardar}>Guardar como versión nueva</button>
            <button type="button" className="btn text-sm" onClick={() => setForm(aFormulario(data.vigente))}>Restaurar valores vigentes</button>
          </div>
        )}
      </div>

      <div className="card p-4 mb-4">
        <div className="text-sm font-medium mb-2">Banco de pruebas (doc 01 §7.4)</div>
        <p className="text-xs text-muted mb-2">
          Serie fija de consultas reales · evaluación con LLM (1–5) · hasta 3 ciclos de ajuste · presupuesto
          de llamadas por corrida. Si encuentra mejora, deja una propuesta en el panel de Propuestas.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {esAdmin && (
            <>
              <input className="input-os" style={{ maxWidth: 360 }} placeholder="Observación para la corrida (ej. campaña de navidad)"
                value={observacion} onChange={(e) => setObservacion(e.target.value)} />
              <button type="button" className="btn btn-primary text-sm" onClick={correrBanco} disabled={corriendo}>
                {corriendo ? 'Midiendo…' : 'Correr banco de pruebas'}
              </button>
            </>
          )}
        </div>
        {data.corridas.length > 0 && (
          <div className="mt-3">
            {data.corridas.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono">{new Date(c.fecha).toLocaleString('es-AR')} · v{c.versionPesos} · {c.ciclos} ciclos · {c.llamadasLlm} llamadas</span>
                <span>
                  métrica {Number(c.metrica)} {c.propuestaId ? `· propuesta #${c.propuestaId}` : '· sin propuesta'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2">Historial de versiones</div>
        {data.historial.map((v) => (
          <div key={v.id} className="flex items-center justify-between text-xs py-1">
            <span>
              <span className="font-mono">v{v.version}</span>
              {v.activa && <span className="agente-badge ml-2">activa</span>}
              <span className="text-muted ml-2">{new Date(v.createdAt).toLocaleString('es-AR')}</span>
              {v.nota && <span className="text-muted ml-2">· {v.nota}</span>}
            </span>
            {esAdmin && !v.activa && (
              <button type="button" className="btn btn-ghost text-xs" onClick={() => activar(v.id)}>Reactivar (rollback)</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
