// ARCHIVO: RecomendacionCard.jsx
// RUTA: frontend/src/components/ui/RecomendacionCard.jsx
// DESCRIPCIÓN: Tarjeta de recomendación. Muestra EAN13 (campo canónico del sistema) y botón para precargar pedido.

import React from 'react';
import { getTapaUrl } from '../../api/api';

const formatPrecio = (n) => {
  const v = Number(n);
  if (!v) return '';
  return v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

export const RecomendacionCard = ({ libro, tipo, onAltaRapida }) => {
  const esStock = tipo === 'en_stock';
  const ean = (libro.ean13_legacy || libro.EAN13 || libro.ean13 || libro.ISBN || '').toString().trim();

  return (
    <div style={{ border: `1px solid ${esStock? '#2e7d32' : '#ed6c02'}`, borderRadius: '8px', padding: '16px', marginBottom: '12px', backgroundColor: esStock? '#f1f8e9' : '#fff3e0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {ean && (
          <img
            src={getTapaUrl(ean)}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ width: 56, height: 84, objectFit: 'cover', borderRadius: 4, marginRight: 12, flexShrink: 0, background: '#f0f0f0' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>{libro.Titulo}</h4>
            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', backgroundColor: esStock? '#2e7d32' : '#ed6c02', flexShrink: 0, alignSelf: 'flex-start' }}>{esStock? `Stock: ${libro.stock}` : 'A Pedir'}</span>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#555', fontStyle: 'italic' }}>{libro.Autor} — <span style={{ fontWeight: '600' }}>{libro.Editorial}</span></p>
          {esStock && (
            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#2e7d32' }}>
              📍 Local 01: <strong>{libro.stock01 ?? 0}</strong> · Local 02: <strong>{libro.stock02 ?? 0}</strong>
            </p>
          )}
        </div>
      </div>

      {ean && (
        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', backgroundColor: '#fff', border: '1px dashed #999', padding: '4px 6px', borderRadius: '4px', display: 'inline-block' }}>
          <strong>EAN13:</strong> <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{ean}</span>
        </p>
      )}

      {libro.fecha_ingreso && (
        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#666' }}>📅 Ingresó al catálogo: {new Date(libro.fecha_ingreso).toLocaleDateString('es-AR')}</p>
      )}

      {libro.db_titulo && <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.04)', padding: '4px 6px', borderRadius: '4px' }}><strong>Match Legacy:</strong> {libro.db_titulo}</p>}

      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>{libro.Resumen}</p>
      <div style={{ fontSize: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '8px', marginTop: '8px' }}>
        {libro.Justificacion ? <p style={{ margin: '0 0 4px 0' }}><strong>¿Por qué?:</strong> {libro.Justificacion}</p> : null}
        {libro.Tip_Venta ? <p style={{ margin: '0 0 4px 0', color: '#0288d1' }}><strong>Tip:</strong> {libro.Tip_Venta}</p> : null}
        {libro.proveedor ? <p style={{ margin: '0', color: '#666' }}><strong>Proveedor:</strong> {libro.proveedor}</p> : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px', gap: 8 }}>
        <div>
          {onAltaRapida && (
            <button onClick={() => onAltaRapida(libro)} style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px' }}>
              + Agregar a Pedidos {ean? `(EAN ${ean})` : ''}
            </button>
          )}
        </div>
        {(Number(libro.precio) || 0) > 0 && (
          <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#2e7d32' }}>{formatPrecio(libro.precio)}</span>
        )}
      </div>
    </div>
  );
};