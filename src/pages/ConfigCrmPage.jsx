// BookOS - ConfigCrmPage.jsx
// ruta: bookos/frontend/src/pages/ConfigCrmPage.jsx
// descripcion: configuracion del CRM (doc 06): mail (SMTP con prueba de envio real), Telegram
//   (bot con prueba) y los toggles del modulo (notificaciones, radar, envio a proveedor).
//   El password/token nunca vuelven de la API (se muestran enmascarados).

import { useEffect, useState } from 'react';
import Toggle from '../ui/Toggle';
import DebugTag from '../ui/DebugTag';
import Input from '../ui/Input';
import { configApi, mailerApi, telegramApi } from '../api/api';

const TOGGLES_CRM = [
  'NOTIFICACIONES_ENABLED',
  'RADAR_ENABLED',
  'TELEGRAM_ENABLED',
  'ENVIO_PROVEEDOR_ENABLED',
];

export default function ConfigCrmPage() {
  const [toggles, setToggles] = useState({});
  const [mailer, setMailer] = useState(null);
  const [mailForm, setMailForm] = useState({ host: '', port: '', user: '', pass: '', from: '' });
  const [pruebaMail, setPruebaMail] = useState('');
  const [telegram, setTelegram] = useState(null);
  const [tgForm, setTgForm] = useState({ token: '', chatId: '' });
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    try {
      const cfg = await configApi.obtener();
      setToggles(cfg.data.toggles || {});
      const m = await mailerApi.estado();
      setMailer(m.data);
      setMailForm((prev) => ({
        host: m.data.host || '',
        port: m.data.port || '',
        user: m.data.user || '',
        pass: '',
        from: m.data.from || '',
      }));
      setPruebaMail((prev) => prev || m.data.from || '');
      const t = await telegramApi.estado();
      setTelegram(t.data);
      setTgForm({ token: '', chatId: t.data.chatId || '' });
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const valorToggle = (clave) => {
    const v = toggles[clave];
    if (v === undefined || v === null || v === '') return false;
    return !(v === false || v === 'false' || v === '0');
  };

  const cambiarToggle = async (clave, valor) => {
    try {
      await configApi.setToggle(clave, valor);
      setMensaje(`Toggle ${clave} → ${valor ? 'activo' : 'apagado'}`);
      cargar();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    }
  };

  const guardarMail = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const r = await mailerApi.guardar({
        host: mailForm.host,
        port: Number(mailForm.port) || undefined,
        user: mailForm.user,
        from: mailForm.from,
        ...(mailForm.pass ? { pass: mailForm.pass } : {}),
      });
      setMensaje(`Mail guardado (${r.data.configurado ? 'configurado' : 'incompleto: falta host/usuario/password'}).`);
      cargar();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const probarMail = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const r = await mailerApi.probar(pruebaMail);
      setMensaje(`✓ ${r.message || `Prueba enviada a ${pruebaMail}`}`);
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const guardarTg = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const r = await telegramApi.guardar({
        chatId: tgForm.chatId,
        ...(tgForm.token ? { token: tgForm.token } : {}),
      });
      setMensaje(`Telegram guardado (${r.data.configurado ? 'configurado' : 'incompleto: falta token/chat'}).`);
      cargar();
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const probarTg = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const r = await telegramApi.probar();
      setMensaje(`✓ ${r.message || 'Mensaje de prueba enviado'}`);
    } catch (err) {
      setMensaje(`⚠️ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <DebugTag nombre="ConfigCrmPage" />
      <h2 className="text-lg font-semibold mb-1">Configuracion del CRM</h2>
      <p className="text-sm text-muted mb-4">
        Mail y Telegram del modulo, y los interruptores de notificaciones. Las claves se guardan en la base
        (nunca se devuelven completas) y las pruebas mandan un mensaje real.
      </p>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Mail (SMTP)</h3>
          <span className="agente-badge" style={{ color: mailer && mailer.configurado ? '#15803d' : 'var(--danger)' }}>
            {mailer ? (mailer.configurado ? 'configurado' : 'sin configurar') : '...'}
          </span>
        </div>
        <div className="form-grid">
          <Input label="Servidor (host)" value={mailForm.host} onChange={(e) => setMailForm({ ...mailForm, host: e.target.value })} placeholder="smtp.gmail.com" />
          <Input label="Puerto" type="number" value={mailForm.port} onChange={(e) => setMailForm({ ...mailForm, port: e.target.value })} placeholder="587" />
          <Input label="Usuario" value={mailForm.user} onChange={(e) => setMailForm({ ...mailForm, user: e.target.value })} placeholder="cuenta@gmail.com" />
          <Input label="Password (dejar vacío para no cambiarla)" type="password" value={mailForm.pass} onChange={(e) => setMailForm({ ...mailForm, pass: e.target.value })} placeholder={mailer && mailer.pass ? mailer.pass : ''} />
          <Input label="Remitente (from)" value={mailForm.from} onChange={(e) => setMailForm({ ...mailForm, from: e.target.value })} placeholder="Librería El Maltés <cuenta@gmail.com>" />
        </div>
        <div className="flex items-end gap-2 flex-wrap mt-1">
          <button type="button" className="btn btn-primary text-sm" disabled={cargando} onClick={guardarMail}>Guardar mail</button>
          <label className="text-sm flex-1 min-w-[220px]">
            <span className="field-label">Probar envío a</span>
            <input className="input-os" value={pruebaMail} onChange={(e) => setPruebaMail(e.target.value)} placeholder="destino@ejemplo.com" />
          </label>
          <button type="button" className="btn text-sm" disabled={cargando || !pruebaMail} onClick={probarMail}>Enviar prueba</button>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Telegram (avisos internos)</h3>
          <span className="agente-badge" style={{ color: telegram && telegram.configurado ? '#15803d' : 'var(--danger)' }}>
            {telegram ? (telegram.configurado ? 'configurado' : 'sin configurar') : '...'}
          </span>
        </div>
        <div className="form-grid">
          <Input label="Token del bot" value={tgForm.token} onChange={(e) => setTgForm({ ...tgForm, token: e.target.value })} placeholder={telegram && telegram.token ? telegram.token : '123456:ABC-DEF...'} />
          <Input label="Chat id" value={tgForm.chatId} onChange={(e) => setTgForm({ ...tgForm, chatId: e.target.value })} placeholder="-1001234567890" />
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <button type="button" className="btn btn-primary text-sm" disabled={cargando} onClick={guardarTg}>Guardar Telegram</button>
          <button type="button" className="btn text-sm" disabled={cargando || !(telegram && telegram.configurado)} onClick={probarTg}>Enviar prueba</button>
          <span className="text-xs text-muted">Creá el bot con @BotFather y pasale el chat id del grupo o chat interno.</span>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Interruptores del CRM</h3>
        <div className="space-y-3">
          {TOGGLES_CRM.map((clave) => (
            <div key={clave} className="flex items-center gap-3">
              <Toggle activo={valorToggle(clave)} onChange={(v) => cambiarToggle(clave, v)} />
              <span className="text-sm font-mono">{clave}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          NOTIFICACIONES = avisos a clientes (ingresos/agotados) · RADAR = detección de ingresos ·
          TELEGRAM = avisos internos · ENVIO_PROVEEDOR = pedidos automáticos (hoy apagado: sale solo el mail de control).
        </p>
      </div>
    </div>
  );
}
