// BookOS - AsistenteVentasPage.jsx
// ruta: bookos/frontend/src/pages/AsistenteVentasPage.jsx
// descripcion: la pagina del ASISTENTE DE VENTAS (perfil 'ventas' del agente). No es un chat
//   generico duplicado: es el mostrador. Encabezado propio, acciones rapidas de libreria, los
//   marcadores a la vista y el cliente activo como contexto, con el chat de ventas adentro.
//   El panel del Secretario viene cerrado en esta vista (se abre desde su boton).

import { useState } from 'react';
import ChatAgente from '../blocks/ChatAgente';
import DebugTag from '../ui/DebugTag';
import { useAppContext } from '../AppContext';

// Pedidos tipicos del mostrador: se mandan tal cual al asistente (cero tipeo).
const ACCIONES = [
  { etiqueta: 'Recomendar para regalar', pedido: 'Recomendame entre 5 y 8 titulos para regalar, combinando novedades y fondo, con un motivo breve para cada uno.' },
  { etiqueta: 'Novedades que entraron', pedido: 'Que novedades ingresaron en las ultimas semanas? Mostrame primero las mas vendibles.' },
  { etiqueta: 'Buscar un titulo', pedido: 'Busco un titulo puntual: decime autor, editorial, precio y stock.' },
  { etiqueta: 'Pedidos pendientes', pedido: 'Que pedidos de clientes estan pendientes de reposicion y para que proveedor irian?' },
  { etiqueta: 'Que le ofrezco a este cliente', pedido: 'Con el cliente activo a la vista, armame una recomendacion con titulos en stock y el motivo de cada uno.' },
];

// Marcadores del perfil de ventas (doc 06): viven en la semilla del agente; aca se muestran para
// usarlos sin memorizarlos. Se copian al portapapeles (se completan en el chat); $ayuda se manda.
const MARCADORES = [
  { comando: '$autor X', detalle: 'por autor' },
  { comando: '$titulo X', detalle: 'por titulo' },
  { comando: '$editorial X', detalle: 'por editorial' },
  { comando: '$materia X', detalle: 'por materia' },
  { comando: '$precio MIN MAX', detalle: 'por rango de precio' },
  { comando: '$sinopsis X', detalle: 'por lo que dice el libro' },
  { comando: '$ayuda', detalle: 'todos los comandos' },
];

export default function AsistenteVentasPage() {
  const { contextoActual, clienteIdActivo, pedirConsulta } = useAppContext();
  const [copiado, setCopiado] = useState('');
  const cliente = contextoActual && contextoActual.nombre ? contextoActual.nombre : null;
  const hayCliente = Boolean(cliente || clienteIdActivo);

  const usarMarcador = async (m) => {
    if (m.comando === '$ayuda') {
      pedirConsulta('$ayuda');
      return;
    }
    try {
      await navigator.clipboard.writeText(m.comando.replace(' X', ' '));
      setCopiado(m.comando);
      setTimeout(() => setCopiado(''), 2500);
    } catch (e) {
      setCopiado('');
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 130px)' }}>
      <DebugTag nombre="AsistenteVentasPage" />
      <div className="card overflow-hidden flex flex-col" style={{ flex: 1, minHeight: 0 }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold">Asistente de ventas</h2>
            <span className="agente-badge">recomienda y vende sobre el catalogo real</span>
            {hayCliente
              ? <span className="agente-badge" style={{ color: '#15803d' }}>cliente: {cliente || `#${clienteIdActivo}`}</span>
              : <span className="text-xs text-muted">sin cliente activo: mira una ficha para fijarlo</span>}
            <span className="text-xs text-muted ml-auto">F6 busqueda tecnica · F7 buscador semantico</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Lo tecnico del sistema (informes, stock, configuracion) lo ve el Secretario: elegi su panel a la
            derecha. Aca se atiende el mostrador: recomendar, buscar, pedir y facturar.
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {ACCIONES.map((a) => (
              <button
                key={a.etiqueta}
                type="button"
                className="btn btn-ghost text-xs"
                disabled={a.etiqueta === 'Que le ofrezco a este cliente' && !hayCliente}
                onClick={() => pedirConsulta(a.pedido)}
                title={a.pedido}
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
          <div className="lista-chips mt-2">
            {MARCADORES.map((m) => (
              <button
                key={m.comando}
                type="button"
                className="chip-tema"
                title={`${m.detalle}${m.comando === '$ayuda' ? '' : ' · se copia y se completa en el chat'}`}
                onClick={() => usarMarcador(m)}
              >
                {copiado === m.comando ? 'copiado ✓' : m.comando}
              </button>
            ))}
          </div>
        </div>
        {/* El chat de ventas vive centrado, con ancho de lectura comodo (500px). El centrado es
            respecto del AREA disponible: si se abre el panel del Secretario, el area se angosta
            y el block se reacomoda solo (el margen se recalcula). */}
        <div className="flex flex-col" style={{ flex: 1, minHeight: 0, alignItems: 'center' }}>
          <div className="flex flex-col" style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 500 }}>
            <ChatAgente perfil="ventas" titulo="Asistente de ventas" />
          </div>
        </div>
      </div>
    </div>
  );
}
