// ARCHIVO: SearchMultiSelect.jsx
// RUTA: frontend/src/components/ui/SearchMultiSelect.jsx
// DESCRIPCIÓN: Select múltiple con búsqueda (chips). Opciones: [{ value, label }].

import React, { useState, useMemo, useRef, useEffect } from 'react';

export const SearchMultiSelect = ({ options = [], value = [], onChange, placeholder = 'Seleccionar...' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = Array.isArray(value) ? value : [];
  const selectedLabels = options.filter(o => selected.includes(o.value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(o => !selected.includes(o.value) && (q ? (o.label || '').toLowerCase().includes(q) : true));
  }, [options, selected, query]);

  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(true)}
        style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px 8px', minHeight: '38px', cursor: 'text', background: '#fff' }}
      >
        {selectedLabels.length === 0 ? (
          <span style={{ color: '#999', fontSize: '0.9rem' }}>{placeholder}</span>
        ) : selectedLabels.map(o => (
          <span key={o.value} style={{ display: 'inline-block', background: '#e3f2fd', color: '#0d47a1', borderRadius: '10px', padding: '2px 8px', margin: '2px', fontSize: '0.8rem' }}>
            {o.label}
            <span style={{ cursor: 'pointer', marginLeft: '6px', fontWeight: 'bold' }} onClick={(e) => { e.stopPropagation(); toggle(o.value); }}>×</span>
          </span>
        ))}
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              style={{ flex: 1, padding: '8px', border: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Cerrar"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 12px', fontSize: '1.2rem', lineHeight: 1, color: '#888' }}
            >
              ×
            </button>
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px', color: '#999', fontSize: '0.85rem' }}>Sin resultados</div>
            ) : filtered.slice(0, 60).map(o => (
              <div key={o.value} onClick={() => toggle(o.value)} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid #f5f5f5' }}>
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchMultiSelect;
