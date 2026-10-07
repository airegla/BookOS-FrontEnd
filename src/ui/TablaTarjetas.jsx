// BookOS - TablaTarjetas.jsx
// ruta: bookos/frontend/src/ui/TablaTarjetas.jsx
// descripcion: tabla para las vistas que escriben su grilla a mano. Envuelve la tabla y le copia a
//   cada celda el titulo de su columna (`data-label`) mas el rol de la celda (`data-rol`), asi el
//   MISMO markup se lee como una tarjeta por fila en pantallas chicas (clase .tabla-cards del
//   globals.css). La etiqueta no se escribe de nuevo: sale del <th> que ya esta en la vista.
//   Convenciones (las mismas de `Table`): la primera columna encabeza la tarjeta y una columna sin
//   titulo es la de acciones (botones al pie, separados con una linea de puntos).

import { Children, Fragment, cloneElement, isValidElement } from 'react';

// Texto de un nodo del encabezado: en las vistas son texto plano (a veces con un span adentro).
function textoDe(nodo) {
  if (nodo == null || typeof nodo === 'boolean') return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (isValidElement(nodo)) return Children.toArray(nodo.props.children).map(textoDe).join('');
  return Children.toArray(nodo).map(textoDe).join('');
}

function etiquetasDe(thead) {
  const hijos = Children.toArray(thead && thead.props ? thead.props.children : null);
  const fila = hijos.find((n) => isValidElement(n) && n.type === 'tr') || hijos[0];
  const celdas = Children.toArray(fila && fila.props ? fila.props.children : null);
  return celdas.map((th) => textoDe(th).trim());
}

function celdaConRol(td, i, etiquetas, indiceTitulo) {
  if (!isValidElement(td) || td.type !== 'td') return td;
  // Fila de estado vacio (una sola celda con colSpan): se muestra centrada y sin etiqueta.
  if (td.props.colSpan) return cloneElement(td, { 'data-rol': 'vacio' });
  const etiqueta = etiquetas[i] || '';
  // Sin titulo de columna es una celda de acciones (botones o un control de la fila).
  if (!etiqueta) return cloneElement(td, { 'data-rol': 'acciones' });
  const rol = i === indiceTitulo ? 'titulo' : 'dato';
  return cloneElement(td, { 'data-rol': rol, 'data-label': rol === 'dato' ? etiqueta : undefined });
}

function filaConRoles(tr, etiquetas, indiceTitulo) {
  if (!isValidElement(tr)) return tr;
  if (tr.type === Fragment) return cloneElement(tr, {}, Children.map(tr.props.children, (n) => filaConRoles(n, etiquetas, indiceTitulo)));
  if (tr.type !== 'tr') return tr;
  return cloneElement(tr, {}, Children.map(tr.props.children, (td, i) => celdaConRol(td, i, etiquetas, indiceTitulo)));
}

const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TablaTarjetas({ className = '', titulo = null, children, ...resto }) {
  const hijos = Children.toArray(children);
  const thead = hijos.find((n) => isValidElement(n) && n.type === 'thead');
  const etiquetas = etiquetasDe(thead);
  // La columna que encabeza la tarjeta: la que el llamador nombra con `titulo` (por el texto de su
  // <th>, sin importar acentos) o, si no dice nada, la primera que tenga titulo.
  const nombrada = titulo ? sinAcentos(titulo) : null;
  const indiceTitulo = nombrada ? etiquetas.findIndex((e) => sinAcentos(e) === nombrada) : etiquetas.findIndex((e) => e);
  const cuerpo = (nodo) => (nodo && nodo.type === 'tbody'
    ? cloneElement(nodo, {}, Children.map(nodo.props.children, (tr) => filaConRoles(tr, etiquetas, indiceTitulo)))
    : nodo);

  return (
    <table className={`table-os tabla-cards${className ? ` ${className}` : ''}`} {...resto}>
      {hijos.map(cuerpo)}
    </table>
  );
}
