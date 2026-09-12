// BookOS - useAgenteStream.js
// ruta: bookos/frontend/src/hooks/useAgenteStream.js
// descripcion: consumo del SSE del Secretario (POST + stream). Expone estados,
//   candidatos, la pregunta del agente (confirmacion/clarificacion) y el texto
//   que llega palabra por palabra. El adjunto viaja como { nombre, contenido }.

import { useCallback, useEffect, useRef, useState } from 'react';
import { agenteApi } from '../api/api';

export default function useAgenteStream(onHerramienta) {
  const [mensajes, setMensajes] = useState([]);
  const [estado, setEstado] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [textoActual, setTextoActual] = useState('');
  const [cargando, setCargando] = useState(false);
  // Continuidad: la conversacion activa sobrevive recargas (el backend guarda el hilo).
  const [conversacionId, setConversacionId] = useState(() => {
    try {
      return Number(localStorage.getItem('bookos_conversacion_id')) || null;
    } catch (_) {
      return null;
    }
  });
  const abortRef = useRef(null);

  const agregarMensaje = useCallback((mensaje) => {
    setMensajes((prev) => [...prev, mensaje]);
  }, []);

  const nuevaConversacion = useCallback(() => {
    setConversacionId(null);
    try {
      localStorage.removeItem('bookos_conversacion_id');
    } catch (_) {
      /* modo privado */
    }
    setMensajes([]);
    setTextoActual('');
    setCandidatos([]);
  }, []);

  // Reabre una conversacion persistida: repinta los turnos guardados y la vuelve activa.
  const cargarConversacion = useCallback(async (id) => {
    try {
      const res = await agenteApi.conversacionTurnos(id);
      // axiosClient desempaqueta el envelope: `res` ya es el payload {conversacionId, titulo, turnos}.
      const payload = res && res.data !== undefined && !Array.isArray(res) ? res.data : res;
      const detalle = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
      const filas = Array.isArray(detalle.turnos) ? detalle.turnos : [];
      const reconstruidos = [];
      for (const t of filas) {
        if (t.rol === 'usuario') {
          reconstruidos.push({ rol: 'usuario', texto: t.texto || '' });
        } else {
          for (const h of t.herramientas || []) reconstruidos.push({ rol: 'herramienta', nombre: h.nombre, ok: true });
          if (t.texto) reconstruidos.push({ rol: 'agente', texto: t.texto });
        }
      }
      setMensajes(reconstruidos);
      setConversacionId(Number(id));
      try {
        localStorage.setItem('bookos_conversacion_id', String(id));
      } catch (_) {
        /* modo privado */
      }
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  // Al abrir el chat, si hay una conversacion activa guardada, se repinta el hilo.
  const autoCargado = useRef(false);
  useEffect(() => {
    if (autoCargado.current || !conversacionId) return;
    autoCargado.current = true;
    cargarConversacion(conversacionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviar = useCallback(async (texto, contexto = null, adjunto = null) => {
    if (!texto.trim() || cargando) return;
    setCargando(true);
    setEstado('Analizando...');
    setCandidatos([]);
    setTextoActual('');
    setMensajes((prev) => [...prev, { rol: 'usuario', texto, adjunto: adjunto ? adjunto.nombre : null }]);

    try {
      const respuesta = await agenteApi.chat(texto.trim(), contexto, adjunto, conversacionId);
      const reader = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acumulado = '';
      let recibioAlgo = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const bloques = buffer.split('\n\n');
        buffer = bloques.pop();
        for (const bloque of bloques) {
          let evento = '';
          let datos = '';
          for (const linea of bloque.split('\n')) {
            if (linea.startsWith('event: ')) evento = linea.slice(7).trim();
            if (linea.startsWith('data: ')) datos += linea.slice(6);
          }
          if (!evento) continue;
          try {
            const payload = datos ? JSON.parse(datos) : {};
            if (evento === 'estado') {
              if (payload.fase === 'done') continue;
              setEstado(payload.fase);
            } else if (evento === 'candidatos') {
              recibioAlgo = true;
              setCandidatos(payload.resultados || []);
            } else if (evento === 'chunk') {
              recibioAlgo = true;
              acumulado += payload.texto;
              setTextoActual(acumulado);
            } else if (evento === 'pregunta') {
              recibioAlgo = true;
              setMensajes((prev) => [...prev, { rol: 'pregunta', pregunta: payload }]);
            } else if (evento === 'resultado') {
              recibioAlgo = true;
              if (payload.conversacionId) {
                setConversacionId(payload.conversacionId);
                try {
                  localStorage.setItem('bookos_conversacion_id', String(payload.conversacionId));
                } catch (_) {
                  /* modo privado */
                }
              }
              setMensajes((prev) => [...prev, { rol: 'agente', resultado: payload }]);
            } else if (evento === 'herramienta') {
              recibioAlgo = true;
              setMensajes((prev) => [...prev, { rol: 'herramienta', nombre: payload.nombre, ok: payload.ok }]);
              if (onHerramienta && payload.resultado) onHerramienta(payload.resultado, payload.nombre);
            } else if (evento === 'error') {
              recibioAlgo = true;
              setMensajes((prev) => [...prev, { rol: 'agente', texto: `⚠️ ${payload.message}` }]);
            }
          } catch (err) {
            // evento parcial: ignorar
          }
        }
      }

      if (acumulado) {
        setMensajes((prev) => [...prev, { rol: 'agente', texto: acumulado }]);
      } else if (!recibioAlgo) {
        setMensajes((prev) => [...prev, {
          rol: 'agente',
          texto: 'No obtuve resultados para ese pedido. Puedo intentarlo de nuevo si me das otro dato o lo reformulás.',
        }]);
      }
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'agente', texto: `⚠️ ${err.message}` }]);
    } finally {
      setEstado('');
      setCargando(false);
    }
  }, [cargando, onHerramienta, conversacionId]);

  return { mensajes, estado, candidatos, textoActual, cargando, enviar, agregarMensaje, conversacionId, nuevaConversacion, cargarConversacion };
}
