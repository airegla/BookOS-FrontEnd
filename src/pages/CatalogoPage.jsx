// BookOS - CatalogoPage.jsx
// ruta: bookos/frontend/src/pages/CatalogoPage.jsx
// descripcion: catalogo enriquecido. Listado paginado + busqueda hibrida semantica
//   + modal de alta/edicion (todo en modal, nada borra trabajo).

import { useEffect, useState } from 'react';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import DebugTag from '../ui/DebugTag';
import { catalogoApi, proveedoresApi } from '../api/api';

export default function CatalogoPage() {
  const [filas, setFilas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [semantico, setSemantico] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const res = await catalogoApi.listar({ page, limit: 20, search });
      setFilas(res.data || []);
      setTotal(res.pagination ? res.pagination.total : 0);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { cargar(); }, [page]); // eslint-disable-line

  useEffect(() => {
    proveedoresApi.listar().then((res) => setProveedores(res.data || [])).catch(() => {});
  }, []);

  const buscarSemantico = async () => {
    setSemantico(null);
    try {
      const res = await catalogoApi.buscar(search, 15);
      setSemantico(res.data);
    } catch (err) { setError(err.message); }
  };

  const abrirNuevo = () => { setEditando(null); setForm({}); setModal(true); };
  const abrirEditar = (fila) => { setEditando(fila); setForm(fila); setModal(true); };

  const guardar = async () => {
    try {
      if (editando) await catalogoApi.actualizar(editando.id, form);
      else await catalogoApi.crear(form);
      setModal(false);
      cargar();
    } catch (err) { setError(err.message); }
  };

  const eliminar = async (f) => {
    if (!window.confirm(`¿Dar de baja "${f.titulo}"? (baja logica, bookerp)`)) return;
    try {
      await catalogoApi.eliminar(f.id);
      cargar();
    } catch (err) { setError(err.message); }
  };

  const columnas = [
    { clave: 'ean13', titulo: 'EAN13', render: (f) => <span className="font-mono text-xs">{f.ean13}</span> },
    { clave: 'titulo', titulo: 'Titulo' },
    { clave: 'autor', titulo: 'Autor' },
    { clave: 'editorial', titulo: 'Editorial' },
    { clave: 'precio', titulo: 'Precio', render: (f) => `$${Number(f.precio).toLocaleString('es-AR')}` },
    { clave: 'stock', titulo: 'Stock', render: (f) => f.stock + f.stockDeposito },
    { clave: 'acciones', titulo: '', render: (f) => (
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={() => abrirEditar(f)}>Editar</button>
        <button type="button" className="btn btn-ghost text-xs" style={{ color: 'var(--danger)' }} onClick={() => eliminar(f)}>Baja</button>
      </div>
    ) },
  ];

  return (
    <div>
      <DebugTag nombre="CatalogoPage" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Catalogo enriquecido</h2>
        <button type="button" className="btn btn-primary" onClick={abrirNuevo}>Nuevo articulo</button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="input-os"
          placeholder="Buscar titulo, autor, editorial, EAN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') cargar(); }}
        />
        <button type="button" className="btn" onClick={cargar}>Filtrar</button>
        <button type="button" className="btn" onClick={buscarSemantico}>Busqueda semantica</button>
      </div>

      {error && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

      {semantico && (
        <div className="mb-4">
          <div className="text-xs text-muted mb-2">
            Intencion: {semantico.intencion} · pesos {JSON.stringify(semantico.perfil)} · desglose auditado
          </div>
          {semantico.resultados.slice(0, 10).map((r) => (
            <div key={r.ean13} className="card p-3 mb-2 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{r.titulo}</div>
                <div className="text-xs text-muted">{r.autor} · {r.editorial}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-muted">{(r.score || 0).toFixed(3)}</div>
                <div className="text-xs">{r.stock + r.stockDeposito} en stock</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Table columnas={columnas} filas={filas} vacio="Cargando catalogo..." />

      <div className="flex justify-between items-center mt-4 text-sm text-muted">
        <span>Pagina {page} · {total} articulos</span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <button type="button" className="btn btn-ghost" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      </div>

      <Modal
        abierto={modal}
        onClose={() => setModal(false)}
        titulo={editando ? 'Editar articulo' : 'Nuevo articulo'}
        footer={<button type="button" className="btn btn-primary" onClick={guardar}>Guardar</button>}
      >
        <Input label="EAN13" value={form.ean13 || ''} onChange={(e) => setForm({ ...form, ean13: e.target.value })} disabled={Boolean(editando)} />
        <Input label="ISBN" value={form.isbn || ''} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
        <Input label="Titulo" value={form.titulo || ''} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-widest text-muted mb-1">Proveedor</span>
          <select className="input-os" value={form.proveedorId || ''} onChange={(e) => setForm({ ...form, proveedorId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <Input label="Autor" value={form.autor || ''} onChange={(e) => setForm({ ...form, autor: e.target.value })} />
        <Input label="Editorial" value={form.editorial || ''} onChange={(e) => setForm({ ...form, editorial: e.target.value })} />
        <Input label="Precio" type="number" value={form.precio || ''} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} />
        <Input label="Stock" type="number" value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
      </Modal>
    </div>
  );
}
