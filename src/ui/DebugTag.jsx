// BookOS - DebugTag.jsx
// ruta: bookos/frontend/src/ui/DebugTag.jsx
// descripcion: marca de identificacion de componente cuando debug_mode esta
//   activo (VITE_DEBUG_MODE). debug_mode=false -> no renderiza nada.

export default function DebugTag({ nombre }) {
  if (import.meta.env.VITE_DEBUG_MODE !== 'true') return null;
  return (
    <span className="agente-badge" title={`componente: ${nombre}`}>
      {nombre}
    </span>
  );
}
