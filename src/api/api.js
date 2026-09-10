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
  crear: (datos) => axiosClient.post('/catalogo', datos),
  actualizar: (id, datos) => axiosClient.put(`/catalogo/${id}`, datos),
  eliminar: (id) => axiosClient.delete(`/catalogo/${id}`),
};

export const ventasApi = {
  procesar: (payload) => axiosClient.post('/ventas/procesar', payload),
  listar: (params = {}) => axiosClient.get('/ventas', { params }),
  obtener: (id) => axiosClient.get(`/ventas/${id}`),
};

export const remitosApi = {
  crear: (payload) => axiosClient.post('/remitos', payload),
  cruzar: (id) => axiosClient.post(`/remitos/${id}/cruzar`),
  listar: (params = {}) => axiosClient.get('/remitos', { params }),
  obtener: (id) => axiosClient.get(`/remitos/${id}`),
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

export const auditoriaApi = {
  ranking: (limite = 30) => axiosClient.get('/auditoria/ranking', { params: { limite } }),
  llm: (limite = 30) => axiosClient.get('/auditoria/llm', { params: { limite } }),
};

export const agenteApi = {
  // SSE sobre POST: devuelve el body del fetch para leer el stream.
  chat: (mensaje, contexto) => {
    const token = localStorage.getItem('bookos_token');
    return fetch(`${import.meta.env.VITE_API_URL || '/api'}/agente/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mensaje, contexto }),
    });
  },
  outcome: (payload) => axiosClient.post('/agente/outcome', payload),
};
