import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const result = await api('login', { identifier, password });
    setBusy(false);
    if (!result.success) return setError(result.error || 'Kredensial tidak dikenali.');
    onLogin(result);
  }

  return <div className="login-box"><div className="card">
    <h1 className="card-title">Dashboard KPI Sales & Marketing</h1>
    <p className="card-subtitle">PT. Emas Perak Indonesia - Masuk ke akun Anda</p>
    <form onSubmit={submit}>
      <label>Username atau Email</label>
      <input type="text" value={identifier} maxLength="255" autoComplete="username" onChange={(event) => setIdentifier(event.target.value)} autoFocus />
      <label>Password</label>
      <input type="password" value={password} maxLength="128" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
      {error && <div className="note-box note-error">{error}</div>}
      <button className="btn full-width" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
    </form>
  </div></div>;
}
