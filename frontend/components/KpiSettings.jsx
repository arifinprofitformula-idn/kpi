import { useState } from 'react';
import { api } from '../lib/api.js';
import { OPERATORS, actualDataFields, clone, evidenceChecklist, formatRule, newKpi } from '../lib/kpi.js';

const UNIT_OPTIONS = ['%', 'Rp', 'Unit', 'Gram', 'Hari', 'Aktivitas', 'Dokumen'];
const CUSTOM_UNIT = '__custom__';
const ACTUAL_DATA_TYPES = {
  number: 'Angka',
  percent: 'Persen',
  currency: 'Nominal',
  text: 'Teks',
  textarea: 'Teks Panjang',
  date: 'Tanggal',
  url: 'URL',
  boolean: 'Ya/Tidak',
};
const ACTUAL_DATA_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function newActualDataField(id = 'actual_data_1') {
  return {
    id,
    label: 'Data Aktual Baru',
    type: 'number',
    unit: '',
    required: true,
    sourceRequired: true,
    dataDateRequired: true,
    verificationRequired: true,
    usedAsActualValue: false,
    helperText: '',
  };
}

function actualDataFieldIssues(kpi) {
  const fields = Array.isArray(kpi.actualDataFields) ? kpi.actualDataFields : [];
  const counts = fields.reduce((acc, field) => {
    const id = String(field.id || '').trim();
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const usedCount = fields.filter((field) => field.usedAsActualValue).length;

  return fields.map((field) => {
    const id = String(field.id || '').trim();
    const issues = [];
    if (!id) issues.push('Field ID wajib diisi.');
    else if (!ACTUAL_DATA_ID_PATTERN.test(id)) issues.push('Field ID hanya boleh huruf, angka, underscore, atau dash.');
    else if (counts[id] > 1) issues.push('Field ID duplikat dalam KPI ini.');
    if (!String(field.label || '').trim()) issues.push('Label Field wajib diisi.');
    if (!ACTUAL_DATA_TYPES[field.type || 'text']) issues.push('Type tidak valid.');
    if (String(field.unit || '').length > 64) issues.push('Unit maksimal 64 karakter.');
    if (String(field.helperText || '').length > 500) issues.push('Helper Text maksimal 500 karakter.');
    if (usedCount > 1 && field.usedAsActualValue) issues.push('Hanya satu field boleh dipakai sebagai Nilai Aktual.');
    return issues;
  });
}

function kpiIsComplete(kpi) {
  return Boolean(
    kpi.id?.trim()
    && kpi.nama?.trim()
    && Number(kpi.bobot) > 0
    && kpi.unit?.trim()
    && kpi.target?.trim()
    && actualDataFieldIssues(kpi).every((issues) => issues.length === 0)
    && (!kpi.evidenceChecklist || kpi.evidenceChecklist.every((item) => String(item || '').trim()))
    && kpi.tiers?.length
    && kpi.tiers.every((tier) => (
      tier.label?.trim()
      && Number.isFinite(Number(tier.skor))
      && tier.rule?.operator
      && Number.isFinite(Number(tier.rule.value))
      && (tier.rule.operator !== 'between' || Number.isFinite(Number(tier.rule.max)))
    )),
  );
}

function positionValidation(totalWeight) {
  if (Math.abs(totalWeight - 100) < 0.001) {
    return { label: 'Valid', className: 'valid' };
  }
  if (totalWeight < 100) {
    return { label: 'Belum Lengkap', className: 'warning' };
  }
  return { label: 'Melebihi 100%', className: 'danger' };
}

function ConfirmModal({ title, description, confirmLabel, onCancel, onConfirm }) {
  return <div className="modal-overlay confirm-overlay" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-icon" aria-hidden="true">!</div>
      <h3 id="confirm-title">{title}</h3>
      <p>{description}</p>
      <div className="confirm-actions">
        <button className="btn secondary" onClick={onCancel}>Batal</button>
        <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>;
}

export default function KpiSettings({ definitions, onSaved }) {
  const [draft, setDraft] = useState(() => clone(definitions));
  const [selectedPosition, setSelectedPosition] = useState(() => Object.keys(definitions)[0] || '');
  const [positionName, setPositionName] = useState(() => Object.keys(definitions)[0] || '');
  const [expandedKpi, setExpandedKpi] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);
  const positions = Object.keys(draft);
  const definition = draft[selectedPosition];

  function buildDraftWithCommittedPositionName(sourceDraft = draft) {
    const trimmedName = positionName.trim();
    if (!selectedPosition || !sourceDraft[selectedPosition]) {
      return { definitions: clone(sourceDraft), selected: selectedPosition, error: '' };
    }
    if (!trimmedName) {
      return { definitions: clone(sourceDraft), selected: selectedPosition, error: 'Nama posisi wajib diisi.' };
    }
    if (trimmedName === selectedPosition) {
      return { definitions: clone(sourceDraft), selected: selectedPosition, error: '' };
    }
    if (sourceDraft[trimmedName]) {
      return { definitions: clone(sourceDraft), selected: selectedPosition, error: 'Nama posisi sudah digunakan.' };
    }

    const next = {};
    Object.keys(sourceDraft).forEach((position) => {
      next[position === selectedPosition ? trimmedName : position] = sourceDraft[position];
    });
    return { definitions: next, selected: trimmedName, error: '' };
  }

  function definitionsAreValid(definitionsToValidate) {
    const names = Object.keys(definitionsToValidate);
    return names.length > 0 && names.every((position) => {
      const kpis = definitionsToValidate[position].kpis || [];
      const total = kpis.reduce((sum, item) => sum + Number(item.bobot || 0), 0);
      return kpis.length > 0 && Math.abs(total - 100) < 0.001 && kpis.every(kpiIsComplete);
    });
  }

  function updateKpi(kpiIndex, field, value) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis[kpiIndex][field] = value;
      return next;
    });
  }

  function updateTier(kpiIndex, tierIndex, field, value) {
    setDraft((current) => {
      const next = clone(current);
      const tier = next[selectedPosition].kpis[kpiIndex].tiers[tierIndex];
      if (field.startsWith('rule.')) tier.rule[field.split('.')[1]] = value;
      else tier[field] = value;
      return next;
    });
  }

  function updateEvidenceItem(kpiIndex, itemIndex, value) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis[kpiIndex].evidenceChecklist ??= [];
      next[selectedPosition].kpis[kpiIndex].evidenceChecklist[itemIndex] = value;
      return next;
    });
  }

  function updateActualDataField(kpiIndex, fieldIndex, key, value) {
    setDraft((current) => {
      const next = clone(current);
      const kpi = next[selectedPosition].kpis[kpiIndex];
      const fields = kpi.actualDataFields ??= [];
      const field = fields[fieldIndex];
      if (!field) return next;
      if (key === 'usedAsActualValue') {
        fields.forEach((item, index) => {
          item.usedAsActualValue = value && index === fieldIndex;
        });
        kpi.actualValueSourceFieldId = value ? field.id : '';
      } else {
        field[key] = value;
        if (key === 'id' && field.usedAsActualValue) {
          kpi.actualValueSourceFieldId = value;
        }
      }
      return next;
    });
  }

  function addActualDataField(kpiIndex) {
    setDraft((current) => {
      const next = clone(current);
      const fields = next[selectedPosition].kpis[kpiIndex].actualDataFields ??= [];
      let sequence = fields.length + 1;
      let id = `actual_data_${sequence}`;
      while (fields.some((field) => field.id === id)) id = `actual_data_${++sequence}`;
      fields.push(newActualDataField(id));
      return next;
    });
  }

  function duplicateActualDataField(kpiIndex, fieldIndex) {
    setDraft((current) => {
      const next = clone(current);
      const kpi = next[selectedPosition].kpis[kpiIndex];
      const fields = kpi.actualDataFields ??= [];
      const source = fields[fieldIndex];
      if (!source) return next;
      let sequence = fields.length + 1;
      let id = `${source.id || 'actual_data'}_copy`;
      while (fields.some((field) => field.id === id)) id = `actual_data_${++sequence}`;
      fields.splice(fieldIndex + 1, 0, { ...clone(source), id, usedAsActualValue: false });
      return next;
    });
  }

  function moveActualDataField(kpiIndex, fieldIndex, direction) {
    setDraft((current) => {
      const next = clone(current);
      const fields = next[selectedPosition].kpis[kpiIndex].actualDataFields ?? [];
      const targetIndex = fieldIndex + direction;
      if (targetIndex < 0 || targetIndex >= fields.length) return next;
      const [field] = fields.splice(fieldIndex, 1);
      fields.splice(targetIndex, 0, field);
      return next;
    });
  }

  function removeActualDataField(kpiIndex, fieldIndex) {
    setDraft((current) => {
      const next = clone(current);
      const kpi = next[selectedPosition].kpis[kpiIndex];
      const removed = kpi.actualDataFields?.[fieldIndex];
      kpi.actualDataFields = (kpi.actualDataFields || [])
        .filter((_, index) => index !== fieldIndex);
      if (removed?.usedAsActualValue) kpi.actualValueSourceFieldId = '';
      return next;
    });
  }

  function addEvidenceItem(kpiIndex) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis[kpiIndex].evidenceChecklist ??= [];
      next[selectedPosition].kpis[kpiIndex].evidenceChecklist.push('');
      return next;
    });
  }

  function removeEvidenceItem(kpiIndex, itemIndex) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis[kpiIndex].evidenceChecklist = (next[selectedPosition].kpis[kpiIndex].evidenceChecklist || [])
        .filter((_, index) => index !== itemIndex);
      return next;
    });
  }

  function selectPosition(name) {
    setSelectedPosition(name);
    setPositionName(name);
    setExpandedKpi(0);
  }

  function addPosition() {
    let name = 'Posisi Baru';
    let count = 2;
    while (draft[name]) name = `Posisi Baru ${count++}`;
    const next = { ...draft, [name]: { kpis: [newKpi('k1', 100)] } };
    setDraft(next);
    setSelectedPosition(name);
    setPositionName(name);
    setExpandedKpi(0);
  }

  function renamePosition(name) {
    name = name.trim();
    if (!name || name === selectedPosition) return setPositionName(selectedPosition);
    if (draft[name]) {
      alert('Nama posisi sudah digunakan.');
      return setPositionName(selectedPosition);
    }
    const next = {};
    positions.forEach((position) => { next[position === selectedPosition ? name : position] = draft[position]; });
    setDraft(next);
    setSelectedPosition(name);
    setPositionName(name);
  }

  function addKpi() {
    const kpis = definition?.kpis || [];
    let sequence = kpis.length + 1;
    let id = `k${sequence}`;
    while (kpis.some((kpi) => kpi.id === id)) id = `k${++sequence}`;
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis.push(newKpi(id, 0));
      return next;
    });
    setExpandedKpi(kpis.length);
  }

  function duplicateKpi(kpiIndex) {
    const source = definition.kpis[kpiIndex];
    const copy = clone(source);
    let sequence = 2;
    let id = `${source.id}-copy`;
    while (definition.kpis.some((kpi) => kpi.id === id)) id = `${source.id}-copy-${sequence++}`;
    copy.id = id;
    copy.nama = `${source.nama} (Salinan)`;
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis.splice(kpiIndex + 1, 0, copy);
      return next;
    });
    setExpandedKpi(kpiIndex + 1);
  }

  function confirmDeletePosition() {
    const next = clone(draft);
    delete next[selectedPosition];
    const first = Object.keys(next)[0] || '';
    setDraft(next);
    setSelectedPosition(first);
    setPositionName(first);
    setExpandedKpi(first ? 0 : null);
    setConfirmation(null);
  }

  function confirmDeleteKpi(kpiIndex) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis.splice(kpiIndex, 1);
      return next;
    });
    setExpandedKpi(null);
    setConfirmation(null);
  }

  async function save() {
    const committed = buildDraftWithCommittedPositionName();
    if (committed.error) {
      alert(committed.error);
      return;
    }
    if (!definitionsAreValid(committed.definitions)) {
      alert('Total bobot harus 100% dan seluruh field KPI harus lengkap sebelum pengaturan dapat disimpan.');
      return;
    }

    setSaving(true);
    setDraft(committed.definitions);
    setSelectedPosition(committed.selected);
    setPositionName(committed.selected);
    const result = await api('saveKpiDefinitions', { definitions: committed.definitions });
    setSaving(false);
    if (!result.success) return alert(result.error || 'Pengaturan KPI gagal disimpan.');
    alert('Pengaturan KPI berhasil disimpan.');
    await onSaved(result.data.posisiData);
  }

  function reset() {
    const next = clone(definitions);
    const first = next[selectedPosition] ? selectedPosition : Object.keys(next)[0] || '';
    setDraft(next);
    setSelectedPosition(first);
    setPositionName(first);
    setExpandedKpi(first ? 0 : null);
  }

  const totalWeight = definition?.kpis.reduce((sum, item) => sum + Number(item.bobot || 0), 0) || 0;
  const validation = positionValidation(totalWeight);
  const committedPreview = buildDraftWithCommittedPositionName();
  const allPositionsValid = !committedPreview.error && definitionsAreValid(committedPreview.definitions);

  return <div className="kpi-builder">
    <section className="builder-header-card">
      <h2>Pengaturan Form KPI</h2>
      <p>Kelola template KPI berdasarkan posisi atau jabatan.</p>
    </section>

    <section className="builder-toolbar">
      <div className="position-picker form-group">
        <label className="form-label">Posisi / Jabatan</label>
        <select className="form-select" value={selectedPosition} onChange={(event) => selectPosition(event.target.value)}>
          {positions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="builder-toolbar-actions">
        <button className="btn secondary" onClick={addPosition}>+ Tambah Posisi</button>
        <button className="btn" onClick={addKpi} disabled={!definition}>+ Tambah KPI</button>
      </div>
    </section>

    {definition && <>
      <section className="position-summary-card">
        <div className="position-summary-main">
          <div className="form-group position-name-field">
            <label className="form-label">Nama Posisi</label>
            <input className="form-control" value={positionName} onBlur={(event) => renamePosition(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} onChange={(event) => setPositionName(event.target.value)} />
          </div>
          <div className="summary-stat"><span>Jumlah KPI</span><strong>{definition.kpis.length} KPI</strong></div>
          <div className="summary-stat"><span>Total Bobot</span><strong>{totalWeight}%</strong></div>
          <div className="summary-stat"><span>Status Validasi</span><span className={`validation-badge ${validation.className}`}>{validation.label}</span></div>
        </div>
        <button className="btn danger-outline small" onClick={() => setConfirmation({ type: 'position' })}>Hapus Posisi</button>
      </section>

      <section className="kpi-accordion-list">
        {definition.kpis.map((kpi, kpiIndex) => {
          const complete = kpiIsComplete(kpi);
          const expanded = expandedKpi === kpiIndex;
          const checklist = kpi.evidenceChecklist || [];
          const dataFields = kpi.actualDataFields || [];
          const dataFieldIssues = actualDataFieldIssues(kpi);
          return <article className={`kpi-accordion-card ${expanded ? 'expanded' : ''}`} key={`${kpi.id}-${kpiIndex}`}>
            <div className="kpi-accordion-summary">
              <button className="accordion-toggle" onClick={() => setExpandedKpi(expanded ? null : kpiIndex)} aria-expanded={expanded}>
                <span className="accordion-chevron" aria-hidden="true">{expanded ? '−' : '+'}</span>
                <span className="accordion-title"><small>KPI {kpiIndex + 1}</small><strong>{kpi.nama || 'Indikator tanpa nama'}</strong></span>
              </button>
              <div className="kpi-quick-meta">
                <span><small>Bobot</small><strong>{Number(kpi.bobot || 0)}%</strong></span>
                <span><small>Satuan</small><strong>{kpi.unit || '-'}</strong></span>
                <span><small>Data Aktual</small><strong>{actualDataFields(kpi).length} field</strong></span>
                <span><small>Bukti</small><strong>{evidenceChecklist(kpi).length} item</strong></span>
                <span className={`completion-badge ${complete ? 'complete' : 'incomplete'}`}>{complete ? 'Lengkap' : 'Belum Lengkap'}</span>
              </div>
              <div className="kpi-card-actions">
                <button className="btn secondary small" onClick={() => setExpandedKpi(expanded ? null : kpiIndex)}>{expanded ? 'Tutup Detail' : 'Edit Detail'}</button>
                <button className="btn ghost small" onClick={() => duplicateKpi(kpiIndex)}>Duplikasi</button>
                <button className="btn danger-outline small" onClick={() => setConfirmation({ type: 'kpi', index: kpiIndex })}>Hapus</button>
              </div>
            </div>

            {expanded && <div className="kpi-accordion-detail">
              <div className="form-grid form-grid-3 kpi-short-fields">
                <div className="form-group">
                  <label className="form-label">ID KPI</label>
                  <input className="form-control" value={kpi.id} onChange={(event) => updateKpi(kpiIndex, 'id', event.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bobot (%)</label>
                  <input className="form-control" type="number" min="0" max="100" step="0.01" value={kpi.bobot} onChange={(event) => updateKpi(kpiIndex, 'bobot', Number(event.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Satuan</label>
                  <select
                    className="form-select"
                    value={UNIT_OPTIONS.includes(kpi.unit) ? kpi.unit : CUSTOM_UNIT}
                    onChange={(event) => updateKpi(kpiIndex, 'unit', event.target.value === CUSTOM_UNIT ? '' : event.target.value)}
                  >
                    {UNIT_OPTIONS.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
                    <option value={CUSTOM_UNIT}>Custom</option>
                  </select>
                </div>
              </div>
              {!UNIT_OPTIONS.includes(kpi.unit) && <div className="form-group custom-unit-field">
                <label className="form-label">Satuan Custom</label>
                <input className="form-control" value={kpi.unit} placeholder="Masukkan satuan KPI" onChange={(event) => updateKpi(kpiIndex, 'unit', event.target.value)} />
              </div>}
              <div className="form-group">
                <label className="form-label">Nama Indikator</label>
                <input className="form-control" value={kpi.nama} onChange={(event) => updateKpi(kpiIndex, 'nama', event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Target</label>
                <textarea className="form-textarea" rows="3" value={kpi.target} onChange={(event) => updateKpi(kpiIndex, 'target', event.target.value)} />
              </div>

              <section className="actual-data-settings-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Input Data Aktual</h4>
                    <p>Atur field data aktual yang wajib diisi sebelum evidence dan keputusan skor final.</p>
                  </div>
                  <button className="btn secondary small" type="button" onClick={() => addActualDataField(kpiIndex)}>+ Tambah Actual Data Field</button>
                </div>
                <div className="actual-data-settings-list">
                  {dataFields.map((field, fieldIndex) => {
                    const issues = dataFieldIssues[fieldIndex] || [];
                    return <div className={`actual-data-field-card ${issues.length ? 'has-warning' : ''}`} key={`${field.id || 'field'}-${fieldIndex}`}>
                      <div className="actual-data-card-head">
                        <strong>{field.label || `Field ${fieldIndex + 1}`}</strong>
                        <div className="actual-data-card-actions">
                          <button className="btn ghost small" type="button" onClick={() => moveActualDataField(kpiIndex, fieldIndex, -1)} disabled={fieldIndex === 0}>Naik</button>
                          <button className="btn ghost small" type="button" onClick={() => moveActualDataField(kpiIndex, fieldIndex, 1)} disabled={fieldIndex === dataFields.length - 1}>Turun</button>
                          <button className="btn secondary small" type="button" onClick={() => duplicateActualDataField(kpiIndex, fieldIndex)}>Duplikasi</button>
                          <button className="btn danger-outline small" type="button" onClick={() => removeActualDataField(kpiIndex, fieldIndex)}>Hapus</button>
                        </div>
                      </div>
                      <div className="actual-data-settings-grid">
                        <div className="form-group">
                          <label className="form-label">Field ID</label>
                          <input
                            className="form-control"
                            value={field.id || ''}
                            placeholder="actual_data_1"
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, 'id', event.target.value)}
                          />
                        </div>
                        <div className="form-group actual-data-label-field">
                          <label className="form-label">Label Field</label>
                          <input
                            className="form-control"
                            value={field.label || ''}
                            placeholder="Contoh: Total leads"
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, 'label', event.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Type</label>
                          <select
                            className="form-select"
                            value={field.type || 'text'}
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, 'type', event.target.value)}
                          >
                            {Object.keys(ACTUAL_DATA_TYPES).map((value) => <option value={value} key={value}>{value}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Unit</label>
                          <input
                            className="form-control"
                            value={field.unit || ''}
                            placeholder="%, Rp, hari"
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, 'unit', event.target.value)}
                          />
                        </div>
                        <div className="form-group actual-data-helper-field">
                          <label className="form-label">Helper Text</label>
                          <input
                            className="form-control"
                            value={field.helperText || ''}
                            placeholder="Petunjuk singkat untuk pengisi"
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, 'helperText', event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="actual-data-checkbox-grid">
                        {[
                          ['required', 'Required'],
                          ['sourceRequired', 'Source Required'],
                          ['dataDateRequired', 'Data Date Required'],
                          ['verificationRequired', 'Verification Required'],
                          ['usedAsActualValue', 'Used as Actual Value'],
                        ].map(([key, label]) => <label className="checkbox-row compact-checkbox" key={key}>
                          <input
                            type="checkbox"
                            checked={Boolean(field[key])}
                            onChange={(event) => updateActualDataField(kpiIndex, fieldIndex, key, event.target.checked)}
                          />
                          <span>{label}</span>
                        </label>)}
                      </div>
                      {issues.length > 0 && <div className="actual-data-warnings">
                        {issues.map((issue) => <span key={issue}>{issue}</span>)}
                      </div>}
                    </div>;
                  })}
                  {dataFields.length === 0 && <div className="evidence-empty">Belum ada field Input Data Aktual untuk KPI ini.</div>}
                </div>
              </section>

              <section className="evidence-settings-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Checklist Bukti Wajib</h4>
                    <p>Item yang diaktifkan di sini harus dicentang saat penilaian KPI disubmit.</p>
                  </div>
                  <button className="btn secondary small" type="button" onClick={() => addEvidenceItem(kpiIndex)}>+ Tambah Bukti</button>
                </div>
                <div className="evidence-settings-list">
                  {checklist.map((item, itemIndex) => <div className="evidence-settings-row" key={itemIndex}>
                    <input
                      className="form-control"
                      value={item}
                      placeholder="Contoh: Dashboard Sales bulan berjalan"
                      onChange={(event) => updateEvidenceItem(kpiIndex, itemIndex, event.target.value)}
                    />
                    <button className="btn danger-outline small" type="button" onClick={() => removeEvidenceItem(kpiIndex, itemIndex)}>Hapus</button>
                  </div>)}
                  {checklist.length === 0 && <div className="evidence-empty">Belum ada checklist bukti wajib untuk KPI ini.</div>}
                </div>
              </section>

              <section className="scoring-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Label Capaian</h4>
                    <p>Atur skor, label, dan kriteria formula untuk setiap tingkat pencapaian.</p>
                  </div>
                </div>
                <div className="scoring-matrix">
                  <div className="scoring-matrix-head" aria-hidden="true">
                    <span>Skor</span>
                    <span>Label</span>
                    <span>Kriteria</span>
                  </div>
                  {kpi.tiers.map((tier, tierIndex) => <div className="scoring-matrix-row" key={tierIndex}>
                    <div className="form-group scoring-score-field">
                      <label className="form-label">Skor</label>
                      <input className="form-control" type="number" min="0" max="2" value={tier.skor} onChange={(event) => updateTier(kpiIndex, tierIndex, 'skor', Number(event.target.value))} />
                    </div>
                    <div className="form-group scoring-label-field">
                      <label className="form-label">Label</label>
                      <input className="form-control" value={tier.label} onChange={(event) => updateTier(kpiIndex, tierIndex, 'label', event.target.value)} />
                    </div>
                    <div className="scoring-criteria-field">
                      <div className={`form-grid ${tier.rule.operator === 'between' ? 'scoring-rule-grid-between' : 'scoring-rule-grid'}`}>
                        <div className="form-group">
                          <label className="form-label">Operator</label>
                          <select className="form-select" value={tier.rule.operator} onChange={(event) => updateTier(kpiIndex, tierIndex, 'rule.operator', event.target.value)}>{Object.entries(OPERATORS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">{tier.rule.operator === 'between' ? 'Batas bawah' : 'Nilai batas'}</label>
                          <input className="form-control" type="number" step="any" value={tier.rule.value} onChange={(event) => updateTier(kpiIndex, tierIndex, 'rule.value', Number(event.target.value))} />
                        </div>
                        {tier.rule.operator === 'between' && <div className="form-group">
                          <label className="form-label">Batas atas</label>
                          <input className="form-control" type="number" step="any" value={tier.rule.max ?? ''} onChange={(event) => updateTier(kpiIndex, tierIndex, 'rule.max', Number(event.target.value))} />
                        </div>}
                      </div>
                      <div className="formula-preview"><strong>Formula aktif:</strong> {formatRule(tier.rule, kpi.unit)}</div>
                    </div>
                  </div>)}
                </div>
              </section>
            </div>}
          </article>;
        })}
        {definition.kpis.length === 0 && <div className="empty-builder-state"><strong>Belum ada KPI</strong><span>Tambahkan indikator KPI pertama untuk posisi ini.</span><button className="btn" onClick={addKpi}>+ Tambah KPI</button></div>}
      </section>
    </>}

    <div className="builder-action-spacer" aria-hidden="true" />
    <footer className="builder-sticky-actions">
      <div className="save-validation-copy">
        {!allPositionsValid && <span>Total bobot harus 100% dan seluruh field KPI harus lengkap sebelum pengaturan dapat disimpan.</span>}
      </div>
      <div className="builder-save-buttons">
        <button className="btn secondary" onClick={reset} disabled={saving}>Batalkan</button>
        <button className="btn" onClick={save} disabled={!allPositionsValid || saving}>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
      </div>
    </footer>

    {confirmation?.type === 'position' && <ConfirmModal
      title="Hapus Posisi?"
      description="Semua konfigurasi KPI pada posisi ini akan ikut terhapus. Tindakan ini tidak dapat dibatalkan."
      confirmLabel="Ya, Hapus Posisi"
      onCancel={() => setConfirmation(null)}
      onConfirm={confirmDeletePosition}
    />}
    {confirmation?.type === 'kpi' && <ConfirmModal
      title="Hapus KPI?"
      description="Indikator KPI ini akan dihapus dari konfigurasi posisi."
      confirmLabel="Ya, Hapus KPI"
      onCancel={() => setConfirmation(null)}
      onConfirm={() => confirmDeleteKpi(confirmation.index)}
    />}
  </div>;
}
