// BookOS - BancoPruebasPage.jsx
// ruta: bookos/frontend/src/pages/BancoPruebasPage.jsx
// descripcion: pantalla del BANCO DE PRUEBAS del kernel (Kernel > Banco de pruebas). Reune las dos
//   series que hoy existen: la del RANKING, que corre la serie fija de consultas contra el kernel y
//   la puntua con el LLM pago (antes vivia dentro de Pesos), y la del MODELO CHICO LOCAL, que mide
//   que herramienta elige el chico para cada consulta de la misma serie.
//
//   Las dos son instrumentos de MEDICION: ninguna activa nada por si sola. La del ranking, si
//   encuentra mejora, deja una propuesta para aprobar; la del chico solo deja el reporte.

import { useCallback, useEffect, useState } from 'react';
import DebugTag from '../ui/DebugTag';
import { kernelApi } from '../api/api';

// Costo medido por consulta del modelo chico. Se declara en la pantalla porque la corrida BLOQUEA la
// peticion: el usuario tiene que saber cuanto va a esperar. El numero es el del 0.5B medido en el i5
// (15-Sep-2026); el 1.5B tarda ~2,4x, y por eso el aviso dice "estimado".
const MS_POR_CONSULTA_CHICO = 12000;

// Rotulo de las series conocidas. La LISTA y su tamano salen del backend (`consultasPorSerie`):
// agregar una serie alla no obliga a tocar esta pantalla.
const ROTULO_SERIE = {
  normal: 'consultas de busqueda del banco de ranking',
  memoria: 'consultas de memoria',
  pedidos: 'PEDIDOS reales del operario',
};

export default function BancoPruebasPage({ esAdmin }) {
  const [aviso, setAviso] = useState('');

  // --- Banco del ranking ---
  const [ranking, setRanking] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [corriendoRanking, setCorriendoRanking] = useState(false);

  // --- Banco del modelo chico ---
  const [chico, setChico] = useState(null);
  const [serie, setSerie] = useState('normal');
  const [limite, setLimite] = useState('');
  const [corriendoChico, setCorriendoChico] = useState(false);
  const [reporte, setReporte] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const b = await kernelApi.banco();
      setRanking(b.data || null);
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    }
    try {
      const c = await kernelApi.bancoChicoEstado();
      setChico(c.data || null);
    } catch (err) {
      setAviso(`⚠️ no se pudo leer el estado del banco del chico: ${err.message}`);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const correrRanking = async () => {
    setCorriendoRanking(true);
    setAviso('Corriendo el banco del ranking (serie fija + evaluación LLM, hasta 3 ciclos)…');
    try {
      const res = await kernelApi.bancoCorrer({ observacion: observacion || null });
      const r = res.data || {};
      setAviso(r.ok === false
        ? `Banco: ${r.motivo}`
        : `Banco: métrica ${r.base} → ${r.mejor} (mejora ${r.mejora}, ciclos ${r.ciclos}, ${r.llamadasLlm} llamadas)${r.propuestaId ? ` · propuesta #${r.propuestaId} creada` : ' · sin mejora: no se propone nada'}`);
      await cargar();
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    } finally {
      setCorriendoRanking(false);
    }
  };

  const correrChico = async () => {
    setCorriendoChico(true);
    setReporte(null);
    setAviso(`Midiendo el modelo chico (serie ${serie})… no cierres la pantalla.`);
    try {
      const res = await kernelApi.bancoChico({ serie, limite: Number(limite) || 0 });
      const r = res.data || {};
      setReporte(r);
      setAviso(r.ok === false ? `Banco del chico: ${r.motivo}` : 'Corrida del banco del chico terminada');
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    } finally {
      setCorriendoChico(false);
    }
  };

  // Tamano de cada serie segun lo que declara el backend.
  const tamanos = (chico && chico.consultasPorSerie) || {};
  const totalSerie = (s) => (s === 'todas'
    ? Object.values(tamanos).reduce((acc, lista) => acc + lista.length, 0)
    : (tamanos[s] || []).length);
  const consultasDeSerie = () => {
    const n = totalSerie(serie);
    const l = Number(limite) || 0;
    return l > 0 ? Math.min(l, n) : n;
  };

  const minutos = Math.round((consultasDeSerie() * MS_POR_CONSULTA_CHICO) / 60000);

  return (
    <div>
      <DebugTag nombre="BancoPruebasPage" />
      <h2 className="text-lg font-semibold mb-1">Banco de pruebas</h2>
      <p className="text-sm text-muted mb-4">
        Los dos instrumentos miden sobre la misma serie de consultas reales. El del ranking mide la
        búsqueda semántica con el LLM pago y, si encuentra mejora, deja una propuesta en
        <strong> Kernel ▾ Propuestas Kernel</strong>; el del modelo chico mide qué herramienta elige
        el modelo local. Ninguno activa nada por sí solo.
      </p>
      {aviso && <p className="text-sm mb-3">{aviso}</p>}

      <div className="card p-4 mb-4">
        <div className="text-sm font-medium mb-2">Ranking (serie fija · evaluación con LLM)</div>
        <p className="text-xs text-muted mb-2">
          Serie fija de {ranking ? ranking.consultas.length : '—'} consultas reales · evaluación con LLM
          (1–5) · hasta 3 ciclos de ajuste · presupuesto de llamadas por corrida.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {esAdmin && (
            <>
              <input className="input-os" style={{ maxWidth: 360 }} placeholder="Observación para la corrida (ej. campaña de navidad)"
                value={observacion} onChange={(e) => setObservacion(e.target.value)} />
              <button type="button" className="btn btn-primary text-sm" onClick={correrRanking} disabled={corriendoRanking}>
                {corriendoRanking ? 'Midiendo…' : 'Correr banco del ranking'}
              </button>
            </>
          )}
        </div>
        {ranking && ranking.corridas && ranking.corridas.length > 0 && (
          <div className="mt-3">
            {ranking.corridas.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono">{new Date(c.fecha).toLocaleString('es-AR')} · v{c.versionPesos} · {c.ciclos} ciclos · {c.llamadasLlm} llamadas</span>
                <span>métrica {Number(c.metrica)} {c.propuestaId ? `· propuesta #${c.propuestaId}` : '· sin propuesta'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4 mb-4">
        <div className="text-sm font-medium mb-2">Modelo chico local (elección de herramienta)</div>
        <p className="text-xs text-muted mb-2">
          Corre la serie de consultas contra el worker del modelo chico, una llamada por consulta, con
          el prompt real del motor. Mide qué herramienta elige y si existe en el contrato vigente.
          <strong> No ejecuta ninguna herramienta</strong>: no toca datos.
        </p>
        {chico && chico.contrato && (
          <p className="text-xs text-muted mb-2">
            contrato vivo: pasos <span className="font-mono">{chico.contrato.pasos}</span> · chars por resultado{' '}
            <span className="font-mono">{chico.contrato.maxChars}</span> · prompt{' '}
            <span className="font-mono">{chico.contrato.promptChars}</span> chars (~{Math.round(chico.contrato.promptChars / 4)} tokens)
            · índice <span className="font-mono">{chico.contrato.indice.modulos} módulos / {chico.contrato.indice.accionesTotales} acciones</span>
            {' '}(fuente <span className="font-mono">{chico.contrato.indice.fuente}</span>)
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {esAdmin && (
            <>
              <select className="input-os" style={{ maxWidth: 380 }} value={serie} onChange={(e) => setSerie(e.target.value)}>
                {((chico && chico.series) || ['normal']).map((s) => (
                  <option key={s} value={s}>{`${s} (${totalSerie(s)}${ROTULO_SERIE[s] ? ` — ${ROTULO_SERIE[s]}` : ''})`}</option>
                ))}
              </select>
              <input type="number" min="0" className="input-os" style={{ maxWidth: 140 }} placeholder="límite (0 = toda)"
                value={limite} onChange={(e) => setLimite(e.target.value)} />
              <button type="button" className="btn btn-primary text-sm" onClick={correrChico} disabled={corriendoChico}>
                {corriendoChico ? 'Midiendo…' : 'Correr banco del chico'}
              </button>
              <span className="text-xs text-muted">
                {consultasDeSerie()} consultas · ~{minutos} min (medido: ~12 s por consulta)
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-muted mt-2">
          LÍMITES declarados: una llamada por consulta (no simula el resultado de la herramienta, así
          que no mide el loop completo ni la respuesta final del turno) y mide con el prompt del motor
          <strong> sin los bloques del turno</strong> (memoria, bloque del operario e hilo): es a
          propósito, para que la serie quede comparable entre corridas. Cambiar de modelo cambia todo
          el resultado: la serie mide la dupla índice + semilla + modelo.
        </p>

        {reporte && reporte.ok === false && (
          <p className="text-sm mt-3" style={{ color: 'var(--danger)' }}>No se midió: {reporte.motivo}</p>
        )}

        {reporte && reporte.ok && (
          <div className="mt-3">
            <div className="text-xs mb-2">
              <span className="font-mono">{reporte.resumen.consultas}</span> consultas ·
              forma <span className="font-mono">{Object.entries(reporte.resumen.porForma).map(([k, v]) => `${k} ${v}`).join(' · ')}</span> ·
              módulo existente <span className="font-mono">{reporte.resumen.moduloExistente}</span> ·
              módulo esperado <span className="font-mono">{reporte.resumen.moduloEsperado}</span> ·
              mediana <span className="font-mono">{reporte.resumen.msMediana} ms</span> ·
              máximo <span className="font-mono">{reporte.resumen.msMaximo} ms</span>
              {reporte.reporte && <span className="text-muted"> · reporte en <span className="font-mono">{reporte.reporte.split(/[\\/]/).pop()}</span></span>}
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              {reporte.filas.map((f, i) => (
                <div key={`${f.consulta}-${i}`} className="flex items-center justify-between text-xs py-0.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="truncate" style={{ maxWidth: 380 }} title={[f.consulta, f.porque ? `esperado: ${f.porque}` : ''].filter(Boolean).join('\n')}>
                    {f.consulta}
                    {f.porque && <span className="text-muted"> → {Array.isArray(f.esperado) ? f.esperado.join(' / ') : f.esperado}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted">{f.ms} ms</span>
                    <span className="font-mono">
                      {f.forma === 'herramienta' ? `${f.herramienta}${f.accion && !String(f.herramienta).includes(':') ? `:${f.accion}` : ''}` : f.forma}
                    </span>
                    {f.forma === 'herramienta' && !f.modulo && <span className="agente-badge" style={{ color: 'var(--danger)' }}>módulo inexistente</span>}
                    {f.forma === 'herramienta' && f.accionValida === false && <span className="agente-badge" style={{ color: 'var(--danger)' }}>acción inexistente</span>}
                    {f.acierta && <span className="agente-badge">esperado</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
