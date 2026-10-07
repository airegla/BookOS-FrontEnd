// BookOS - Table.jsx
// ruta: bookos/frontend/src/ui/Table.jsx
// descripcion: tabla base del OS (clase .table-os del globals.css). Si recibe
//   exportable=true, agrega un boton "Exportar CSV" que descarga el listado que
//   se esta viendo (usa los datos crudos de cada fila). En pantallas chicas la
//   grilla se abandona y cada fila se lee como una tarjeta (clase .tabla-cards).

import { descargarCsv } from '../utils/exportar';

export default function Table({ columnas, filas, vacio = 'Sin resultados', exportable = false, exportarNombre = 'listado' }) {
  const exportar = () => {
    const cols = columnas.filter((c) => c.clave && c.titulo);
    const filasCrudas = filas.map((f) => {
      const o = {};
      for (const c of cols) o[c.clave] = c.valorExport ? c.valorExport(f) : f[c.clave];
      return o;
    });
    descargarCsv(exportarNombre, cols.map((c) => ({ titulo: c.titulo, clave: c.clave })), filasCrudas);
  };

  // En pantallas chicas (clase .tabla-cards) cada fila es una tarjeta. La etiqueta de cada dato
  // sale del titulo de su columna: no se escribe de nuevo, viaja en el `data-label` de la celda.
  // El `data-rol` distingue el encabezado de la tarjeta, los datos y la fila de acciones (la
  // columna sin titulo). Encabeza la primera columna de datos, salvo que una columna pida el
  // encabezado con `movil: 'titulo'`; una columna con `movil: 'oculto'` no viaja al celular.
  const esAcciones = (c) => !c.titulo;
  const columnasDeDatos = columnas.filter((c) => c.movil !== 'oculto' && !esAcciones(c));
  const conTitulo = columnas.find((c) => c.movil === 'titulo' && !esAcciones(c));
  const claveTitulo = conTitulo ? conTitulo.clave : (columnasDeDatos[0] || {}).clave;
  const rolDe = (c) => (c.clave === claveTitulo ? 'titulo' : esAcciones(c) ? 'acciones' : 'dato');

  return (
    <div className="card overflow-hidden">
      {exportable && (
        <div className="flex justify-end px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-ghost text-xs" onClick={exportar}>Exportar CSV</button>
        </div>
      )}
      {/* En pantallas chicas la tabla puede ser mas ancha que la tarjeta: se desplaza en horizontal
          en vez de recortarse (antes el overflow-hidden mostraba solo una franja de la 1a columna). */}
      <div className="overflow-x-auto">
        <table className="table-os tabla-cards">
          <thead>
            <tr>
              {columnas.map((c) => <th key={c.clave}>{c.titulo}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={columnas.length} data-rol="vacio" className="text-muted text-center py-8">{vacio}</td>
              </tr>
            ) : filas.map((fila, i) => (
              <tr key={fila.id || i}>
                {columnas.map((c) => (
                  <td key={c.clave} data-rol={rolDe(c)} data-label={rolDe(c) === 'dato' ? c.titulo : undefined}>
                    {c.render ? c.render(fila) : fila[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
