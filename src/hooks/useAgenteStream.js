// BookOS - useAgenteStream.js
// ruta: bookos/frontend/src/hooks/useAgenteStream.js
// descripcion: consumo del SSE del Secretario (POST + stream). Expone estados,
//   candidatos, la pregunta del agente (confirmacion/clarificacion) y el texto
//   que llega palabra por palabra. El adjunto viaja como { nombre, contenido }.

import { useCallback, useRef, useState } from 'react';
import { agenteApi } from '../api/api';

export default function useAgenteStream(onHerramienta) {
  const [mensajes, setMensajes] = useState([]);
  const [estado, setEstado] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [textoActual, setTextoActual] = useState('');
  const [cargando, setCargando] = useState(false);
  const abortRef = useRef(null);

  const agregarMensaje = useCallback((mensaje) => {
    setMensajes((prev) => [...prev, mensaje]);
  }, []);

  const enviar = useCallback(async (texto, contexto = null, adjunto = null) => {
    if (!texto.trim() || cargando) return;
    setCargando(true);
    setEstado('Analizando...');
    setCandidatos([]);
    setTextoActual('');
    setMensajes((prev) => [...prev, { rol: 'usuario', texto, adjunto: adjunto ? adjunto.nombre : null }]);

    try {
      const respuesta = await agenteApi.chat(texto.trim(), contexto, adjunto);
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
  }, [cargando, onHerramienta]);

  return { mensajes, estado, candidatos, textoActual, cargando, enviar, agregarMensaje };
}
