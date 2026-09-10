// BookOS - EmpresaPage.jsx
// ruta: bookos/frontend/src/pages/EmpresaPage.jsx
// descripcion: datos de la empresa (fiscales AR por defecto). Editable, nunca
//   eliminable: no existe boton de borrar.

import { useEffect, useState } from 'react';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { empresaApi } from '../api/api';

export default function EmpresaPage() {
  const [form, setForm] = useState(null);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    empresaApi.obtener().then((res) => setForm(res.data || {})).catch(() => {});
  }, []);

  const guardar = async () => {
    try {
      const res = await empresaApi.actualizar(form);
      setForm(res.data);
      setMensaje('Empresa actualizada ✓ (indegradable: no se puede eliminar)');
    } catch (err) { setMensaje(`⚠️ ${err.message}`); }
  };

  if (!form) return <div><DebugTag nombre="EmpresaPage" /><p className="text-muted">Cargando...</p></div>;

  const esAr = form.pais === 'AR';

  return (
    <div>
      <DebugTag nombre="EmpresaPage" />
      <h2 className="text-lg font-semibold mb-4">Empresa</h2>
      {mensaje && <p className="text-sm mb-3">{mensaje}</p>}

      <div className="card p-4 max-w-lg">
        <Input label="Nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Pais</span>
          <select className="input-os" value={form.pais || 'AR'} onChange={(e) => setForm({ ...form, pais: e.target.value })}>
            <option value="AR">Argentina</option>
            <option value="ES">Espana</option>
            <option value="UY">Uruguay</option>
          </select>
        </label>
        <Input label="Rubro" value={form.rubro || ''} onChange={(e) => setForm({ ...form, rubro: e.target.value })} />
        {esAr && (
          <>
            <Input label="CUIT" value={form.cuit || ''} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
            <label className="block mb-3">
              <span className="block text-xs uppercase tracking-widest text-muted mb-1">Condicion IVA</span>
              <select className="input-os" value={form.condicionIva || ''} onChange={(e) => setForm({ ...form, condicionIva: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
              </select>
            </label>
          </>
        )}
        <button type="button" className="btn btn-primary" onClick={guardar}>Guardar</button>
      </div>
    </div>
  );
}
