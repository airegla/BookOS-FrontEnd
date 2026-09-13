<!--
nombre: README-FRONTEND.md
ruta: bookos/frontend/README-FRONTEND.md
descripcion: como levantar y probar el frontend de BookOS (React + Vite + Tailwind).
-->

# BookOS — Frontend (OS)

> **Documento técnico canónico del frontend.** El `README.md` del repositorio es solo la presentación
> para GitHub; la referencia de instalación, estructura, reglas del OS y tramos vive acá.

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
- **Estilos en un solo lugar**: `src/styles/globals.css` (colores, tarjetas, modales, panel del
  agente, layout, labels `.field-label` / `.form-grid`, tablas). `app.css` solo ajustes mobile.
- **Layout OS (3 zonas fijas)**: `bookos-app` ocupa `100dvh`; el navbar y el panel del Secretario
  no scrollean. La unica barra de scroll es la del `main` (`.bookos-main`). El chat tiene
  cabecera fija, mensajes con scroll (`.agente-mensajes`) y entrada siempre visible
  (`.agente-input-wrap`). En <=1024px el panel se abre a pantalla completa con el boton flotante.
- **Modal con pie visible**: `Modal.jsx` usa `modal-header` / `modal-body` / `modal-footer`;
  scrollea solo el cuerpo, el titulo y los botones (Guardar/Cancelar) quedan siempre a la vista.
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
- **Paginado (F2)**: `ui/Paginador` (page/limite/total + saltos) aplicado a **Ventas, Compras,
  Remitos, Catalogo, Referencias (autores/materias/editoriales), Clientes, Proveedores, CtaCte,
  Caja, Logs del kernel, Inventario y Newsletter**. Los listados ya no cargan todo de un golpe:
  el backend devuelve `{page, limit, total, totalPages}` y la page pide solo la pagina visible.
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
- **Clientes ajustado al bookerp (F6.2)**: el modal de alta/edicion paso de 2 a **14 campos**
  (fantasia, CUIT, condicion IVA con sugerencias, telefono, email, direccion, localidad, descuento
  fijo %, plazo de pago, mayorista, activo, observaciones) y el boton **Ver** abre la **ficha +
  cuenta corriente** (saldo actual y ultimos 10 movimientos con debe/haber/saldo/vencimiento).
- **Compras "Ver" funciona (F6.3)**: el boton abre el **detalle de la compra** (proveedor, fecha
  de emision, nro, estado, stock afectado, descuento global, renglones con precio/descuento/subtotal
  y total) con **Exportar CSV**, **Anular** (revierte stock) y contexto inyectado al Secretario.
  `comprasApi.obtener(id)` consume `GET /api/compras/:id`.
- **Proveedores ajustado (F6.4)**: modal de 12 campos (razon social, fantasia, codigo interno,
  CUIT, telefono, email, **bonificacion %**, **transporte asignado**, direccion, localidad, activo,
  observaciones) y el boton **Ver** abre la **ficha + cuenta corriente** (saldo con la nota
  "positivo = le debemos" y ultimos 10 movimientos).
- **Alta al vuelo de maestros (F6.5)**: el modal de articulos avisa que los autores/materias
  inexistentes se crean solos al guardar (backend `resolverAutor`/`resolverMateria`/`resolverEditorial`)
  y **completa la editorial por la raiz del ISBN** al salir del campo (como el bookerp).
- **Informe del cierre Z (F6.6)**: el historial de cierres tiene **Ver informe**: KPIs del cierre
  (total ventas, efectivo teorico/declarado, diferencia, tarjetas, transferencias, cheques,
  cantidad de movimientos) + **todos los movimientos del turno** y **Exportar CSV**.
- **Editar medio de pago (F6.6)**: en los movimientos del turno, el boton **Metodo** abre el modal
  para cambiar el medio (EFECTIVO/TARJETA/TRANSFERENCIA/CHEQUE). La regla es la elegida por el
  vectorHumano: **solo movimientos del turno abierto**; un movimiento de un cierre Z ya cerrado
  devuelve error y no se puede tocar.
- **Usuarios (F6.7)**: **Editar** (nombre, rol, activo) y **Reset pass** (nueva contrasena +
  confirmacion, se guarda hasheada). Probado end-to-end con un usuario de prueba: el login con la
  clave nueva dio 200 y el usuario se elimino despues.
- **Ventas (F6.8)**: el badge del historial y el detalle usan `tipoComprobante` (antes mostraba
  `undefined` y el detalle crasheaba por leer `articulos`); el detalle ahora pide `GET /ventas/:id`
  y muestra renglones, cliente y **formas de pago registradas**; los **pendientes** se reconstruyen
  con los items + codigo del articulo; el cobro tiene **Monto recibido** y **Vuelto** calculado.
- **Empresa (F6.10)**: ficha completa — IIBB, inicio de actividades, direccion, localidad,
  provincia, telefono, email de contacto y sitio web (van en `datosFiscales`, sin migracion).
  Logo pendiente de una subida de archivos dedicada.
- **Inventario FIFE (F6.10)**: el modal de ajuste ofrece los **tipos** del bookerp (alta/baja firme,
  alta/baja consigna con su original, firme↔consigna) con la cantidad positiva y el calculo visible
  ("Aplica: firme +2 · consigna −2 · original +0"), mas el modo **personalizado** con deltas a mano.
- **Seña en pedidos (F6.8b)**: en PEDIDO/PRESUPUESTO la suma de pagos puede ser **menor** al total:
  lo cobrado es la seña (entra a caja como "SENA PEDIDO #n") y el modal muestra el **saldo pendiente**;
  la suma nunca puede superar el total.
- **Categorías de caja (F6.9)**: solapa nueva en Parámetros (tabla `parametros` por tipo) y el
  concepto del movimiento manual de caja las sugiere con un datalist. No cambia el esquema de caja.
- **Historial de ajustes de inventario (F6.10b)**: seccion nueva en Inventario con el listado de
  documentos AJUSTE/REVERSO (numero, fecha, articulo, deltas, estado), **Ver** con motivo y stock
  previo, y **Anular (revierte stock)**: aplica los deltas invertidos y deja un documento REVERSO
  con `referenciaId`; el original queda ANULADO (inmutable a partir de ahi).
- **Formato de comprobantes (F4)**: la cabecera de compra tiene **nro de comprobante, fecha de
  emision, vencimiento, descuento global % y observaciones** (los precargados son fecha de hoy y
  FIRME); el detalle permite **descuento por linea %** con subtotal visible por renglon y un pie con
  Subtotal / Descuento / Total en vivo. Ventas y Remitos ya tenian su formato completo
  (cliente/tipo/descuento global y proveedor/nro/fecha/observaciones respectivamente).
- **Chat: ayuda y listados de marcadores (E7.9b)**: el render del envelope suma `ayuda`,
  `editoriales` y `materias` a las claves de lista, muestra `$comando` + su descripcion y corta a
  30 items en la ayuda (8 en los listados). Ventas/Presupuestos ya estaban.
- **Layout de 3 zonas + modales con pie fijo (2026-09-13)**: la ventana no scrollea
  (`.bookos-app` ocupa `100dvh`; el navbar y el panel del Secretario quedan fijos): scrollea solo el
  `main`. El chat tiene cabecera y entrada fijas (solo los mensajes scrollean) y los modales usan
  `modal-header/body/footer`, asi que **Guardar/Cancelar quedan siempre visibles**. Labels
  (`.field-label`), grillas de formulario (`.form-grid`) y el contraste de textos secundarios
  (`--muted` a `#6e6a62`, AA) se centralizaron en `globals.css`; los `th` de tabla quedaron sticky.
- **Propuestas sin cuerpo + clasificacion (2026-09-13)**: el panel de Propuestas marca las que no
  traen cuerpo estructurado (no aprobables) con el motivo visible y el boton **Aprobar**
  deshabilitado; el detalle vacio ya no muestra un `null`. El agente suma `materias_proponer`
  (propone materia para titulos sin materia por vecinos semanticos, exportable a CSV) y
  `materias_asignar` (asignacion en lote con preview y confirmacion).
- **CRM + Asistente de ventas (doc 06, E-BR1)**: menu nuevo **CRM** (Asistente, Pedidos, Radar,
  Propuestas, Campañas, Config CRM) y el chat del agente quedo **extraido a `blocks/ChatAgente.jsx`**
  (reutilizable por perfil): el panel lateral del Secretario y la pagina **Asistente de ventas**
  comparten el mismo componente (mismo motor, misma conversacion persistente; cambia el perfil
  `secretario`/`ventas` y el texto de arranque, con las tarjetas de candidatos y "Agregar a la
  venta" iguales). Las paginas Pedidos/Radar/Propuestas/Campañas/Config CRM indican su etapa del
  plan (`E-BR2`, `E-BR4`, `E-BR1 parte 2`). La vista del kernel paso a llamarse **Propuestas
  Kernel** para no chocar con la del CRM.
