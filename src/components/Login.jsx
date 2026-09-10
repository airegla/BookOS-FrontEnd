// ARCHIVO: Login.jsx
// RUTA: frontend/src/components/Login.jsx
// DESCRIPCIÓN: Pantalla de login (usuario + contraseña).

import React, { useState } from 'react';
import { api } from '../api/api';
import DebugTag from '../ui/DebugTag';

export const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(usuario.trim(), password);
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a237e' }}>
      <DebugTag name="Login.jsx" />
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '32px', borderRadius: '8px', width: '320px', maxWidth: 'calc(100vw - 32px)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>BOOK(RM)</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: 0 }}>Ingresá con tu usuario</p>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '0.85rem' }}>{error}</div>}
        <input
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={loading || !usuario || !password} style={{ width: '100%', padding: '10px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};

export default Login;
