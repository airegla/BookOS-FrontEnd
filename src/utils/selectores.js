// BookOS - selectores.js
// ruta: bookos/frontend/src/utils/selectores.js
// descripcion: busquedas asincronicas para SelectBuscador (maestros grandes). Una sola fuente
//   para todas las pantallas: cada funcion devuelve [{ id, etiqueta, detalle? }] consultando el
//   endpoint con search+limit (nunca se precarga la tabla entera).

import { clientesApi, proveedoresApi, autoresApi, editorialesApi, materiasApi } from '../api/api';

const LIMITE = 20;

// excluir: ids a dejar afuera (p. ej. Consumidor Final en cuenta corriente).
export async function buscarClientes(q, excluir = []) {
  const res = await clientesApi.listar({ search: q, limit: LIMITE });
  return (res.data || [])
    .filter((c) => !excluir.includes(c.id))
    .map((c) => ({ id: c.id, etiqueta: c.nombre, detalle: c.telefono || c.documento || '' }));
}

export async function buscarProveedores(q) {
  const res = await proveedoresApi.listar({ search: q, limit: LIMITE });
  return (res.data || []).map((p) => ({ id: p.id, etiqueta: p.nombre, detalle: p.localidad || '' }));
}

export async function buscarAutores(q) {
  const res = await autoresApi.listar({ search: q, limit: LIMITE });
  return (res.data || []).map((a) => ({ id: a.id, etiqueta: a.nombre }));
}

export async function buscarEditoriales(q) {
  const res = await editorialesApi.listar({ search: q, limit: LIMITE });
  return (res.data || []).map((e) => ({ id: e.id, etiqueta: e.nombre }));
}

export async function buscarMaterias(q) {
  const res = await materiasApi.listar({ search: q, limit: LIMITE });
  return (res.data || []).map((m) => ({ id: m.id, etiqueta: m.descripcion }));
}
