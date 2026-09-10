// BookOS - usePersistentWork.js
// ruta: bookos/frontend/src/hooks/usePersistentWork.js
// descripcion: borradores que sobreviven al cambio de pagina (localStorage).
//   Regla de oro del OS: cambiar de pagina NO borra trabajo.

import { useEffect, useState } from 'react';

export default function usePersistentWork(clave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(`bookos_borrador_${clave}`);
      return guardado ? { ...valorInicial, ...JSON.parse(guardado) } : valorInicial;
    } catch (err) {
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`bookos_borrador_${clave}`, JSON.stringify(valor));
    } catch (err) {
      // storage lleno: se pierde el borrador pero no rompe la app
    }
  }, [clave, valor]);

  const limpiar = () => setValor(valorInicial);

  return [valor, setValor, limpiar];
}
