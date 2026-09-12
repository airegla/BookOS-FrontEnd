// BookOS - Navbar.jsx
// ruta: bookos/frontend/src/ui/Navbar.jsx
// descripcion: navegacion del OS agrupada en bloques semanticos. Cada grupo es un
//   desplegable; el grupo que contiene la vista actual queda resaltado. Cambiar de
//   pagina NO borra trabajo (estado en React).

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { manualApi } from '../api/api';

// Estructura extensible: agrega vistas nuevas dentro de su grupo (o crea uno nuevo).
const GRUPOS = [
  { nombre: 'Operación', items: ['Ventas', 'Caja', 'Compras', 'Remitos'] },
  { nombre: 'Catálogo', items: ['Catalogo', 'Referencias'] },
  { nombre: 'Personas', items: ['Clientes', 'Cuenta Corriente', 'Proveedores', 'Newsletter'] },
  { nombre: 'Logística', items: ['Transportes', 'Inventario', 'Mayorista'] },
  { nombre: 'Consigna', items: ['Consigna'] },
  { nombre: 'Sistema', items: ['Config', 'Empresa', 'Usuarios', 'Parametros', 'Desarrollo'] },
  { nombre: 'Kernel', items: ['Salud', 'Propuestas', 'Pesos', 'Logs', 'Cola', 'Memoria'] },
];

export default function Navbar({ vista, onCambiarVista, usuario, onLogout }) {
  const [abierto, setAbierto] = useState(null);
  const ref = useRef(null);
  const [manualAbierto, setManualAbierto] = useState(false);
  const [manualTexto, setManualTexto] = useState('');

  useEffect(() => {
    const alClicFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(null); };
    const alEscape = (e) => { if (e.key === 'Escape') setAbierto(null); };
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, []);

  const elegir = (item) => { onCambiarVista(item); setAbierto(null); };

  const abrirManual = async () => {
    setManualAbierto(true);
    try {
      const res = await manualApi.obtener();
      setManualTexto(res.data?.contenido || 'Manual no disponible.');
    } catch (e) {
      setManualTexto('No se pudo cargar el manual.');
    }
  };

  return (
    <header
      ref={ref}
      className="relative flex items-center gap-1 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', zIndex: 50 }}
    >
      <span className="font-black tracking-tight mr-4">Book<span style={{ color: 'var(--accent)' }}>OS</span></span>

      <nav className="flex gap-1 flex-1 flex-wrap">
        {GRUPOS.map((grupo) => {
          const activo = grupo.items.includes(vista);
          const desplegado = abierto === grupo.nombre;
          return (
            <div key={grupo.nombre} className="relative">
              <button
                type="button"
                className={`btn ${activo ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAbierto(desplegado ? null : grupo.nombre)}
              >
                {grupo.nombre} <span className="text-xs opacity-70">▾</span>
              </button>
              {desplegado && (
                <div className="absolute left-0 top-full mt-1 card p-1 z-50 min-w-[180px]">
                  {grupo.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded text-sm ${vista === item ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => elegir(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <span className="text-xs text-muted hidden md:block">{usuario ? usuario.nombre : ''}</span>
      <button type="button" className="btn btn-ghost" onClick={abrirManual}>Manual</button>
      <button type="button" className="btn btn-ghost text-muted" onClick={onLogout}>Salir</button>

      <Modal abierto={manualAbierto} onClose={() => setManualAbierto(false)} titulo="Manual de BookOS" ancho="860px">
        <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{ maxHeight: '70vh', overflowY: 'auto', fontFamily: 'inherit' }}>
          {manualTexto || 'Cargando...'}
        </pre>
      </Modal>
    </header>
  );
}
