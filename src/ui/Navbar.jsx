// BookOS - Navbar.jsx
// ruta: bookos/frontend/src/ui/Navbar.jsx
// descripcion: navegacion del OS agrupada en bloques semanticos. En escritorio cada grupo es un
//   desplegable (el grupo que contiene la vista actual queda resaltado); en pantallas chicas la
//   navegacion se muda a una BARRA INFERIOR al alcance del pulgar (lanzador "Menú" + accesos fijos
//   del mostrador) y el lanzador abre un panel a PANTALLA COMPLETA con buscador de vistas, usadas
//   hace poco y grupos plegables. Cambiar de pagina NO borra trabajo.

import { useEffect, useRef, useState } from 'react';
import ManualBlock from '../blocks/ManualBlock';

// Estructura extensible: agrega vistas nuevas dentro de su grupo (o crea uno nuevo).
// La division es por FLUJO (decision del vectorHumano, 2026-09-12):
//   Ventas  = entra dinero, sale mercaderia.
//   Compras = entra mercaderia, sale dinero (incluye remitos y consigna).
const GRUPOS = [
  { nombre: 'Ventas', items: ['Facturar', 'Caja', 'Ventas del dia/periodo', 'Clientes', 'Cuenta corriente cliente', 'Newsletter'] },
  { nombre: 'Compras', items: ['Compras', 'Remitos', 'Proveedores', 'Cuenta corriente proveedor', 'Consigna'] },
  { nombre: 'Stock', items: ['Inventario', 'Transportes', 'Mayorista'] },
  { nombre: 'Catalogo', items: ['Catalogo', 'Referencias'] },
  { nombre: 'CRM', items: ['Pedidos', 'Radar', 'Propuestas', 'Campañas', 'Config CRM', 'Plantillas mail'] },
  {
    // Core agrupa los cuatro modulos portables (pedido del vectorHumano, 2026-09-20): kernel,
    // router, agent y llm, en espejo de `backend/src/core/`. `directos` = lo que se EXIME de los
    // submenus (Salud: sus tarjetas no son configuracion de un modulo). `submenus` = la
    // configuracion de cada modulo, con su rotulo propio cuando la vista sirve a dos modulos.
    nombre: 'Core',
    directos: [{ vista: 'Salud', label: 'Salud (exenta)' }],
    submenus: [
      { nombre: 'Kernel', items: [{ vista: 'Pesos del buscador' }, { vista: 'Banco del buscador' }, { vista: 'Enriquecimiento' }, { vista: 'Propuestas Kernel' }, { vista: 'Cola' }, { vista: 'Memoria' }] },
      { nombre: 'Router', items: [{ vista: 'Pesos del router' }, { vista: 'Banco del router' }] },
      { nombre: 'Agent', items: [{ vista: 'Agente' }, { vista: 'Perfiles' }] },
      { nombre: 'LLM', items: [{ vista: 'Modelo local' }, { vista: 'Banco del modelo chico' }] },
      { nombre: 'Logs', items: [{ vista: 'Logs', label: 'Logs del core' }] },
    ],
  },
  { nombre: 'Sistema', items: ['Config', 'Empresa', 'Usuarios', 'Parametros', 'Importador', 'Desarrollo'] },
];

// Accesos fijos de la barra movil (los que se usan en el mostrador). El resto vive en el lanzador.
const PINNADOS = [
  { vista: 'Facturar', label: 'Facturar', icono: '🧾' },
  { vista: 'Caja', label: 'Caja', icono: '💵' },
  { vista: 'Catalogo', label: 'Catálogo', icono: '📚' },
];

// Indice plano de todas las vistas con su ruta (grupo › submenu): es lo que recorre el buscador del
// panel movil. Se escribe el nombre y la vista aparece, sin recorrer los grupos a ojo.
const VISTAS = GRUPOS.flatMap((g) => {
  if (g.submenus) {
    const directos = (g.directos || []).map((it) => ({ ...it, grupo: g.nombre, sub: null }));
    const anidados = g.submenus.flatMap((s) => s.items.map((it) => ({ ...it, grupo: g.nombre, sub: s.nombre })));
    return [...directos, ...anidados];
  }
  return g.items.map((v) => ({ vista: v, label: v, grupo: g.nombre, sub: null }));
});

const rotuloDe = (it) => it.label || it.vista;
const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const rutaDe = (v) => {
  const it = VISTAS.find((i) => i.vista === v);
  return it ? (it.sub ? `${it.grupo} › ${it.sub}` : it.grupo) : '';
};

// Vistas usadas hace poco (por navegador): en el mostrador se entra siempre a las mismas.
const CLAVE_RECIENTES = 'bookos_vistas_recientes';
const leerRecientes = () => {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) || '[]');
    return Array.isArray(v) ? v.filter((x) => VISTAS.some((i) => i.vista === x)) : [];
  } catch (_) { return []; }
};
const guardarReciente = (vista) => {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify([vista, ...leerRecientes().filter((v) => v !== vista)].slice(0, 5)));
  } catch (_) { /* sin storage: el menu funciona igual, solo no recuerda */ }
};

export default function Navbar({ vista, onCambiarVista, usuario, onLogout, asistenteAbierto = false, onAlternarAsistente = null, secretarioAbierto = false, onAlternarSecretario = null }) {
  const [abierto, setAbierto] = useState(null);
  const [subAbierto, setSubAbierto] = useState(null);
  const [masAbierto, setMasAbierto] = useState(false);
  const ref = useRef(null);
  const [manualAbierto, setManualAbierto] = useState(false);
  // Panel del lanzador movil: pantalla completa, con buscador arriba y grupos plegables.
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [gruposAbiertos, setGruposAbiertos] = useState({});
  const [recientes, setRecientes] = useState(leerRecientes);

  useEffect(() => {
    const alClicFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) { setAbierto(null); setSubAbierto(null); setMasAbierto(false); } };
    const alEscape = (e) => { if (e.key === 'Escape') { setAbierto(null); setSubAbierto(null); setMasAbierto(false); setSheetAbierto(false); } };
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, []);

  // Al cerrar el panel el buscador queda limpio para la proxima apertura.
  useEffect(() => { if (!sheetAbierto) setFiltro(''); }, [sheetAbierto]);

  const elegir = (item) => {
    onCambiarVista(item);
    guardarReciente(item);
    setRecientes(leerRecientes());
    setAbierto(null);
    setSubAbierto(null);
    setMasAbierto(false);
    setSheetAbierto(false);
  };

  // Con el buscador vacio se ve el indice: el grupo de la vista actual abierto y el resto plegado.
  const grupoDeLaVista = (VISTAS.find((i) => i.vista === vista) || {}).grupo || null;
  const grupoDesplegado = (nombre) => (nombre in gruposAbiertos ? gruposAbiertos[nombre] : nombre === grupoDeLaVista);
  const buscando = filtro.trim().length > 0;
  const encontradas = buscando
    ? VISTAS.filter((it) => sinAcentos(rotuloDe(it)).includes(sinAcentos(filtro)) || sinAcentos(it.grupo).includes(sinAcentos(filtro)))
    : [];

  const abrirManual = () => setManualAbierto(true);

  return (
    <>
    <header
      ref={ref}
      className="relative flex items-center gap-1 px-3 py-2 flex-nowrap lg:px-4 lg:py-3 lg:flex-wrap"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', zIndex: 50 }}
    >
      <span className="font-black tracking-tight mr-2 lg:mr-4">Book<span style={{ color: 'var(--accent)' }}>OS</span></span>

      <nav className="nav-escritorio flex gap-1 flex-1 flex-wrap">
        {GRUPOS.map((grupo) => {
          const itemsDe = (g) => (g.submenus ? [...(g.directos || []), ...g.submenus.flatMap((s) => s.items)] : g.items.map((i) => ({ vista: i, label: i })));
          const activo = itemsDe(grupo).some((it) => it.vista === vista);
          const desplegado = abierto === grupo.nombre;
          const rotulo = (it) => it.label || it.vista;
          return (
            <div key={grupo.nombre} className="relative">
              <button
                type="button"
                className={`btn ${activo ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setAbierto(desplegado ? null : grupo.nombre); setSubAbierto(null); }}
              >
                {grupo.nombre} <span className="text-xs opacity-70">▾</span>
              </button>
              {desplegado && (
                <div className="absolute left-0 top-full mt-1 card p-1 z-50 min-w-[200px]">
                  {grupo.submenus ? (
                    <>
                      {(grupo.directos || []).map((it) => (
                        <button
                          key={`directo-${it.vista}`}
                          type="button"
                          className={`w-full text-left px-3 py-2 rounded text-sm ${vista === it.vista ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => elegir(it.vista)}
                        >
                          {rotulo(it)}
                        </button>
                      ))}
                      {grupo.submenus.map((sub) => {
                        const subActivo = sub.items.some((it) => it.vista === vista);
                        const subDesplegado = subAbierto === sub.nombre;
                        return (
                          <div
                            key={sub.nombre}
                            className="relative"
                            onMouseEnter={() => setSubAbierto(sub.nombre)}
                            onMouseLeave={() => setSubAbierto(null)}
                          >
                            <button
                              type="button"
                              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${subActivo ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setSubAbierto(subDesplegado ? null : sub.nombre)}
                            >
                              <span>{sub.nombre}</span><span className="text-xs opacity-70">›</span>
                            </button>
                            {subDesplegado && (
                              <div className="absolute left-full top-0 ml-1 card p-1 z-50 min-w-[200px]">
                                {sub.items.map((it) => (
                                  <button
                                    key={`${sub.nombre}-${it.vista}-${it.label || ''}`}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 rounded text-sm ${vista === it.vista ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => elegir(it.vista)}
                                  >
                                    {rotulo(it)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    grupo.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded text-sm ${vista === item ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => elegir(item)}
                      >
                        {item}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <span className="text-xs text-muted hidden md:block">{usuario ? usuario.nombre : ''}</span>
        {typeof onAlternarAsistente === 'function' && (
          <button
            type="button"
            className={`btn text-xs whitespace-nowrap ${asistenteAbierto ? 'btn-primary' : 'btn-ghost'}`}
            onClick={onAlternarAsistente}
            aria-label="Vendedor"
            title={asistenteAbierto ? 'Cerrar el Vendedor' : 'Abrir el Vendedor (asistente de ventas, ventana izquierda)'}
          >
            💬<span className="hidden lg:inline"> Vendedor</span>
          </button>
        )}
        {/* En el celular la barra va en UNA fila: los dos chats en icono y Manual y Salir dentro del
            "...". Antes se repartian en dos filas y Salir quedaba solo abajo, comiendo alto. */}
        <button type="button" className="btn btn-ghost text-xs whitespace-nowrap hidden lg:inline-flex" onClick={abrirManual}>Manual</button>
        {typeof onAlternarSecretario === 'function' && (
          <button
            type="button"
            className={`btn text-xs whitespace-nowrap ${secretarioAbierto ? 'btn-primary' : 'btn-ghost'}`}
            onClick={onAlternarSecretario}
            aria-label="Secretario"
            title={secretarioAbierto ? 'Cerrar el Secretario' : 'Abrir el Secretario (ventana derecha)'}
          >
            💬<span className="hidden lg:inline"> Secretario</span>
          </button>
        )}
        <button type="button" className="btn btn-ghost text-muted hidden lg:inline-flex" onClick={onLogout}>Salir</button>
        <div className="relative lg:hidden">
          <button
            type="button"
            className={`btn px-3 ${masAbierto ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMasAbierto((v) => !v)}
            aria-label="Mas opciones"
            aria-expanded={masAbierto}
          >
            ⋯
          </button>
          {masAbierto && (
            <div className="absolute right-0 top-full mt-1 card p-1 z-50 min-w-[180px]">
              <button type="button" className="w-full text-left px-3 py-2 rounded text-sm btn-ghost" onClick={() => { setMasAbierto(false); abrirManual(); }}>Manual</button>
              <button type="button" className="w-full text-left px-3 py-2 rounded text-sm btn-ghost" onClick={onLogout}>Salir</button>
            </div>
          )}
        </div>
      </div>

      <ManualBlock abierto={manualAbierto} onClose={() => setManualAbierto(false)} esAdmin={Boolean(usuario && usuario.rol === 'admin')} />
    </header>

    {/* Barra inferior movil: lanzador + accesos fijos del mostrador, al alcance del pulgar. */}
    <nav className="nav-movil">
      <button
        type="button"
        className={`nav-movil-btn${sheetAbierto ? ' activo' : ''}`}
        onClick={() => setSheetAbierto((v) => !v)}
      >
        <span className="nav-movil-icono">☰</span>
        <span>Menú</span>
      </button>
      {PINNADOS.map((fijo) => (
        <button
          key={fijo.vista}
          type="button"
          className={`nav-movil-btn${vista === fijo.vista ? ' activo' : ''}`}
          onClick={() => elegir(fijo.vista)}
        >
          <span className="nav-movil-icono">{fijo.icono}</span>
          <span>{fijo.label}</span>
        </button>
      ))}
    </nav>

    {sheetAbierto && (
      <section className="nav-sheet" aria-label="Menú de aplicaciones">
        <div className="nav-sheet-header">
          <input
            className="nav-sheet-buscador"
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar vista (facturar, caja, pesos...)"
            aria-label="Buscar vista"
          />
          <button type="button" className="nav-sheet-cerrar" onClick={() => setSheetAbierto(false)} aria-label="Cerrar menú">✕</button>
        </div>
        <div className="nav-sheet-cuerpo">
          {buscando ? (
            <div className="nav-sheet-grupo">
              <div className="nav-sheet-titulo">
                <span>{encontradas.length === 1 ? '1 vista' : `${encontradas.length} vistas`}</span>
              </div>
              {encontradas.length === 0 ? (
                <div className="nav-sheet-vacio">Ninguna vista se llama así.</div>
              ) : (
                <div className="nav-sheet-items">
                  {encontradas.map((it) => (
                    <button
                      key={`f-${it.grupo}-${it.vista}`}
                      type="button"
                      className={`nav-sheet-item${vista === it.vista ? ' activo' : ''}`}
                      onClick={() => elegir(it.vista)}
                    >
                      <span>{rotuloDe(it)}</span>
                      <span className="nav-sheet-ruta">{rutaDe(it.vista)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {recientes.length > 0 && (
                <div className="nav-sheet-grupo">
                  <div className="nav-sheet-titulo"><span>Usadas hace poco</span></div>
                  <div className="nav-sheet-items">
                    {recientes.map((v) => (
                      <button
                        key={`r-${v}`}
                        type="button"
                        className={`nav-sheet-item${vista === v ? ' activo' : ''}`}
                        onClick={() => elegir(v)}
                      >
                        <span>{v}</span>
                        <span className="nav-sheet-ruta">{rutaDe(v)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {GRUPOS.map((grupo) => {
                const desplegado = grupoDesplegado(grupo.nombre);
                const fila = (it) => (
                  <button
                    key={`m-${it.vista}`}
                    type="button"
                    className={`nav-sheet-item${vista === it.vista ? ' activo' : ''}`}
                    onClick={() => elegir(it.vista)}
                  >
                    <span>{rotuloDe(it)}</span>
                  </button>
                );
                return (
                  <div key={grupo.nombre} className="nav-sheet-grupo">
                    <button
                      type="button"
                      className={`nav-sheet-titulo${desplegado ? ' abierto' : ''}`}
                      onClick={() => setGruposAbiertos((s) => ({ ...s, [grupo.nombre]: !desplegado }))}
                      aria-expanded={desplegado}
                    >
                      <span>{grupo.nombre}</span>
                      <span className="nav-sheet-flecha">›</span>
                    </button>
                    {desplegado && (
                      <div className="nav-sheet-items">
                        {grupo.submenus ? (
                          <>
                            {(grupo.directos || []).map((it) => fila(it))}
                            {grupo.submenus.map((sub) => (
                              <div key={sub.nombre} className="nav-sheet-sub">
                                <div className="nav-sheet-subtitulo">{sub.nombre}</div>
                                {sub.items.map((it) => fila(it))}
                              </div>
                            ))}
                          </>
                        ) : (
                          grupo.items.map((v) => fila({ vista: v }))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    )}
    </>
  );
}
