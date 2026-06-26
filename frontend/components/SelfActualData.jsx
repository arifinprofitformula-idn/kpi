import { useState } from 'react';
import { api } from '../lib/api.js';
import { MONTHS, actualDataFields, calculatedTier, defaultPeriod, evidenceChecklist, formatRule } from '../lib/kpi.js';

const WORK_DAYS = Number(window.APP_CONFIG?.workDays || 26);
const NUMERIC_ACTUAL_TYPES = ['number', 'percent', 'currency'];

function emptyActualDataEntry() {
  return {
    valueText: '',
    valueNumber: '',
    valueDate: '',
    sourceDocument: '',
    dataDate: '',
    submittedNote: '',
  };
}

function emptyAnswer() {
  return { actualValue: '', actualData: {}, link: '', notes: '', achievementNote: '', checklist: [] };
}

function actualDataValue(field, entry = {}) {
  if (NUMERIC_ACTUAL_TYPES.includes(field.type)) return entry.valueNumber;
  if (field.type === 'date') return entry.valueDate;
  return entry.valueText;
}

function actualDataIsFilled(field, entry = {}) {
  const value = actualDataValue(field, entry);
  if (field.type === 'boolean') return value === '1' || value === '0' || value === true || value === false;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function sourceFieldFor(kpi) {
  const fields = actualDataFields(kpi);
  return fields.find((field) => field.id === kpi.actualValueSourceFieldId || field.usedAsActualValue) || null;
}

export default function SelfActualData({ currentUser, definitions, onSaved }) {
  const [period, setPeriod] = useState(defaultPeriod());
  const [answers, setAnswers] = useState({});
  const [attendance, setAttendance] = useState({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const definition = definitions[currentUser?.posisi];

  function updateAnswer(id, field, value) {
    setAnswers((current) => ({ ...current, [id]: { ...emptyAnswer(), ...current[id], [field]: value } }));
  }

  function updateActualData(kpi, field, key, value) {
    setAnswers((current) => {
      const answer = { ...emptyAnswer(), ...current[kpi.id] };
      const entry = { ...emptyActualDataEntry(), ...(answer.actualData?.[field.id] || {}), [key]: value };
      const sourceField = sourceFieldFor(kpi);
      const syncedActualValue = sourceField?.id === field.id && NUMERIC_ACTUAL_TYPES.includes(field.type)
        ? (entry.valueNumber === '' ? '' : Number(entry.valueNumber))
        : answer.actualValue;
      return {
        ...current,
        [kpi.id]: {
          ...answer,
          actualValue: syncedActualValue,
          actualData: { ...(answer.actualData || {}), [field.id]: entry },
        },
      };
    });
  }

  function toggleChecklist(id, item, checked) {
    setAnswers((current) => {
      const answer = { ...emptyAnswer(), ...current[id] };
      const checklist = new Set(answer.checklist || []);
      if (checked) checklist.add(item);
      else checklist.delete(item);
      return { ...current, [id]: { ...answer, checklist: Array.from(checklist) } };
    });
  }

  async function submit() {
    setError('');
    setMessage('');
    if (!definition) {
      setError('Template KPI untuk posisi Anda belum tersedia.');
      return;
    }
    const missingKpi = definition.kpis.find((kpi) => {
      const answer = { ...emptyAnswer(), ...answers[kpi.id] };
      const sourceField = sourceFieldFor(kpi);
      const sourceEntry = sourceField ? answer.actualData?.[sourceField.id] : null;
      const value = sourceField && NUMERIC_ACTUAL_TYPES.includes(sourceField.type)
        ? sourceEntry?.valueNumber
        : answer.actualValue;
      return value === undefined || value === '' || !Number.isFinite(Number(value));
    });
    if (missingKpi) {
      setError(`Nilai aktual untuk KPI ${missingKpi.nama} belum diisi dengan benar.`);
      return;
    }
    const missingActualData = definition.kpis.find((kpi) => actualDataFields(kpi).some((field) => {
      const entry = answers[kpi.id]?.actualData?.[field.id] || {};
      return (field.required && !actualDataIsFilled(field, entry))
        || (field.sourceRequired && !String(entry.sourceDocument || '').trim())
        || (field.dataDateRequired && !String(entry.dataDate || '').trim());
    }));
    if (missingActualData) {
      setError(`Input Data Aktual untuk KPI ${missingActualData.nama} belum lengkap.`);
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
    const result = await api('submitSelfActualData', {
      selectedPeriode: period,
      draftAnswers: answers,
      draftKehadiran: attendance,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Input Data Aktual gagal dikirim.');
      return;
    }
    setMessage('Data aktual dan evidence berhasil dikirim ke atasan untuk diverifikasi.');
    setAnswers({});
    setAttendance({ sakit: 0, izin: 0, alpa: 0, cuti: 0 });
    await onSaved();
  }

  return <>
    <div className="card">
      <h3 className="card-title">Input Data Aktual Saya</h3>
      <p className="card-subtitle">Data ini akan dikirim ke atasan untuk diverifikasi. Atasan akan menentukan skor final setelah data aktual dan evidence dinyatakan valid.</p>
      <label>Nama</label>
      <input type="text" value={currentUser?.nama || currentUser?.name || ''} disabled />
      <label>Posisi / Jabatan</label>
      <input type="text" value={currentUser?.posisi || ''} disabled />
      <label>Periode Laporan</label>
      <select value={period} onChange={(event) => setPeriod(event.target.value)}>
        {MONTHS.map((month) => <option key={month}>{month} {new Date().getFullYear()}</option>)}
      </select>
      {message && <div className="note-box">{message}</div>}
      {error && <div className="note-box note-error">{error}</div>}
      {!definition && <div className="empty-state">Template KPI untuk posisi Anda belum tersedia.</div>}
    </div>

    {definition && <div className="card">
      <h3 className="card-title">Form KPI - {currentUser?.nama || currentUser?.name}</h3>
      {definition.kpis.map((kpi) => {
        const answer = { ...emptyAnswer(), ...answers[kpi.id] };
        const fields = actualDataFields(kpi);
        const sourceField = sourceFieldFor(kpi);
        const syncedActualValue = sourceField && NUMERIC_ACTUAL_TYPES.includes(sourceField.type)
          ? (answer.actualData?.[sourceField.id]?.valueNumber ?? '')
          : answer.actualValue;
        const previewTier = calculatedTier(kpi, syncedActualValue);
        const checklist = evidenceChecklist(kpi);
        return <div className="kpi-block" key={kpi.id}>
          <div className="kpi-head"><div className="kpi-title">{kpi.nama}</div><div className="kpi-bobot">Bobot {kpi.bobot}%</div></div>
          <div className="kpi-target">Target: {kpi.target}</div>
          <div className="formula-list">{[...kpi.tiers].sort((a, b) => b.skor - a.skor).map((item) =>
            <span key={item.skor}><strong>Skor {item.skor}:</strong> {formatRule(item.rule, kpi.unit)}</span>)}
          </div>
          <label>Nilai Aktual Utama ({kpi.unit})</label>
          <input
            type="number"
            step="any"
            value={syncedActualValue ?? ''}
            readOnly={Boolean(sourceField)}
            onChange={(event) => updateAnswer(kpi.id, 'actualValue', event.target.value === '' ? '' : Number(event.target.value))}
          />
          {sourceField && <div className="actual-value-source-note">Nilai aktual utama diambil dari field: {sourceField.label}</div>}
          <div className={`formula-result ${previewTier ? 'matched' : ''}`}>
            {syncedActualValue === undefined || syncedActualValue === '' ? 'Skor dihitung otomatis.' : previewTier ? <>Hasil formula: <strong>{previewTier.label}</strong> (skor {previewTier.skor})</> : 'Nilai belum masuk formula mana pun.'}
          </div>

          {fields.length > 0 && <div className="actual-data-panel">
            <div className="actual-data-title">C. Input Data Aktual</div>
            <div className="actual-data-subtitle">Isi data pendukung yang menjadi dasar angka capaian KPI. Data ini akan diverifikasi atasan.</div>
            <div className="actual-data-list">
              {fields.map((field) => {
                const entry = { ...emptyActualDataEntry(), ...(answer.actualData?.[field.id] || {}) };
                const isNumeric = NUMERIC_ACTUAL_TYPES.includes(field.type);
                return <div className="actual-data-entry" key={field.id}>
                  <div className="actual-data-entry-head">
                    <div>
                      <label>{field.label}</label>
                      {field.helperText && <p>{field.helperText}</p>}
                    </div>
                    {field.required && <span>Required</span>}
                  </div>
                  <div className="actual-data-entry-grid">
                    <div className="actual-data-main-input">
                      {field.type === 'textarea' ? <textarea rows="3" value={entry.valueText} onChange={(event) => updateActualData(kpi, field, 'valueText', event.target.value)} />
                        : field.type === 'boolean' ? <select value={entry.valueText} onChange={(event) => updateActualData(kpi, field, 'valueText', event.target.value)}>
                          <option value="">-- Pilih --</option>
                          <option value="1">Ya</option>
                          <option value="0">Tidak</option>
                        </select>
                          : <input
                            type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : isNumeric ? 'number' : 'text'}
                            step={isNumeric ? 'any' : undefined}
                            value={field.type === 'date' ? entry.valueDate : isNumeric ? entry.valueNumber : entry.valueText}
                            onChange={(event) => updateActualData(kpi, field, field.type === 'date' ? 'valueDate' : isNumeric ? 'valueNumber' : 'valueText', event.target.value)}
                          />}
                      {field.unit && <span>{field.unit}</span>}
                    </div>
                    <div>
                      <label>Source Document {field.sourceRequired ? '*' : ''}</label>
                      <input type="text" value={entry.sourceDocument} onChange={(event) => updateActualData(kpi, field, 'sourceDocument', event.target.value)} />
                    </div>
                    <div>
                      <label>Data Date {field.dataDateRequired ? '*' : ''}</label>
                      <input type="date" value={entry.dataDate} onChange={(event) => updateActualData(kpi, field, 'dataDate', event.target.value)} />
                    </div>
                    <div className="actual-data-note-field">
                      <label>Submitted Note</label>
                      <textarea rows="2" value={entry.submittedNote} onChange={(event) => updateActualData(kpi, field, 'submittedNote', event.target.value)} />
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>}

          <div className="evidence-panel">
            <div className="evidence-title">D. Evidence Checklist</div>
            <label>Link Bukti</label>
            <input type="url" value={answer.link || ''} onChange={(event) => updateAnswer(kpi.id, 'link', event.target.value)} />
            {checklist.length > 0 ? checklist.map((item) => <label className="checkbox-row evidence-check-row" key={item}>
              <input
                type="checkbox"
                checked={(answer.checklist || []).includes(item)}
                onChange={(event) => toggleChecklist(kpi.id, item, event.target.checked)}
              />
              <span>{item}</span>
            </label>) : <div className="evidence-empty">Tidak ada evidence checklist untuk KPI ini.</div>}
            <label>Catatan Bukti</label>
            <textarea rows="3" value={answer.notes || ''} onChange={(event) => updateAnswer(kpi.id, 'notes', event.target.value)} />
          </div>
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
        <button className="btn secondary" type="button" onClick={() => { setAnswers({}); setError(''); setMessage(''); }} disabled={saving}>Reset</button>
        <button className="btn" type="button" onClick={submit} disabled={saving}>{saving ? 'Mengirim...' : 'Kirim ke Atasan'}</button>
      </div>
    </div>}
  </>;
}
