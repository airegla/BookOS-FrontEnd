// BookOS - AgenteChatBlock.jsx
// ruta: bookos/frontend/src/blocks/AgenteChatBlock.jsx
// descripcion: VENTANA de chat del agente, reutilizable por LADO y PERFIL. El Secretario (perfil
//   'secretario', lado derecho) y el Vendedor (perfil 'ventas', lado izquierdo: ex pagina del CRM)
//   son la MISMA pieza: en escritorio el aside es una columna del layout; en pantallas chicas se
//   abre a pantalla completa desde su boton flotante.

import { useState } from 'react';
import ChatAgente from './ChatAgente';
import DebugTag from '../ui/DebugTag';

export default function AgenteChatBlock({
  abierto = true,
  onAlternar = null,
  perfil = 'secretario',
  titulo = 'El Secretario',
  lado = 'der',
  etiquetaBoton = '💬 Secretario',
  extras = null,
  claveArranque = null,
  arranqueDefault = null,
}) {
  const [abiertoMobile, setAbiertoMobile] = useState(false);
  const plegable = typeof onAlternar === 'function';
  const visible = abierto || abiertoMobile;
  const claseLado = lado === 'izq' ? ' izquierda' : '';
  const claseBoton = lado === 'izq' ? 'asistente' : 'agente';
  // Preferencia de arranque por VENTANA (clave + default segun el lado): el mismo par lo usa App
  // para decidir con que estado abre. Se puede cambiar desde el boton de la cabecera del chat.
  const claveArranqueFinal = claveArranque || (lado === 'izq' ? 'bookos_arranque_vendedor' : 'bookos_arranque_secretario');
  const arranqueDefaultFinal = arranqueDefault || (lado === 'izq' ? 'minimizado' : 'expandido');

  // En pantallas chicas el panel se muestra como CHAT a pantalla completa: `abiertoMobile` es la
  // puerta propia del telefono, porque el estado de escritorio (`abierto`) puede estar en false
  // (el layout ocupa todo el ancho) y antes el boton flotante no hacia nada en ese caso: el
  // operario tocaba el boton y el panel no volvia a aparecer (se sentia colgado).
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
      <button type="button" className={`btn btn-primary ${claseBoton}-toggle`} onClick={abrirMobile} title={`Abrir ${titulo}`}>
        {etiquetaBoton}
      </button>
      {!abierto && !abiertoMobile && plegable && (
        <button type="button" className={`btn ${claseBoton}-reabrir`} onClick={onAlternar} title={`Abrir ${titulo}`}>
          {etiquetaBoton}
        </button>
      )}
      {visible && (
        <aside className={`agente-panel${claseLado} ${plegable ? 'plegable' : ''} ${abiertoMobile ? 'agente-abierto' : ''}`}>
          <DebugTag nombre={lado === 'izq' ? 'AsistenteVentasBlock' : 'AgenteChatBlock'} />
          {extras}
          <ChatAgente perfil={perfil} titulo={titulo} onCerrarMobile={cerrar} claveArranque={claveArranqueFinal} arranqueDefault={arranqueDefaultFinal} />
        </aside>
      )}
    </>
  );
}
