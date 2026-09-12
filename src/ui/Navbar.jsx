// BookOS - Navbar.jsx
// ruta: bookos/frontend/src/ui/Navbar.jsx
// descripcion: navegacion del OS agrupada en bloques semanticos. Cada grupo es un
//   desplegable; el grupo que contiene la vista actual queda resaltado. Cambiar de
//   pagina NO borra trabajo (estado en React).

import { useEffect, useRef, useState } from 'react';
import ManualBlock from '../blocks/ManualBlock';

// Estructura extensible: agrega vistas nuevas dentro de su grupo (o crea uno nuevo).
// La division es por FLUJO (decision del vectorHumano, 2026-09-12):
//   Ventas  = entra dinero, sale mercaderia.
//   Compras = entra mercaderia, sale dinero (incluye remitos y consigna).
const GRUPOS = [
  { nombre: 'Ventas', items: ['Facturar', 'Ventas del dia/periodo', 'Caja', 'Clientes', 'Cuenta corriente cliente', 'Newsletter'] },
  { nombre: 'Compras', items: ['Compras', 'Remitos', 'Proveedores', 'Cuenta corriente proveedor', 'Consigna'] },
  { nombre: 'Stock', items: ['Inventario', 'Transportes', 'Mayorista'] },
  { nombre: 'Catalogo', items: ['Catalogo', 'Referencias'] },
  { nombre: 'Kernel', items: ['Salud', 'Propuestas', 'Pesos', 'Logs', 'Cola', 'Memoria'] },
  { nombre: 'Sistema', items: ['Config', 'Empresa', 'Usuarios', 'Parametros', 'Desarrollo'] },
];

export default function Navbar({ vista, onCambiarVista, usuario, onLogout }) {
  const [abierto, setAbierto] = useState(null);
  const ref = useRef(null);
  const [manualAbierto, setManualAbierto] = useState(false);

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

  const abrirManual = () => setManualAbierto(true);

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

      <ManualBlock abierto={manualAbierto} onClose={() => setManualAbierto(false)} />
    </header>
  );
}
