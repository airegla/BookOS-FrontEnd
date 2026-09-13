// BookOS - BuscadorSemanticoBlock.jsx
// ruta: bookos/frontend/src/blocks/BuscadorSemanticoBlock.jsx
// descripcion: F7 — el buscador SEMANTICO del kernel como modal global, con las MISMAS tarjetas
//   del asistente (titulo, score, autor/editorial, precio y stock) y sus acciones: agregar el
//   renglon cuando se esta facturando y preguntarle al Secretario. Desde aca tambien se abre la
//   pagina del Asistente de ventas.

import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { kernelApi } from '../api/api';
import { useAppContext } from '../AppContext';

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
const stockDe = (a) => Number(a.stock || 0) + Number(a.stockDeposito || 0);

export default function BuscadorSemanticoBlock({ abierto, onCerrar, enFacturar = false, onAbrirAsistente }) {
  const { emitirInstruccion, pedirConsulta, clienteIdActivo } = useAppContext();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [consultado, setConsultado] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!abierto) {
      setTexto('');
      setResultados([]);
      setConsultado('');
      setError('');
      return;
    }
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
    return () => clearTimeout(t);
  }, [abierto]);

  const buscar = async () => {
    const consulta = texto.trim();
    if (!consulta) return;
    setCargando(true);
    setError('');
    try {
      const res = await kernelApi.buscar({
        texto: consulta,
        limite: 12,
        // Con cliente activo la busqueda se mide como recomendacion para ese cliente (zeta/contexto).
        contexto: clienteIdActivo ? { clienteId: clienteIdActivo, uso: 'recomendacion' } : { uso: 'agente' },
      });
      const data = res.data || {};
      setResultados(data.resultados || data.candidatos || []);
      setConsultado(consulta);
    } catch (err) {
      setError(err.message);
      setResultados([]);
    } finally {
      setCargando(false);
    }
  };

  const eanDe = (a) => a.ean13 || a.barras || a.codigo || '';

  const agregar = (a) => {
    if (!enFacturar) return;
    emitirInstruccion({ dominio: 'ventas', accion: 'agregar_item', item: { ean13: eanDe(a), titulo: a.titulo, precio: a.precio } });
    onCerrar();
  };

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full">
      <span className="text-xs text-muted">
        Busca por significado en todo el catalogo{clienteIdActivo ? ' (con el cliente activo como contexto)' : ''}. Enter para buscar.
        El primer buscar del dia arma el indice del kernel, puede tardar unos segundos.
      </span>
      <div className="flex gap-2">
        {onAbrirAsistente && (
          <button type="button" className="btn btn-ghost text-xs" onClick={() => { onCerrar(); onAbrirAsistente(); }}>
            Abrir el Asistente
          </button>
        )}
        <button type="button" className="btn btn-ghost text-xs" onClick={onCerrar}>Cerrar (Esc)</button>
      </div>
    </div>
  );

  return (
    <Modal abierto={abierto} onClose={onCerrar} titulo="Buscador semantico (F7)" ancho="900px" footer={footer}>
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          className="input-os flex-1"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
          placeholder="que le regalo a alguien que le gusta el policial argentino"
        />
        <button type="button" className="btn btn-primary text-sm" disabled={cargando || !texto.trim()} onClick={buscar}>
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {error && <p className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      {consultado && !error && <p className="text-xs text-muted mb-2">{resultados.length} resultado(s) para «{consultado}»</p>}
      <div className="space-y-2" style={{ maxHeight: '56vh', overflowY: 'auto' }}>
        {resultados.map((a, i) => (
          <div key={eanDe(a) || a.articuloId || i} className="card p-3">
            <div className="flex justify-between gap-2">
              <span className="text-sm font-medium">{a.titulo}</span>
              <span className="text-xs text-muted font-mono">{Number(a.score || 0).toFixed(3)}</span>
            </div>
            <div className="text-xs text-muted">{[a.autor, a.editorial].filter(Boolean).join(' · ')}</div>
            <div className="flex justify-between text-xs mt-1">
              <span className="font-mono">{eanDe(a)}</span>
              <span>{money(a.precio)} · stock {stockDe(a)}</span>
            </div>
            <div className="flex justify-end gap-1 mt-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => { pedirConsulta(`Pregunta de mostrador: ${consultado}. Que me decis de "${a.titulo}"?`); onCerrar(); }}
              >
                Preguntar al Secretario
              </button>
              {enFacturar && <button type="button" className="btn btn-primary text-xs" onClick={() => agregar(a)}>Agregar a la venta</button>}
            </div>
          </div>
        ))}
        {!resultados.length && !error && (
          <p className="text-sm text-muted">
            Describi lo que buscas en lenguaje natural (tema, clima, a quien le puede gustar) y apreta Enter.
          </p>
        )}
      </div>
    </Modal>
  );
}
