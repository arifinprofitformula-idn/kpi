import { useState } from 'react';
import { api } from '../lib/api.js';
import {
  BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
  BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET,
  applyActualDataPresetToDefinitions,
} from '../lib/actualDataPresets.js';
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
const DETAIL_TABS = [
  { id: 'basic', label: 'Dasar KPI' },
  { id: 'actualData', label: 'Input Data Aktual' },
  { id: 'scoring', label: 'Formula Skor' },
  { id: 'evidence', label: 'Bukti Tambahan' },
];
const PRESET_OPTIONS = [
  { type: 'brandExecutiveMeezanPreset', label: 'Brand Executive Meezan Gold' },
  { type: 'brandExecutiveSilvergramPreset', label: 'Brand Executive Silvergram' },
  { type: 'staffMarcomCrmDatabasePreset', label: 'Staff Marcom CRM & Database' },
  { type: 'staffMarcomDesignWebPreset', label: 'Staff Marcom Design & Web' },
  { type: 'staffMarcomSocialMediaPreset', label: 'Staff Marcom Social Media' },
  { type: 'staffMarcomPhotoVideoProductionPreset', label: 'Staff Marcom Photo & Video Production' },
  { type: 'staffMarkomDesignerVideoPreset', label: 'Staff Markom Designer & Video' },
  { type: 'markomPreset', label: 'Markom Leader' },
];
const MARKOM_ACTUAL_DATA_PRESET = [
  {
    match: ['Demand & Lead Growth'],
    actualValueSourceFieldId: 'growth_actual',
    fields: [
      presetField('current_leads', 'Leads Bulan Ini (total dari CRM)', 'number', 'leads'),
      presetField('baseline_leads', 'Leads Baseline OGSM (referensi)', 'number', 'leads'),
      presetField('growth_actual', '% Growth Aktual', 'percent', '%', {
        usedAsActualValue: true,
        helperText: 'Growth = (Leads Bulan Ini - Baseline) / Baseline x 100',
      }),
      presetField('top_lead_channel', 'Channel leads terbesar bulan ini', 'text', '', {
        required: false,
        sourceRequired: false,
        dataDateRequired: false,
      }),
      presetField('crm_export_link', 'Nama file / link export CRM', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
      presetField('anomaly_note', 'Catatan anomali atau kendala', 'textarea', '', {
        required: false,
        sourceRequired: false,
        dataDateRequired: false,
        verificationRequired: false,
      }),
    ],
  },
  {
    match: ['Funnel Conversion'],
    actualValueSourceFieldId: 'selected_improvement',
    fields: [
      presetField('current_leads', 'Total leads bulan ini', 'number', 'leads'),
      presetField('current_conversions', 'Total konversi bulan ini', 'number', 'conversions'),
      presetField('current_conversion_rate', 'Conversion Rate bulan ini (%)', 'percent', '%'),
      presetField('previous_conversion_rate', 'Conversion Rate bulan lalu (%)', 'percent', '%'),
      presetField('current_ad_spend', 'Total biaya iklan bulan ini (Rp)', 'currency', 'Rp'),
      presetField('current_cpl', 'CPL bulan ini (Rp)', 'currency', 'Rp'),
      presetField('previous_cpl', 'CPL bulan lalu (Rp)', 'currency', 'Rp'),
      presetField('selected_improvement', '% Improvement yang digunakan (CR/CPL)', 'percent', '%', { usedAsActualValue: true }),
      presetField('crm_data_file', 'Nama file data CRM yang dilampirkan', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
    ],
  },
  {
    match: ['Produk Digital Revenue', 'Digital Revenue'],
    actualValueSourceFieldId: 'achievement_percent',
    fields: [
      presetField('target_revenue', 'Target revenue produk digital bulan ini (Rp)', 'currency', 'Rp'),
      presetField('actual_revenue', 'Realisasi revenue aktual (Rp)', 'currency', 'Rp'),
      presetField('achievement_percent', '% Achievement', 'percent', '%', { usedAsActualValue: true }),
      presetField('product_sku_list', 'Daftar produk digital yang masuk hitungan', 'textarea', ''),
      presetField('refund_amount', 'Ada refund/pembatalan? (Rp)', 'currency', 'Rp', { required: false }),
      presetField('net_revenue', 'Revenue bersih setelah refund (Rp)', 'currency', 'Rp'),
      presetField('source_used', 'Sumber data yang digunakan', 'text', ''),
    ],
  },
  {
    match: ['SLA Support'],
    actualValueSourceFieldId: 'sla_achievement',
    fields: [
      presetField('total_requests', 'Total task/request diterima dari Brand Executive', 'number', 'task'),
      presetField('on_time_completed', 'Jumlah yang diselesaikan tepat waktu (sesuai SLA)', 'number', 'task'),
      presetField('late_count', 'Jumlah yang terlambat / melewati SLA', 'number', 'task'),
      presetField('sla_achievement', '% SLA Achievement', 'percent', '%', { usedAsActualValue: true }),
      presetField('late_items', 'Daftar item terlambat (jika ada)', 'textarea', '', { required: false }),
      presetField('approval_log_file', 'Nama file log/timeline yang dilampirkan', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
    ],
  },
  {
    match: ['Campaign & Roadmap'],
    actualValueSourceFieldId: 'execution_rate',
    fields: [
      presetField('planned_campaigns', 'Jumlah program/kampanye direncanakan (dari roadmap)', 'number', 'program'),
      presetField('executed_campaigns', 'Jumlah yang terealisasi (benar-benar berjalan)', 'number', 'program'),
      presetField('not_executed_programs', 'Program yang TIDAK terealisasi', 'textarea', '', { required: false }),
      presetField('execution_rate', '% Execution Rate', 'percent', '%', { usedAsActualValue: true }),
      presetField('campaign_roadmap_file', 'Nama file proposal/roadmap kampanye', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
      presetField('approval_reference', 'Nomor/nama approval program', 'text', ''),
    ],
  },
  {
    match: ['Team Performance'],
    actualValueSourceFieldId: 'team_achievement',
    fields: [
      presetField('total_team_members', 'Total anggota tim yang dinilai bulan ini', 'number', 'orang'),
      presetField('achieve_members', 'Jumlah yang ACHIEVE KPI', 'number', 'orang'),
      presetField('not_achieve_members', 'Jumlah yang TIDAK achieve KPI', 'number', 'orang'),
      presetField('team_achievement', '% Tim yang Achieve', 'percent', '%', { usedAsActualValue: true }),
      presetField('not_achieve_names', 'Nama anggota yang tidak achieve (dan alasan)', 'textarea', '', { required: false }),
      presetField('follow_up_plan', 'Rencana tindak lanjut untuk yang tidak achieve', 'textarea', '', { required: false }),
      presetField('team_kpi_file', 'Nama file rekap KPI tim yang dilampirkan', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
    ],
  },
  {
    match: ['Reporting & Budget'],
    actualValueSourceFieldId: 'report_achievement_percent',
    fields: [
      presetField('report_deadline', 'Deadline laporan bulanan (sesuai SOP)', 'date', ''),
      presetField('report_sent_date', 'Tanggal laporan aktual dikirimkan', 'date', ''),
      presetField('day_difference', 'Selisih hari (minus=awal, plus=terlambat)', 'number', 'hari'),
      presetField('revision_count', 'Jumlah revisi yang diminta atasan', 'number', 'revisi'),
      presetField('report_accuracy', 'Apakah data laporan akurat?', 'text', ''),
      presetField('budget_realization', 'Anggaran yang terealisasi vs yang direncanakan (Rp)', 'currency', 'Rp', { required: false }),
      presetField('report_file_link', 'Link/nama file laporan yang disubmit', 'url', '', {
        sourceRequired: false,
        dataDateRequired: false,
      }),
      presetField('report_achievement_percent', 'Capaian laporan aktual (%)', 'percent', '%', {
        usedAsActualValue: true,
        helperText: '100 jika tepat waktu dan akurat; 70 jika terlambat ringan <=2 hari dan data akurat; <70 jika lebih dari 1x terlambat atau data tidak akurat.',
      }),
    ],
  },
];

function presetField(id, label, type, unit, overrides = {}) {
  return {
    id,
    label,
    type,
    unit,
    required: true,
    sourceRequired: true,
    dataDateRequired: true,
    verificationRequired: true,
    usedAsActualValue: false,
    helperText: '',
    ...overrides,
  };
}

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

function findPresetForKpi(kpi, kpiIndex) {
  const name = String(kpi?.nama || '').toLowerCase();
  return MARKOM_ACTUAL_DATA_PRESET.find((preset) => preset.match.some((keyword) => name.includes(keyword.toLowerCase())))
    || MARKOM_ACTUAL_DATA_PRESET[kpiIndex]
    || null;
}

function mergePresetIntoKpi(kpi, preset) {
  const existingFields = Array.isArray(kpi.actualDataFields) ? kpi.actualDataFields : [];
  const presetFields = preset.fields.map((field) => clone(field));
  const presetIds = new Set(presetFields.map((field) => field.id));
  const mergedFields = [
    ...presetFields,
    ...existingFields.filter((field) => !presetIds.has(field.id)),
  ].map((field) => ({
    ...field,
    usedAsActualValue: field.id === preset.actualValueSourceFieldId,
  }));

  return {
    ...kpi,
    actualValueSourceFieldId: preset.actualValueSourceFieldId,
    actualDataFields: mergedFields,
  };
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
  const [activeDetailTab, setActiveDetailTab] = useState('basic');
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [kpiSearch, setKpiSearch] = useState('');
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

  function updateActualValueSourceField(kpiIndex, fieldId) {
    setDraft((current) => {
      const next = clone(current);
      const kpi = next[selectedPosition].kpis[kpiIndex];
      const fields = kpi.actualDataFields ?? [];
      kpi.actualValueSourceFieldId = fieldId;
      fields.forEach((field) => {
        field.usedAsActualValue = Boolean(fieldId) && field.id === fieldId;
      });
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

  function applyMarkomActualDataPreset() {
    setDraft((current) => {
      const next = clone(current);
      const kpis = next[selectedPosition]?.kpis || [];
      kpis.forEach((kpi, kpiIndex) => {
        const preset = findPresetForKpi(kpi, kpiIndex);
        if (!preset) return;
        kpis[kpiIndex] = mergePresetIntoKpi(kpi, preset);
      });
      return next;
    });
    setConfirmation(null);
  }

  function applyBrandExecutiveMeezanPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Brand Executive Meezan Gold berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyBrandExecutiveSilvergramPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Brand Executive Silvergram berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyStaffMarcomCrmDatabasePreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Staff Marcom CRM & Database berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyStaffMarcomDesignWebPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Staff Marcom Design & Web berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyStaffMarcomSocialMediaPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Staff Marcom Social Media berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyStaffMarcomPhotoVideoProductionPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Staff Marcom Photo & Video Production berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
  }

  function applyStaffMarkomDesignerVideoPreset() {
    const { definitions: next, result } = applyActualDataPresetToDefinitions(
      draft,
      selectedPosition,
      STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET,
    );
    setDraft(next);
    setConfirmation(null);
    alert(`Preset Staff Markom Designer & Video berhasil diterapkan ke ${result.matchedCount} KPI. Review lalu klik Simpan Pengaturan.`);
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
    setActiveDetailTab('basic');
    setPresetMenuOpen(false);
    setKpiSearch('');
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
    setActiveDetailTab('basic');
    setKpiSearch('');
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
    setActiveDetailTab('basic');
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
    setActiveDetailTab('basic');
  }

  function moveKpi(kpiIndex, direction) {
    const targetIndex = kpiIndex + direction;
    if (!definition || targetIndex < 0 || targetIndex >= definition.kpis.length) return;
    setDraft((current) => {
      const next = clone(current);
      const kpis = next[selectedPosition].kpis;
      const [item] = kpis.splice(kpiIndex, 1);
      kpis.splice(targetIndex, 0, item);
      return next;
    });
    setExpandedKpi(targetIndex);
  }

  function confirmDeletePosition() {
    const next = clone(draft);
    delete next[selectedPosition];
    const first = Object.keys(next)[0] || '';
    setDraft(next);
    setSelectedPosition(first);
    setPositionName(first);
    setExpandedKpi(first ? 0 : null);
    setActiveDetailTab('basic');
    setConfirmation(null);
  }

  function confirmDeleteKpi(kpiIndex) {
    setDraft((current) => {
      const next = clone(current);
      next[selectedPosition].kpis.splice(kpiIndex, 1);
      return next;
    });
    const nextLength = Math.max((definition?.kpis.length || 1) - 1, 0);
    setExpandedKpi(nextLength ? Math.min(kpiIndex, nextLength - 1) : null);
    setActiveDetailTab('basic');
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
    setActiveDetailTab('basic');
    setPresetMenuOpen(false);
    setKpiSearch('');
  }

  const totalWeight = definition?.kpis.reduce((sum, item) => sum + Number(item.bobot || 0), 0) || 0;
  const validation = positionValidation(totalWeight);
  const committedPreview = buildDraftWithCommittedPositionName();
  const allPositionsValid = !committedPreview.error && definitionsAreValid(committedPreview.definitions);
  const kpis = definition?.kpis || [];
  const selectedKpiIndex = kpis.length ? Math.min(Math.max(Number.isInteger(expandedKpi) ? expandedKpi : 0, 0), kpis.length - 1) : null;
  const selectedKpi = selectedKpiIndex === null ? null : kpis[selectedKpiIndex];
  const selectedChecklist = selectedKpi?.evidenceChecklist || [];
  const selectedDataFields = selectedKpi?.actualDataFields || [];
  const selectedDataFieldIssues = selectedKpi ? actualDataFieldIssues(selectedKpi) : [];
  const invalidKpiCount = kpis.filter((kpi) => !kpiIsComplete(kpi)).length;
  const validationIssueCount = invalidKpiCount + (Math.abs(totalWeight - 100) < 0.001 ? 0 : 1) + (committedPreview.error ? 1 : 0);
  const actualDataKpiCount = kpis.filter((kpi) => actualDataFields(kpi).length > 0).length;
  const evidenceKpiCount = kpis.filter((kpi) => evidenceChecklist(kpi).length > 0).length;
  const visibleKpis = kpis
    .map((kpi, index) => ({ kpi, index }))
    .filter(({ kpi }) => String(kpi.nama || '').toLowerCase().includes(kpiSearch.trim().toLowerCase()));
  const validationSummary = allPositionsValid
    ? 'Semua posisi valid. Perubahan siap disimpan.'
    : `Ada ${validationIssueCount || 1} error validasi. Periksa KPI yang ditandai.`;

  return <div className="kpi-builder">
    <section className="builder-header-card">
      <h2>Pengaturan Form KPI</h2>
      <p>Kelola template KPI berdasarkan posisi atau jabatan.</p>
    </section>

    <section className="builder-toolbar builder-toolbar-card">
      <div className="position-picker form-group">
        <label className="form-label">Posisi / Jabatan</label>
        <select className="form-select" value={selectedPosition} onChange={(event) => selectPosition(event.target.value)}>
          {positions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="builder-toolbar-actions">
        <div className="preset-dropdown">
          <button className="btn secondary preset-dropdown-toggle" type="button" onClick={() => setPresetMenuOpen((open) => !open)} disabled={!definition}>
            Terapkan Preset <span aria-hidden="true">⌄</span>
          </button>
          {presetMenuOpen && <div className="preset-dropdown-menu">
            {PRESET_OPTIONS.map((preset) => <button
              type="button"
              key={preset.type}
              onClick={() => {
                setPresetMenuOpen(false);
                setConfirmation({ type: preset.type });
              }}
            >
              <span aria-hidden="true">▣</span>
              {preset.label}
            </button>)}
          </div>}
        </div>
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
          <div className="summary-stat"><span>KPI dengan Input Data Aktual</span><strong>{actualDataKpiCount}/{kpis.length}</strong></div>
          <div className="summary-stat"><span>KPI dengan Bukti Tambahan</span><strong>{evidenceKpiCount}</strong></div>
        </div>
        <button className="btn danger-outline small" onClick={() => setConfirmation({ type: 'position' })}>Hapus Posisi</button>
      </section>

      <section className="builder-layout">
        <aside className="builder-sidebar">
          <div className="builder-sidebar-head">
            <div>
              <strong>Daftar KPI</strong>
              <span>{kpis.length} KPI</span>
            </div>
            <input className="form-control" value={kpiSearch} placeholder="Cari KPI..." onChange={(event) => setKpiSearch(event.target.value)} />
          </div>
          <div className="kpi-list">
            {visibleKpis.map(({ kpi, index }) => {
              const complete = kpiIsComplete(kpi);
              const active = index === selectedKpiIndex;
              return <article className={`kpi-list-card ${active ? 'active' : ''} ${complete ? '' : 'invalid'}`} key={`${kpi.id}-${index}`}>
                <button className="kpi-list-main" type="button" onClick={() => { setExpandedKpi(index); setActiveDetailTab('basic'); }}>
                  <span className="kpi-list-number">{index + 1}</span>
                  <span className="kpi-list-copy">
                    <strong>{kpi.nama || 'Indikator tanpa nama'}</strong>
                    <small>Bobot {Number(kpi.bobot || 0)}% | {kpi.unit || '-'}</small>
                    <small>Data Aktual: {actualDataFields(kpi).length} field | Bukti: {evidenceChecklist(kpi).length} item</small>
                  </span>
                  <span className={`completion-badge ${complete ? 'complete' : 'incomplete'}`}>{complete ? 'Lengkap' : 'Belum Lengkap'}</span>
                </button>
                <div className="kpi-list-actions">
                  <button className="btn ghost small" type="button" onClick={() => moveKpi(index, -1)} disabled={index === 0}>Naik</button>
                  <button className="btn ghost small" type="button" onClick={() => moveKpi(index, 1)} disabled={index === kpis.length - 1}>Turun</button>
                  <button className="btn ghost small" type="button" onClick={() => duplicateKpi(index)}>Duplikasi</button>
                  <button className="btn danger-outline small" type="button" onClick={() => setConfirmation({ type: 'kpi', index })}>Hapus</button>
                </div>
              </article>;
            })}
            {visibleKpis.length === 0 && <div className="evidence-empty">Tidak ada KPI yang cocok dengan pencarian.</div>}
            <button className="btn secondary kpi-sidebar-add" type="button" onClick={addKpi}>+ Tambah KPI</button>
          </div>
        </aside>

        <section className="builder-detail">
          {selectedKpi ? <>
            <div className="builder-detail-head">
              <div>
                <span>KPI {selectedKpiIndex + 1} dari {kpis.length}</span>
                <h3>{selectedKpi.nama || 'Indikator tanpa nama'}</h3>
              </div>
              <div className="kpi-card-actions">
                <button className="btn ghost small" type="button" onClick={() => duplicateKpi(selectedKpiIndex)}>Duplikasi</button>
                <button className="btn danger-outline small" type="button" onClick={() => setConfirmation({ type: 'kpi', index: selectedKpiIndex })}>Hapus KPI</button>
              </div>
            </div>
            <div className="kpi-detail-tabs" role="tablist" aria-label="Editor KPI">
              {DETAIL_TABS.map((tab) => <button
                className={`kpi-detail-tab ${activeDetailTab === tab.id ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={activeDetailTab === tab.id}
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id)}
              >
                {tab.label}
              </button>)}
            </div>
            <div className="kpi-detail-panel">
              {activeDetailTab === 'basic' && <>
                <div className="form-grid form-grid-3 kpi-short-fields">
                  <div className="form-group">
                    <label className="form-label">ID KPI</label>
                    <input className="form-control" value={selectedKpi.id} onChange={(event) => updateKpi(selectedKpiIndex, 'id', event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bobot (%)</label>
                    <input className="form-control" type="number" min="0" max="100" step="0.01" value={selectedKpi.bobot} onChange={(event) => updateKpi(selectedKpiIndex, 'bobot', Number(event.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Satuan</label>
                    <select
                      className="form-select"
                      value={UNIT_OPTIONS.includes(selectedKpi.unit) ? selectedKpi.unit : CUSTOM_UNIT}
                      onChange={(event) => updateKpi(selectedKpiIndex, 'unit', event.target.value === CUSTOM_UNIT ? '' : event.target.value)}
                    >
                      {UNIT_OPTIONS.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
                      <option value={CUSTOM_UNIT}>Custom</option>
                    </select>
                  </div>
                </div>
                {!UNIT_OPTIONS.includes(selectedKpi.unit) && <div className="form-group custom-unit-field">
                  <label className="form-label">Satuan Custom</label>
                  <input className="form-control" value={selectedKpi.unit} placeholder="Masukkan satuan KPI" onChange={(event) => updateKpi(selectedKpiIndex, 'unit', event.target.value)} />
                </div>}
                <div className="form-group">
                  <label className="form-label">Nama Indikator</label>
                  <input className="form-control" value={selectedKpi.nama} onChange={(event) => updateKpi(selectedKpiIndex, 'nama', event.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target</label>
                  <textarea className="form-textarea" rows="4" value={selectedKpi.target} onChange={(event) => updateKpi(selectedKpiIndex, 'target', event.target.value)} />
                  <p className="field-helper">Target digunakan untuk perhitungan skor KPI.</p>
                </div>
              </>}

              {activeDetailTab === 'actualData' && <section className="actual-data-settings-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Input Data Aktual</h4>
                    <p>Sumber Dokumen / Bukti pada setiap field menjadi evidence utama untuk verifikasi atasan.</p>
                  </div>
                  <button className="btn secondary small" type="button" onClick={() => addActualDataField(selectedKpiIndex)}>+ Tambah Actual Data Field</button>
                </div>
                <div className="actual-value-source-control">
                  <label className="form-label">Nilai Aktual Utama Diambil Dari</label>
                  <select className="form-select" value={selectedKpi.actualValueSourceFieldId || ''} onChange={(event) => updateActualValueSourceField(selectedKpiIndex, event.target.value)}>
                    <option value="">Input manual Nilai Aktual</option>
                    {selectedDataFields.map((field) => <option key={field.id} value={field.id}>{field.label || field.id}</option>)}
                  </select>
                </div>
                <div className="actual-data-settings-list">
                  {selectedDataFields.map((field, fieldIndex) => {
                    const issues = selectedDataFieldIssues[fieldIndex] || [];
                    return <div className={`actual-data-field-card ${issues.length ? 'has-warning' : ''}`} key={`${field.id || 'field'}-${fieldIndex}`}>
                      <div className="actual-data-card-head">
                        <strong>{field.label || `Field ${fieldIndex + 1}`}</strong>
                        <div className="actual-data-card-actions">
                          <button className="btn ghost small" type="button" onClick={() => moveActualDataField(selectedKpiIndex, fieldIndex, -1)} disabled={fieldIndex === 0}>Naik</button>
                          <button className="btn ghost small" type="button" onClick={() => moveActualDataField(selectedKpiIndex, fieldIndex, 1)} disabled={fieldIndex === selectedDataFields.length - 1}>Turun</button>
                          <button className="btn secondary small" type="button" onClick={() => duplicateActualDataField(selectedKpiIndex, fieldIndex)}>Duplikasi</button>
                          <button className="btn danger-outline small" type="button" onClick={() => removeActualDataField(selectedKpiIndex, fieldIndex)}>Hapus</button>
                        </div>
                      </div>
                      <div className="actual-data-settings-grid">
                        <div className="form-group">
                          <label className="form-label">Field ID</label>
                          <input className="form-control" value={field.id || ''} placeholder="actual_data_1" onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, 'id', event.target.value)} />
                        </div>
                        <div className="form-group actual-data-label-field">
                          <label className="form-label">Label Field</label>
                          <input className="form-control" value={field.label || ''} placeholder="Contoh: Total leads" onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, 'label', event.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Type</label>
                          <select className="form-select" value={field.type || 'text'} onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, 'type', event.target.value)}>
                            {Object.keys(ACTUAL_DATA_TYPES).map((value) => <option value={value} key={value}>{value}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Unit</label>
                          <input className="form-control" value={field.unit || ''} placeholder="%, Rp, hari" onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, 'unit', event.target.value)} />
                        </div>
                        <div className="form-group actual-data-helper-field">
                          <label className="form-label">Helper Text</label>
                          <input className="form-control" value={field.helperText || ''} placeholder="Petunjuk singkat untuk pengisi" onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, 'helperText', event.target.value)} />
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
                          <input type="checkbox" checked={Boolean(field[key])} onChange={(event) => updateActualDataField(selectedKpiIndex, fieldIndex, key, event.target.checked)} />
                          <span>{label}</span>
                        </label>)}
                      </div>
                      {issues.length > 0 && <div className="actual-data-warnings">
                        {issues.map((issue) => <span key={issue}>{issue}</span>)}
                      </div>}
                    </div>;
                  })}
                  {selectedDataFields.length === 0 && <div className="evidence-empty">Belum ada field Input Data Aktual untuk KPI ini.</div>}
                </div>
              </section>}

              {activeDetailTab === 'scoring' && <section className="scoring-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Formula Skor</h4>
                    <p>Atur skor, label, dan kriteria formula untuk setiap tingkat pencapaian.</p>
                  </div>
                </div>
                <div className="scoring-matrix">
                  <div className="scoring-matrix-head" aria-hidden="true">
                    <span>Skor</span>
                    <span>Label</span>
                    <span>Kriteria</span>
                  </div>
                  {selectedKpi.tiers.map((tier, tierIndex) => <div className="scoring-matrix-row" key={tierIndex}>
                    <div className="form-group scoring-score-field">
                      <label className="form-label">Skor</label>
                      <input className="form-control" type="number" min="0" max="2" value={tier.skor} onChange={(event) => updateTier(selectedKpiIndex, tierIndex, 'skor', Number(event.target.value))} />
                    </div>
                    <div className="form-group scoring-label-field">
                      <label className="form-label">Label</label>
                      <input className="form-control" value={tier.label} onChange={(event) => updateTier(selectedKpiIndex, tierIndex, 'label', event.target.value)} />
                    </div>
                    <div className="scoring-criteria-field">
                      <div className={`form-grid ${tier.rule.operator === 'between' ? 'scoring-rule-grid-between' : 'scoring-rule-grid'}`}>
                        <div className="form-group">
                          <label className="form-label">Operator</label>
                          <select className="form-select" value={tier.rule.operator} onChange={(event) => updateTier(selectedKpiIndex, tierIndex, 'rule.operator', event.target.value)}>{Object.entries(OPERATORS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">{tier.rule.operator === 'between' ? 'Batas bawah' : 'Nilai batas'}</label>
                          <input className="form-control" type="number" step="any" value={tier.rule.value} onChange={(event) => updateTier(selectedKpiIndex, tierIndex, 'rule.value', Number(event.target.value))} />
                        </div>
                        {tier.rule.operator === 'between' && <div className="form-group">
                          <label className="form-label">Batas atas</label>
                          <input className="form-control" type="number" step="any" value={tier.rule.max ?? ''} onChange={(event) => updateTier(selectedKpiIndex, tierIndex, 'rule.max', Number(event.target.value))} />
                        </div>}
                      </div>
                      <div className="formula-preview"><strong>Formula aktif:</strong> {formatRule(tier.rule, selectedKpi.unit)}</div>
                    </div>
                  </div>)}
                </div>
              </section>}

              {activeDetailTab === 'evidence' && <section className="evidence-settings-section">
                <div className="scoring-section-heading">
                  <div>
                    <h4>Bukti Tambahan</h4>
                    <p>Gunakan Bukti Tambahan hanya jika ada dokumen yang tidak bisa diwakili oleh Sumber Dokumen / Bukti pada Input Data Aktual.</p>
                  </div>
                  <button className="btn secondary small" type="button" onClick={() => addEvidenceItem(selectedKpiIndex)}>+ Tambah Bukti</button>
                </div>
                <div className="evidence-settings-list">
                  {selectedChecklist.map((item, itemIndex) => <div className="evidence-settings-row" key={itemIndex}>
                    <input className="form-control" value={item} placeholder="Contoh: Dashboard Sales bulan berjalan" onChange={(event) => updateEvidenceItem(selectedKpiIndex, itemIndex, event.target.value)} />
                    <button className="btn danger-outline small" type="button" onClick={() => removeEvidenceItem(selectedKpiIndex, itemIndex)}>Hapus</button>
                  </div>)}
                  {selectedChecklist.length === 0 && <div className="evidence-empty">Belum ada bukti tambahan. Sebagian besar KPI cukup menggunakan Sumber Dokumen / Bukti pada Input Data Aktual.</div>}
                </div>
              </section>}
            </div>
          </> : <div className="empty-builder-state"><strong>Belum ada KPI</strong><span>Tambahkan indikator KPI pertama untuk posisi ini.</span><button className="btn" onClick={addKpi}>+ Tambah KPI</button></div>}
        </section>
      </section>
    </>}

    <div className="builder-action-spacer" aria-hidden="true" />
    <footer className="builder-sticky-actions">
      <div className={`builder-validation-summary ${allPositionsValid ? 'valid' : 'invalid'}`}>
        <span>{validationSummary}</span>
        <small>Perubahan belum disimpan sampai Anda klik Simpan Pengaturan.</small>
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
    {confirmation?.type === 'markomPreset' && <ConfirmModal
      title="Terapkan Preset Markom Leader?"
      description="Preset ini akan mengisi Section C Input Data Aktual untuk KPI pada posisi yang sedang dipilih berdasarkan dokumen evidence. Data yang sudah ada tidak akan ditimpa kecuali Field ID sama, dan perubahan belum tersimpan sampai Anda klik Simpan Pengaturan."
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyMarkomActualDataPreset}
    />}
    {confirmation?.type === 'brandExecutiveMeezanPreset' && <ConfirmModal
      title="Terapkan Preset Brand Executive Meezan Gold?"
      description={`${selectedPosition.toLowerCase().includes('brand executive meezan gold') ? '' : 'Posisi yang dipilih bukan Brand Executive Meezan Gold. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Brand Executive Meezan Gold berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyBrandExecutiveMeezanPreset}
    />}
    {confirmation?.type === 'brandExecutiveSilvergramPreset' && <ConfirmModal
      title="Terapkan Preset Brand Executive Silvergram?"
      description={`${selectedPosition.toLowerCase().includes('brand executive silvergram') ? '' : 'Posisi yang dipilih bukan Brand Executive Silvergram. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Brand Executive Silvergram berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyBrandExecutiveSilvergramPreset}
    />}
    {confirmation?.type === 'staffMarcomCrmDatabasePreset' && <ConfirmModal
      title="Terapkan Preset Staff Marcom CRM & Database?"
      description={`${/staff\s*mar(?:c|k)om|crm|database/i.test(selectedPosition) ? '' : 'Posisi yang dipilih bukan Staff Marcom CRM & Database. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Staff Marcom CRM & Database berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyStaffMarcomCrmDatabasePreset}
    />}
    {confirmation?.type === 'staffMarcomDesignWebPreset' && <ConfirmModal
      title="Terapkan Preset Staff Marcom Design & Web?"
      description={`${/staff\s*mar(?:c|k)om|design|web/i.test(selectedPosition) ? '' : 'Posisi yang dipilih bukan Staff Marcom Design & Web. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Staff Marcom Design & Web berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyStaffMarcomDesignWebPreset}
    />}
    {confirmation?.type === 'staffMarcomSocialMediaPreset' && <ConfirmModal
      title="Terapkan Preset Staff Marcom Social Media?"
      description={`${/staff\s*mar(?:c|k)om|social media|designer|video|visual/i.test(selectedPosition) ? '' : 'Posisi yang dipilih bukan Staff Marcom Social Media. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Staff Marcom Social Media berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyStaffMarcomSocialMediaPreset}
    />}
    {confirmation?.type === 'staffMarcomPhotoVideoProductionPreset' && <ConfirmModal
      title="Terapkan Preset Staff Marcom Photo & Video Production?"
      description={`${/staff\s*mar(?:c|k)om|photo|foto|video|production/i.test(selectedPosition) ? '' : 'Posisi yang dipilih bukan Staff Marcom Photo & Video Production. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Staff Marcom Photo & Video Production berdasarkan dokumen evidence. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyStaffMarcomPhotoVideoProductionPreset}
    />}
    {confirmation?.type === 'staffMarkomDesignerVideoPreset' && <ConfirmModal
      title="Terapkan Preset Staff Markom Designer & Video?"
      description={`${/staff\s*mar(?:c|k)om|designer|video|visual|social media/i.test(selectedPosition) ? '' : 'Posisi yang dipilih bukan Staff Markom Designer & Video. Tetap terapkan preset ke posisi ini? '}Preset ini akan mengisi Input Data Aktual KPI Staff Markom Designer & Video berdasarkan dokumen evidence Locky. Field dengan ID yang sama akan diperbarui, field lain tetap dipertahankan. Pengaturan belum tersimpan sampai Anda klik Simpan Pengaturan.`}
      confirmLabel="Terapkan Preset"
      onCancel={() => setConfirmation(null)}
      onConfirm={applyStaffMarkomDesignerVideoPreset}
    />}
  </div>;
}
