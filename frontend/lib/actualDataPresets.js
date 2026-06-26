import { clone } from './kpi.js';

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

export const BRAND_EXECUTIVE_MEEZAN_GOLD_ACTUAL_DATA_PRESET = {
  name: 'Brand Executive Meezan Gold',
  items: [
    {
      match: ['Pencapaian Target Revenue Brand', 'Revenue Brand'],
      actualValueSourceFieldId: 'achievement_percent',
      fields: [
        presetField('target_revenue', 'Target revenue Meezan Gold bulan ini', 'currency', 'Rp', { helperText: 'Isi target revenue bulan berjalan, misalnya Rp200.000.000 atau target resmi yang ditetapkan.' }),
        presetField('actual_revenue', 'Realisasi revenue aktual', 'currency', 'Rp', { helperText: 'Isi dari Dashboard Sales atau Finance Report.' }),
        presetField('achievement_percent', '% Achievement', 'percent', '%', { usedAsActualValue: true, helperText: 'Achievement = Realisasi Revenue Meezan Gold ÷ Target Revenue × 100.' }),
        presetField('revenue_breakdown_channel', 'Breakdown revenue per channel', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Rinci kontribusi revenue per channel seperti EPIS, online, event, atau channel lain jika tersedia.' }),
        presetField('refund_return_amount', 'Refund / retur / pembatalan', 'currency', 'Rp', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi 0 jika tidak ada. Data ini memengaruhi net revenue.' }),
        presetField('net_revenue', 'Revenue bersih setelah refund/retur', 'currency', 'Rp', { helperText: 'Revenue bersih = realisasi revenue dikurangi refund, retur, atau pembatalan.' }),
        presetField('data_source_used', 'Sumber data yang digunakan', 'text', '', { sourceRequired: false, helperText: 'Contoh: Dashboard Sales, Finance Report, atau keduanya.' }),
        presetField('report_file_link', 'Nama file / link laporan yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Drive, dashboard, atau nama file laporan revenue.' }),
      ],
    },
    {
      match: ['Channel Productivity', 'Activation', 'EPIS'],
      actualValueSourceFieldId: 'activation_rate',
      fields: [
        presetField('total_epis_registered', 'Total EPIS terdaftar aktif', 'number', 'store', { helperText: 'Isi jumlah total EPIS yang terdaftar sebagai channel aktif.' }),
        presetField('epis_transacting', 'Jumlah EPIS yang bertransaksi Meezan Gold bulan ini', 'number', 'store', { helperText: 'Isi dari data achievement EPIS bulan berjalan.' }),
        presetField('epis_not_transacting', 'Jumlah EPIS yang tidak bertransaksi', 'number', 'store', { helperText: 'Jumlah EPIS tidak bertransaksi = Total EPIS terdaftar aktif − EPIS yang bertransaksi.' }),
        presetField('activation_rate', '% Aktivasi Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Aktivasi Rate = Jumlah EPIS aktif bertransaksi Meezan Gold ÷ Total EPIS terdaftar × 100.' }),
        presetField('inactive_epis_list', 'EPIS yang tidak aktif', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama atau kode store EPIS yang tidak aktif untuk tindak lanjut.' }),
        presetField('epis_transaction_value', 'Total nilai transaksi Meezan Gold dari EPIS', 'currency', 'Rp', { helperText: 'Isi total revenue/transaksi yang berasal dari channel EPIS.' }),
        presetField('epis_achievement_file', 'Nama file / link data achievement EPIS', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link atau nama file data achievement EPIS yang dilampirkan.' }),
      ],
    },
    {
      match: ['Eksekusi Roadmap', 'Campaign', 'Roadmap'],
      actualValueSourceFieldId: 'execution_rate',
      fields: [
        presetField('planned_milestones', 'Total milestone campaign direncanakan bulan ini', 'number', 'milestone', { helperText: 'Isi dari kalender campaign resmi yang sudah di-approve.' }),
        presetField('on_time_milestones', 'Jumlah milestone yang terealisasi tepat waktu', 'number', 'milestone', { helperText: 'Isi berdasarkan MOM dan report event/campaign.' }),
        presetField('delayed_or_cancelled_milestones', 'Jumlah milestone yang delay / tidak terlaksana', 'number', 'milestone', { helperText: 'Isi jumlah milestone yang melewati timeline atau dibatalkan.' }),
        presetField('execution_rate', '% Execution Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Execution Rate = Jumlah milestone terealisasi tepat waktu ÷ total milestone direncanakan × 100.' }),
        presetField('delayed_milestone_notes', 'Daftar milestone yang delay/batal beserta alasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi untuk keperluan evaluasi dan tindak lanjut.' }),
        presetField('campaign_calendar_file', 'Nama file kalender campaign / roadmap', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link atau nama file kalender campaign/roadmap resmi.' }),
        presetField('mom_report_reference', 'Referensi MOM dan nomor report event/campaign', 'text', '', { helperText: 'Isi tanggal MOM, nama file report, atau referensi dokumen yang relevan.' }),
      ],
    },
    {
      match: ['Brand Trust', 'Positioning', 'Consistency', 'Brand Consistency'],
      actualValueSourceFieldId: 'compliance_rate',
      fields: [
        presetField('total_content_campaign', 'Total konten/campaign yang diproduksi bulan ini', 'number', 'item', { helperText: 'Isi jumlah total konten/campaign yang dibuat.' }),
        presetField('audited_content_campaign', 'Jumlah yang diaudit menggunakan brand guideline checklist', 'number', 'item', { helperText: 'Idealnya 100% dari konten/campaign yang diproduksi.' }),
        presetField('passed_audit_count', 'Jumlah yang lolos audit brand guideline', 'number', 'item', { helperText: 'Isi dari hasil audit checklist.' }),
        presetField('failed_or_revision_count', 'Jumlah yang tidak lolos / perlu revisi', 'number', 'item', { helperText: 'Isi jumlah konten yang ditolak atau perlu revisi mayor.' }),
        presetField('compliance_rate', '% Compliance Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Compliance Rate = jumlah konten/campaign lolos audit ÷ total yang diaudit × 100.' }),
        presetField('main_guideline_deviation', 'Catatan deviasi terbanyak', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jenis pelanggaran guideline yang paling sering terjadi, misalnya visual, messaging, atau tone of voice.' }),
        presetField('audit_checklist_file', 'Nama file audit checklist yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link atau nama file audit checklist bulanan.' }),
      ],
    },
    {
      match: ['Strategic Partnership', 'Ecosystem Growth', 'Partnership'],
      actualValueSourceFieldId: 'revenue_impact_collaboration_count',
      fields: [
        presetField('revenue_impact_collaboration_count', 'Jumlah kolaborasi baru yang berdampak revenue bulan ini', 'number', 'kolaborasi', { usedAsActualValue: true, helperText: 'Hitung kolaborasi yang memiliki dokumen resmi MoU/PKS dan terbukti berkontribusi pada transaksi.' }),
        presetField('partner_1_revenue_impact', 'Nama mitra kolaborasi #1 + nilai dampak revenue', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama mitra dan estimasi/aktual kontribusi revenue.' }),
        presetField('partner_2_revenue_impact', 'Nama mitra kolaborasi #2 + nilai dampak revenue', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama mitra dan estimasi/aktual kontribusi revenue.' }),
        presetField('partner_3_revenue_impact', 'Nama mitra kolaborasi #3 + nilai dampak revenue', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama mitra dan estimasi/aktual kontribusi revenue.' }),
        presetField('additional_partnership_notes', 'Kolaborasi tambahan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jika ada lebih dari 3 kolaborasi, termasuk nama mitra dan dampaknya.' }),
        presetField('total_partnership_revenue', 'Total estimasi revenue dari seluruh kolaborasi', 'currency', 'Rp', { helperText: 'Jumlah total dampak revenue dari seluruh kolaborasi.' }),
        presetField('mou_pks_status', 'Status dokumen MoU/PKS', 'textarea', '', { helperText: 'Konfirmasi status dokumen resmi untuk setiap kolaborasi, apakah sudah ditandatangani atau masih proses.' }),
      ],
    },
    {
      match: ['Reporting', 'Governance'],
      actualValueSourceFieldId: 'report_achievement_percent',
      fields: [
        presetField('monthly_report_deadline', 'Deadline laporan bulanan Meezan Gold', 'date', '', { dataDateRequired: false, helperText: 'Isi tanggal deadline laporan sesuai SOP.' }),
        presetField('report_sent_date', 'Tanggal laporan aktual dikirim via email', 'date', '', { dataDateRequired: false, helperText: 'Isi tanggal aktual laporan dikirim via email.' }),
        presetField('deadline_day_difference', 'Selisih hari dari deadline', 'number', 'hari', { dataDateRequired: false, helperText: 'Selisih hari = tanggal kirim aktual − deadline. Minus berarti lebih awal, plus berarti terlambat.' }),
        presetField('revision_request_count', 'Jumlah revisi yang diminta atasan setelah pengiriman', 'number', 'revisi', { helperText: 'Isi 0 jika tidak ada revisi. Jelaskan jika ada revisi.' }),
        presetField('report_accuracy_status', 'Apakah seluruh data dalam laporan akurat?', 'text', '', { helperText: 'Isi Ya/Tidak dan jelaskan jika ada data salah atau mismatch.' }),
        presetField('report_components', 'Komponen laporan yang disertakan', 'textarea', '', { helperText: 'Sebutkan komponen seperti revenue report, campaign recap, EPIS data, partnership, dan lainnya.' }),
        presetField('report_email_file_link', 'Link / nama file email laporan yang dikirim', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Isi link screenshot email terkirim, subject email, atau nama file bukti laporan.' }),
        presetField('report_achievement_percent', 'Capaian laporan aktual', 'percent', '%', { usedAsActualValue: true, helperText: '100 jika laporan tepat waktu dan akurat. 70 jika 1x terlambat ringan maksimal 2 hari dan data akurat. Di bawah 70 jika lebih dari 1x terlambat atau data tidak akurat.' }),
      ],
    },
  ],
};

export const BRAND_EXECUTIVE_SILVERGRAM_ACTUAL_DATA_PRESET = {
  name: 'Brand Executive Silvergram',
  items: [
    {
      match: ['Pencapaian Target Revenue Brand', 'Revenue Brand', 'Target Revenue'],
      actualValueSourceFieldId: 'achievement_ytd_percent',
      fields: [
        presetField('target_revenue', 'Target revenue Silvergram tahunan/bulanan', 'currency', 'Rp', { helperText: 'Isi target yang disepakati, bisa target tahunan atau breakdown target bulanan.' }),
        presetField('actual_monthly_revenue', 'Realisasi revenue aktual bulan ini', 'currency', 'Rp', { helperText: 'Isi dari Dashboard Sales atau Finance Report bulan berjalan.' }),
        presetField('actual_ytd_revenue', 'Realisasi revenue YTD / kumulatif', 'currency', 'Rp', { helperText: 'Isi total revenue sejak awal tahun sampai bulan berjalan.' }),
        presetField('achievement_monthly_percent', '% Achievement bulan ini', 'percent', '%', { helperText: 'Achievement bulan ini = Realisasi bulan ini ÷ target bulanan × 100.' }),
        presetField('achievement_ytd_percent', '% Achievement YTD vs target tahunan', 'percent', '%', { usedAsActualValue: true, helperText: 'Achievement YTD = Realisasi revenue YTD ÷ target revenue tahunan × 100.' }),
        presetField('revenue_breakdown_channel', 'Breakdown revenue per channel', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Rinci kontribusi revenue dari EPIS, SC, online, event, atau channel lainnya.' }),
        presetField('refund_return_amount', 'Retur / refund / pembatalan', 'currency', 'Rp', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi 0 jika tidak ada. Data ini memengaruhi net revenue.' }),
        presetField('report_file_link', 'Nama file / link laporan revenue yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Dashboard Sales, Finance Report, atau dokumen target revenue.' }),
      ],
    },
    {
      match: ['Channel Productivity', 'Activation', 'EPIS', 'SC'],
      actualValueSourceFieldId: 'combined_activation_rate',
      fields: [
        presetField('total_sc_active', 'Total SC terdaftar aktif', 'number', 'orang', { helperText: 'Isi jumlah total Sales Consultant aktif dalam jaringan Silvergram.' }),
        presetField('sc_transacting', 'Jumlah SC yang bertransaksi Silvergram bulan ini', 'number', 'orang', { helperText: 'Isi dari data transaksi SC bulan berjalan.' }),
        presetField('sc_activation_rate', '% Aktivasi SC', 'percent', '%', { helperText: 'Aktivasi SC = SC bertransaksi ÷ total SC aktif × 100.' }),
        presetField('total_epis_active', 'Total EPIS terdaftar aktif', 'number', 'store', { helperText: 'Isi jumlah total EPIS yang terdaftar sebagai channel aktif.' }),
        presetField('epis_transacting', 'Jumlah EPIS yang bertransaksi Silvergram bulan ini', 'number', 'store', { helperText: 'Isi dari data achievement EPIS bulan berjalan.' }),
        presetField('epis_activation_rate', '% Aktivasi EPIS', 'percent', '%', { helperText: 'Aktivasi EPIS = EPIS bertransaksi ÷ total EPIS aktif × 100.' }),
        presetField('combined_activation_rate', '% Aktivasi gabungan SC + EPIS', 'percent', '%', { usedAsActualValue: true, helperText: 'Aktivasi gabungan = (SC aktif transaksi + EPIS aktif transaksi) ÷ (total SC + total EPIS) × 100.' }),
        presetField('inactive_sc_epis_list', 'SC/EPIS yang tidak aktif beserta alasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama/kode SC atau EPIS yang tidak aktif untuk tindak lanjut coaching dan aktivasi.' }),
        presetField('activation_data_file', 'Nama file / link data EPIS & SC yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link atau nama file data achievement EPIS dan aktivasi SC.' }),
      ],
    },
    {
      match: ['Conversion', 'Funnel', 'CRM'],
      actualValueSourceFieldId: 'follow_up_rate_h1',
      fields: [
        presetField('total_leads', 'Total leads masuk bulan ini dari CRM', 'number', 'leads', { helperText: 'Isi jumlah total leads yang tercatat di CRM bulan berjalan.' }),
        presetField('leads_followed_h1', 'Jumlah leads ditindaklanjuti ≤ H+1', 'number', 'leads', { helperText: 'Isi berdasarkan timestamp CRM antara lead masuk dan follow-up pertama.' }),
        presetField('leads_not_followed_h1', 'Jumlah leads yang tidak ditindaklanjuti ≤ H+1', 'number', 'leads', { helperText: 'Leads tidak tepat waktu = total leads − leads yang ditindaklanjuti ≤ H+1.' }),
        presetField('follow_up_rate_h1', '% Follow-up Rate ≤ H+1', 'percent', '%', { usedAsActualValue: true, helperText: 'Follow-up Rate = leads tepat waktu ÷ total leads × 100.' }),
        presetField('converted_leads', 'Jumlah leads yang berhasil konversi transaksi', 'number', 'leads', { helperText: 'Isi dari laporan Admin Sales bulan berjalan.' }),
        presetField('conversion_rate', '% Conversion Rate bulan ini', 'percent', '%', { helperText: 'Conversion Rate = leads konversi ÷ total leads × 100.' }),
        presetField('unhandled_lead_source', 'Leads yang paling sering tidak tertangani', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi sumber/channel leads yang paling sering tidak tertangani untuk perbaikan proses distribusi.' }),
        presetField('crm_sales_report_file', 'Nama file CRM / laporan Admin Sales yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link export CRM atau laporan Admin Sales.' }),
      ],
    },
    {
      match: ['Eksekusi Roadmap', 'Campaign', 'Roadmap'],
      actualValueSourceFieldId: 'execution_rate',
      fields: [
        presetField('planned_milestones', 'Total milestone campaign direncanakan bulan ini', 'number', 'milestone', { helperText: 'Isi dari kalender campaign resmi yang sudah di-approve.' }),
        presetField('on_time_milestones', 'Jumlah milestone yang terealisasi tepat waktu', 'number', 'milestone', { helperText: 'Isi berdasarkan MOM dan report event/campaign.' }),
        presetField('delayed_or_cancelled_milestones', 'Jumlah milestone yang delay / tidak terlaksana', 'number', 'milestone', { helperText: 'Isi jumlah milestone yang melewati timeline atau dibatalkan.' }),
        presetField('execution_rate', '% Execution Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Execution Rate = milestone terealisasi tepat waktu ÷ total milestone direncanakan × 100.' }),
        presetField('delayed_milestone_notes', 'Daftar milestone yang delay / batal beserta alasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi untuk evaluasi dan tindak lanjut campaign berikutnya.' }),
        presetField('campaign_calendar_file', 'Nama file kalender campaign / roadmap', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link atau nama file kalender campaign/roadmap resmi.' }),
        presetField('mom_report_reference', 'Referensi MOM dan nomor report event/campaign', 'text', '', { helperText: 'Isi tanggal MOM, nama file report, atau nomor referensi dokumen campaign.' }),
      ],
    },
    {
      match: ['Portofolio', 'Product Velocity', 'SKU', 'varian produk'],
      actualValueSourceFieldId: 'stagnant_sku_count',
      fields: [
        presetField('total_active_sku', 'Total SKU / varian produk Silvergram aktif', 'number', 'SKU', { helperText: 'Isi jumlah total varian produk yang ada di portofolio Silvergram.' }),
        presetField('stagnant_sku_count', 'Jumlah SKU stagnan >3 bulan', 'number', 'SKU', { usedAsActualValue: true, helperText: 'Hitung SKU Silvergram yang tidak memiliki transaksi dalam 3 bulan terakhir berturut-turut.' }),
        presetField('stagnant_sku_names', 'Nama SKU yang stagnan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Sebutkan nama/kode varian yang stagnan beserta durasi stagnan.' }),
        presetField('stagnant_sku_causes', 'Penyebab stagnan per SKU', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Analisis penyebab: demand rendah, harga, stok, awareness, channel, atau faktor lain.' }),
        presetField('stagnant_sku_action_plan', 'Rencana tindak lanjut untuk SKU stagnan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi rencana seperti promo khusus, bundle, discontinue, relaunch, atau channel push.' }),
        presetField('best_performing_sku', 'SKU dengan performa terbaik bulan ini', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama SKU dan volume/revenue sebagai benchmark internal.' }),
        presetField('sales_dashboard_file', 'Nama file Dashboard Sales yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link atau nama file Dashboard Sales rekap transaksi SKU 3 bulan terakhir.' }),
      ],
    },
    {
      match: ['Strategic Improvement', 'Improvement'],
      actualValueSourceFieldId: 'implemented_improvement_count',
      fields: [
        presetField('implemented_improvement_count', 'Jumlah improvement yang diajukan dan terlaksana bulan ini', 'number', 'improvement', { usedAsActualValue: true, helperText: 'Improvement harus memiliki proposal resmi dan bukti dampak revenue.' }),
        presetField('improvement_1_name', 'Improvement #1: nama inisiatif', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Jelaskan inisiatif perbaikan yang dilakukan.' }),
        presetField('improvement_1_revenue_impact', 'Improvement #1: dampak revenue before vs after', 'textarea', '', { required: false, helperText: 'Isi perbandingan angka sebelum dan sesudah improvement.' }),
        presetField('improvement_2_name', 'Improvement #2: nama inisiatif', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Jelaskan inisiatif perbaikan kedua jika ada.' }),
        presetField('improvement_2_revenue_impact', 'Improvement #2: dampak revenue before vs after', 'textarea', '', { required: false, helperText: 'Isi perbandingan angka sebelum dan sesudah improvement kedua.' }),
        presetField('improvement_3_summary', 'Improvement #3: nama + dampak revenue', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jika ada lebih dari 2 improvement.' }),
        presetField('total_revenue_impact', 'Total estimasi dampak revenue dari semua improvement', 'currency', 'Rp', { helperText: 'Jumlah total dampak positif yang terukur dari semua inisiatif improvement.' }),
        presetField('proposal_approval_status', 'Status proposal resmi', 'textarea', '', { helperText: 'Konfirmasi bahwa proposal resmi sudah di-approve atasan sebelum eksekusi.' }),
      ],
    },
    {
      match: ['Reporting', 'Governance'],
      actualValueSourceFieldId: 'report_achievement_percent',
      fields: [
        presetField('monthly_report_deadline', 'Deadline laporan bulanan Silvergram sesuai SOP', 'date', '', { dataDateRequired: false, helperText: 'Isi tanggal deadline laporan bulanan yang ditetapkan.' }),
        presetField('report_sent_date', 'Tanggal laporan aktual dikirim via email', 'date', '', { dataDateRequired: false, helperText: 'Isi tanggal dan jam laporan dikirimkan.' }),
        presetField('deadline_day_difference', 'Selisih hari dari deadline', 'number', 'hari', { dataDateRequired: false, helperText: 'Selisih hari = tanggal kirim aktual − deadline. Minus berarti lebih awal, plus berarti terlambat.' }),
        presetField('revision_request_count', 'Jumlah revisi yang diminta atasan setelah pengiriman', 'number', 'revisi', { helperText: 'Isi 0 jika tidak ada revisi. Jelaskan jika ada revisi.' }),
        presetField('report_accuracy_status', 'Apakah seluruh data dalam laporan akurat?', 'text', '', { helperText: 'Isi Ya/Tidak dan jelaskan jika ada data salah atau mismatch.' }),
        presetField('report_components', 'Komponen laporan yang disertakan', 'textarea', '', { helperText: 'Sebutkan komponen seperti revenue, campaign recap, channel data, SKU velocity, dan improvement summary.' }),
        presetField('report_email_file_link', 'Link / subject email / nama file laporan yang dikirim', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Isi link screenshot email terkirim, subject email, atau nama file laporan.' }),
        presetField('report_achievement_percent', 'Capaian laporan aktual', 'percent', '%', { usedAsActualValue: true, helperText: '100 jika laporan tepat waktu dan akurat. 70 jika 1x terlambat ringan maksimal 2 hari dan data akurat. Di bawah 70 jika lebih dari 1x terlambat atau data tidak akurat.' }),
      ],
    },
  ],
};

export const STAFF_MARCOM_CRM_DATABASE_ACTUAL_DATA_PRESET = {
  name: 'Staff Marcom CRM & Database',
  items: [
    {
      match: ['Kualitas & Ketepatan Update Database CRM', 'Database CRM', 'CRM', 'Database Quality'],
      actualValueSourceFieldId: 'data_quality_score',
      fields: [
        presetField('total_active_crm_records', 'Total record aktif dalam CRM bulan ini', 'number', 'record', { helperText: 'Isi jumlah total kontak aktif yang ada di CRM bulan berjalan.' }),
        presetField('complete_updated_records', 'Jumlah record yang lengkap dan terupdate', 'number', 'record', { helperText: 'Lengkap minimal memiliki nama, nomor WA aktif, status pelanggan, dan tanggal update terakhir.' }),
        presetField('incomplete_or_outdated_records', 'Jumlah record yang tidak lengkap / outdated', 'number', 'record', { helperText: 'Hitung record yang field wajibnya kosong atau tanggal update lebih dari 30 hari.' }),
        presetField('data_quality_score', '% Data Quality Score', 'percent', '%', { usedAsActualValue: true, helperText: 'Data Quality Score = record lengkap & terupdate ÷ total record aktif × 100.' }),
        presetField('new_records_added', 'Record baru yang ditambahkan bulan ini', 'number', 'record', { helperText: 'Isi jumlah kontak baru yang diinput pada bulan berjalan.' }),
        presetField('records_updated_reverified', 'Record lama yang diupdate / diverifikasi ulang bulan ini', 'number', 'record', { helperText: 'Isi jumlah record lama yang diperbaiki, dikonfirmasi, atau diverifikasi ulang.' }),
        presetField('common_data_gap', 'Gap data yang paling sering ditemukan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: nomor WA kosong, status pelanggan kosong, tanggal update tidak valid, atau data duplikat.' }),
        presetField('crm_export_file', 'Nama file / link export CRM atau spreadsheet database', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet, file export CRM, atau screenshot rekap audit.' }),
      ],
    },
    {
      match: ['Aktivasi Channel', 'Komunitas EPI', 'Channel Activation', 'IG Story', 'WA Channel', 'Telegram'],
      actualValueSourceFieldId: 'overall_achievement_rate',
      fields: [
        presetField('target_ig_story', 'Target story IG per bulan', 'number', 'story', { helperText: 'Isi target standar, misalnya 150 story/bulan atau target resmi terbaru.' }),
        presetField('actual_ig_story', 'Realisasi story IG bulan ini', 'number', 'story', { helperText: 'Isi dari tracker konten harian atau IG Insights.' }),
        presetField('ig_story_rate', '% Capaian IG Story', 'percent', '%', { helperText: 'Capaian IG Story = realisasi story IG ÷ target story IG × 100.' }),
        presetField('target_wa_broadcast', 'Target broadcast WA Channel per bulan', 'number', 'broadcast', { helperText: 'Isi target broadcast WA Channel, misalnya 100 broadcast/bulan.' }),
        presetField('actual_wa_broadcast', 'Realisasi broadcast WA Channel bulan ini', 'number', 'broadcast', { helperText: 'Isi dari tracker konten atau WA Channel analytics.' }),
        presetField('wa_broadcast_rate', '% Capaian WA Channel', 'percent', '%', { helperText: 'Capaian WA = realisasi broadcast WA ÷ target broadcast WA × 100.' }),
        presetField('target_telegram_broadcast', 'Target broadcast Telegram per bulan', 'number', 'broadcast', { helperText: 'Isi target broadcast Telegram, misalnya 100 broadcast/bulan atau sesuai target aktif.' }),
        presetField('actual_telegram_broadcast', 'Realisasi broadcast Telegram bulan ini', 'number', 'broadcast', { helperText: 'Isi dari tracker konten atau Telegram analytics.' }),
        presetField('telegram_broadcast_rate', '% Capaian Telegram', 'percent', '%', { helperText: 'Capaian Telegram = realisasi broadcast Telegram ÷ target broadcast Telegram × 100.' }),
        presetField('overall_achievement_rate', 'Overall Achievement Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Overall Achievement = rata-rata capaian IG Story, WA Channel, dan Telegram. Jika Telegram belum aktif, gunakan rata-rata IG dan WA.' }),
        presetField('weakest_channel', 'Channel dengan capaian paling rendah', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi channel yang paling sering tidak mencapai target dan alasannya.' }),
        presetField('content_tracker_file', 'Nama file / link tracker konten harian', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link spreadsheet tracker konten harian per platform.' }),
      ],
    },
    {
      match: ['Respons Interaksi Audiens', 'Respons Audiens', 'DM', 'Social Inbox', 'First Response'],
      actualValueSourceFieldId: 'on_time_response_rate',
      fields: [
        presetField('total_inbound_interactions', 'Total DM/comment masuk semua platform bulan ini', 'number', 'interaksi', { helperText: 'Isi jumlah total DM/comment yang memerlukan respons.' }),
        presetField('on_time_responses', 'Jumlah yang direspons ≤15 menit', 'number', 'interaksi', { helperText: 'Isi dari DM log, kolom on-time = Y.' }),
        presetField('late_responses', 'Jumlah yang direspons >15 menit', 'number', 'interaksi', { helperText: 'Jumlah terlambat = total interaksi masuk − respons on-time.' }),
        presetField('on_time_response_rate', '% On-Time Response Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'On-Time Rate = interaksi direspons ≤15 menit ÷ total interaksi × 100.' }),
        presetField('average_first_response_time', 'Average First Response Time', 'number', 'menit', { helperText: 'Rata-rata selisih waktu dari DM/comment masuk sampai respons pertama.' }),
        presetField('slowest_response_platform', 'Platform dengan respons paling lambat', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: IG, WA, Telegram, atau platform lain.' }),
        presetField('high_risk_response_period', 'Jam/periode paling rawan terlambat merespons', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi pola keterlambatan, misalnya pagi, siang, sore, akhir pekan, atau luar jam kerja.' }),
        presetField('dm_log_file', 'Nama file / link DM response log', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link spreadsheet log harian timestamp masuk vs respons pertama.' }),
      ],
    },
    {
      match: ['Support Campaign CRM', 'Campaign Support', 'Task Tracker', 'Kalender Campaign'],
      actualValueSourceFieldId: 'on_time_completion_rate',
      fields: [
        presetField('total_crm_campaign_tasks', 'Total task CRM yang dijadwalkan bulan ini', 'number', 'task', { helperText: 'Isi dari kalender campaign dan task tracker CRM.' }),
        presetField('on_time_completed_tasks', 'Jumlah task yang selesai tepat waktu', 'number', 'task', { helperText: 'Isi dari task tracker, kolom on-time = Y.' }),
        presetField('late_or_incomplete_tasks', 'Jumlah task yang terlambat / tidak selesai', 'number', 'task', { helperText: 'Jumlah terlambat = total task − task selesai tepat waktu.' }),
        presetField('on_time_completion_rate', '% On-Time Completion Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'On-Time Completion Rate = task selesai tepat waktu ÷ total task CRM × 100.' }),
        presetField('delayed_task_list', 'Daftar task yang terlambat beserta alasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama task, campaign terkait, deadline, tanggal selesai, dan alasan delay.' }),
        presetField('main_campaign_supported', 'Campaign yang paling banyak membutuhkan support CRM', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi campaign utama yang paling intensif secara support CRM.' }),
        presetField('campaign_task_tracker_file', 'Nama file / link task tracker dan kalender campaign', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link task tracker CRM, kalender campaign, atau export EPIC Hub jika digunakan.' }),
      ],
    },
    {
      match: ['Administrasi EPIC Hub', 'EPIC Hub', 'Admin EPIC'],
      actualValueSourceFieldId: 'admin_completion_rate',
      fields: [
        presetField('total_epic_admin_tasks', 'Total task admin EPIC Hub yang dijadwalkan bulan ini', 'number', 'task', { helperText: 'Isi dari daftar tugas admin atau assignment di EPIC Hub.' }),
        presetField('done_documented_tasks', 'Jumlah task selesai dan terdokumentasi', 'number', 'task', { helperText: 'Task dihitung valid jika status final Done/Closed dan field wajib sudah lengkap.' }),
        presetField('incomplete_or_open_tasks', 'Jumlah task belum selesai / field tidak lengkap', 'number', 'task', { helperText: 'Jumlah belum selesai = total task − task selesai dan terdokumentasi.' }),
        presetField('admin_completion_rate', '% Admin Completion Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Admin Completion Rate = task selesai & terdokumentasi ÷ total task admin × 100.' }),
        presetField('most_incomplete_task_type', 'Jenis task yang paling sering tidak selesai / tidak lengkap', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi untuk perbaikan SOP EPIC Hub.' }),
        presetField('epic_hub_report_file', 'Nama file / link export EPIC Hub report', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link export report task EPIC Hub bulan berjalan.' }),
      ],
    },
    {
      match: ['Insight & Analisis CRM', 'Insight CRM', 'Analisis CRM'],
      actualValueSourceFieldId: 'valid_insight_count',
      fields: [
        presetField('valid_insight_count', 'Jumlah insight CRM valid yang dihasilkan bulan ini', 'number', 'insight', { usedAsActualValue: true, helperText: 'Insight valid harus berbasis data aktual, punya temuan spesifik, rekomendasi tindakan, dan bukti disampaikan ke atasan.' }),
        presetField('insight_1_summary', 'Insight #1: judul dan tanggal disampaikan ke atasan', 'text', '', { required: false, helperText: 'Isi judul singkat insight dan tanggal penyampaian.' }),
        presetField('insight_2_summary', 'Insight #2: judul dan tanggal disampaikan ke atasan', 'text', '', { required: false, helperText: 'Isi judul singkat insight dan tanggal penyampaian.' }),
        presetField('insight_3_summary', 'Insight #3: judul dan tanggal disampaikan ke atasan', 'text', '', { required: false, helperText: 'Isi judul singkat insight dan tanggal penyampaian.' }),
        presetField('insight_4_summary', 'Insight #4: judul dan tanggal disampaikan ke atasan', 'text', '', { required: false, helperText: 'Isi judul singkat insight dan tanggal penyampaian.' }),
        presetField('implemented_insight', 'Insight yang menghasilkan tindakan konkret dari atasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Sebutkan insight yang langsung ditindaklanjuti oleh atasan, jika ada.' }),
        presetField('insight_folder_file', 'Nama file / link folder dokumen insight CRM', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link folder bulanan berisi dokumen insight dengan format data, temuan, interpretasi, dan rekomendasi.' }),
      ],
    },
    {
      match: ['Pertumbuhan Database', 'Database Growth', 'Growth Database'],
      actualValueSourceFieldId: 'database_growth_rate',
      fields: [
        presetField('previous_month_total_records', 'Total record database CRM akhir bulan lalu', 'number', 'record', { helperText: 'Isi angka snapshot database akhir bulan sebelumnya.' }),
        presetField('current_month_total_records', 'Total record database CRM akhir bulan ini', 'number', 'record', { helperText: 'Isi dari export CRM akhir bulan berjalan.' }),
        presetField('new_records_this_month', 'Jumlah record baru yang ditambahkan bulan ini', 'number', 'record', { helperText: 'Isi dari log input kontak baru bulan berjalan.' }),
        presetField('deleted_invalid_unsubscribed_records', 'Jumlah record dihapus / invalid / unsubscribe', 'number', 'record', { helperText: 'Isi jumlah record yang dihapus, invalid, unsubscribe, atau duplikat yang dibersihkan.' }),
        presetField('net_growth_records', 'NET Growth record', 'number', 'record', { helperText: 'NET Growth = record baru − record dihapus/invalid/unsubscribe.' }),
        presetField('database_growth_rate', '% Database Growth Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Growth Rate = (record akhir bulan ini − record akhir bulan lalu) ÷ record akhir bulan lalu × 100.' }),
        presetField('main_growth_source', 'Sumber kontak baru terbesar', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi channel, event, campaign, atau sumber kontak baru yang paling berkontribusi.' }),
        presetField('database_snapshot_file', 'Nama file / link snapshot database bulan ini dan bulan lalu', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link snapshot/export CRM akhir bulan ini dan akhir bulan lalu.' }),
      ],
    },
  ],
};

export const STAFF_MARCOM_DESIGN_WEB_ACTUAL_DATA_PRESET = {
  name: 'Staff Marcom Design & Web',
  items: [
    {
      match: ['Ketepatan Waktu Penyelesaian Desain', 'Ketepatan Waktu Penyelesaian Desain dan Web', 'SLA', 'Penyelesaian Desain', 'Penyelesaian Web'],
      actualValueSourceFieldId: 'sla_on_time_rate',
      fields: [
        presetField('total_tasks_received', 'Total task diterima bulan ini (design + web)', 'number', 'task', { helperText: 'Isi dari task tracker untuk semua kategori task desain dan web bulan berjalan.' }),
        presetField('simple_design_tasks', 'Breakdown: Simple Design', 'number', 'task', { helperText: 'Simple design seperti banner, story, thumbnail, atau output ringan dengan SLA 1 hari kerja.' }),
        presetField('campaign_design_tasks', 'Breakdown: Campaign Design', 'number', 'task', { helperText: 'Campaign design seperti poster, ads, dan multi-format dengan SLA 2 hari kerja.' }),
        presetField('landing_page_tasks', 'Breakdown: Landing Page', 'number', 'task', { helperText: 'Landing Page baru dengan SLA 3 hari kerja jika brief final.' }),
        presetField('website_update_tasks', 'Breakdown: Website Update / Halaman Baru', 'number', 'task', { helperText: 'Website update atau halaman baru dengan SLA hingga 5 hari kerja sesuai kompleksitas.' }),
        presetField('on_time_tasks', 'Jumlah task ON-TIME sesuai SLA', 'number', 'task', { helperText: 'Ambil dari task tracker kolom On-Time = Y.' }),
        presetField('late_tasks', 'Jumlah task TERLAMBAT', 'number', 'task', { helperText: 'Jumlah terlambat = Total task diterima − task on-time.' }),
        presetField('sla_on_time_rate', 'SLA On-Time Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'SLA On-Time Rate = task selesai sesuai SLA ÷ total task diterima × 100.' }),
        presetField('most_late_task_pattern', 'Task paling sering terlambat (jenis + alasan)', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jenis task yang paling sering melewati SLA beserta alasan keterlambatannya.' }),
        presetField('task_tracker_file', 'Link task tracker / nama file', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet task tracker atau nama file rekap SLA.' }),
      ],
    },
    {
      match: ['Produktivitas Output Desain Digital', 'Produktivitas Output', 'Output Desain', 'Productivity'],
      actualValueSourceFieldId: 'productivity_rate',
      fields: [
        presetField('target_monthly_output', 'Target output desain bulanan yang disepakati', 'number', 'output', { helperText: 'Isi angka target output bulanan yang disepakati dengan Bima di awal bulan.' }),
        presetField('total_final_design_output', 'Total design final selesai bulan ini', 'number', 'output', { helperText: 'Hitung file final yang tersimpan di folder Drive dengan status final.' }),
        presetField('static_design_output', 'Breakdown: design static / grafis', 'number', 'output', { helperText: 'Jumlah file desain grafis final seperti banner, story, poster, thumbnail, dan sejenisnya.' }),
        presetField('landing_page_web_output', 'Breakdown: landing page / web page', 'number', 'halaman', { helperText: 'Jumlah halaman landing page atau web page yang sudah live dan berfungsi.' }),
        presetField('other_output_count', 'Breakdown: lainnya (email template, dll)', 'number', 'output', { required: false, helperText: 'Isi kategori lain seperti email template, resize signifikan, asset campaign turunan, atau output lain yang valid.' }),
        presetField('productivity_rate', 'Productivity Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Productivity Rate = total design final tersimpan di Drive ÷ target output bulanan × 100.' }),
        presetField('monthly_drive_folder_link', 'Link folder Google Drive bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive yang berisi semua file final bulan berjalan dan dapat diakses Bima.' }),
        presetField('best_output_examples', 'Contoh output terbaik bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan 3–5 contoh output terbaik beserta link atau nama file.' }),
      ],
    },
    {
      match: ['Kualitas dan Konsistensi Visual Brand', 'Konsistensi Visual', 'Brand Quality', 'Visual Brand'],
      actualValueSourceFieldId: 'brand_quality_rate',
      fields: [
        presetField('total_reviewed_outputs', 'Total output yang direview / diapprove bulan ini', 'number', 'output', { helperText: 'Isi jumlah total output desain dan web yang melewati proses approval.' }),
        presetField('outputs_without_major_revision', 'Jumlah output lolos TANPA revisi mayor', 'number', 'output', { helperText: 'Hitung output yang hanya mengalami revisi minor atau tanpa revisi dari Bima.' }),
        presetField('major_revision_outputs', 'Jumlah output kena revisi MAYOR', 'number', 'output', { helperText: 'Revisi mayor termasuk layout dirombak besar, warna/font tidak sesuai brand, fungsi web tidak sesuai spesifikasi, atau harus diulang dari awal.' }),
        presetField('brand_quality_rate', 'Brand Quality Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Brand Quality Rate = output tanpa revisi mayor ÷ total output direview × 100.' }),
        presetField('common_major_revision_type', 'Jenis revisi mayor paling sering terjadi', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi pola seperti brand color, font, layout, fungsi web, brief tidak lengkap, atau mismatch brand guideline.' }),
        presetField('most_revised_output', 'Output dengan revisi terbanyak bulan ini', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama output yang paling banyak revisi untuk evaluasi kualitas brief dan eksekusi.' }),
        presetField('revision_log_file', 'Link revision log / nama file', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet log revisi desain/web bulan berjalan.' }),
        presetField('best_no_major_revision_examples', 'Contoh output terbaik tanpa revisi mayor', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan contoh output yang on-brief dari awal sebagai benchmark kualitas.' }),
      ],
    },
    {
      match: ['Penyelesaian Landing Page', 'Landing Page', 'Website', 'LP/Web'],
      actualValueSourceFieldId: 'lp_web_completion_rate',
      fields: [
        presetField('total_lp_web_assigned', 'Total LP/website yang ditugaskan bulan ini', 'number', 'halaman', { helperText: 'Isi dari task tracker atau brief LP/website yang diterima.' }),
        presetField('completed_live_functional_pages', 'Jumlah LP/website yang selesai + live + berfungsi', 'number', 'halaman', { helperText: 'Dihitung selesai jika sudah approve, live di URL, semua link/form berfungsi, mobile OK, dan sudah dikonfirmasi siap pakai.' }),
        presetField('incomplete_or_buggy_pages', 'Jumlah LP/website yang belum selesai / belum live / belum berfungsi', 'number', 'halaman', { helperText: 'Jumlah ini adalah total LP/web ditugaskan dikurangi yang selesai penuh.' }),
        presetField('lp_web_completion_rate', 'LP/Web Completion Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'LP/Web Completion Rate = LP/Web selesai + live + berfungsi ÷ total LP/Web ditugaskan × 100.' }),
        presetField('unfinished_lp_web_notes', 'LP/web yang belum selesai (nama + kendala)', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama LP/web yang belum selesai, belum live, ada bug, atau belum approve beserta kendalanya.' }),
        presetField('live_url_list', 'Link URL semua LP/web yang sudah live bulan ini', 'textarea', '', { helperText: 'Cantumkan daftar URL aktif setiap halaman yang sudah live.' }),
        presetField('lp_web_checklist_file', 'Nama file / link checklist LP/website per halaman', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link checklist berisi approval, URL live, fungsi OK, mobile OK, dan konfirmasi siap pakai.' }),
        presetField('approval_reference', 'Referensi approval dari Bima untuk LP/web', 'text', '', { helperText: 'Isi referensi screenshot WA/email approval atau nama file bukti approval.' }),
      ],
    },
    {
      match: ['Dukungan Visual terhadap Campaign Marketing', 'Campaign Marketing', 'Campaign Support', 'Dukungan Visual'],
      actualValueSourceFieldId: 'campaign_support_rate',
      fields: [
        presetField('total_campaigns_running', 'Total campaign yang berjalan bulan ini', 'number', 'campaign', { helperText: 'Isi dari kalender campaign resmi bulan berjalan.' }),
        presetField('total_visual_campaign_requests', 'Total kebutuhan visual campaign (design + LP/web)', 'number', 'request', { helperText: 'Isi jumlah total request visual dari semua campaign bulan berjalan.' }),
        presetField('on_time_visual_campaign_done', 'Jumlah kebutuhan visual yang selesai ON-TIME sebelum go-live campaign', 'number', 'request', { helperText: 'Ambil dari task tracker dan folder Drive final asset per campaign.' }),
        presetField('late_or_unfulfilled_visuals', 'Jumlah kebutuhan visual yang terlambat / tidak terpenuhi', 'number', 'request', { helperText: 'Jumlah terlambat = total kebutuhan visual campaign − yang selesai on-time.' }),
        presetField('campaign_support_rate', 'Campaign Support Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Campaign Support Rate = kebutuhan visual campaign selesai on-time ÷ total kebutuhan visual campaign × 100.' }),
        presetField('highest_request_campaign', 'Campaign dengan visual paling banyak requestnya', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi campaign terbesar bulan ini berdasarkan jumlah request visual.' }),
        presetField('visual_campaign_drive_folder', 'Link folder Drive materi visual campaign bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link folder Drive per campaign yang berisi final asset visual.' }),
        presetField('delayed_campaign_visual_notes', 'Campaign yang visualnya terlambat / tidak terpenuhi', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama campaign, jenis visual yang terlambat, dan alasan keterlambatan.' }),
      ],
    },
    {
      match: ['Improvement Desain', 'Improvement Desain dan Tampilan Digital', 'Improvement Visual', 'Tampilan Digital', 'UI'],
      actualValueSourceFieldId: 'implemented_improvement_count',
      fields: [
        presetField('implemented_improvement_count', 'Jumlah improvement yang diimplementasi bulan ini', 'number', 'improvement', { usedAsActualValue: true, helperText: 'Improvement valid harus sudah live/diimplementasi, terdokumentasi before-after, memiliki reasoning, dan dilaporkan ke Bima.' }),
        presetField('improvement_1_description', 'Improvement #1: nama/deskripsi + area (design/web/UI)', 'textarea', '', { required: false, helperText: 'Jelaskan improvement pertama, area yang diperbaiki, alasan, before-after, dan status implementasi.' }),
        presetField('improvement_2_description', 'Improvement #2: nama/deskripsi + area', 'textarea', '', { required: false, helperText: 'Jelaskan improvement kedua jika ada.' }),
        presetField('improvement_3_description', 'Improvement #3: nama/deskripsi + area', 'textarea', '', { required: false, helperText: 'Jelaskan improvement ketiga jika ada.' }),
        presetField('improvement_4_description', 'Improvement #4: nama/deskripsi + area', 'textarea', '', { required: false, helperText: 'Jelaskan improvement keempat jika ada.' }),
        presetField('additional_improvements', 'Improvement tambahan jika ada', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jika ada lebih dari 4 improvement valid.' }),
        presetField('all_improvements_reported_to_bima', 'Sudah dilaporkan semua ke Bima?', 'text', '', { helperText: 'Isi Ya/Tidak dan cantumkan bukti penyampaian seperti screenshot WA/email atau notulen.' }),
        presetField('improvement_folder_link', 'Link folder dokumen before-after improvement', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan folder Drive berisi before-after, reasoning, dan bukti live/implementasi.' }),
      ],
    },
    {
      match: ['Riset Kompetitor', 'Implementasi Insight Visual', 'Insight Visual', 'Kompetitor'],
      actualValueSourceFieldId: 'implemented_competitor_insight_count',
      fields: [
        presetField('implemented_competitor_insight_count', 'Jumlah insight kompetitor yang DIIMPLEMENTASIKAN bulan ini', 'number', 'insight', { usedAsActualValue: true, helperText: 'Insight dihitung valid jika berbasis riset kompetitor aktual dan sudah diimplementasikan ke design/web EPI.' }),
        presetField('insight_1_implementation', 'Insight #1: kompetitor + elemen yang diadaptasi + hasil di EPI', 'textarea', '', { required: false, helperText: 'Jelaskan kompetitor, elemen visual/web yang diadaptasi, hasil implementasi di EPI, dan link bukti.' }),
        presetField('insight_2_implementation', 'Insight #2: kompetitor + elemen yang diadaptasi + hasil di EPI', 'textarea', '', { required: false, helperText: 'Jelaskan insight kedua jika ada.' }),
        presetField('insight_3_implementation', 'Insight #3: kompetitor + elemen yang diadaptasi + hasil di EPI', 'textarea', '', { required: false, helperText: 'Jelaskan insight ketiga jika ada.' }),
        presetField('creative_review_status', 'Sudah dibahas di review kreatif/notulen dengan Bima?', 'text', '', { helperText: 'Isi Ya/Tidak dan cantumkan referensi review kreatif, screenshot diskusi, atau notulen.' }),
        presetField('competitor_research_folder', 'Link folder dokumen riset kompetitor + implementasi EPI', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Folder berisi screenshot kompetitor, insight, adaptasi, dan hasil implementasi di design/web EPI.' }),
        presetField('non_implemented_insights', 'Insight yang belum diimplementasikan dan alasannya', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi jika ada insight yang hanya diriset tetapi belum diimplementasikan, beserta alasannya.' }),
      ],
    },
  ],
};

export const STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET = {
  name: 'Staff Marcom Social Media',
  items: [
    {
      match: ['Ketepatan Waktu Produksi Design', 'SLA Produksi', 'Produksi Design', 'Design SLA', 'Ketepatan Waktu'],
      actualValueSourceFieldId: 'sla_on_time_rate',
      fields: [
        presetField('total_tasks_received', 'Total task diterima bulan ini (semua jenis)', 'number', 'task', { helperText: 'Isi jumlah total task dari task tracker bulan berjalan.' }),
        presetField('simple_design_tasks', 'Breakdown: jumlah task Simple Design', 'number', 'task', { helperText: 'Simple Design mencakup infografis, story, thumbnail, banner standar, dan output ringan lain dengan SLA 1 hari kerja.' }),
        presetField('campaign_design_tasks', 'Breakdown: jumlah task Campaign Design', 'number', 'task', { helperText: 'Campaign Design mencakup poster campaign, materi ads, desain multi-format, dan output campaign dengan SLA 2 hari kerja.' }),
        presetField('video_motion_tasks', 'Breakdown: jumlah task Video / Motion', 'number', 'task', { helperText: 'Video/Motion mencakup video clipper, reels, dan motion graphic dengan SLA 3 hari kerja.' }),
        presetField('on_time_tasks', 'Jumlah task selesai ON-TIME sesuai SLA', 'number', 'task', { helperText: 'Ambil dari task tracker, kolom On-Time = Y.' }),
        presetField('late_tasks', 'Jumlah task TERLAMBAT melewati SLA', 'number', 'task', { helperText: 'Jumlah terlambat = total task diterima − task on-time.' }),
        presetField('sla_on_time_rate', 'SLA On-Time Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'SLA On-Time Rate = task selesai sesuai SLA ÷ total task diterima × 100.' }),
        presetField('most_late_task_pattern', 'Task yang paling sering terlambat (jenis + alasan)', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi pola keterlambatan seperti jenis task, brief tidak jelas, revisi berulang, atau bottleneck approval.' }),
        presetField('task_tracker_file', 'Link task tracker / nama file yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet task tracker atau nama file rekap SLA.' }),
      ],
    },
    {
      match: ['Support Visual Campaign Marketing', 'Visual Campaign', 'Campaign Support', 'Campaign Marketing'],
      actualValueSourceFieldId: 'campaign_fulfillment_rate',
      fields: [
        presetField('total_campaigns_running', 'Total campaign yang berjalan bulan ini', 'number', 'campaign', { helperText: 'Isi dari kalender campaign resmi bulan berjalan.' }),
        presetField('total_campaign_design_requests', 'Total permintaan design campaign yang diterima', 'number', 'request', { helperText: 'Isi total request visual campaign. Jumlah request bisa lebih dari jumlah campaign.' }),
        presetField('completed_approved_campaign_designs', 'Jumlah design campaign selesai dan diapprove', 'number', 'request', { helperText: 'Design dihitung selesai jika sesuai brief, selesai sebelum atau saat go-live, dan sudah mendapat approval atasan Markom.' }),
        presetField('unfulfilled_campaign_designs', 'Jumlah design campaign yang tidak terpenuhi', 'number', 'request', { helperText: 'Jumlah tidak terpenuhi = total request design campaign − design selesai dan diapprove. Jelaskan alasan pada catatan jika ada.' }),
        presetField('campaign_fulfillment_rate', 'Campaign Fulfillment Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Campaign Fulfillment Rate = design campaign selesai dan diapprove ÷ total permintaan design campaign × 100.' }),
        presetField('highest_request_campaign', 'Campaign dengan visual paling banyak requestnya', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi campaign terbesar bulan ini berdasarkan jumlah request visual.' }),
        presetField('campaign_drive_folder', 'Link folder Google Drive materi campaign bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive folder campaign yang bisa diakses Bima.' }),
        presetField('campaign_calendar_file', 'Kalender campaign resmi bulan berjalan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link kalender campaign atau dokumen campaign resmi.' }),
        presetField('approval_reference', 'Referensi approval design campaign dari atasan', 'text', '', { helperText: 'Isi referensi screenshot WA/email/task tracker approval dari atasan Markom.' }),
      ],
    },
    {
      match: ['Kualitas & Konsistensi Brand Visual', 'Kualitas dan Konsistensi Brand Visual', 'Brand Visual', 'Brand Quality', 'Konsistensi Brand'],
      actualValueSourceFieldId: 'brand_quality_rate',
      fields: [
        presetField('total_reviewed_designs', 'Total design yang direview / diapprove bulan ini', 'number', 'design', { helperText: 'Isi jumlah total design yang melalui proses approval bulan berjalan.' }),
        presetField('designs_without_major_revision', 'Jumlah design lolos TANPA revisi mayor', 'number', 'design', { helperText: 'Hitung design yang tidak ada revisi atau hanya mengalami revisi minor.' }),
        presetField('major_revision_designs', 'Jumlah design yang kena revisi MAYOR', 'number', 'design', { helperText: 'Revisi mayor termasuk layout dirombak besar, warna/font tidak sesuai brand, elemen visual salah, atau harus diulang dari awal.' }),
        presetField('brand_quality_rate', 'Brand Quality Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Brand Quality Rate = design tanpa revisi mayor ÷ total design yang direview × 100.' }),
        presetField('common_major_revision_type', 'Jenis revisi mayor yang paling sering terjadi', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi pola revisi mayor seperti font, warna, layout, elemen visual, atau brief tidak sesuai.' }),
        presetField('most_revised_design', 'Design dengan revisi paling banyak bulan ini', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama design yang paling banyak revisi untuk bahan evaluasi dan pembinaan.' }),
        presetField('revision_log_file', 'Link revision log / nama file yang dilampirkan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet Design Revision Log atau nama file rekap revisi.' }),
        presetField('brief_document_reference', 'Brief design document / referensi brief', 'text', '', { helperText: 'Cantumkan referensi brief design, screenshot WA brief, atau dokumen brief yang digunakan.' }),
      ],
    },
    {
      match: ['Produktivitas Asset Visual', 'Produktivitas Design', 'Asset Visual', 'Output Design'],
      actualValueSourceFieldId: 'productivity_rate',
      fields: [
        presetField('target_design_per_month', 'Target design per bulan', 'number', 'design', { helperText: 'Isi target standar, misalnya 125 design/bulan sesuai dokumen KPI.' }),
        presetField('total_final_designs', 'Total design final yang selesai bulan ini', 'number', 'design', { helperText: 'Hitung file design final yang tersimpan di Google Drive folder bulanan. Draft/WIP tidak dihitung.' }),
        presetField('simple_design_output', 'Breakdown: Simple Design', 'number', 'design', { helperText: 'Jumlah design kategori simple.' }),
        presetField('campaign_design_output', 'Breakdown: Campaign Design', 'number', 'design', { helperText: 'Jumlah design kategori campaign.' }),
        presetField('story_social_media_output', 'Breakdown: Story / Social Media', 'number', 'design', { helperText: 'Jumlah design story dan konten sosial media.' }),
        presetField('banner_infographic_other_output', 'Breakdown: Banner / Infografis / Lainnya', 'number', 'design', { helperText: 'Jumlah design kategori banner, infografis, dan output lainnya.' }),
        presetField('productivity_rate', 'Productivity Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Productivity Rate = total design final tersimpan di Drive ÷ target 125 × 100.' }),
        presetField('drive_folder_link', 'Link folder Google Drive bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link folder Google Drive yang berisi semua design final bulan ini.' }),
        presetField('best_design_examples', 'Contoh 5 design terbaik bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan nama file/link 5 design terbaik sebagai benchmark kualitas.' }),
      ],
    },
    {
      match: ['Editing Video', 'Media Support', 'Video Support', 'Video Clipper', 'Video Production'],
      actualValueSourceFieldId: 'video_completion_rate',
      fields: [
        presetField('target_video_clipper', 'Target video clipper per bulan', 'number', 'video', { helperText: 'Isi target standar, misalnya 25 video/bulan sesuai dokumen KPI.' }),
        presetField('total_final_videos', 'Total video final yang selesai bulan ini', 'number', 'video', { helperText: 'Hitung file MP4/MOV final di folder Google Drive. Draft/project file tidak dihitung.' }),
        presetField('reels_video_count', 'Breakdown: Reels', 'number', 'video', { helperText: 'Jumlah video format Reels.' }),
        presetField('story_video_count', 'Breakdown: Story Video', 'number', 'video', { helperText: 'Jumlah video format Story.' }),
        presetField('video_ads_count', 'Breakdown: Video Ads / Iklan', 'number', 'video', { helperText: 'Jumlah video untuk keperluan ads.' }),
        presetField('product_clip_other_count', 'Breakdown: Product Clip / Lainnya', 'number', 'video', { required: false, helperText: 'Jumlah video kategori product clip atau kategori lainnya.' }),
        presetField('video_completion_rate', 'Video Completion Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Video Completion Rate = total video final bulan ini ÷ target 25 × 100.' }),
        presetField('video_drive_folder_link', 'Link folder Google Drive video bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive yang bisa diakses Bima dan berisi semua video final.' }),
        presetField('best_video_examples', 'Contoh 3 video terbaik bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan 3 link/nama file video terbaik bulan berjalan.' }),
      ],
    },
    {
      match: ['Riset Visual Kompetitor', 'Riset Kompetitor', 'Visual Kompetitor', 'Competitor Insight'],
      actualValueSourceFieldId: 'valid_visual_insight_count',
      fields: [
        presetField('total_visual_insights', 'Total insight visual yang dihasilkan bulan ini', 'number', 'insight', { helperText: 'Isi jumlah total baris insight dalam spreadsheet riset kompetitor.' }),
        presetField('valid_visual_insight_count', 'Jumlah insight yang VALID / usable', 'number', 'insight', { usedAsActualValue: true, helperText: 'Insight valid harus punya screenshot/link kompetitor, temuan spesifik, rekomendasi untuk EPI, dan status sudah dilaporkan ke Bima.' }),
        presetField('most_analyzed_competitor', 'Kompetitor yang paling banyak dianalisis', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Sebutkan brand/kompetitor yang paling sering muncul dalam riset bulan ini.' }),
        presetField('most_observed_platform', 'Platform yang paling sering diobservasi', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: IG, TikTok, YouTube, website, marketplace, atau platform lain.' }),
        presetField('most_actionable_insight', 'Insight yang paling actionable bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Sebutkan satu insight terbaik dan rekomendasi visual yang bisa digunakan untuk EPI.' }),
        presetField('all_insights_reported_to_bima', 'Apakah semua insight sudah dilaporkan ke Bima?', 'text', '', { helperText: 'Isi Ya/Tidak. Jika tidak, sebutkan insight yang belum dilaporkan.' }),
        presetField('competitor_research_sheet_link', 'Link spreadsheet riset visual kompetitor', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet yang berisi screenshot/link, temuan visual, rekomendasi, dan status dilaporkan.' }),
        presetField('best_insight_document', 'Contoh 1 insight terbaik bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan ringkasan insight terbaik, screenshot referensi, dan rekomendasi implementasi.' }),
      ],
    },
    {
      match: ['Manajemen Asset Branding', 'Asset Branding', 'Asset Management', 'Manajemen Aset'],
      actualValueSourceFieldId: 'asset_compliance_rate',
      fields: [
        presetField('total_new_files', 'Total file baru yang diproduksi bulan ini (design + video)', 'number', 'file', { helperText: 'Isi jumlah total file baru yang dibuat bulan berjalan.' }),
        presetField('compliant_files', 'Jumlah file yang tersimpan sesuai standar folder dan nama', 'number', 'file', { helperText: 'Hitung file yang mengikuti struktur folder dan standar penamaan yang disepakati.' }),
        presetField('non_compliant_files', 'Jumlah file yang tidak sesuai standar', 'number', 'file', { helperText: 'Jumlah tidak sesuai = total file baru − file compliant.' }),
        presetField('asset_compliance_rate', 'Asset Compliance Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Asset Compliance Rate = file tersimpan sesuai standar ÷ total file yang diproduksi × 100.' }),
        presetField('telegram_backup_status', 'Sudah di-backup ke Telegram channel aset?', 'text', '', { helperText: 'Isi Ya/Tidak dan cantumkan referensi bukti backup Telegram.' }),
        presetField('most_common_standard_violation', 'Jenis pelanggaran standar yang paling sering terjadi', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: salah folder, nama file tidak standar, belum FINAL, file duplikat, atau tidak ada backup Telegram.' }),
        presetField('monthly_drive_folder_link', 'Link folder Google Drive bulan ini untuk audit Bima', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive folder asset bulan berjalan.' }),
        presetField('telegram_asset_channel_reference', 'Referensi channel Telegram asset branding', 'text', '', { helperText: 'Cantumkan nama channel, link, atau screenshot referensi Telegram asset.' }),
        presetField('compliant_file_example', 'Contoh penamaan file yang sudah benar', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan beberapa contoh nama file yang sudah sesuai standar.' }),
      ],
    },
  ],
};

export const STAFF_MARKOM_DESIGNER_VIDEO_ACTUAL_DATA_PRESET = {
  ...STAFF_MARCOM_SOCIAL_MEDIA_ACTUAL_DATA_PRESET,
  name: 'Staff Markom Designer & Video',
};

export const STAFF_MARCOM_PHOTO_VIDEO_PRODUCTION_ACTUAL_DATA_PRESET = {
  name: 'Staff Marcom Photo & Video Production',
  items: [
    {
      match: ['Ketepatan Waktu Produksi Foto & Video', 'Produksi Foto', 'Produksi Video', 'SLA Produksi', 'Foto & Video', 'Photo & Video'],
      actualValueSourceFieldId: 'sla_on_time_rate',
      fields: [
        presetField('total_production_tasks', 'Total task produksi diterima bulan ini', 'number', 'task', { helperText: 'Semua jenis task produksi: foto produk, reel/short edit, video campaign, recap event, dan upload file mentah event.' }),
        presetField('product_photo_tasks', 'Breakdown: Foto Produk', 'number', 'task', { helperText: 'Foto produk memiliki SLA 1 hari kerja sejak brief diterima.' }),
        presetField('reel_short_edit_tasks', 'Breakdown: Reel / Short Edit', 'number', 'task', { helperText: 'Reel atau short edit sederhana memiliki SLA 1 hari kerja.' }),
        presetField('video_campaign_tasks', 'Breakdown: Video Campaign', 'number', 'task', { helperText: 'Video campaign memiliki SLA 2 hari kerja.' }),
        presetField('recap_event_tasks', 'Breakdown: Recap Event H+2', 'number', 'task', { helperText: 'Recap event wajib selesai maksimal H+2 setelah event selesai.' }),
        presetField('raw_event_upload_tasks', 'Breakdown: Upload File Mentah Event H+1', 'number', 'task', { helperText: 'File mentah event wajib upload ke Drive/Harddisk maksimal H+1.' }),
        presetField('on_time_tasks', 'Jumlah task ON-TIME sesuai SLA', 'number', 'task', { helperText: 'Ambil dari task tracker, kolom On-Time = Y.' }),
        presetField('late_tasks', 'Jumlah task TERLAMBAT melewati SLA', 'number', 'task', { helperText: 'Jumlah terlambat = total task produksi diterima − task on-time. Jelaskan alasan per kategori pada catatan jika ada.' }),
        presetField('sla_on_time_rate', 'SLA On-Time Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'SLA On-Time Rate = task selesai sesuai SLA ÷ total task × 100.' }),
        presetField('task_tracker_file', 'Link task tracker / nama file tracker', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet task tracker lengkap dengan timestamp brief/event, deadline SLA, tanggal selesai/upload, On-Time, dan link file.' }),
      ],
    },
    {
      match: ['Kualitas Visual dan Kepatuhan terhadap Brief', 'Kualitas Visual', 'Kepatuhan terhadap Brief', 'Quality Rate', 'Revisi Mayor'],
      actualValueSourceFieldId: 'quality_rate',
      fields: [
        presetField('total_reviewed_outputs', 'Total output foto/video yang direview atau diapprove bulan ini', 'number', 'output', { helperText: 'Semua output foto/video yang melalui proses approval Bima.' }),
        presetField('outputs_without_major_revision', 'Jumlah output lolos TANPA revisi mayor', 'number', 'output', { helperText: 'Hitung output yang tidak ada revisi mayor dari revision log.' }),
        presetField('major_revision_outputs', 'Jumlah output kena revisi MAYOR', 'number', 'output', { helperText: 'Revisi mayor termasuk reshoot/reedit signifikan, subjek salah, komposisi tidak sesuai brand guideline, blur/gelap/noise berat, atau format tidak sesuai brief.' }),
        presetField('quality_rate', 'Quality Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Quality Rate = output tanpa revisi mayor ÷ total output direview × 100.' }),
        presetField('common_major_revision_type', 'Jenis revisi mayor yang paling sering terjadi', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Identifikasi pola revisi mayor: foto, video, event, angle, lighting, format, objek, atau brand guideline.' }),
        presetField('reshoot_reedit_outputs', 'Output yang perlu reshoot/reedit bulan ini', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama output dan alasan reshoot/reedit untuk evaluasi mendalam.' }),
        presetField('revision_log_file', 'Link revision log / nama file', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Google Sheet log revisi foto & video bulan berjalan.' }),
        presetField('brief_approval_reference', 'Referensi brief awal dan approval Bima', 'text', '', { helperText: 'Cantumkan referensi brief awal dan bukti approval dari Bima, misalnya screenshot WA/email/task tracker.' }),
      ],
    },
    {
      match: ['Output Konten Visual untuk Campaign & Media Sosial', 'Output Konten Visual', 'Campaign & Media Sosial', 'Video Final', 'Foto Final'],
      actualValueSourceFieldId: 'overall_visual_output_rate',
      fields: [
        presetField('target_final_video', 'Target video final per bulan', 'number', 'video', { helperText: 'Isi target standar, misalnya 78 video final per bulan atau target yang ditetapkan.' }),
        presetField('total_final_video', 'Total video final selesai bulan ini', 'number', 'video', { helperText: 'Hitung file MP4/MOV final yang tersimpan di folder Drive dan siap publish. Raw file, draft, dan duplicate tidak dihitung.' }),
        presetField('reels_video_count', 'Breakdown video: Reels', 'number', 'video', { helperText: 'Jumlah video format Reels.' }),
        presetField('story_video_count', 'Breakdown video: Story Video', 'number', 'video', { helperText: 'Jumlah video format Story.' }),
        presetField('campaign_ads_video_count', 'Breakdown video: Campaign / Ads Video', 'number', 'video', { helperText: 'Jumlah video campaign atau video iklan.' }),
        presetField('other_video_count', 'Breakdown video: Lainnya', 'number', 'video', { required: false, helperText: 'Jumlah video kategori lain jika ada.' }),
        presetField('video_achievement_rate', '% Pencapaian Video', 'percent', '%', { helperText: 'Pencapaian Video = total video final ÷ target video final × 100.' }),
        presetField('target_final_photo', 'Target foto final per bulan', 'number', 'foto', { helperText: 'Isi target standar, misalnya 30 foto final per bulan atau target yang ditetapkan.' }),
        presetField('total_final_photo', 'Total foto final selesai bulan ini', 'number', 'foto', { helperText: 'Hitung file foto final yang sudah diedit/diseleksi, tersimpan di Drive, dan siap publish.' }),
        presetField('photo_achievement_rate', '% Pencapaian Foto', 'percent', '%', { helperText: 'Pencapaian Foto = total foto final ÷ target foto final × 100.' }),
        presetField('overall_visual_output_rate', 'Overall Visual Output Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Overall = rata-rata pencapaian video dan pencapaian foto.' }),
        presetField('monthly_output_drive_folder', 'Link folder Drive semua output bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive yang dipisah folder video dan foto final.' }),
      ],
    },
    {
      match: ['Dokumentasi Event dan Ketepatan Materi Pasca-Event', 'Dokumentasi Event', 'Pasca-Event', 'Event Documentation', 'Recap Event'],
      actualValueSourceFieldId: 'event_documentation_rate',
      fields: [
        presetField('total_events', 'Total event yang dilaksanakan bulan ini', 'number', 'event', { helperText: 'Isi jumlah event dari jadwal event bulan berjalan.' }),
        presetField('raw_files_uploaded_h1', 'Jumlah event dengan file mentah upload H+1', 'number', 'event', { helperText: 'Hitung event yang file mentah foto/video sudah upload ke Drive/Harddisk maksimal H+1.' }),
        presetField('recap_available_h2', 'Jumlah event dengan highlight/recap H+2 tersedia', 'number', 'event', { helperText: 'Hitung event yang highlight/recap sudah tersedia, diedit, dan diapprove maksimal H+2.' }),
        presetField('main_documentation_available', 'Jumlah event dengan dokumentasi utama tersedia', 'number', 'event', { helperText: 'Dokumentasi utama minimal 20 foto pilihan dan 1 video highlight.' }),
        presetField('complete_on_time_events', 'Jumlah event LENGKAP & ON-TIME', 'number', 'event', { helperText: 'Event dihitung lengkap jika memenuhi semua kriteria: H+1 raw upload, H+2 recap, dokumentasi utama tersedia, folder rapi, dan approved.' }),
        presetField('event_documentation_rate', 'Event Documentation Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Event Documentation Rate = event lengkap & on-time ÷ total event × 100.' }),
        presetField('incomplete_event_notes', 'Event yang tidak terdokumentasi lengkap', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi nama event, kriteria yang tidak terpenuhi, dan alasan keterlambatan/ketidaklengkapan.' }),
        presetField('event_documentation_folder', 'Link folder dokumentasi event bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link Drive per event.' }),
        presetField('event_doc_log_file', 'Link Event Documentation Log', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Log berisi Nama Event, Tanggal, H+1 Upload, H+2 Recap, Dokumentasi Utama, dan Approval.' }),
      ],
    },
    {
      match: ['Produktivitas Pengambilan Konten', 'Take Content', 'Pengambilan Konten', 'Kalender Produksi'],
      actualValueSourceFieldId: 'take_content_rate',
      fields: [
        presetField('target_take_content', 'Target Take Content per bulan', 'number', 'sesi', { helperText: 'Isi target standar, misalnya 78 sesi atau sesuai target yang ditetapkan.' }),
        presetField('completed_take_sessions', 'Total sesi Take Content yang terlaksana bulan ini', 'number', 'sesi', { helperText: 'Isi dari kalender produksi dan brief shooting.' }),
        presetField('approved_take_sessions', 'Jumlah sesi yang DIAPPROVE outputnya', 'number', 'sesi', { helperText: 'Sesi dihitung final jika terlaksana sesuai brief, menghasilkan minimal 1 file output layak pakai, ada approval, dan ada raw/BTS tersimpan.' }),
        presetField('cancelled_take_sessions', 'Jumlah sesi yang tidak terlaksana / dibatalkan', 'number', 'sesi', { helperText: 'Jumlah sesi batal = target atau rencana sesi − sesi terlaksana. Jelaskan alasan pada catatan jika ada.' }),
        presetField('take_content_rate', 'Take Content Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Take Content Rate = sesi final yang diapprove ÷ target Take Content × 100.' }),
        presetField('dominant_content_type', 'Jenis konten yang paling banyak sesinya bulan ini', 'text', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: foto produk, video sosmed, event, product clip, atau kategori lain.' }),
        presetField('cancelled_session_notes', 'Sesi yang tidak terlaksana beserta alasan', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Isi untuk evaluasi dan perencanaan bulan berikutnya.' }),
        presetField('production_calendar_file', 'Link kalender produksi / brief shooting bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Cantumkan link kalender produksi, brief shooting, dokumentasi BTS/raw file, atau approval hasil take.' }),
      ],
    },
    {
      match: ['Riset Referensi Visual Kompetitor', 'Insight Produksi', 'Riset Visual', 'Referensi Visual', 'Kompetitor'],
      actualValueSourceFieldId: 'valid_visual_insight_count',
      fields: [
        presetField('total_visual_insights', 'Total insight visual yang dihasilkan bulan ini', 'number', 'insight', { helperText: 'Isi jumlah total insight visual terdokumentasi bulan berjalan.' }),
        presetField('valid_visual_insight_count', 'Jumlah insight visual yang VALID / usable', 'number', 'insight', { usedAsActualValue: true, helperText: 'Insight valid harus berbasis referensi visual kompetitor aktual, ada analisis efektivitas, ada usulan penerapan ke produksi EPI, dan terdokumentasi/dibahas di review kreatif.' }),
        presetField('insight_1_summary', 'Insight #1: kompetitor + elemen visual + usulan penerapan EPI', 'textarea', '', { required: false, helperText: 'Rangkum referensi visual, analisis, dan usulan penerapan untuk insight pertama.' }),
        presetField('insight_2_summary', 'Insight #2: kompetitor + elemen visual + usulan penerapan EPI', 'textarea', '', { required: false, helperText: 'Rangkum referensi visual, analisis, dan usulan penerapan untuk insight kedua.' }),
        presetField('insight_3_summary', 'Insight #3: kompetitor + elemen visual + usulan penerapan EPI', 'textarea', '', { required: false, helperText: 'Rangkum referensi visual, analisis, dan usulan penerapan untuk insight ketiga.' }),
        presetField('insight_4_summary', 'Insight #4: kompetitor + elemen visual + usulan penerapan EPI', 'textarea', '', { required: false, helperText: 'Rangkum referensi visual, analisis, dan usulan penerapan untuk insight keempat.' }),
        presetField('review_creative_status', 'Sudah dibahas di review kreatif / dilaporkan ke Bima?', 'text', '', { helperText: 'Isi Ya/Tidak dan cantumkan referensi notulen review kreatif atau screenshot diskusi dengan Bima.' }),
        presetField('visual_research_document_link', 'Link dokumen riset visual bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link Drive/spreadsheet/Google Doc berisi referensi kompetitor, analisis, dan usulan penerapan.' }),
      ],
    },
    {
      match: ['Manajemen Arsip Aset Foto & Video', 'Arsip Aset', 'Aset Foto', 'Aset Video', 'Asset Compliance', 'Harddisk'],
      actualValueSourceFieldId: 'asset_compliance_rate',
      fields: [
        presetField('total_new_photo_video_files', 'Total file baru yang diproduksi bulan ini', 'number', 'file', { helperText: 'Semua file final foto dan video semua kategori bulan berjalan.' }),
        presetField('compliant_files', 'Jumlah file tersimpan SESUAI standar', 'number', 'file', { helperText: 'File compliant jika struktur folder sesuai standar, nama file sesuai format, status jelas RAW/EDIT/FINAL, dan tersimpan di harddisk serta Google Drive.' }),
        presetField('non_compliant_files', 'Jumlah file yang TIDAK sesuai standar', 'number', 'file', { helperText: 'Jumlah tidak sesuai = total file baru − file compliant. Jelaskan jenis pelanggaran pada catatan.' }),
        presetField('asset_compliance_rate', 'Asset Compliance Rate', 'percent', '%', { usedAsActualValue: true, helperText: 'Asset Compliance Rate = aset tersimpan sesuai standar ÷ total aset yang diproduksi × 100.' }),
        presetField('harddisk_backup_status', 'Tersimpan di harddisk? Persentase dari total', 'text', '', { helperText: 'Isi Ya/Tidak dan persentase file yang sudah ada di harddisk fisik.' }),
        presetField('google_drive_backup_status', 'Tersimpan di Google Drive? Persentase dari total', 'text', '', { helperText: 'Isi Ya/Tidak dan persentase file yang sudah ada di Google Drive.' }),
        presetField('common_standard_violation', 'Jenis pelanggaran standar yang paling sering', 'textarea', '', { required: false, sourceRequired: false, dataDateRequired: false, helperText: 'Contoh: salah folder, nama tidak standar, hanya 1 lokasi backup, file masih draft, file duplikat, atau nama acak.' }),
        presetField('asset_folder_reference', 'Link folder Drive dan/atau nama folder harddisk bulan ini', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Link folder Drive atau referensi folder harddisk untuk audit Bima.' }),
        presetField('asset_audit_checklist_file', 'Link checklist audit aset bulan berjalan', 'url', '', { sourceRequired: false, dataDateRequired: false, helperText: 'Checklist audit berisi struktur folder, penamaan file, kelengkapan harddisk, dan kelengkapan Drive.' }),
      ],
    },
  ],
};

function matchPresetItem(kpi, kpiIndex, presetItems) {
  const name = String(kpi?.nama || '').toLowerCase();
  return presetItems.find((item) => item.match.some((keyword) => name.includes(keyword.toLowerCase())))
    || presetItems[kpiIndex]
    || null;
}

function mergePresetFields(kpi, presetItem) {
  const existingFields = Array.isArray(kpi.actualDataFields) ? kpi.actualDataFields : [];
  const presetFields = presetItem.fields.map((field) => clone(field));
  const presetIds = new Set(presetFields.map((field) => field.id));
  const mergedFields = [
    ...presetFields,
    ...existingFields.filter((field) => !presetIds.has(field.id)),
  ].map((field) => ({
    ...field,
    usedAsActualValue: field.id === presetItem.actualValueSourceFieldId,
  }));

  return {
    ...kpi,
    actualValueSourceFieldId: presetItem.actualValueSourceFieldId,
    actualDataFields: mergedFields,
  };
}

export function applyActualDataPresetToDefinitions(definitions, selectedPosition, preset) {
  const next = clone(definitions);
  const definition = next[selectedPosition];
  const result = {
    positionName: selectedPosition,
    matchedCount: 0,
    updatedKpis: [],
    unmatchedPresetItems: [],
  };

  if (!definition || !Array.isArray(definition.kpis)) {
    result.unmatchedPresetItems = preset.items.map((item) => item.match[0]);
    return { definitions: next, result };
  }

  const usedPresetItems = new Set();
  definition.kpis = definition.kpis.map((kpi, kpiIndex) => {
    const presetItem = matchPresetItem(kpi, kpiIndex, preset.items);
    if (!presetItem) return kpi;

    usedPresetItems.add(presetItem);
    const updatedKpi = mergePresetFields(kpi, presetItem);
    result.matchedCount += 1;
    result.updatedKpis.push({
      kpiName: updatedKpi.nama,
      actualDataFieldCount: updatedKpi.actualDataFields.length,
      actualValueSourceFieldId: updatedKpi.actualValueSourceFieldId,
    });
    return updatedKpi;
  });
  result.unmatchedPresetItems = preset.items
    .filter((item) => !usedPresetItems.has(item))
    .map((item) => item.match[0]);

  return { definitions: next, result };
}
