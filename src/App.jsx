// BookOS - App.jsx
// ruta: bookos/frontend/src/App.jsx
// descripcion: shell del OS. Login JWT, navbar de 7 vistas y layout
//   contenido + Secretario lateral (persistente). Cambiar de vista no borra nada.

import { useEffect, useState } from 'react';
import Navbar from './ui/Navbar';
import AgenteChatBlock from './blocks/AgenteChatBlock';
import CatalogoPage from './pages/CatalogoPage';
import VentasPage from './pages/VentasPage';
import VentasPeriodoPage from './pages/VentasPeriodoPage';
import RemitosPage from './pages/RemitosPage';
import CajaPage from './pages/CajaPage';
import ComprasPage from './pages/ComprasPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ClientesPage from './pages/ClientesPage';
import CtaCtePage from './pages/CtaCtePage';
import TransportesPage from './pages/TransportesPage';
import ConsignaPage from './pages/ConsignaPage';
import MayoristaPage from './pages/MayoristaPage';
import InventarioPage from './pages/InventarioPage';
import NewsletterPage from './pages/NewsletterPage';
import ParametrosPage from './pages/ParametrosPage';
import ReferenciasPage from './pages/ReferenciasPage';
import ConfigPage from './pages/ConfigPage';
import EmpresaPage from './pages/EmpresaPage';
import UsuariosPage from './pages/UsuariosPage';
import DesarrolloPage from './pages/DesarrolloPage';
import SaludPage from './pages/SaludPage';
import PropuestasPage from './pages/PropuestasPage';
import PesosPage from './pages/PesosPage';
import LogsPage from './pages/LogsPage';
import ColaPage from './pages/ColaPage';
import MemoriaPage from './pages/MemoriaPage';
import { authApi } from './api/api';
import { useAppContext } from './AppContext';

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@bookos.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('bookos_token', res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <form className="card p-8 w-full max-w-sm" onSubmit={entrar}>
        <h1 className="text-2xl font-black mb-6">
          Book<span style={{ color: 'var(--accent)' }}>OS</span>
        </h1>
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Email</span>
          <input className="input-os" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block mb-4">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Password</span>
          <input className="input-os" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('Catalogo');
  const [cargando, setCargando] = useState(true);
  const { setContextoActual } = useAppContext();
  const debug = import.meta.env.VITE_DEBUG_MODE === 'true';

  useEffect(() => {
    const token = localStorage.getItem('bookos_token');
    if (!token) {
      setCargando(false);
      return;
    }
    authApi.me()
      .then((res) => setUsuario(res.data))
      .catch(() => localStorage.removeItem('bookos_token'))
      .finally(() => setCargando(false));
  }, []);

  const cambiarVista = (nueva) => {
    setVista(nueva);
    setContextoActual(null);
  };

  const salir = () => {
    localStorage.removeItem('bookos_token');
    setUsuario(null);
  };

  if (cargando) return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />;
  if (!usuario) return <Login onLogin={setUsuario} />;

  const esAdmin = usuario.rol === 'admin';

  return (
    <div className={debug ? 'debug-watermark' : ''}>
      <Navbar vista={vista} onCambiarVista={cambiarVista} usuario={usuario} onLogout={salir} />
      <div className="bookos-layout">
        <main className="p-6 overflow-y-auto">
          {vista === 'Catalogo' && <CatalogoPage />}
          {vista === 'Facturar' && <VentasPage />}
          {vista === 'Ventas del dia/periodo' && <VentasPeriodoPage />}
          {vista === 'Remitos' && <RemitosPage />}
          {vista === 'Caja' && <CajaPage />}
          {vista === 'Compras' && <ComprasPage />}
          {vista === 'Proveedores' && <ProveedoresPage />}
          {vista === 'Clientes' && <ClientesPage />}
          {vista === 'Cuenta corriente cliente' && <CtaCtePage lado="cliente" />}
          {vista === 'Cuenta corriente proveedor' && <CtaCtePage lado="proveedor" />}
          {vista === 'Transportes' && <TransportesPage />}
          {vista === 'Consigna' && <ConsignaPage />}
          {vista === 'Mayorista' && <MayoristaPage />}
          {vista === 'Inventario' && <InventarioPage />}
          {vista === 'Newsletter' && <NewsletterPage />}
          {vista === 'Parametros' && <ParametrosPage />}
          {vista === 'Referencias' && <ReferenciasPage />}
          {vista === 'Config' && <ConfigPage esAdmin={esAdmin} />}
          {vista === 'Empresa' && <EmpresaPage />}
          {vista === 'Usuarios' && <UsuariosPage esAdmin={esAdmin} />}
          {vista === 'Desarrollo' && <DesarrolloPage esAdmin={esAdmin} />}
          {vista === 'Salud' && <SaludPage esAdmin={esAdmin} />}
          {vista === 'Propuestas' && <PropuestasPage esAdmin={esAdmin} />}
          {vista === 'Pesos' && <PesosPage esAdmin={esAdmin} />}
          {vista === 'Logs' && <LogsPage />}
          {vista === 'Cola' && <ColaPage />}
          {vista === 'Memoria' && <MemoriaPage esAdmin={esAdmin} />}
        </main>
        <AgenteChatBlock />
      </div>
    </div>
  );
}
