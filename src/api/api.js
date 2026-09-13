// BookOS - api.js
// ruta: bookos/frontend/src/api/api.js
// descripcion: modulos de acceso a cada dominio del backend.

import axiosClient from './axiosClient';

export const authApi = {
  login: (email, password) => axiosClient.post('/auth/login', { email, password }),
  me: () => axiosClient.get('/auth/me'),
};

export const catalogoApi = {
  listar: (params = {}) => axiosClient.get('/catalogo', { params }),
  buscar: (q, limite = 30) => axiosClient.get('/catalogo/buscar', { params: { q, limite } }),
  obtenerPorEan: (ean13) => axiosClient.get(`/catalogo/ean/${ean13}`),
  autocomplete: (q) => axiosClient.get('/catalogo/autocomplete', { params: { q } }),
  f7: (q) => axiosClient.get('/catalogo/f7', { params: { q } }),
  buscarExacto: (codigo) => axiosClient.get('/catalogo/buscarExacto', { params: { codigo } }),
  kardex: (id) => axiosClient.get(`/catalogo/${id}/kardex`),
  crear: (datos) => axiosClient.post('/catalogo', datos),
  actualizar: (id, datos) => axiosClient.put(`/catalogo/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/catalogo/${id}`),
};

export const autoresApi = {
  listar: (params = {}) => axiosClient.get('/autores', { params }),
  crear: (datos) => axiosClient.post('/autores', datos),
  actualizar: (id, datos) => axiosClient.put(`/autores/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/autores/${id}`),
};

export const materiasApi = {
  listar: (params = {}) => axiosClient.get('/materias', { params }),
  crear: (datos) => axiosClient.post('/materias', datos),
  actualizar: (id, datos) => axiosClient.put(`/materias/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/materias/${id}`),
};

export const editorialesApi = {
  listar: (params = {}) => axiosClient.get('/editoriales', { params }),
  buscar: (q) => axiosClient.get('/editoriales/buscar', { params: { q } }),
  resolver: (isbn) => axiosClient.get('/editoriales/resolver', { params: { isbn } }),
  crear: (datos) => axiosClient.post('/editoriales', datos),
  actualizar: (id, datos) => axiosClient.put(`/editoriales/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/editoriales/${id}`),
};

export const ventasApi = {
  procesar: (payload) => axiosClient.post('/ventas/procesar', payload),
  listar: (params = {}) => axiosClient.get('/ventas', { params }),
  obtener: (id) => axiosClient.get(`/ventas/${id}`),
  anular: (id) => axiosClient.post(`/ventas/${id}/anular`),
  pendientes: () => axiosClient.get('/ventas/pendientes'),
};

export const remitosApi = {
  crear: (payload) => axiosClient.post('/remitos', payload),
  cruzar: (id) => axiosClient.post(`/remitos/${id}/cruzar`),
  confirmar: (id) => axiosClient.post(`/remitos/${id}/confirmar`),
  anular: (id) => axiosClient.post(`/remitos/${id}/anular`),
  listar: (params = {}) => axiosClient.get('/remitos', { params }),
  obtener: (id) => axiosClient.get(`/remitos/${id}`),
};

export const cajaApi = {
  actual: () => axiosClient.get('/caja/actual'),
  movimiento: (datos) => axiosClient.post('/caja/manual', datos),
  editarMetodo: (id, metodoPago) => axiosClient.put(`/caja/movimientos/${id}/metodo`, { metodoPago }),
  cerrar: (datos) => axiosClient.post('/caja/cerrar', datos),
  cierres: (params = {}) => axiosClient.get('/caja/cierres', { params }),
  detalleCierre: (id) => axiosClient.get(`/caja/cierres/${id}`),
};

export const proveedoresApi = {
  listar: (params = {}) => axiosClient.get('/proveedores', { params }),
  crear: (datos) => axiosClient.post('/proveedores', datos),
  actualizar: (id, datos) => axiosClient.put(`/proveedores/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/proveedores/${id}`),
};

export const comprasApi = {
  crear: (payload) => axiosClient.post('/compras', payload),
  anular: (id) => axiosClient.post(`/compras/${id}/anular`),
  listar: (params = {}) => axiosClient.get('/compras', { params }),
  obtener: (id) => axiosClient.get(`/compras/${id}`),
};

export const pedidosProveedorApi = {
  crear: (payload) => axiosClient.post('/pedidos-proveedor', payload),
  listar: (params = {}) => axiosClient.get('/pedidos-proveedor', { params }),
  obtener: (id) => axiosClient.get(`/pedidos-proveedor/${id}`),
  anular: (id) => axiosClient.post(`/pedidos-proveedor/${id}/anular`),
  confirmar: (id, payload = {}) => axiosClient.post(`/pedidos-proveedor/${id}/confirmar`, payload),
};

export const clientesApi = {
  listar: (params = {}) => axiosClient.get('/clientes', { params }),
  crear: (datos) => axiosClient.post('/clientes', datos),
  actualizar: (id, datos) => axiosClient.put(`/clientes/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/clientes/${id}`),
  interacciones: (id) => axiosClient.get(`/clientes/${id}/interacciones`),
};

export const configApi = {
  obtener: () => axiosClient.get('/config'),
  setToggle: (clave, valor) => axiosClient.put('/config', { clave, valor }),
};

export const empresaApi = {
  obtener: () => axiosClient.get('/empresa'),
  actualizar: (datos) => axiosClient.put('/empresa', datos),
};

export const usuariosApi = {
  listar: () => axiosClient.get('/usuarios'),
  crear: (datos) => axiosClient.post('/usuarios', datos),
  actualizar: (id, datos) => axiosClient.put(`/usuarios/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/usuarios/${id}`),
};

export const propuestasApi = {
  listar: (soloPendientes = false) => axiosClient.get('/propuestas', { params: { soloPendientes } }),
  aprobar: (id) => axiosClient.post(`/propuestas/${id}/aprobar`),
  rechazar: (id) => axiosClient.post(`/propuestas/${id}/rechazar`),
};

// Kernel (E7): paneles de Salud, Propuestas, Pesos, Logs, Cola y Memoria.
export const kernelApi = {
  estado: () => axiosClient.get('/kernel/estado'),
  salud: (limit = 30) => axiosClient.get('/kernel/salud', { params: { limit } }),
  saludCorrer: () => axiosClient.post('/kernel/salud/correr'),
  pesos: () => axiosClient.get('/kernel/pesos'),
  pesosGuardar: (payload) => axiosClient.post('/kernel/pesos', payload),
  pesosActivar: (id) => axiosClient.post(`/kernel/pesos/${id}/activar`),
  banco: () => axiosClient.get('/kernel/banco'),
  bancoCorrer: (payload = {}) => axiosClient.post('/kernel/banco/correr', payload),
  cola: () => axiosClient.get('/kernel/cola'),
  logs: (params = {}) => axiosClient.get('/kernel/logs', { params }),
  registro: (params = {}) => axiosClient.get('/kernel/registro', { params }),
  registroDetalle: (id) => axiosClient.get(`/kernel/registro/${id}`),
  observaciones: (params = {}) => axiosClient.get('/kernel/observaciones', { params }),
  observacionesCorrer: (payload = {}) => axiosClient.post('/kernel/observaciones/correr', payload),
};

export const auditoriaApi = {
  ranking: (limite = 30) => axiosClient.get('/auditoria/ranking', { params: { limite } }),
  llm: (limite = 30) => axiosClient.get('/auditoria/llm', { params: { limite } }),
};

export const exportacionApi = {
  csv: (payload) => axiosClient.post('/exportacion/csv', payload),
  pdf: (payload) => axiosClient.post('/exportacion/pdf', payload),
};

export const ctaCteApi = {
  estadoCuenta: (params = {}) => axiosClient.get('/ctacte', { params }),
  registrarRecibo: (payload) => axiosClient.post('/ctacte/recibos', payload),
  anularRecibo: (movimientoId) => axiosClient.post(`/ctacte/recibos/${movimientoId}/anular`),
  observar: (payload) => axiosClient.post('/ctacte/observar', payload),
};

export const observacionesApi = {
  documento: (payload) => axiosClient.post('/observaciones/documento', payload),
  editorial: (id) => axiosClient.post('/observaciones/editorial', { id }),
  buscar: (consulta, limite = 5) => axiosClient.get('/observaciones/buscar', { params: { consulta, limite } }),
};

export const transportesApi = {
  listar: () => axiosClient.get('/transportes'),
  crear: (datos) => axiosClient.post('/transportes', datos),
  actualizar: (id, datos) => axiosClient.put(`/transportes/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/transportes/${id}`),
};

export const depositosApi = {
  listar: () => axiosClient.get('/depositos'),
  crear: (datos) => axiosClient.post('/depositos', datos),
  actualizar: (id, datos) => axiosClient.put(`/depositos/${id}`, datos),
  stock: (id) => axiosClient.get(`/depositos/${id}/stock`),
};

export const mayoristaApi = {
  resumen: () => axiosClient.get('/mayorista/resumen'),
  listarRemitos: (params = {}) => axiosClient.get('/mayorista/remitos', { params }),
  listarVentas: (params = {}) => axiosClient.get('/mayorista/ventas', { params }),
  listarDevoluciones: (params = {}) => axiosClient.get('/mayorista/devoluciones', { params }),
  listarSabanas: (params = {}) => axiosClient.get('/mayorista/sabanas', { params }),
  listarAjustes: (params = {}) => axiosClient.get('/mayorista/ajustes', { params }),
  crearRemito: (payload) => axiosClient.post('/mayorista/remitos', payload),
  crearVenta: (payload) => axiosClient.post('/mayorista/ventas', payload),
  crearDevolucion: (payload) => axiosClient.post('/mayorista/devoluciones', payload),
  crearSabana: (payload) => axiosClient.post('/mayorista/sabanas', payload),
  crearAjuste: (payload) => axiosClient.post('/mayorista/ajustes', payload),
};

export const consignaApi = {
  liquidaciones: (params = {}) => axiosClient.get('/liquidaciones', { params }),
  crearLiquidacion: (payload) => axiosClient.post('/liquidaciones', payload),
  obtenerLiquidacion: (id) => axiosClient.get(`/liquidaciones/${id}`),
  anularLiquidacion: (id) => axiosClient.post(`/liquidaciones/${id}/anular`),
  facturarLiquidacion: (id, compraId) => axiosClient.post(`/liquidaciones/${id}/facturar`, { compraId }),
  previsualizarConciliacion: (payload) => axiosClient.post('/conciliaciones/previsualizar', payload),
  guardarConciliacion: (payload) => axiosClient.post('/conciliaciones', payload),
  listarConciliaciones: () => axiosClient.get('/conciliaciones'),
  anularConciliacion: (id) => axiosClient.post(`/conciliaciones/${id}/anular`),
  registrarDevolucion: (payload) => axiosClient.post('/devoluciones', payload),
  listarDevoluciones: (params = {}) => axiosClient.get('/devoluciones', { params }),
  anularDevolucion: (id) => axiosClient.post(`/devoluciones/${id}/anular`),
};

export const inventarioApi = {
  stock: (params = {}) => axiosClient.get('/inventario', { params }),
  transferir: (payload) => axiosClient.post('/inventario/transferir', payload),
  ajustar: (payload) => axiosClient.post('/inventario/ajustar', payload),
  ajustes: (params = {}) => axiosClient.get('/inventario/ajustes', { params }),
  anularAjuste: (id) => axiosClient.post(`/inventario/ajustes/${id}/anular`),
};

export const newsletterApi = {
  listar: (params = {}) => axiosClient.get('/newsletter', { params }),
  suscribir: (payload) => axiosClient.post('/newsletter', payload),
  darDeBaja: (email) => axiosClient.delete(`/newsletter/${encodeURIComponent(email)}`),
};

export const parametrosApi = {
  metodosPago: () => axiosClient.get('/parametros/metodos-pago'),
  crearMetodoPago: (payload) => axiosClient.post('/parametros/metodos-pago', payload),
  actualizarMetodoPago: (id, payload) => axiosClient.put(`/parametros/metodos-pago/${id}`, payload),
  eliminarMetodoPago: (id) => axiosClient.delete(`/parametros/metodos-pago/${id}`),
  categoriasCaja: () => axiosClient.get('/parametros/categorias-caja'),
  crearCategoriaCaja: (payload) => axiosClient.post('/parametros/categorias-caja', payload),
  actualizarCategoriaCaja: (id, payload) => axiosClient.put(`/parametros/categorias-caja/${id}`, payload),
  eliminarCategoriaCaja: (id) => axiosClient.delete(`/parametros/categorias-caja/${id}`),
};

export const importadorApi = {
  importarCatalogo: (payload) => axiosClient.post('/importador/catalogo', payload),
  historial: () => axiosClient.get('/importador'),
};

export const manualApi = {
  obtener: () => axiosClient.get('/manual'),
};

export const agenteApi = {
  // SSE sobre POST: devuelve el body del fetch para leer el stream.
  // adjunto: { nombre, contenido } — el CSV crudo viaja como texto en el body.
  // conversacionId: continuidad del hilo (el backend lo crea y lo devuelve en el evento resultado).
  // perfil: 'secretario' (tecnico) | 'ventas' (asistente de mostrador) — mismo motor, otra semilla/tools.
  chat: (mensaje, contexto, adjunto, conversacionId = null, perfil = 'secretario') => {
    const token = localStorage.getItem('bookos_token');
    return fetch(`${import.meta.env.VITE_API_URL || '/api'}/agente/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mensaje, contexto, adjunto: adjunto || null, conversacionId: conversacionId || null, perfil }),
    });
  },
  // Confirmacion de una escritura destructiva: misma tool con confirmado:true, sin LLM.
  confirmar: (herramienta, argumentos, conversacionId = null) => axiosClient.post('/agente/confirmar', { herramienta, argumentos, conversacionId: conversacionId || null }),
  metricas: (dias = 30) => axiosClient.get('/agente/metricas', { params: { dias } }),
  memoria: (params = {}) => axiosClient.get('/agente/memoria', { params }),
  memoriaEliminar: (id) => axiosClient.delete(`/agente/memoria/${id}`),
  outcome: (payload) => axiosClient.post('/agente/outcome', payload),
  conversaciones: (params = {}) => axiosClient.get('/agente/conversaciones', { params }),
  conversacionTurnos: (id) => axiosClient.get(`/agente/conversaciones/${id}`),
  conversacionEliminar: (id) => axiosClient.delete(`/agente/conversaciones/${id}`),
};

// Documentos recuperables entre modulos (patron bookerp): cargar el contenido de un
// remito/pedido/compra dentro de otro comprobante.
export const documentosApi = {
  recuperables: (params = {}) => axiosClient.get('/documentos/recuperables', { params }),
  detalle: (tipo, id) => axiosClient.get(`/documentos/${tipo}/${id}`),
};

// Configuracion del CRM (doc 06): mailer SMTP y bot de Telegram (admin; claves enmascaradas).
export const mailerApi = {
  estado: () => axiosClient.get('/mailer'),
  guardar: (datos) => axiosClient.put('/mailer', datos),
  probar: (destinatario) => axiosClient.post('/mailer/probar', { destinatario }),
};

export const telegramApi = {
  estado: () => axiosClient.get('/telegram'),
  guardar: (datos) => axiosClient.put('/telegram', datos),
  probar: () => axiosClient.post('/telegram/probar', {}),
};
