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
  App.jsx            shell: login + navbar + layout contenido/Secretario
  AppContext.jsx     contexto de pantalla inyectado al agente
  api/               axiosClient (JWT + envelope) + modulos por dominio
  blocks/            AgenteChatBlock (chat lateral persistente)
  pages/             Catalogo | Ventas | Remitos | Config | Empresa | Usuarios | Desarrollo
  ui/                Modal, Table, Toggle, Input, DebugTag, Navbar
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
