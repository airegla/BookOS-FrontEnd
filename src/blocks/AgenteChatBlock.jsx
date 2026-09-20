// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: El Secretario. Panel lateral del layout, plegable: en la mayoria de las vistas
//   arranca abierto y se puede cerrar (queda el boton flotante para volver); la pagina del
//   Asistente de ventas lo arranca CERRADO porque ahi el protagonista es el asistente. En
//   pantallas chicas el panel se abre a pantalla completa desde el boton flotante. El chat en si
//   (estado, SSE, render del envelope) vive en blocks/ChatAgente.jsx y es compartido con el
//   Asistente de ventas (perfil 'ventas').

import { useState } from 'react';
import ChatAgente from './ChatAgente';
import DebugTag from '../ui/DebugTag';

export default function AgenteChatBlock({ abierto = true, onAlternar = null }) {
  const [abiertoMobile, setAbiertoMobile] = useState(false);
  const plegable = typeof onAlternar === 'function';

  // En pantallas chicas el panel se muestra como CHAT a pantalla completa: `abiertoMobile` es la
  // puerta propia del telefono, porque el estado de escritorio (`abierto`) puede estar en false
  // (el layout ocupa todo el ancho) y antes el boton flotante no hacia nada en ese caso: el
  // operario tocaba "💬 Secretario" y el panel no volvia a aparecer (se sentia colgado).
  const visible = abierto || abiertoMobile;

  const cerrar = () => {
    setAbiertoMobile(false);
    if (plegable && abierto) onAlternar();
  };

  const abrirMobile = () => {
    setAbiertoMobile(true);
    if (plegable && !abierto) onAlternar();
  };

  return (
    <>
      <button type="button" className="btn btn-primary agente-toggle" onClick={abrirMobile} title="Abrir el Secretario">
        💬 Secretario
      </button>
      {!abierto && !abiertoMobile && plegable && (
        <button type="button" className="btn agente-reabrir" onClick={onAlternar} title="Abrir el Secretario">
          💬 Secretario
        </button>
      )}
      {visible && (
        <aside className={`agente-panel ${plegable ? 'plegable' : ''} ${abiertoMobile ? 'agente-abierto' : ''}`}>
          <DebugTag nombre="AgenteChatBlock" />
          <ChatAgente perfil="secretario" titulo="El Secretario" onCerrarMobile={cerrar} />
        </aside>
      )}
    </>
  );
}
