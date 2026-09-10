// BookOS - Input.jsx
// ruta: bookos/frontend/src/ui/Input.jsx
// descripcion: input estandarizado del OS (clase .input-os).

export default function Input({ label, ...props }) {
  return (
    <label className="block mb-3">
      {label && <span className="block text-xs uppercase tracking-widest text-muted mb-1">{label}</span>}
      <input className="input-os" {...props} />
    </label>
  );
}
