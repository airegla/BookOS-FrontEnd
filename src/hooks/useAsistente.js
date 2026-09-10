// ARCHIVO: useAsistente.js
// RUTA: frontend/src/hooks/useAsistente.js
// DESCRIPCIÓN: Hook personalizado para gestionar las solicitudes al Asistente y la clasificación en_stock / a_pedir.
//              Cuando el backend responde llm_pendiente (LLM lento en segundo plano), hace polling
//              de /asistente/tarea/:id y reemplaza el resultado cuando la redacción LLM está lista.

import { useState, useRef } from 'react';
import { api } from '../api/api';

const POLL_EVERY_MS = 3000;   // cada 3 s
const POLL_MAX_MS = 240000;   // hasta 4 min: el LLM en segundo plano puede tardar >90 s

export const useAsistente = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState({ en_stock: [], a_pedir: [] });
  const [mejorando, setMejorando] = useState(false); // true mientras se espera la redacción LLM
  const pollRef = useRef(null);

  const detenerPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const consultarAsistente = async (prompt, modo = 'auto') => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setMejorando(false);
    detenerPolling();

    try {
      const data = await api.recomendar(prompt, modo);
      setResultado(data);

      // El backend devolvió el recall al instante y sigue redactando con el LLM: poll.
      if (data.llm_pendiente && data.tarea_id) {
        setMejorando(true);
        const inicio = Date.now();
        pollRef.current = setInterval(async () => {
          try {
            const t = await api.getAsistenteTarea(data.tarea_id);
            console.log('[useAsistente] poll tarea:', data.tarea_id, t && t.estado);
            if (t.estado === 'listo' && t.resultado) {
              detenerPolling();
              setMejorando(false);
              setResultado(t.resultado);
            } else if (t.estado === 'error' || t.estado === 'no_encontrada') {
              detenerPolling();
              setMejorando(false);
            } else if (Date.now() - inicio > POLL_MAX_MS) {
              detenerPolling();
              setMejorando(false);
            }
          } catch {
            // falla de polling: no romper la UI; se reintenta en el próximo tick.
            if (Date.now() - inicio > POLL_MAX_MS) {
              detenerPolling();
              setMejorando(false);
            }
          }
        }, POLL_EVERY_MS);
      }
    } catch (err) {
      console.error('[useAsistente] Error:', err);
      const raw = err?.message || '';
      const amigable = /524|timeout|timed out|tiempo de espera|ETIMEDOUT|ECONNRESET|Failed to fetch|NetworkError|gateway/i.test(raw)
        ? 'Tiempo de espera excedido. Consultá nuevamente más tarde.'
        : (raw || 'Error al conectar con el asistente');
      setError(amigable);
    } finally {
      setLoading(false);
    }
  };

  const limpiarResultado = () => {
    detenerPolling();
    setMejorando(false);
    setResultado({ en_stock: [], a_pedir: [] });
    setError(null);
  };

  return {
    loading,
    error,
    resultado,
    mejorando,
    consultarAsistente,
    limpiarResultado,
  };
};