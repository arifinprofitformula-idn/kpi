import { useState } from 'react';
import { api } from '../lib/api.js';
import { MONTHS, calculatedTier, defaultPeriod, evidenceChecklist, formatRule } from '../lib/kpi.js';

const WORK_DAYS = Number(window.APP_CONFIG?.workDays || 26);

export default function InputKpi({ assessableUsers, definitions, onSaved }) {
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState(defaultPeriod());
  const [answers, setAnswers] = useState({});
  const [attendance, setAttendance] = useState({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const subject = assessableUsers.find((user) => user.id === Number(subjectId));
  const definition = definitions[subject?.posisi];

  function updateAnswer(id, field, value) {
    setAnswers((current) => ({ ...current, [id]: { actualValue: '', link: '', notes: '', achievementNote: '', checklist: [], ...current[id], [field]: value } }));
  }

  function toggleChecklist(id, item, checked) {
    setAnswers((current) => {
      const answer = { actualValue: '', link: '', notes: '', achievementNote: '', checklist: [], ...current[id] };
      const checklist = new Set(answer.checklist || []);
      if (checked) checklist.add(item);
      else checklist.delete(item);
      return { ...current, [id]: { ...answer, checklist: Array.from(checklist) } };
    });
  }

  async function submit() {
    setError('');
    if (!subject) {
      setError('Pilih akun yang akan dinilai terlebih dahulu.');
      return;
    }
    if (!definition) {
      setError('Template KPI untuk posisi ini belum tersedia.');
      return;
    }
    const missingKpi = definition.kpis.find((kpi) => {
      const value = answers[kpi.id]?.actualValue;
      return value === undefined || value === '' || !Number.isFinite(Number(value));
    });
    if (missingKpi) {
      setError(`Nilai aktual untuk KPI ${missingKpi.nama} belum diisi dengan benar.`);
      return;
    }
    const missingEvidence = definition.kpis.find((kpi) => {
      const checklist = evidenceChecklist(kpi);
      if (checklist.length === 0) return false;
      const checked = new Set(answers[kpi.id]?.checklist || []);
      return checklist.some((item) => !checked.has(item));
    });
    if (missingEvidence) {
      setError(`Checklist bukti untuk KPI ${missingEvidence.nama} belum lengkap.`);
      return;
    }
    const invalidAttendance = Object.values(attendance).some((value) => (
      !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > WORK_DAYS
    ));
    if (invalidAttendance || Object.values(attendance).reduce((sum, value) => sum + Number(value || 0), 0) > WORK_DAYS) {
      setError(`Data kehadiran harus berupa angka 0 sampai ${WORK_DAYS}, dan totalnya tidak boleh melebihi hari kerja.`);
      return;
    }

    setSaving(true);
    const result = await api('submitKpi', {
      subjectUserId: Number(subjectId),
      selectedPeriode: period,
      draftAnswers: answers,
      draftKehadiran: attendance,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Submission gagal.');
      return;
    }
    alert(`Penilaian ${period} berhasil disimpan.`);
    setAnswers({});
    setAttendance({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
    await onSaved();
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
      <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setAnswers({}); setError(''); }}>
        <option value="">-- Pilih anggota tim --</option>
        {assessableUsers.map((user) => <option key={user.id} value={user.id}>{user.nama} - {user.posisi}</option>)}
      </select>
      {error && <div className="note-box note-error">{error}</div>}
    </div>
    {definition && <div className="card">
      <h3 className="card-title">Form KPI - {subject.nama}</h3>
      {definition.kpis.map((kpi) => {
        const answer = answers[kpi.id] || {};
        const tier = calculatedTier(kpi, answer.actualValue);
        const checklist = evidenceChecklist(kpi);
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
          {checklist.length > 0 && <div className="evidence-panel">
            <div className="evidence-title">Checklist Bukti Wajib</div>
            {checklist.map((item) => <label className="checkbox-row evidence-check-row" key={item}>
              <input
                type="checkbox"
                checked={(answer.checklist || []).includes(item)}
                onChange={(event) => toggleChecklist(kpi.id, item, event.target.checked)}
              />
              <span>{item}</span>
            </label>)}
          </div>}
          <label>Catatan Bukti</label>
          <textarea rows="3" value={answer.notes || ''} onChange={(event) => updateAnswer(kpi.id, 'notes', event.target.value)} />
          <label>Catatan Pencapaian</label>
          <textarea rows="3" value={answer.achievementNote || ''} onChange={(event) => updateAnswer(kpi.id, 'achievementNote', event.target.value)} />
        </div>;
      })}
    </div>}
    {definition && <div className="card">
      <h3 className="card-title">Kehadiran (Hari Kerja: {WORK_DAYS})</h3>
      <div className="kehadiran-grid">{Object.keys(attendance).map((key) => <div key={key}>
        <label>{key[0].toUpperCase() + key.slice(1)} (hari)</label>
        <input type="number" min="0" max={WORK_DAYS} value={attendance[key]} onChange={(event) => setAttendance({ ...attendance, [key]: Number(event.target.value) })} />
      </div>)}</div>
      <div className="actions">
        <button className="btn secondary" type="button" onClick={() => { setAnswers({}); setError(''); }} disabled={saving}>Reset</button>
        <button className="btn" type="button" onClick={submit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Penilaian'}</button>
      </div>
    </div>}
  </>;
}
