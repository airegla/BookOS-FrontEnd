// BookOS - ImportadorPage.jsx
// ruta: bookos/frontend/src/pages/ImportadorPage.jsx
// descripcion: importacion masiva por CSV (plan 09). Admin importa catalogo y referencias;
//   todo el equipo actualiza precios (con bloqueo opcional de bajas). Flujo: config -> mapeo de
//   columnas -> preview sin efectos -> aplicacion por lotes -> historial con detalle por fila
//   y descargas. Regla: lo que no se mapea, no se modifica.

import { useEffect, useState } from 'react';
import { importadorApi } from '../api/api';
import { parsearCsv } from '../utils/csv';
import { descargarCsv, descargarDesdeServidor } from '../utils/exportar';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Paginador from '../ui/Paginador';

const LOTE = 1000;
const LIMITE_HISTORIAL = 20;
const LIMITE_DETALLE = 50;

const ENTIDADES = {
  catalogo: {
    label: 'Catalogo (articulos)',
    solaAdmin: true,
    campos: [
      { id: 'ean', label: 'ISBN / Codigo (clave)', requerido: true, desc: 'EAN13, ISBN o codigo interno: identifica la fila' },
      { id: 'titulo', label: 'Titulo', requerido: true, desc: 'Obligatorio para crear (un libro siempre tiene titulo)' },
      { id: 'precio', label: 'Precio de venta' },
      { id: 'costo', label: 'Costo' },
      { id: 'stock', label: 'Stock firme', desc: 'Si no lo mapeas, el stock no se toca' },
      { id: 'consigna_actual', label: 'Consigna actual' },
      { id: 'consigna_original', label: 'Consigna original', desc: 'Techo de la consigna (la actual no puede superarla)' },
      { id: 'editorial', label: 'Editorial (nombre)', desc: 'Si no viene, se detecta por la raiz del ISBN' },
      { id: 'autor', label: 'Autor (nombre)' },
      { id: 'raiz', label: 'Raiz ISBN de la editorial', desc: 'Solo para editoriales nuevas del archivo' },
      { id: 'fantasia', label: 'Nombre de fantasia (editorial)' },
    ],
  },
  autores: {
    label: 'Autores',
    solaAdmin: true,
    campos: [{ id: 'nombre', label: 'Nombre', requerido: true }],
  },
  editoriales: {
    label: 'Editoriales',
    solaAdmin: true,
    campos: [
      { id: 'nombre', label: 'Nombre (razon social)', requerido: true },
      { id: 'fantasia', label: 'Nombre de fantasia' },
      { id: 'raiz', label: 'Raiz ISBN' },
    ],
  },
  materias: {
    label: 'Materias',
    solaAdmin: true,
    campos: [
      { id: 'nombre', label: 'Descripcion', requerido: true },
      { id: 'codigo', label: 'Codigo' },
    ],
  },
  precios: {
    label: 'Precios',
    solaAdmin: false,
    campos: [
      { id: 'ean', label: 'ISBN / Codigo (clave)', requerido: true },
      { id: 'precio', label: 'Precio nuevo', requerido: true },
    ],
  },
};

const ALIAS_FRONT = {
  ean: ['ean13', 'ean', 'codigo', 'codigo_barras', 'cod_barras', 'cod', 'barras', 'isbn'],
  titulo: ['titulo', 'nombre', 'descripcion'],
  precio: ['precio', 'precio_lista', 'pvp', 'precio_venta'],
  costo: ['costo', 'precio_costo', 'neto'],
  stock: ['stock', 'stock_actual', 'stock_firme', 'cantidad', 'unidades'],
  consigna_actual: ['consigna', 'consigna_actual', 'stock_consigna'],
  consigna_original: ['consigna_original'],
  editorial: ['editorial', 'editorial_nombre'],
  autor: ['autor', 'autor_nombre'],
  raiz: ['raiz', 'numero_raiz', 'raiz_isbn'],
  fantasia: ['fantasia', 'nombre_fantasia', 'sello'],
  nombre: ['nombre', 'razon_social', 'razon', 'descripcion', 'titulo'],
  codigo: ['codigo', 'cod'],
};

const norm = (s) => String(s ?? '').toLowerCase().trim().replace(/[\s.]+/g, '_');
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const money = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('es-AR')}`);
const fecha = (f) => new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const MODO_LABEL = {
  crear_actualizar: 'Crear y actualizar',
  upsert: 'Crear y actualizar',
  solo_nuevos: 'Solo nuevos',
  solo_actualizar: 'Solo existentes',
  solo_precios: 'Solo precios',
};

const COLOR_ESTADO = {
  CREADO: '#157347',
  ACTUALIZADO: '#0d6efd',
  ERROR: '#dc3545',
  OMITIDO: '#b8860b',
  COMPLETADA: '#157347',
  EN_PROCESO: '#b8860b',
};

function EstadoBadge({ estado }) {
  return (
    <span className="text-xs font-semibold" style={{ color: COLOR_ESTADO[estado] || 'var(--muted)' }}>
      {estado}
    </span>
  );
}

function claveDe(filaDatos) {
  if (!filaDatos) return '';
  const claves = ['cod', 'codigo', 'ean13', 'ean', 'isbn', 'barras', 'codigo_barras', 'clave'];
  const encontrada = Object.keys(filaDatos).find((k) => claves.includes(norm(k)));
  return encontrada ? String(filaDatos[encontrada]) : '';
}

function autoMapeo(entidadId, encabezados) {
  const m = {};
  for (const c of ENTIDADES[entidadId].campos) {
    const alias = ALIAS_FRONT[c.id] || [c.id];
    const col = encabezados.find((h) => alias.includes(norm(h)));
    if (col) m[c.id] = col;
  }
  return m;
}

export default function ImportadorPage({ esAdmin = false }) {
  const [tab, setTab] = useState(esAdmin ? 'importar' : 'precios');
  const [archivo, setArchivo] = useState(null);
  const [mapeo, setMapeo] = useState({});
  const [modo, setModo] = useState('crear_actualizar');
  const [soloSubir, setSoloSubir] = useState(false);
  const [preview, setPreview] = useState(null);
  const [decisiones, setDecisiones] = useState({});
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [hist, setHist] = useState({ total: 0, filas: [] });
  const [histPage, setHistPage] = useState(1);
  const [detalle, setDetalle] = useState(null);

  const esPrecios = tab === 'precios';
  const entidadId = tab === 'precios' ? 'precios' : 'catalogo';
  const ENT = ENTIDADES[entidadId];

  const resetFlujo = () => {
    setArchivo(null);
    setMapeo({});
    setModo('crear_actualizar');
    setSoloSubir(false);
    setPreview(null);
    setDecisiones({});
    setProgreso(null);
    setResultado(null);
    setError('');
    setAviso('');
  };

  useEffect(() => { resetFlujo(); }, [tab]);

  const cargarHistorial = async (p) => {
    try {
      const r = await importadorApi.historial({ page: p, limite: LIMITE_HISTORIAL });
      setHist(r.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    if (tab === 'historial') cargarHistorial(histPage);
  }, [tab, histPage]);

  // ── Paso 1: archivo ──────────────────────────────────────────────────────────
  const alElegirArchivo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    setAviso('');
    const reader = new FileReader();
    reader.onload = () => {
      let texto;
      try {
        texto = new TextDecoder('utf-8', { fatal: true }).decode(reader.result);
      } catch (_) {
        texto = new TextDecoder('iso-8859-1').decode(reader.result);
        setAviso('El archivo no esta en UTF-8: se leyo como ISO-8859-1 (Latin-1).');
      }
      const { encabezados, filas } = parsearCsv(texto);
      if (!encabezados.length || !filas.length) {
        setError('No se pudieron leer columnas y filas del archivo. Verifica que sea un CSV valido.');
        return;
      }
      setArchivo({ nombre: file.name, encabezados, filas, texto });
      setMapeo(autoMapeo(entidadId, encabezados));
      setPreview(null);
      setResultado(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const ejemploDe = (campo) => {
    const col = mapeo[campo.id];
    if (!col || !archivo) return '—';
    const f = archivo.filas[0] || {};
    const valor = f[col];
    return valor === undefined || valor === '' ? '—' : String(valor).slice(0, 40);
  };

  // ── Paso 2: preview ──────────────────────────────────────────────────────────
  const previsualizar = async () => {
    setError('');
    setAviso('');
    const requeridos = ENT.campos.filter((c) => c.requerido && !mapeo[c.id]);
    if (requeridos.length) {
      setError(`Falta mapear: ${requeridos.map((c) => c.label).join(', ')}.`);
      return;
    }
    setCargando(true);
    try {
      const filasMuestra = archivo.filas.slice(0, 5000);
      const payload = { entidad: 'catalogo', filas: filasMuestra, mapeo, modo: esPrecios ? 'solo_precios' : modo, soloSubir };
      const r = esPrecios ? await importadorApi.previsualizarPrecios(payload) : await importadorApi.preview(payload);
      const prev = r.data;
      setPreview(prev);
      if (archivo.filas.length > 5000) {
        setAviso('El preview cubre las primeras 5000 filas; la aplicacion procesa el archivo completo por lotes.');
      }
      const refs = [...((prev.referencias && prev.referencias.autores) || []), ...((prev.referencias && prev.referencias.editoriales) || [])];
      const d = {};
      for (const ref of refs) {
        if (ref.estado === 'parecido') d[`${ref.tabla}:${plano(ref.nombre)}`] = { accion: 'usar', id: ref.id };
      }
      setDecisiones(d);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Paso 3: aplicar por lotes ────────────────────────────────────────────────
  const aplicar = async () => {
    setError('');
    setCargando(true);
    setProgreso({ hechas: 0, total: archivo.filas.length });
    try {
      const acum = { insertados: 0, actualizados: 0, errores: 0, omitidos: 0, stockAjustado: 0 };
      let importacionId = null;
      for (let i = 0; i < archivo.filas.length; i += LOTE) {
        const payload = {
          importacionId,
          entidad: 'catalogo',
          filas: archivo.filas.slice(i, i + LOTE),
          mapeo,
          modo: esPrecios ? 'solo_precios' : modo,
          soloSubir,
          decisiones: esPrecios ? {} : decisiones,
          archivoTexto: i === 0 ? archivo.texto : null,
        };
        const r = esPrecios ? await importadorApi.aplicarPrecios(payload) : await importadorApi.aplicar(payload);
        importacionId = r.data.importacionId;
        acum.insertados += r.data.insertados;
        acum.actualizados += r.data.actualizados;
        acum.errores += r.data.errores;
        acum.omitidos += r.data.omitidos;
        acum.stockAjustado += r.data.stockAjustado;
        setProgreso({ hechas: Math.min(i + LOTE, archivo.filas.length), total: archivo.filas.length });
      }
      await importadorApi.finalizar({ importacionId });
      setResultado({ importacionId, ...acum });
      setArchivo(null);
      setMapeo({});
      setPreview(null);
      setProgreso(null);
      if (tab === 'historial') cargarHistorial(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setCargando(false);
      setProgreso(null);
    }
  };

  // ── Historial ────────────────────────────────────────────────────────────────
  const abrirDetalle = async (imp, page = 1) => {
    try {
      const r = await importadorApi.detalle(imp.id, { page, limit: LIMITE_DETALLE });
      setDetalle({ importacion: imp, page, ...r.data });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const descargarResultado = async (imp) => {
    try {
      const r = await importadorApi.detalle(imp.id, { page: 1, limit: 500 });
      const filas = r.data.filas.map((f) => ({
        estado: f.estado,
        clave: claveDe(f.datosFila),
        mensaje: f.mensaje || '',
        precio: f.precioNuevo !== null && f.precioNuevo !== undefined ? f.precioNuevo : '',
        deltaFirme: f.deltaFirme ?? '',
        deltaConsigna: f.deltaConsignaActual ?? '',
      }));
      descargarCsv(`importacion_${imp.id}`, [
        { titulo: 'Estado', clave: 'estado' },
        { titulo: 'Clave', clave: 'clave' },
        { titulo: 'Mensaje', clave: 'mensaje' },
        { titulo: 'Precio nuevo', clave: 'precio' },
        { titulo: 'Delta firme', clave: 'deltaFirme' },
        { titulo: 'Delta consigna', clave: 'deltaConsigna' },
      ], filas);
      if (r.data.total > 500) setAviso(`El CSV incluye las primeras 500 de ${r.data.total} filas del detalle.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const descargarOriginal = (imp) => {
    if (!imp.archivoId) return;
    descargarDesdeServidor(`/api/archivos/${imp.archivoId}/descarga`, `importacion_${imp.id}_original.csv`);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const TABS = [
    ...(esAdmin ? [{ id: 'importar', label: 'Importar (catalogo y referencias)' }] : []),
    { id: 'precios', label: 'Actualizar precios' },
    { id: 'historial', label: 'Historial' },
  ];

  const columnasMapeo = [
    {
      titulo: 'Campo',
      clave: 'id',
      render: (c) => (
        <div>
          <div className="font-semibold text-sm">{c.label}{c.requerido ? ' *' : ''}</div>
          {c.desc && <div className="text-xs text-muted">{c.desc}</div>}
        </div>
      ),
    },
    {
      titulo: 'Columna del archivo',
      clave: 'col',
      render: (c) => (
        <select
          className="input-os"
          value={mapeo[c.id] || ''}
          onChange={(e) => setMapeo({ ...mapeo, [c.id]: e.target.value || undefined })}
        >
          <option value="">— Ignorar (no se toca) —</option>
          {(archivo?.encabezados || []).map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      ),
    },
    { titulo: 'Ejemplo (fila 1)', clave: 'ej', render: (c) => <span className="text-xs text-muted">{ejemploDe(c)}</span> },
  ];

  const refsParecidas = preview
    ? [...((preview.referencias && preview.referencias.autores) || []), ...((preview.referencias && preview.referencias.editoriales) || [])].filter((r) => r.estado === 'parecido')
    : [];

  const columnasMuestra = esPrecios
    ? [
      { titulo: 'Clave', clave: 'clave' },
      { titulo: 'Titulo', clave: 'titulo', render: (f) => <span className="text-xs">{f.titulo || '—'}</span> },
      { titulo: 'Precio actual', clave: 'pa', render: (f) => money(f.precio && f.precio.antes) },
      { titulo: 'Precio nuevo', clave: 'pn', render: (f) => money(f.precio && f.precio.despues) },
      { titulo: 'Estado', clave: 'e', render: (f) => <span className="text-xs">{f.estado}</span> },
    ]
    : [
      { titulo: 'Clave', clave: 'clave' },
      { titulo: 'Titulo', clave: 'titulo', render: (f) => <span className="text-xs">{f.titulo || '—'}</span> },
      { titulo: 'Precio antes', clave: 'pa', render: (f) => money(f.precio && f.precio.antes) },
      { titulo: 'Precio nuevo', clave: 'pn', render: (f) => money(f.precio && f.precio.despues) },
      { titulo: 'Stock antes', clave: 'sa', render: (f) => (f.stock && f.stock.antes !== null ? f.stock.antes : '—') },
      { titulo: 'Stock nuevo', clave: 'sn', render: (f) => (f.stock && f.stock.despues !== null ? f.stock.despues : '—') },
      { titulo: 'Base', clave: 'es', render: (f) => <span className="text-xs text-muted">{f.estado}</span> },
    ];

  const columnasHistorial = [
    { titulo: '#', clave: 'id' },
    { titulo: 'Fecha', clave: 'fecha', render: (f) => <span className="text-xs">{fecha(f.createdAt)}</span> },
    { titulo: 'Entidad', clave: 'entidad', render: (f) => <span className="text-xs">{(ENTIDADES[f.entidad] && ENTIDADES[f.entidad].label) || f.entidad}</span> },
    { titulo: 'Modo', clave: 'modo', render: (f) => <span className="text-xs">{MODO_LABEL[f.modo] || f.modo}</span> },
    { titulo: 'Estado', clave: 'estado', render: (f) => <EstadoBadge estado={f.estado} /> },
    {
      titulo: 'Resultado',
      clave: 'res',
      render: (f) => (
        <span className="text-xs">
          {f.insertados} nuevos · {f.actualizados} act. · {f.errores} err. · {f.omitidos} omit.
        </span>
      ),
    },
    {
      titulo: 'Acciones',
      clave: 'acc',
      render: (f) => (
        <div className="flex gap-1 flex-wrap">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => abrirDetalle(f, 1)}>Ver</button>
          <button type="button" className="btn btn-ghost text-xs" onClick={() => descargarResultado(f)}>CSV resultado</button>
          {f.archivoId && (
            <button type="button" className="btn btn-ghost text-xs" onClick={() => descargarOriginal(f)}>CSV original</button>
          )}
        </div>
      ),
    },
  ];

  const columnasDetalle = [
    { titulo: '#', clave: 'id' },
    { titulo: 'Estado', clave: 'estado', render: (f) => <EstadoBadge estado={f.estado} /> },
    { titulo: 'Clave', clave: 'clave', render: (f) => <span className="text-xs">{claveDe(f.datosFila) || '—'}</span> },
    { titulo: 'Motivo', clave: 'mensaje', render: (f) => <span className="text-xs">{f.mensaje || '—'}</span> },
    {
      titulo: 'Cambios',
      clave: 'cam',
      render: (f) => (
        <span className="text-xs">
          {f.precioAnterior !== null && f.precioNuevo !== null ? `${money(f.precioAnterior)} → ${money(f.precioNuevo)}` : ''}
          {f.deltaFirme ? ` · firme ${f.deltaFirme > 0 ? '+' : ''}${f.deltaFirme}` : ''}
          {f.deltaConsignaActual ? ` · consigna ${f.deltaConsignaActual > 0 ? '+' : ''}${f.deltaConsignaActual}` : ''}
          {f.deltaConsignaOriginal ? ` · consigna orig. ${f.deltaConsignaOriginal > 0 ? '+' : ''}${f.deltaConsignaOriginal}` : ''}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="text-lg font-black">Importador masivo (CSV)</h2>
          <p className="text-xs text-muted">
            Catalogo y referencias: solo administradores. Precios: todo el equipo.
            Lo que no se mapea, no se modifica.
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="card p-3 mb-3 text-sm" style={{ borderLeft: '4px solid #dc3545' }}>{error}</div>}
      {aviso && <div className="card p-3 mb-3 text-sm" style={{ borderLeft: '4px solid #b8860b' }}>{aviso}</div>}

      {tab !== 'historial' && (
        <div className="card p-3 mb-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="field-label">Que se importa</label>
              <input className="input-os" value={ENT.label} disabled readOnly />
            </div>
            {!esPrecios && (
              <div>
                <label className="field-label">Modo</label>
                <select className="input-os" value={modo} onChange={(e) => setModo(e.target.value)}>
                  <option value="crear_actualizar">Crear y actualizar</option>
                  <option value="solo_nuevos">Solo nuevos</option>
                  <option value="solo_actualizar">Solo existentes</option>
                </select>
              </div>
            )}
            {esPrecios && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={soloSubir} onChange={(e) => setSoloSubir(e.target.checked)} />
                No bajar precios (solo subir)
              </label>
            )}
            <div>
              <label className="field-label">Archivo CSV</label>
              <input type="file" accept=".csv,text/csv" className="input-os" onChange={alElegirArchivo} />
            </div>
            {archivo && (
              <div className="text-xs text-muted">
                {archivo.nombre} · {archivo.filas.length} filas · {archivo.encabezados.length} columnas
              </div>
            )}
          </div>
        </div>
      )}

      {tab !== 'historial' && archivo && (
        <div className="card p-3 mb-3">
          <h3 className="font-semibold mb-2 text-sm">Mapeo de columnas (paso 2)</h3>
          <Table columnas={columnasMapeo} filas={ENT.campos} vacio="Sin campos" />
          <div className="flex gap-2 mt-3">
            <button type="button" className="btn btn-primary" disabled={cargando} onClick={previsualizar}>
              {cargando && !progreso ? 'Analizando…' : 'Previsualizar (sin efectos)'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetFlujo}>Cancelar</button>
          </div>
        </div>
      )}

      {tab !== 'historial' && preview && (
        <div className="card p-3 mb-3">
          <h3 className="font-semibold mb-2 text-sm">Previsualizacion</h3>
          <div className="flex gap-3 flex-wrap mb-2 text-sm">
            <span className="card px-2 py-1">{preview.total} filas</span>
            <span className="card px-2 py-1">{preview.nuevos ?? preview.resumen?.nuevos ?? 0} nuevas</span>
            {!esPrecios && <span className="card px-2 py-1">{preview.coincidentes} existentes</span>}
            {!esPrecios && <span className="card px-2 py-1">{preview.sinCodigo} sin codigo</span>}
            {!esPrecios && <span className="card px-2 py-1">{preview.duplicadasEnArchivo} repetidas</span>}
            {!esPrecios && preview.precios && (
              <span className="card px-2 py-1">precios: {preview.precios.suben} suben · {preview.precios.bajan} bajan · {preview.precios.iguales} igual</span>
            )}
            {!esPrecios && preview.stock && <span className="card px-2 py-1">stock: {preview.stock.cambia} cambian</span>}
          </div>

          {(preview.avisos || []).length > 0 && (
            <ul className="text-xs mb-2" style={{ paddingLeft: 18 }}>
              {preview.avisos.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}

          {refsParecidas.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Nombres parecidos a existentes (confirmar antes de crear)</h4>
              {refsParecidas.map((r) => {
                const key = `${r.tabla}:${plano(r.nombre)}`;
                const dec = decisiones[key] || { accion: 'usar', id: r.id };
                return (
                  <div key={key} className="card p-2 mb-1">
                    <div className="text-sm mb-1">
                      <b>{r.nombre}</b> se parece a <b>{r.existente}</b> ({Math.round(r.similitud * 100)}%)
                    </div>
                    <label className="text-xs mr-3">
                      <input
                        type="radio"
                        checked={dec.accion === 'usar'}
                        onChange={() => setDecisiones({ ...decisiones, [key]: { accion: 'usar', id: r.id } })}
                      />{' '}
                      Usar el existente
                    </label>
                    <label className="text-xs">
                      <input
                        type="radio"
                        checked={dec.accion === 'crear'}
                        onChange={() => setDecisiones({ ...decisiones, [key]: { accion: 'crear' } })}
                      />{' '}
                      Crear uno nuevo
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {preview.muestra && preview.muestra.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Muestra</h4>
              <Table columnas={columnasMuestra} filas={preview.muestra} vacio="Sin muestra" />
            </div>
          )}

          {preview.referencias && (preview.referencias.autores || preview.referencias.editoriales) && (
            <div className="text-xs text-muted mb-3">
              {preview.referencias.editoriales && (
                <div>Editoriales del archivo: {preview.referencias.editoriales.length} ({preview.referencias.editoriales.filter((r) => r.estado === 'nuevo').length} nuevas)</div>
              )}
              {preview.referencias.autores && (
                <div>Autores del archivo: {preview.referencias.autores.length} ({preview.referencias.autores.filter((r) => r.estado === 'nuevo').length} nuevos)</div>
              )}
            </div>
          )}

          {progreso ? (
            <div className="mt-2">
              <div className="text-xs mb-1">{progreso.hechas} / {progreso.total} filas aplicadas…</div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                <div style={{ height: 8, width: `${Math.round((progreso.hechas / progreso.total) * 100)}%`, background: 'var(--accent)', borderRadius: 4 }} />
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary mt-2" disabled={cargando} onClick={aplicar}>
              Confirmar importacion ({archivo ? archivo.filas.length : 0} filas, de a {LOTE})
            </button>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="card p-3">
          <h3 className="font-semibold mb-2 text-sm">Historial de importaciones</h3>
          <Table columnas={columnasHistorial} filas={hist.filas} vacio="Todavia no hay importaciones" />
          <Paginador
            page={histPage}
            total={hist.total}
            limite={LIMITE_HISTORIAL}
            onCambiar={setHistPage}
            etiqueta="importaciones"
          />
        </div>
      )}

      <Modal abierto={!!resultado} onClose={() => setResultado(null)} titulo="Importacion finalizada" ancho="560px"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setResultado(null)}>Cerrar</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setResultado(null); setTab('historial'); setHistPage(1); }}
            >
              Ver en el historial
            </button>
          </>
        )}
      >
        {resultado && (
          <div className="text-sm">
            <div>Importacion #{resultado.importacionId}</div>
            <ul style={{ paddingLeft: 18 }} className="mt-2">
              <li>{resultado.insertados} creados</li>
              <li>{resultado.actualizados} actualizados</li>
              <li>{resultado.omitidos} omitidos</li>
              <li>{resultado.errores} con error</li>
              {!esPrecios && <li>{resultado.stockAjustado} filas ajustaron stock/consigna por el ledger (documento IMP-)</li>}
            </ul>
            {resultado.errores > 0 && <div className="text-xs text-muted mt-2">Los motivos estan en el detalle del historial.</div>}
          </div>
        )}
      </Modal>

      <Modal abierto={!!detalle} onClose={() => setDetalle(null)} titulo={detalle ? `Detalle importacion #${detalle.importacion.id}` : ''} ancho="860px">
        {detalle && (
          <div>
            <div className="text-xs text-muted mb-2">
              {MODO_LABEL[detalle.importacion.modo] || detalle.importacion.modo} · {detalle.total} filas ·{' '}
              {detalle.importacion.insertados} nuevas · {detalle.importacion.actualizados} act. · {detalle.importacion.errores} err. · {detalle.importacion.omitidos} omit.
            </div>
            <Table columnas={columnasDetalle} filas={detalle.filas} vacio="Sin detalle" />
            <Paginador
              page={detalle.page}
              total={detalle.total}
              limite={LIMITE_DETALLE}
              onCambiar={(p) => abrirDetalle(detalle.importacion, p)}
              etiqueta="filas"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
