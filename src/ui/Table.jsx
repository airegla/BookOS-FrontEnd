// BookOS - Table.jsx
// ruta: bookos/frontend/src/ui/Table.jsx
// descripcion: tabla base del OS (clase .table-os del globals.css).

export default function Table({ columnas, filas, vacio = 'Sin resultados' }) {
  return (
    <div className="card overflow-hidden">
      <table className="table-os">
        <thead>
          <tr>
            {columnas.map((c) => <th key={c.clave}>{c.titulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="text-muted text-center py-8">{vacio}</td>
            </tr>
          ) : filas.map((fila, i) => (
            <tr key={fila.id || i}>
              {columnas.map((c) => <td key={c.clave}>{c.render ? c.render(fila) : fila[c.clave]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
