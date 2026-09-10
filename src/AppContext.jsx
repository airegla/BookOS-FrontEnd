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
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
