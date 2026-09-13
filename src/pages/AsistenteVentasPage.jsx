// BookOS - AsistenteVentasPage.jsx
// ruta: bookos/frontend/src/pages/AsistenteVentasPage.jsx
// descripcion: el Asistente de VENTAS: chat de mostrador embebido como pagina (perfil 'ventas'
//   del agente). Comparte motor y kernel con el Secretario, con semilla y herramientas acotadas
//   a la venta (catalogo, clientes, informes, pedidos y archivos).

import ChatAgente from '../blocks/ChatAgente';
import DebugTag from '../ui/DebugTag';

export default function AsistenteVentasPage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 130px)' }}>
      <DebugTag nombre="AsistenteVentasPage" />
      <div className="card overflow-hidden flex flex-col" style={{ flex: 1, minHeight: 0 }}>
        <ChatAgente perfil="ventas" titulo="Asistente de ventas" />
      </div>
    </div>
  );
}
