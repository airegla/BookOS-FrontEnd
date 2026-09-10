// BookOS - Navbar.jsx
// ruta: bookos/frontend/src/ui/Navbar.jsx
// descripcion: navegacion del OS: Catalogo | Ventas | Remitos | Config | Empresa |
//   Usuarios | Desarrollo. Cambiar de pagina NO borra trabajo (estado en React).

const ITEMS = [
  'Catalogo', 'Ventas', 'Remitos', 'Clientes', 'Config', 'Empresa', 'Usuarios', 'Desarrollo',
];

export default function Navbar({ vista, onCambiarVista, usuario, onLogout }) {
  return (
    <header className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
      <span className="font-black tracking-tight mr-4">Book<span style={{ color: 'var(--accent)' }}>OS</span></span>
      <nav className="flex gap-1 flex-1 overflow-x-auto">
        {ITEMS.map((item) => (
          <button
            key={item}
            type="button"
            className={`btn ${vista === item ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onCambiarVista(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <span className="text-xs text-muted hidden md:block">{usuario ? usuario.nombre : ''}</span>
      <button type="button" className="btn btn-ghost text-muted" onClick={onLogout}>Salir</button>
    </header>
  );
}
