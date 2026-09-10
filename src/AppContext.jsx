// BookOS - AppContext.jsx
// ruta: bookos/frontend/src/AppContext.jsx
// descripcion: contexto del OS. Lleva el contexto de pantalla que se inyecta al
//   Secretario (ej. el remito que estas viendo) y los ultimos recomendados para
//   cerrar el ciclo de outcome en la venta.

import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [contextoActual, setContextoActual] = useState(null);
  const [ultimosRecomendados, setUltimosRecomendados] = useState([]);
  const [clienteIdActivo, setClienteIdActivo] = useState(null);
  // Pedido de consulta programado desde cualquier vista ("Preguntar al Secretario").
  const [consultaAutomatica, setConsultaAutomatica] = useState(null);
  // Bus de instrucciones: el Secretario "opera sobre la vista" emitiendo una
  // instruccion que la pagina activa escucha y aplica (refrescar, agregar item...).
  const [instruccionVista, setInstruccionVista] = useState(null);
  // CSV adjuntado desde una vista para que el Secretario lo procese con la tool que corresponda.
  const [csvAdjunto, setCsvAdjunto] = useState(null);

  const emitirInstruccion = (instruccion) => {
    setInstruccionVista({ ...instruccion, ts: Date.now() });
  };

  return (
    <AppContext.Provider value={{
      contextoActual,
      setContextoActual,
      ultimosRecomendados,
      setUltimosRecomendados,
      clienteIdActivo,
      setClienteIdActivo,
      consultaAutomatica,
      pedirConsulta: setConsultaAutomatica,
      instruccionVista,
      emitirInstruccion,
      csvAdjunto,
      setCsvAdjunto,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
