// ARCHIVO: Pagination.jsx
// RUTA: frontend/src/components/ui/Pagination.jsx
// DESCRIPCIÓN: Paginador simple (anterior/siguiente).

import React from 'react';

export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px', justifyContent: 'flex-end' }}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} style={{ padding: '4px 10px', cursor: page <= 1 ? 'default' : 'pointer' }}>‹ Anterior</button>
      <span style={{ fontSize: '0.85rem', color: '#555' }}>Página {page} de {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} style={{ padding: '4px 10px', cursor: page >= totalPages ? 'default' : 'pointer' }}>Siguiente ›</button>
    </div>
  );
};

export default Pagination;
