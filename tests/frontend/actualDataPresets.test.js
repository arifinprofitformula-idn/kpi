import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
  BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
  STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET,
  applyActualDataPresetToDefinitions,
} from '../../frontend/lib/actualDataPresets.js';

function baseKpi(id, nama) {
  return {
    id,
    nama,
    bobot: 10,
    target: 'Target lama',
    unit: '%',
    evidenceChecklist: ['Evidence lama'],
    tiers: [{ label: 'Achieve', skor: 2, rule: { operator: 'gte', value: 100 } }],
    actualDataFields: [],
    actualValueSourceFieldId: '',
  };
}

test('Brand Executive Meezan preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Brand Executive Meezan Gold': {
      kpis: [
        baseKpi('k1', 'Pencapaian Target Revenue Brand'),
        baseKpi('k2', 'Channel Productivity & Activation EPIS'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Brand Executive Meezan Gold',
    BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
  );

  const first = updated['Brand Executive Meezan Gold'].kpis[0];
  assert.equal(result.matchedCount, 2);
  assert.equal(first.actualValueSourceFieldId, 'achievement_percent');
  assert.equal(first.actualDataFields.length, 8);
  assert.deepEqual(first.evidenceChecklist, ['Evidence lama']);
  assert.equal(first.target, 'Target lama');
  assert.equal(first.tiers[0].label, 'Achieve');
});

test('Brand Executive Meezan preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'achievement_percent');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'activation_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'execution_rate');
});

test('Brand Executive Meezan preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Brand Executive Meezan Gold': {
      kpis: [{
        ...baseKpi('k1', 'Revenue Brand'),
        actualDataFields: [
          { id: 'achievement_percent', label: 'Old label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Brand Executive Meezan Gold',
    BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Brand Executive Meezan Gold'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'achievement_percent').label, '% Achievement');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'achievement_percent');
});

test('Brand Executive Silvergram preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Brand Executive Silvergram': {
      kpis: [
        baseKpi('k1', 'Conversion Funnel CRM Follow Up'),
        baseKpi('k2', 'Portofolio Product Velocity SKU'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Brand Executive Silvergram',
    BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
  );

  const conversion = updated['Brand Executive Silvergram'].kpis[0];
  const portfolio = updated['Brand Executive Silvergram'].kpis[1];
  assert.equal(BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 2);
  assert.equal(conversion.actualValueSourceFieldId, 'follow_up_rate_h1');
  assert.equal(portfolio.actualValueSourceFieldId, 'stagnant_sku_count');
  assert.deepEqual(conversion.evidenceChecklist, ['Evidence lama']);
  assert.equal(conversion.target, 'Target lama');
  assert.equal(conversion.bobot, 10);
  assert.equal(conversion.tiers[0].label, 'Achieve');
});

test('Brand Executive Silvergram preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
        baseKpi('k4', 'KPI Empat'),
        baseKpi('k5', 'KPI Lima'),
        baseKpi('k6', 'KPI Enam'),
        baseKpi('k7', 'KPI Tujuh'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'achievement_ytd_percent');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'combined_activation_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'follow_up_rate_h1');
  assert.equal(updated.Other.kpis[6].actualValueSourceFieldId, 'report_achievement_percent');
});

test('Brand Executive Silvergram preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Brand Executive Silvergram': {
      kpis: [{
        ...baseKpi('k2', 'Channel Productivity SC EPIS'),
        actualDataFields: [
          { id: 'combined_activation_rate', label: 'Old combined label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Brand Executive Silvergram',
    BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Brand Executive Silvergram'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'combined_activation_rate').label, '% Aktivasi gabungan SC + EPIS');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'combined_activation_rate');
});

test('Staff Marcom CRM preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Staff Marcom - CRM & Database': {
      kpis: [
        baseKpi('k1', 'Kualitas & Ketepatan Update Database CRM'),
        baseKpi('k2', 'Respons Interaksi Audiens DM'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Marcom - CRM & Database',
    STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
  );

  const database = updated['Staff Marcom - CRM & Database'].kpis[0];
  const response = updated['Staff Marcom - CRM & Database'].kpis[1];
  assert.equal(STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 2);
  assert.equal(database.actualValueSourceFieldId, 'data_quality_score');
  assert.equal(response.actualValueSourceFieldId, 'on_time_response_rate');
  assert.deepEqual(database.evidenceChecklist, ['Evidence lama']);
  assert.equal(database.target, 'Target lama');
  assert.equal(database.nama, 'Kualitas & Ketepatan Update Database CRM');
  assert.equal(database.bobot, 10);
  assert.equal(database.tiers[0].label, 'Achieve');
});

test('Staff Marcom CRM preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
        baseKpi('k4', 'KPI Empat'),
        baseKpi('k5', 'KPI Lima'),
        baseKpi('k6', 'KPI Enam'),
        baseKpi('k7', 'KPI Tujuh'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'data_quality_score');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'overall_achievement_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'on_time_response_rate');
  assert.equal(updated.Other.kpis[6].actualValueSourceFieldId, 'database_growth_rate');
});

test('Staff Marcom CRM preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Staff Markom (CRM & Digital Channel)': {
      kpis: [{
        ...baseKpi('k2', 'Aktivasi Channel WA Channel Telegram'),
        actualDataFields: [
          { id: 'overall_achievement_rate', label: 'Old overall label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom (CRM & Digital Channel)',
    STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Staff Markom (CRM & Digital Channel)'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'overall_achievement_rate').label, 'Overall Achievement Rate');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'overall_achievement_rate');
});

test('Staff Marcom Design & Web preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Staff Marcom - Design & Web': {
      kpis: [
        baseKpi('k1', 'Ketepatan Waktu Penyelesaian Desain dan Web'),
        baseKpi('k2', 'Penyelesaian Landing Page Website'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Marcom - Design & Web',
    STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
  );

  const sla = updated['Staff Marcom - Design & Web'].kpis[0];
  const landingPage = updated['Staff Marcom - Design & Web'].kpis[1];
  assert.equal(STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 2);
  assert.equal(sla.actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(landingPage.actualValueSourceFieldId, 'lp_web_completion_rate');
  assert.deepEqual(sla.evidenceChecklist, ['Evidence lama']);
  assert.equal(sla.target, 'Target lama');
  assert.equal(sla.nama, 'Ketepatan Waktu Penyelesaian Desain dan Web');
  assert.equal(sla.bobot, 10);
  assert.equal(sla.tiers[0].label, 'Achieve');
});

test('Staff Marcom Design & Web preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
        baseKpi('k4', 'KPI Empat'),
        baseKpi('k5', 'KPI Lima'),
        baseKpi('k6', 'KPI Enam'),
        baseKpi('k7', 'KPI Tujuh'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'productivity_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'brand_quality_rate');
  assert.equal(updated.Other.kpis[6].actualValueSourceFieldId, 'implemented_competitor_insight_count');
});

test('Staff Marcom Design & Web preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Staff Markom Designer & Web Developer': {
      kpis: [{
        ...baseKpi('k6', 'Improvement Desain dan Tampilan Digital UI'),
        actualDataFields: [
          { id: 'implemented_improvement_count', label: 'Old improvement label', type: 'number', unit: 'improvement', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom Designer & Web Developer',
    STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Staff Markom Designer & Web Developer'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'implemented_improvement_count').label, 'Jumlah improvement yang diimplementasi bulan ini');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'implemented_improvement_count');
});

test('Staff Marcom Social Media preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Staff Marcom - Social Media': {
      kpis: [
        baseKpi('k1', 'Ketepatan Waktu Produksi Design'),
        baseKpi('k2', 'Editing Video Media Support'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Marcom - Social Media',
    STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  );

  const sla = updated['Staff Marcom - Social Media'].kpis[0];
  const video = updated['Staff Marcom - Social Media'].kpis[1];
  assert.equal(STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 2);
  assert.equal(sla.actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(video.actualValueSourceFieldId, 'video_completion_rate');
  assert.deepEqual(sla.evidenceChecklist, ['Evidence lama']);
  assert.equal(sla.target, 'Target lama');
  assert.equal(sla.nama, 'Ketepatan Waktu Produksi Design');
  assert.equal(sla.bobot, 10);
  assert.equal(sla.tiers[0].label, 'Achieve');
});

test('Staff Marcom Social Media preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
        baseKpi('k4', 'KPI Empat'),
        baseKpi('k5', 'KPI Lima'),
        baseKpi('k6', 'KPI Enam'),
        baseKpi('k7', 'KPI Tujuh'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'campaign_fulfillment_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'brand_quality_rate');
  assert.equal(updated.Other.kpis[6].actualValueSourceFieldId, 'asset_compliance_rate');
});

test('Staff Marcom Social Media preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Staff Markom Designer & Video': {
      kpis: [{
        ...baseKpi('k4', 'Produktivitas Asset Visual Output Design'),
        actualDataFields: [
          { id: 'productivity_rate', label: 'Old productivity label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom Designer & Video',
    STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Staff Markom Designer & Video'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'productivity_rate').label, 'Productivity Rate');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'productivity_rate');
});

test('Staff Markom Designer & Video preset uses Locky social media actual data mapping', () => {
  const definitions = {
    'Staff Markom - Designer & Video': {
      kpis: [
        baseKpi('k1', 'Ketepatan Waktu Produksi Design'),
        baseKpi('k2', 'Support Visual Campaign Marketing'),
        baseKpi('k3', 'Kualitas & Konsistensi Brand Visual'),
        baseKpi('k4', 'Produktivitas Asset Visual'),
        baseKpi('k5', 'Editing Video & Media Support'),
        baseKpi('k6', 'Riset Visual Kompetitor'),
        baseKpi('k7', 'Manajemen Asset Branding'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom - Designer & Video',
    STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET,
  );

  assert.equal(STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 7);
  assert.equal(updated['Staff Markom - Designer & Video'].kpis[0].actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(updated['Staff Markom - Designer & Video'].kpis[4].actualValueSourceFieldId, 'video_completion_rate');
  assert.equal(updated['Staff Markom - Designer & Video'].kpis[6].actualValueSourceFieldId, 'asset_compliance_rate');
  assert.deepEqual(updated['Staff Markom - Designer & Video'].kpis[0].evidenceChecklist, ['Evidence lama']);
});

test('Staff Markom Designer & Video preset upserts fields and keeps custom fields', () => {
  const definitions = {
    'Staff Markom - Designer & Video': {
      kpis: [{
        ...baseKpi('k1', 'Ketepatan Waktu Produksi Design'),
        actualDataFields: [
          { id: 'sla_on_time_rate', label: 'Old SLA label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom - Designer & Video',
    STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Staff Markom - Designer & Video'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'sla_on_time_rate').label, 'SLA On-Time Rate');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'sla_on_time_rate');
});

test('Staff Marcom Photo & Video Production preset matches KPI names by keyword and preserves existing KPI config', () => {
  const definitions = {
    'Staff Marcom - Photo & Video Production': {
      kpis: [
        baseKpi('k1', 'Ketepatan Waktu Produksi Foto & Video'),
        baseKpi('k2', 'Dokumentasi Event dan Ketepatan Materi Pasca-Event'),
      ],
    },
  };
  const { definitions: updated, result } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Marcom - Photo & Video Production',
    STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
  );

  const sla = updated['Staff Marcom - Photo & Video Production'].kpis[0];
  const event = updated['Staff Marcom - Photo & Video Production'].kpis[1];
  assert.equal(STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET.items.length, 7);
  assert.equal(result.matchedCount, 2);
  assert.equal(sla.actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(event.actualValueSourceFieldId, 'event_documentation_rate');
  assert.deepEqual(sla.evidenceChecklist, ['Evidence lama']);
  assert.equal(sla.target, 'Target lama');
  assert.equal(sla.nama, 'Ketepatan Waktu Produksi Foto & Video');
  assert.equal(sla.bobot, 10);
  assert.equal(sla.tiers[0].label, 'Achieve');
});

test('Staff Marcom Photo & Video Production preset falls back by KPI order', () => {
  const definitions = {
    Other: {
      kpis: [
        baseKpi('k1', 'KPI Satu'),
        baseKpi('k2', 'KPI Dua'),
        baseKpi('k3', 'KPI Tiga'),
        baseKpi('k4', 'KPI Empat'),
        baseKpi('k5', 'KPI Lima'),
        baseKpi('k6', 'KPI Enam'),
        baseKpi('k7', 'KPI Tujuh'),
      ],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Other',
    STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
  );

  assert.equal(updated.Other.kpis[0].actualValueSourceFieldId, 'sla_on_time_rate');
  assert.equal(updated.Other.kpis[1].actualValueSourceFieldId, 'quality_rate');
  assert.equal(updated.Other.kpis[2].actualValueSourceFieldId, 'overall_visual_output_rate');
  assert.equal(updated.Other.kpis[6].actualValueSourceFieldId, 'asset_compliance_rate');
});

test('Staff Marcom Photo & Video Production preset upserts by id and keeps unrelated existing fields', () => {
  const definitions = {
    'Staff Markom Foto & Video': {
      kpis: [{
        ...baseKpi('k3', 'Output Konten Visual untuk Campaign & Media Sosial'),
        actualDataFields: [
          { id: 'overall_visual_output_rate', label: 'Old overall visual label', type: 'number', unit: '%', usedAsActualValue: false },
          { id: 'custom_context', label: 'Custom Context', type: 'text', unit: '', usedAsActualValue: true },
        ],
      }],
    },
  };
  const { definitions: updated } = applyActualDataPresetToDefinitions(
    definitions,
    'Staff Markom Foto & Video',
    STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET,
  );
  const fields = updated['Staff Markom Foto & Video'].kpis[0].actualDataFields;
  const sourceFields = fields.filter((field) => field.usedAsActualValue);

  assert.equal(fields.find((field) => field.id === 'overall_visual_output_rate').label, 'Overall Visual Output Rate');
  assert.equal(fields.some((field) => field.id === 'custom_context'), true);
  assert.equal(sourceFields.length, 1);
  assert.equal(sourceFields[0].id, 'overall_visual_output_rate');
});
