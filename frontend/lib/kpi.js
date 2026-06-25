export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const OPERATORS = {
  gte: 'Lebih besar / sama dengan (>=)',
  gt: 'Lebih besar dari (>)',
  between: 'Di antara (inklusif)',
  lte: 'Lebih kecil / sama dengan (<=)',
  lt: 'Lebih kecil dari (<)',
  eq: 'Sama dengan (=)',
};

export function clone(value) {
  return structuredClone(value);
}

export function defaultPeriod(date = new Date()) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function ruleMatches(actual, rule) {
  const value = Number(rule?.value);
  const max = Number(rule?.max);
  if (!Number.isFinite(actual) || !Number.isFinite(value)) return false;
  if (rule.operator === 'gte') return actual >= value;
  if (rule.operator === 'gt') return actual > value;
  if (rule.operator === 'lte') return actual <= value;
  if (rule.operator === 'lt') return actual < value;
  if (rule.operator === 'eq') return Math.abs(actual - value) < 0.00001;
  return rule.operator === 'between' && Number.isFinite(max) && actual >= value && actual <= max;
}

export function calculatedTier(kpi, actualValue) {
  if (actualValue === '' || actualValue === null || actualValue === undefined) return null;
  return [...kpi.tiers]
    .sort((a, b) => Number(b.skor) - Number(a.skor))
    .find((tier) => ruleMatches(Number(actualValue), tier.rule)) || null;
}

export function formatRule(rule, unit = '') {
  const suffix = unit ? ` ${unit}` : '';
  if (rule?.operator === 'gte') return `nilai >= ${rule.value}${suffix}`;
  if (rule?.operator === 'gt') return `nilai > ${rule.value}${suffix}`;
  if (rule?.operator === 'lte') return `nilai <= ${rule.value}${suffix}`;
  if (rule?.operator === 'lt') return `nilai < ${rule.value}${suffix}`;
  if (rule?.operator === 'eq') return `nilai = ${rule.value}${suffix}`;
  if (rule?.operator === 'between') return `${rule.value}${suffix} <= nilai <= ${rule.max}${suffix}`;
  return '-';
}

export function achievementLabel(value) {
  const score = Number(value);
  if (score >= 90) return ['Sangat Baik', 'ach-sangat-baik'];
  if (score >= 80) return ['Baik', 'ach-baik'];
  if (score >= 70) return ['Cukup', 'ach-cukup'];
  return ['Perlu Evaluasi', 'ach-evaluasi'];
}

export function evidenceChecklist(kpi) {
  return Array.isArray(kpi?.evidenceChecklist)
    ? kpi.evidenceChecklist.filter((item) => String(item || '').trim() !== '')
    : [];
}

export function actualDataFields(kpi) {
  return Array.isArray(kpi?.actualDataFields)
    ? kpi.actualDataFields.filter((field) => field?.id && field?.label)
    : [];
}

export function newKpi(id, weight) {
  return {
    id,
    nama: 'Indikator KPI Baru',
    bobot: weight,
    target: 'Target KPI',
    unit: '%',
    actualDataFields: [],
    evidenceChecklist: ['Link laporan / dokumen pendukung'],
    tiers: [
      { label: 'Target tercapai', skor: 2, rule: { operator: 'gte', value: 100, max: null } },
      { label: 'Target sebagian', skor: 1, rule: { operator: 'between', value: 80, max: 99.99 } },
      { label: 'Target tidak tercapai', skor: 0, rule: { operator: 'lt', value: 80, max: null } },
    ],
  };
}
