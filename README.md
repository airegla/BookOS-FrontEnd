# BOOK(RM) — Frontend

Interfaz web de BOOK(RM) para la librería **El Maltés**. React 18 + Vite 5, con estilos inline y **versión responsive** (navegación inferior en mobile).

## Stack

- React 18 + Vite 5 (ES Modules)
- Sin router: navegación por pestañas (estado en `App.jsx`)
- Estilos inline + `src/styles/app.css` (ajustes globales y mobile)
- API client en `src/api/api.js` (JWT `Authorization: Bearer` + `X-API-Key`)

## Requisitos

- Node.js 18+
- Backend corriendo (default `http://localhost:3000`)
- Variables de entorno en `.env` (ver `.env.example`)

## Instalación y arranque

```bash
cd frontend
npm install
cp .env.example .env          # y completá los valores
npm run dev                   # vite → http://localhost:5173
```

Build de producción:

```bash
npm run build                 # genera dist/
```

## Variables de entorno (`.env`)

| Variable | Uso |
|----------|-----|
| `VITE_API_URL` | Base de la API (default `http://localhost:3000/api`) |
| `VITE_API_KEY` | API key compartida (mismo valor que `API_KEY` del backend) |

## Pantallas / pestañas

Todas tras el login (JWT). Roles `admin`/`vendedor`.

| Pestaña | Componente | Descripción |
|---------|------------|-------------|
| 🤖 Asistente | `AsistenteBlock` | Recomendaciones por contenido con stock por local (01/02), precio y tapa. **30 candidatos paginados (15/pág)**; en venta, top 17 al LLM. Selector de ruta (Auto/Contenido/Venta). Modo contenido: digesto completo y búsqueda por autor. "A Pedir" y "Fuera de catálogo" como secciones aparte |
| 📦 Pedidos | `PedidoBlock` | Alta rápida con cantidad/observaciones, cambio de estado, edición de EAN13/cant/obs (Pendiente), badge `Intentos: X/3` |
| 👥 Clientes | `ClienteBlock` | CRUD, temáticas (SearchMultiSelect), historial, notas de preferencias y anti-duplicados (mail/teléfono únicos) |
| 🏢 Proveedores | `ProveedoresBlock` | CRUD (id=1 protegido) |
| 📨 Radar | `RadarBlock` | Seguimiento por estado con secciones apiladas en mobile y paginador por estado + export CSV + botones de acción (despachar / verificar / notificar ingresos / notificar agotados) |
| 📚 Propuestas | `PropuestasBlock` | Propuestas personalizadas (generar/previsualizar/enviar/export) |
| ⚙️ Config | `ConfigBlock` | Config de empresa (modal) + **toggles** de comportamiento (ON/OFF, valores, volver a default) |
| 👤 Usuarios | `UsuariosBlock` | CRUD de usuarios (solo admin) |
| 📋 Logs | `LogsBlock` | Log de actividad (solo admin): ver y limpiar |
| 🧠 Auditoría LLM | `LlmAuditBlock` | Auditoría de llamadas LLM (solo admin): filtro por módulo, detalle de prompt/respuesta, modelo y latencia, y **modal con consulta + listado de libros + descarga CSV** |
| 📖 Manual | `ManualBlock` | Manual de uso de Empatía integrado: modos, lenguaje natural y **marcadores `$`** (con copiar al portapapeles) |

Todas las listas tienen **buscador + paginador**; los selects con muchas opciones tienen **búsqueda integrada**.

## Versión mobile

En pantallas ≤640px:

- **Navegación inferior fija**: Asistente · Pedidos · Clientes · Proveed. · **⋯ Más** (panel con Radar, Propuestas, Config, Usuarios/Logs/Auditoría LLM/Catálogo para admin).
- Las listas de **Clientes** y **Pedidos** se muestran como **tarjetas** (no tablas).
- El **Asistente** apila las dos columnas (En Stock / A Pedir) en una sola.
- El **Radar** apila las secciones (Pendiente → Solicitado → Ingresado → Notificado) una debajo de la otra, para no romper el ancho en el celular; cada sección tiene su paginador.
- Las tablas restantes tienen scroll horizontal.
- Detección de viewport con `useIsMobile` (`matchMedia`).

## Árbol de archivos

```
frontend/
├── .env                      # VITE_API_URL / VITE_API_KEY
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── src/
    ├── App.jsx               # Raíz: login + navegación (tabs desktop / bottom nav mobile)
    ├── main.jsx
    ├── constants.js          # ESTADOS_PEDIDO
    ├── api/
    │   └── api.js            # Wrapper fetch (JWT / X-API-Key) + getTapaUrl
    ├── components/
    │   ├── Login.jsx         # Pantalla de login
    │   ├── blocks/
    │   │   ├── AsistenteBlock.jsx
    │   │   ├── CatalogoBlock.jsx
    │   │   ├── ClienteBlock.jsx
    │   │   ├── ConfigBlock.jsx
    │   │   ├── LlmAuditBlock.jsx
    │   │   ├── LogsBlock.jsx
    │   │   ├── ManualBlock.jsx
    │   │   ├── PedidoBlock.jsx
    │   │   ├── PropuestasBlock.jsx
    │   │   ├── ProveedoresBlock.jsx
    │   │   ├── RadarBlock.jsx
    │   │   └── UsuariosBlock.jsx
    │   └── ui/
    │       ├── Pagination.jsx
    │       ├── RecomendacionCard.jsx
    │       ├── SearchMultiSelect.jsx
    │       └── SearchSelect.jsx
    ├── hooks/
    │   ├── useAsistente.js
    │   ├── useIsMobile.js
    │   └── usePagination.js
    ├── pages/                 # Vacío (reservado)
    ├── styles/
    │   └── app.css           # Estilos globales + ajustes mobile
    └── utils/                 # Vacío (reservado)
```

## Notas

- El frontend **no usa router**: la navegación es un estado de pestaña en `App.jsx`.
- `ConfigBlock` incluye **toggles en caliente** (`app_config`): cambian el comportamiento del backend sin reiniciar y sin tocar el `.env`.
- `ClienteBlock` valida contactos: exige **al menos email o teléfono** y evita **duplicados** (mismo mail o mismo celular en otro cliente); además guarda **notas de preferencias** para el perfilado.
- El **Radar** tiene botones de acción manual (despachar pendientes a proveedores, verificar ingresos, notificar ingresos consolidado, notificar agotados) y secciones con paginador.
- La pestaña **🧠 Auditoría LLM** (solo admin) muestra prompt/respuesta, modelo/proveedor reales y latencia de cada llamada.
- La pestaña **📖 Manual** muestra el manual de uso de Empatía integrado (modos, lenguaje natural y **marcadores `$`**), con botones para copiar comandos al portapapeles.
- La búsqueda del Asistente **no se pierde al cambiar de pestaña**: `AsistenteBlock` se mantiene montado (se oculta con `display:none`).
- El stock se muestra **diferenciado por local** (Local 01 / Local 02); el total solo suma los locales operativos.
- La tapa de cada libro se carga desde `GET /api/tapas/:ean13` (endpoint público del backend).
- El precio y la tapa de las fichas vienen del backend (enriquecidos con la base legacy).
