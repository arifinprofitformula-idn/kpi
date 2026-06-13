import { useEffect, useState } from 'react';
import Approval from './components/Approval.jsx';
import InputKpi from './components/InputKpi.jsx';
import KpiSettings from './components/KpiSettings.jsx';
import Login from './components/Login.jsx';
import Users from './components/Users.jsx';
import { api } from './lib/api.js';

const INITIAL_AUTH = window.APP_STATE || {};
const EMPTY_DATA = { users: [], assessableUsers: [], submissions: [], posisiData: {} };

export default function App() {
  const [auth, setAuth] = useState({
    role: INITIAL_AUTH.role || null,
    currentUser: INITIAL_AUTH.currentUser || null,
  });
  const [data, setData] = useState(EMPTY_DATA);
  const [tab, setTab] = useState('results');
  const [loading, setLoading] = useState(Boolean(INITIAL_AUTH.role));
  const [loadError, setLoadError] = useState('');

  async function loadData() {
    setLoading(true);
    const result = await api('loadData');
    setLoading(false);
    if (!result.success) {
      setLoadError(result.error || 'Data tidak dapat dimuat.');
      return;
    }
    setLoadError(result.warning || '');
    setAuth({ role: result.role, currentUser: result.currentUser });
    setData({
      users: result.users || [],
      assessableUsers: result.assessableUsers || [],
      submissions: result.submissions || [],
      posisiData: result.posisiData || {},
    });
  }

  useEffect(() => {
    if (!INITIAL_AUTH.role) return undefined;
    let active = true;
    api('loadData').then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.success) {
        setLoadError(result.error || 'Data tidak dapat dimuat.');
        return;
      }
      setLoadError(result.warning || '');
      setAuth({ role: result.role, currentUser: result.currentUser });
      setData({
        users: result.users || [],
        assessableUsers: result.assessableUsers || [],
        submissions: result.submissions || [],
        posisiData: result.posisiData || {},
      });
    });
    return () => { active = false; };
  }, []);

  async function logout() {
    await api('logout');
    setAuth({ role: null, currentUser: null });
    setData(EMPTY_DATA);
    setTab('results');
  }

  if (!auth.role) {
    return <Login onLogin={(result) => {
      setAuth({ role: result.role, currentUser: result.currentUser });
      setTimeout(loadData, 0);
    }} />;
  }

  if (loading && !Object.keys(data.posisiData).length) {
    return <div className="loading">Memuat dashboard React...</div>;
  }

  if (loadError && !Object.keys(data.posisiData).length) {
    return <div className="card error-state"><p>{loadError}</p><button className="btn" onClick={loadData}>Coba Lagi</button></div>;
  }

  const isAdmin = auth.role === 'admin';
  const canEvaluate = ['admin', 'manager', 'supervisor'].includes(auth.role);
  const roleLabel = `${auth.currentUser?.nama || 'Akun'} - ${auth.role}`;

  return <>
    <header><div className="top-bar"><div><h1>Dashboard KPI Sales & Marketing</h1><span className="role-pill">{roleLabel}</span></div><button className="btn secondary small" onClick={logout}>Logout</button></div><p>PT. Emas Perak Indonesia - React KPI Management</p></header>
    <nav className="tabs">
      {canEvaluate && <button className={`tab-btn ${tab === 'input' ? 'active' : ''}`} onClick={() => setTab('input')}>Penilaian Tim</button>}
      <button className={`tab-btn ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>Hasil KPI</button>
      {isAdmin && <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Pengaturan User</button>}
      {isAdmin && <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Pengaturan Form KPI</button>}
    </nav>
    {loadError && <div className="note-box note-error">{loadError}</div>}
    {tab === 'input' && canEvaluate && (data.assessableUsers.length
      ? <InputKpi assessableUsers={data.assessableUsers} definitions={data.posisiData} onSaved={loadData} />
      : <div className="card empty-state">Belum ada akun yang ditugaskan untuk Anda nilai.</div>)}
    {tab === 'results' && <Approval submissions={data.submissions} />}
    {tab === 'users' && isAdmin && <Users users={data.users} definitions={data.posisiData} onRefresh={loadData} />}
    {tab === 'settings' && isAdmin && <KpiSettings key={Object.keys(data.posisiData).join('|')} definitions={data.posisiData} onSaved={(definitions) => setData((current) => ({ ...current, posisiData: definitions }))} />}
  </>;
}
