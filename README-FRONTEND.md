<!--
nombre: README-FRONTEND.md
ruta: bookos/frontend/README-FRONTEND.md
descripcion: como levantar y probar el frontend de BookOS (React + Vite + Tailwind).
-->

# BookOS — Frontend (OS)

React + Vite + Tailwind. Homogeneidad total, todo en modales, **cambiar de pagina no borra trabajo**.

## Instalacion

```bash
npm install
npm run dev   # http://localhost:5174 (proxy /api -> backend 3002)
```

## Estructura

```
src/
  App.jsx            shell: login + navbar (menus por flujo) + layout contenido/Secretario
  AppContext.jsx     contexto de pantalla inyectado al agente
  api/               axiosClient (JWT + envelope) + modulos por dominio
  blocks/            AgenteChatBlock · ManualBlock · CargarDocumentoBlock · BuscadorArticuloBlock
  pages/             25 paginas: Catalogo, Referencias, Ventas (POS/historial/periodo), Compras,
                     Remitos, Caja, CtaCte, Consigna, Inventario, Clientes, Proveedores,
                     Transportes, Mayorista, Newsletter, Usuarios, Parametros, Empresa, Config,
                     Desarrollo y el grupo Kernel (Salud, Propuestas, Pesos, Logs, Cola, Memoria)
  ui/                Modal, Table, Paginador, Toggle, Input, DebugTag, Navbar, MermaidDiagram
  hooks/             useAgenteStream (SSE) · usePersistentWork (borradores)
  styles/globals.css UNICO lugar para modificar la identidad visual
  utils/             desarrolloPreguntas.js (instalador extensible)
```

## Reglas del OS

- **Todo modal**: crear/editar nunca navega a otra pagina.
- **Nada borra trabajo**: carrito de venta y borrador de remito persisten en localStorage (`usePersistentWork`).
- **El Secretario es contextual**: al ver un remito/cliente, su JSON se inyecta solo.
- **Estilos en un solo lugar**: `src/styles/globals.css` (colores, tarjetas, modales, panel del agente).
- **debug_mode**: `VITE_DEBUG_MODE=true` muestra marca de agua y DebugTag por componente.
- **El stock no se edita desde el catalogo**: el modal de articulos NO manda campos de stock
  (el backend rechaza el payload si vienen); el stock se ajusta por inventario/transferencia
  (ledger) y en el modal solo se informa el firme actual. `Ver` abre el kardex de movimientos.

## Flujo de prueba PoC

1. Login `admin@bookos.local` / `admin123`.
2. Catalogo: probar "Busqueda semantica" (ej. `ciencia ficcion`).
3. Ventas: buscar EAN, agregar al carrito, elegir comprobante (FACTURA_B/C/PEDIDO/PRESUPUESTO)
   y metodo de pago, cobrar. Reglas bookerp: solo factura descuenta stock; pedido/presupuesto
   exigen cliente; CTA_CTE no aplica a consumidor final. El historial permite **Ver** cada
   documento y **Anular** (restaura stock). En cada detalle: "Preguntar al Secretario".
4. Remitos: cargar items, "Cruzar faltantes". "Ver" abre el detalle del documento e
   inyecta su JSON al Secretario.
5. Secretario: `$autor X`, `$editoriales`, `$faltantes_remito ID`, `$ayuda`, o lenguaje
   natural ("armame un remito con los libros de stock 1", "cruzá el remito 2 y decime que falta").
   Con `DEEPSEEK_API_KEY` el agente decide herramientas por function calling y redacta en streaming.
6. Config: toggles + propuestas del Secretario (aprobar cristaliza un marcador).

## Tramos recientes (E7.9)

- **Buscador de articulos (F1)**: `BuscadorArticuloBlock` busca por titulo, autor, editorial o
  EAN13 en un solo campo (usa `/api/catalogo/f7`) y devuelve renglon listo para el carrito.
- **Paginado (F2)**: `ui/Paginador` (page/limite/total + saltos) aplicado a Ventas (historial),
  Compras (historial), Remitos y Catalogo; el resto de las tablas queda en la lista de pendientes.
- **Menu por flujo (F3)**: navbar agrupada (Operacion, Comercial, Maestros, Kernel) y nueva
  `VentasPeriodoPage` (comprobantes del dia/periodo con totales); el remito es unico (no hay dos
  formas de hacer un remito).
- **Traer comprobante entre modulos (F5)**: `CargarDocumentoBlock` permite cargar renglones de un
  remito/pedido/compra existente en Compras y Remitos (ver seccion del backend).
- **Manual en 4 solapas**: boton **Manual** en la navbar abre `ManualBlock` (Uso clasico,
  Secretario, Kernel, Flujos con 12 diagramas mermaid renderizados por `MermaidDiagram`).
- **Logs con detalle**: en la page Logs, **cada fila abre un modal** con los campos del registro
  uno por linea (fecha, modulo, accion, ruta, proveedor, modelo, ms, tokens, outcome, usuario) y
  los textos largos (prompt, salida, herramientas) en bloques `<pre>`.
- **Modal de articulos ajustado (F6.1)**: la edicion **ya persiste** (antes fallaba siempre por
  mandar campos de stock) y se sumaron los campos que el backend ya soportaba sin UI (Autor 2/3,
  Materia/Materia 2 con sugerencias del maestro, Costo) + boton **Ver** con el kardex del articulo.
