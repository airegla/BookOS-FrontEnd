// ARCHIVO: SearchSelect.jsx
// RUTA: frontend/src/components/ui/SearchSelect.jsx
// DESCRIPCIÓN: Select único con búsqueda. Opciones: [{ value, label }].

import React, { useState, useMemo } from 'react';

export const SearchSelect = ({ options = [], value, onChange, placeholder = 'Buscar...' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(o => !q || (o.label || '').toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => { setOpen(!open); setQuery(''); }} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px', cursor: 'pointer', background: '#fff', minHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {selectedLabel || <span style={{ color: '#999' }}>{placeholder}</span>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', maxHeight: '220px', overflow: 'auto', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." style={{ width: '100%', padding: '8px', border: 'none', borderBottom: '1px solid #eee', boxSizing: 'border-box', outline: 'none' }} />
          <div onClick={() => { onChange(''); setOpen(false); }} style={{ padding: '8px 10px', cursor: 'pointer', color: '#888', borderBottom: '1px solid #f5f5f5' }}>— Sin selección —</div>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px', color: '#999', fontSize: '0.85rem' }}>Sin resultados</div>
          ) : filtered.slice(0, 60).map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid #f5f5f5' }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
