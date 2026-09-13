// BookOS - MayoristaTablaBlock.jsx
// ruta: bookos/frontend/src/blocks/MayoristaTablaBlock.jsx
// descripcion: renglones de una operacion del mayorista (F-12 §4.4): buscador asincronico de
//   articulos + cantidad + tipo de stock por linea (consigna/firme) + importacion de CSV. Es el
//   mismo bloque para remitos, facturas y devoluciones: cambia lo que la pagina hace con los items.

import SelectBuscador from '../ui/SelectBuscador';
import ImportarCsvBlock from './ImportarCsvBlock';
import { buscarArticulos } from '../utils/selectores';

export default function MayoristaTablaBlock({ items = [], onItems, conTipoStock = true, conPrecio = false, etiquetaVacio = 'Agrega renglones con el buscador o un CSV (código;cantidad)' }) {
  const agregar = (item, cantidad, tipoStock) => {
    if (!item || !cantidad) return;
    const existente = items.findIndex((i) => i.articuloId === item.id && (!conTipoStock || i.tipoStock === tipoStock));
    if (existente >= 0) {
      const copia = [...items];
      copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + Number(cantidad) };
      onItems(copia);
      return;
    }
    onItems([...items, {
      articuloId: item.id,
      ean13: item.ean13,
      titulo: item.etiqueta,
      cantidad: Number(cantidad),
      ...(conTipoStock ? { tipoStock } : {}),
      ...(conPrecio ? { precioUnitario: item.precioLista || 0, descuentoLinea: null } : {}),
    }]);
  };

  const importarCsv = (filas) => {
    const nuevos = filas
      .filter((f) => (f.ean13 || f.codigo) && Number(f.cantidad) > 0)
      .map((f) => ({ articuloId: null, ean13: String(f.ean13 || f.codigo), titulo: f.titulo || '', cantidad: Number(f.cantidad), ...(conTipoStock ? { tipoStock: 'CONSIGNA' } : {}) }));
    if (nuevos.length) onItems([...items, ...nuevos]);
  };

  const quitar = (i) => onItems(items.filter((_, idx) => idx !== i));
  const cambiar = (i, campo, v) => {
    const copia = [...items];
    copia[i] = { ...copia[i], [campo]: v };
    onItems(copia);
  };

  return (
    <>
      <div className="flex gap-2 items-end mb-2 flex-wrap">
        <div className="flex-1" style={{ minWidth: 260 }}>
          <span className="field-label">Buscar título (EAN, título o autor)</span>
          <SelectBuscador
            valor={null}
            etiquetaValor=""
            placeholder="EAN, título o autor..."
            buscar={buscarArticulos}
            onSeleccionar={(item) => { if (item) agregar(item, 1, conTipoStock ? 'CONSIGNA' : undefined); }}
          />
        </div>
        <ImportarCsvBlock etiqueta="Importar CSV" onCargar={importarCsv} />
      </div>

      <table className="table-os">
        <thead>
          <tr>
            <th>EAN</th>
            <th>Título</th>
            <th>Cant.</th>
            {conTipoStock && <th>Sale de</th>}
            {conPrecio && <th>Precio</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={conTipoStock ? 5 : 4} className="text-muted text-sm">{etiquetaVacio}</td></tr>
          )}
          {items.map((it, i) => (
            <tr key={i}>
              <td className="font-mono text-xs">{it.ean13 || '—'}</td>
              <td>{it.titulo || '(se resuelve al guardar por el código)'}</td>
              <td style={{ width: 90 }}>
                <input className="input-os" type="number" min="1" value={it.cantidad} onChange={(e) => cambiar(i, 'cantidad', Number(e.target.value))} />
              </td>
              {conTipoStock && (
                <td style={{ width: 150 }}>
                  <select className="input-os" value={it.tipoStock || 'CONSIGNA'} onChange={(e) => cambiar(i, 'tipoStock', e.target.value)}>
                    <option value="CONSIGNA">Consigna</option>
                    <option value="FIRME">Firme</option>
                  </select>
                </td>
              )}
              {conPrecio && (
                <td style={{ width: 130 }}>
                  <input className="input-os" type="number" min="0" value={it.precioUnitario || 0} onChange={(e) => cambiar(i, 'precioUnitario', Number(e.target.value))} />
                </td>
              )}
              <td>
                <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => quitar(i)}>Quitar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm mt-2">
        Renglones: <strong>{items.length}</strong> · Unidades: <strong>{items.reduce((a, i) => a + Number(i.cantidad || 0), 0)}</strong>
      </p>
    </>
  );
}
