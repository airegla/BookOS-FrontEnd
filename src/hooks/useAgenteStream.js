// BookOS - useAgenteStream.js
// ruta: bookos/frontend/src/hooks/useAgenteStream.js
// descripcion: consumo del SSE del Secretario (POST + stream). Expone estados,
//   candidatos de la almohadilla y el texto que llega palabra por palabra.

import { useCallback, useRef, useState } from 'react';
import { agenteApi } from '../api/api';

export default function useAgenteStream() {
  const [mensajes, setMensajes] = useState([]);
  const [estado, setEstado] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [textoActual, setTextoActual] = useState('');
  const [cargando, setCargando] = useState(false);
  const abortRef = useRef(null);

  const enviar = useCallback(async (texto, contexto = null) => {
    if (!texto.trim() || cargando) return;
    setCargando(true);
    setEstado('Analizando...');
    setCandidatos([]);
    setTextoActual('');
    setMensajes((prev) => [...prev, { rol: 'usuario', texto }]);

    try {
      const respuesta = await agenteApi.chat(texto.trim(), contexto);
      const reader = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acumulado = '';
      let recibioResultado = false;
      let recibioCandidatos = false;

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
              recibioCandidatos = true;
              setCandidatos(payload.resultados || []);
            } else if (evento === 'chunk') {
              acumulado += payload.texto;
              setTextoActual(acumulado);
            } else if (evento === 'resultado') {
              recibioResultado = true;
              setMensajes((prev) => [...prev, { rol: 'agente', resultado: payload }]);
            } else if (evento === 'herramienta') {
              setMensajes((prev) => [...prev, { rol: 'herramienta', nombre: payload.nombre, ok: payload.ok }]);
            } else if (evento === 'error') {
              setMensajes((prev) => [...prev, { rol: 'agente', texto: `⚠️ ${payload.message}` }]);
            }
          } catch (err) {
            // evento parcial: ignorar
          }
        }
      }

      if (acumulado) {
        setMensajes((prev) => [...prev, { rol: 'agente', texto: acumulado }]);
      } else if (!recibioCandidatos && !recibioResultado) {
        setMensajes((prev) => [...prev, { rol: 'agente', texto: 'Sin resultados.' }]);
      }
    } catch (err) {
      setMensajes((prev) => [...prev, { rol: 'agente', texto: `⚠️ ${err.message}` }]);
    } finally {
      setEstado('');
      setCargando(false);
    }
  }, [cargando]);

  return { mensajes, estado, candidatos, textoActual, cargando, enviar };
}
