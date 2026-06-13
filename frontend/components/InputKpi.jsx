import { useState } from 'react';
import { api } from '../lib/api.js';
import { MONTHS, calculatedTier, defaultPeriod, formatRule } from '../lib/kpi.js';

const WORK_DAYS = Number(window.APP_CONFIG?.workDays || 26);

export default function InputKpi({ assessableUsers, definitions, onSaved }) {
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState(defaultPeriod());
  const [answers, setAnswers] = useState({});
  const [attendance, setAttendance] = useState({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
  const subject = assessableUsers.find((user) => user.id === Number(subjectId));
  const definition = definitions[subject?.posisi];

  function updateAnswer(id, field, value) {
    setAnswers((current) => ({ ...current, [id]: { actualValue: '', link: '', ...current[id], [field]: value } }));
  }

  async function submit() {
    const result = await api('submitKpi', {
      subjectUserId: Number(subjectId),
      selectedPeriode: period,
      draftAnswers: answers,
      draftKehadiran: attendance,
    });
    if (!result.success) return alert(result.error || 'Submission gagal.');
    alert(`Penilaian ${period} berhasil disimpan.`);
    setAnswers({});
    setAttendance({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
    onSaved();
  }

  return <>
    <div className="card">
      <label>Periode Laporan</label>
      <select value={period} onChange={(event) => setPeriod(event.target.value)}>
        {MONTHS.map((month) => <option key={month}>{month} {new Date().getFullYear()}</option>)}
      </select>
      <label>Posisi / Jabatan</label>
      <input type="text" value={subject?.posisi || ''} disabled />
      <label>Akun yang Dinilai</label>
      <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setAnswers({}); }}>
        <option value="">-- Pilih anggota tim --</option>
        {assessableUsers.map((user) => <option key={user.id} value={user.id}>{user.nama} - {user.posisi}</option>)}
      </select>
    </div>
    {definition && <div className="card">
      <h3 className="card-title">Form KPI - {subject.nama}</h3>
      {definition.kpis.map((kpi) => {
        const answer = answers[kpi.id] || {};
        const tier = calculatedTier(kpi, answer.actualValue);
        return <div className="kpi-block" key={kpi.id}>
          <div className="kpi-head"><div className="kpi-title">{kpi.nama}</div><div className="kpi-bobot">Bobot {kpi.bobot}%</div></div>
          <div className="kpi-target">Target: {kpi.target}</div>
          <div className="formula-list">{[...kpi.tiers].sort((a, b) => b.skor - a.skor).map((item) =>
            <span key={item.skor}><strong>Skor {item.skor}:</strong> {formatRule(item.rule, kpi.unit)}</span>)}
          </div>
          <label>Nilai Aktual ({kpi.unit})</label>
          <input type="number" step="any" value={answer.actualValue ?? ''} onChange={(event) => updateAnswer(kpi.id, 'actualValue', event.target.value === '' ? '' : Number(event.target.value))} />
          <div className={`formula-result ${tier ? 'matched' : ''}`}>
            {answer.actualValue === undefined || answer.actualValue === '' ? 'Skor dihitung otomatis.' : tier ? <>Hasil formula: <strong>{tier.label}</strong> (skor {tier.skor})</> : 'Nilai belum masuk formula mana pun.'}
          </div>
          <label>Link Bukti</label>
          <input type="url" value={answer.link || ''} onChange={(event) => updateAnswer(kpi.id, 'link', event.target.value)} />
        </div>;
      })}
    </div>}
    {definition && <div className="card">
      <h3 className="card-title">Kehadiran (Hari Kerja: {WORK_DAYS})</h3>
      <div className="kehadiran-grid">{Object.keys(attendance).map((key) => <div key={key}>
        <label>{key[0].toUpperCase() + key.slice(1)} (hari)</label>
        <input type="number" min="0" max={WORK_DAYS} value={attendance[key]} onChange={(event) => setAttendance({ ...attendance, [key]: Number(event.target.value) })} />
      </div>)}</div>
      <div className="actions"><button className="btn secondary" onClick={() => setAnswers({})}>Reset</button><button className="btn" onClick={submit}>Simpan Penilaian</button></div>
    </div>}
  </>;
}
