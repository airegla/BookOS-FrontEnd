// BookOS - App.jsx
// ruta: bookos/frontend/src/App.jsx
// descripcion: shell del OS. Login JWT, navbar de 7 vistas y layout
//   contenido + Secretario lateral (persistente). Cambiar de vista no borra nada.

import { useCallback, useEffect, useState } from 'react';
import Navbar from './ui/Navbar';
import AgenteChatBlock from './blocks/AgenteChatBlock';
import BuscadorTecnicoBlock from './blocks/BuscadorTecnicoBlock';
import BuscadorSemanticoBlock from './blocks/BuscadorSemanticoBlock';
import AltaRapidaClienteBlock from './blocks/AltaRapidaClienteBlock';
import useAtajoGlobal from './hooks/useAtajoGlobal';
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
import AgentePage from './pages/AgentePage';
import PedidosPage from './pages/PedidosPage';
import RadarPage from './pages/RadarPage';
import PropuestasVentaPage from './pages/PropuestasVentaPage';
import CampaniasPage from './pages/CampaniasPage';
import AsistenteVentasPage from './pages/AsistenteVentasPage';
import ConfigCrmPage from './pages/ConfigCrmPage';
import PlantillasMailPage from './pages/PlantillasMailPage';
import ImportadorPage from './pages/ImportadorPage';
import { authApi, configApi } from './api/api';
import { activarDebug, useDebugActivo } from './ui/DebugTag';
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
      // La clave de los borradores es por usuario: el id se guarda para usePersistentWork.
      if (res.data.user && res.data.user.id) localStorage.setItem('bookos_usuario_id', String(res.data.user.id));
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
  const { setContextoActual, emitirInstruccion } = useAppContext();
  const debug = useDebugActivo();

  useEffect(() => {
    const token = localStorage.getItem('bookos_token');
    if (!token) {
      setCargando(false);
      return;
    }
    authApi.me()
      .then((res) => {
        setUsuario(res.data);
        if (res.data && res.data.id) localStorage.setItem('bookos_usuario_id', String(res.data.id));
      })
      .catch(() => {
        localStorage.removeItem('bookos_token');
        localStorage.removeItem('bookos_usuario_id');
      })
      .finally(() => setCargando(false));
    // Marcas de debug: el toggle debug_mode del OS manda en caliente (Sistema > Config), sin
    // recompilar el front. VITE_DEBUG_MODE sigue siendo el piso: si esta en true, no lo apaga.
    configApi.obtener()
      .then((res) => {
        const t = (res.data.catalogo || []).find((c) => c.clave === 'debug_mode');
        const encendido = Boolean(t) && !(t.valor === false || t.valor === 'false' || t.valor === '0' || t.valor === '');
        activarDebug(encendido);
      })
      .catch(() => {});
  }, []);

  const cambiarVista = (nueva) => {
    setVista(nueva);
    setContextoActual(null);
  };

  // Teclas del OS (doc 06 D9): F2 = alta rapida de cliente, F6 = busqueda tecnica del mostrador,
  // F7 = busqueda semantica + asistente. El panel del Secretario arranca cerrado en la pagina del
  // Asistente (ahi el protagonista es el asistente de ventas) y abierto en el resto.
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [buscadorTecnico, setBuscadorTecnico] = useState(false);
  const [buscadorSemantico, setBuscadorSemantico] = useState(false);
  const [altaCliente, setAltaCliente] = useState(false);

  useEffect(() => { setPanelAbierto(vista !== 'Asistente'); }, [vista]);

  const alternarTecnico = useCallback(() => {
    setBuscadorTecnico((v) => !v);
    setBuscadorSemantico(false);
  }, []);
  const alternarSemantico = useCallback(() => {
    setBuscadorSemantico((v) => !v);
    setBuscadorTecnico(false);
  }, []);

  useAtajoGlobal('F6', alternarTecnico);
  useAtajoGlobal('F7', alternarSemantico);

  // F2 abre el alta rapida (no alterna): la tecla tiene que ser segura en el mostrador. Se apaga
  // mientras el modal esta abierto y ESC lo cierra.
  const abrirAltaCliente = useCallback(() => setAltaCliente(true), []);
  useAtajoGlobal('F2', abrirAltaCliente, { activo: !altaCliente });

  const salir = () => {
    localStorage.removeItem('bookos_token');
    localStorage.removeItem('bookos_usuario_id');
    setUsuario(null);
  };

  if (cargando) return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />;
  if (!usuario) return <Login onLogin={setUsuario} />;

  const esAdmin = usuario.rol === 'admin';

  return (
    <div className={`bookos-app${debug ? ' debug-watermark' : ''}`}>
      <Navbar vista={vista} onCambiarVista={cambiarVista} usuario={usuario} onLogout={salir} />
      <div className={`bookos-layout${panelAbierto ? '' : ' agente-cerrado'}`}>
        <main className="bookos-main p-6">
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
          {vista === 'Importador' && <ImportadorPage esAdmin={esAdmin} />}
          {vista === 'Referencias' && <ReferenciasPage />}
          {vista === 'Config' && <ConfigPage esAdmin={esAdmin} />}
          {vista === 'Empresa' && <EmpresaPage />}
          {vista === 'Usuarios' && <UsuariosPage esAdmin={esAdmin} />}
          {vista === 'Desarrollo' && <DesarrolloPage esAdmin={esAdmin} />}
          {vista === 'Salud' && <SaludPage esAdmin={esAdmin} />}
          {vista === 'Agente' && <AgentePage esAdmin={esAdmin} />}
          {vista === 'Propuestas Kernel' && <PropuestasPage esAdmin={esAdmin} />}
          {vista === 'Pesos' && <PesosPage esAdmin={esAdmin} />}
          {vista === 'Logs' && <LogsPage />}
          {vista === 'Cola' && <ColaPage />}
          {vista === 'Memoria' && <MemoriaPage esAdmin={esAdmin} />}
          {vista === 'Asistente' && <AsistenteVentasPage />}
          {vista === 'Pedidos' && <PedidosPage />}
          {vista === 'Radar' && <RadarPage />}
          {vista === 'Propuestas' && <PropuestasVentaPage />}
          {vista === 'Campañas' && <CampaniasPage />}
          {vista === 'Config CRM' && <ConfigCrmPage />}
          {vista === 'Plantillas mail' && <PlantillasMailPage />}
        </main>
        <AgenteChatBlock abierto={panelAbierto} onAlternar={() => setPanelAbierto((v) => !v)} />
      </div>
      <BuscadorTecnicoBlock
        abierto={buscadorTecnico}
        onCerrar={() => setBuscadorTecnico(false)}
        enFacturar={vista === 'Facturar'}
        onIrACatalogo={() => cambiarVista('Catalogo')}
      />
      <BuscadorSemanticoBlock
        abierto={buscadorSemantico}
        onCerrar={() => setBuscadorSemantico(false)}
        enFacturar={vista === 'Facturar'}
        onAbrirAsistente={() => cambiarVista('Asistente')}
      />
      {/* F2 desde cualquier vista. El cliente creado se anuncia por el bus de instrucciones (una
          sola vez): la vista que sepa tomarlo lo elige (la factura minorista y los pedidos). */}
      <AltaRapidaClienteBlock
        abierto={altaCliente}
        onCerrar={() => setAltaCliente(false)}
        contexto="Queda elegido en la factura o en el pedido"
        onCreado={(cliente) => emitirInstruccion({ dominio: 'clientes', accion: 'cliente_creado', cliente })}
      />
    </div>
  );
}
