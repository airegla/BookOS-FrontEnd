// BookOS - MemoriaPage.jsx
// ruta: bookos/frontend/src/pages/MemoriaPage.jsx
// descripcion: panel de Memoria del Secretario. Muestra lo que quedo guardado por tipo
//   (nota, buena_practica, decision, ultimo_trabajo), permite filtrar, descargar y (admin)
//   eliminar entradas. La memoria entra al prompt del agente en cada turno.

import { useCallback, useEffect, useState } from 'react';
import DebugTag from '../ui/DebugTag';
import { agenteApi } from '../api/api';
import { descargarCsv } from '../utils/exportar';

const TIPOS = ['', 'nota', 'buena_practica', 'decision', 'ultimo_trabajo'];

export default function MemoriaPage({ esAdmin }) {
  const [filas, setFilas] = useState([]);
  const [tipo, setTipo] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso('');
    try {
      const res = await agenteApi.memoria(tipo ? { tipo, limit: 200 } : { limit: 200 });
      setFilas(res.data || []);
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, [tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id) => {
    if (!window.confirm(`Eliminar la entrada #${id} de la memoria. ¿Confirmás?`)) return;
    try {
      await agenteApi.memoriaEliminar(id);
      setAviso(`Entrada ${id} eliminada`);
      await cargar();
    } catch (err) {
      setAviso(`⚠️ ${err.message}`);
    }
  };

  const exportar = () => {
    const planas = filas.map((m) => ({ id: m.id, tipo: m.tipo, origen: m.origen || 'historica (sin firmar)', texto: m.texto, fecha: new Date(m.fecha).toLocaleString('es-AR') }));
    descargarCsv('memoria_secretario', [
      { titulo: 'id', clave: 'id' }, { titulo: 'tipo', clave: 'tipo' }, { titulo: 'origen', clave: 'origen' }, { titulo: 'texto', clave: 'texto' }, { titulo: 'fecha', clave: 'fecha' },
    ], planas);
  };

  return (
    <div>
      <DebugTag nombre="MemoriaPage" />
      <h2 className="text-lg font-semibold mb-1">Memoria del Secretario</h2>
      <p className="text-sm text-muted mb-4">
        Memoria curada que entra al prompt del agente: notas, buenas prácticas y decisiones. El último
        trabajo se guarda solo; el resto lo escribe el operario (o el agente con <span className="font-mono">memoria_guardar</span>).
        Cada entrada va <strong>firmada</strong> con su origen: sin eso una nota tuya y una generada por el
        agente o el cron se leen igual. Las anteriores a la firma dicen <span className="font-mono">sin firmar</span>.
      </p>
      {aviso && <p className="text-sm mb-3">{aviso}</p>}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select className="input-os" style={{ maxWidth: 220 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t} value={t}>{t === '' ? 'todos los tipos' : t}</option>)}
        </select>
        <button type="button" className="btn btn-ghost text-sm" onClick={cargar} disabled={cargando}>Refrescar</button>
        {filas.length > 0 && <button type="button" className="btn btn-ghost text-sm" onClick={exportar}>⬇ Descargar</button>}
        <span className="text-xs text-muted">{filas.length} entradas</span>
      </div>

      {filas.length === 0 && !cargando && <p className="text-sm text-muted">Sin entradas para ese filtro.</p>}
      <div className="space-y-1">
        {filas.map((m) => (
          <div key={m.id} className="card p-2 flex items-center gap-2">
            <span className="agente-badge">{m.tipo}</span>
            <span className="agente-badge" title="Quien escribio esta entrada">{m.origen || 'sin firmar'}</span>
            <span className="text-sm flex-1">{m.texto}</span>
            <span className="text-xs text-muted font-mono whitespace-nowrap">{new Date(m.fecha).toLocaleString('es-AR')}</span>
            {esAdmin && (
              <button type="button" className="btn btn-ghost text-xs" onClick={() => eliminar(m.id)} title="Eliminar entrada">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
