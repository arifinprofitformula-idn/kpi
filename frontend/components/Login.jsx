import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const result = await api('login', { pin });
    setBusy(false);
    if (!result.success) return setError(result.error || 'PIN tidak dikenali.');
    onLogin(result);
  }

  return <div className="login-box"><div className="card">
    <h1 className="card-title">Dashboard KPI Sales & Marketing</h1>
    <p className="card-subtitle">PT. Emas Perak Indonesia - Masukkan PIN Anda</p>
    <form onSubmit={submit}>
      <label>PIN Akses</label>
      <input type="password" value={pin} maxLength="64" autoComplete="current-password" onChange={(event) => setPin(event.target.value)} autoFocus />
      {error && <div className="note-box note-error">{error}</div>}
      <button className="btn full-width" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
    </form>
  </div></div>;
}
