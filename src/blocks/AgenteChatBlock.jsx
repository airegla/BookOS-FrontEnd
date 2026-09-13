// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: El Secretario. Panel lateral persistente del layout: envuelve a ChatAgente
//   (perfil secretario) en el aside del grid, con el boton flotante que lo abre a pantalla
//   completa en pantallas chicas. El chat en si (estado, SSE, render del envelope) vive en
//   blocks/ChatAgente.jsx y es compartido con el Asistente de ventas (perfil 'ventas').

import { useState } from 'react';
import ChatAgente from './ChatAgente';
import DebugTag from '../ui/DebugTag';

export default function AgenteChatBlock() {
  // En pantallas chicas el panel se abre a pantalla completa desde un boton flotante.
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-primary agente-toggle" onClick={() => setAbierto(true)} title="Abrir el Secretario">
        💬 Secretario
      </button>
      <aside className={`agente-panel ${abierto ? 'agente-abierto' : ''}`}>
        <DebugTag nombre="AgenteChatBlock" />
        <ChatAgente perfil="secretario" titulo="El Secretario" onCerrarMobile={() => setAbierto(false)} />
      </aside>
    </>
  );
}
