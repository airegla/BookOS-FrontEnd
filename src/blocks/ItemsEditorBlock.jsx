// BookOS - ItemsEditorBlock.jsx
// ruta: bookos/frontend/src/blocks/ItemsEditorBlock.jsx
// descripcion: tabla editable generica para cargar items de un comprobante
//   (venta, remito). Recibe columnas configurables y delega cambios al padre.

export default function ItemsEditorBlock({ items, onChange, onRemove, columnas, vacio = 'Sin items' }) {
  const setCampo = (index, clave, valor) => {
    onChange(items.map((it, i) => (i === index ? { ...it, [clave]: valor } : it)));
  };

  return (
    <table className="table-os w-full">
      <thead>
        <tr>
          {columnas.map((c) => <th key={c.clave} style={c.style}>{c.titulo}</th>)}
          <th style={{ width: 40 }} />
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={columnas.length + 1} className="text-muted text-xs py-4 text-center">{vacio}</td>
          </tr>
        )}
        {items.map((it, i) => (
          <tr key={i}>
            {columnas.map((c) => (
              <td key={c.clave}>
                {c.render ? c.render(it, i, setCampo) : c.editable ? (
                  <input
                    className="input-os"
                    style={{ padding: '4px 8px', width: c.ancho || 90 }}
                    type={c.tipo || 'text'}
                    value={it[c.clave] ?? ''}
                    onChange={(e) => setCampo(i, c.clave, c.tipo === 'number' ? Number(e.target.value) : e.target.value)}
                  />
                ) : (
                  <span className="text-sm">{it[c.clave]}</span>
                )}
              </td>
            ))}
            <td>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => onRemove(i)} title="Quitar">✕</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
