import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { achievementLabel } from '../lib/kpi.js';

const KPI_SOURCE_DATA = {
  'Pencapaian Target Revenue Brand': 'Dashboard Sales / Finance Report',
  'Channel Productivity & Activation': 'Data EPIS & SC',
  'Conversion & Funnel Impact': 'CRM Database, Laporan Admin Sales',
  'Eksekusi Roadmap & Campaign': 'Kalender Campaign Resmi, MOM, Report event & campaign',
  'Portofolio & Product Velocity': 'Dashboard Sales',
  'Strategic Improvement': 'Proposal Resmi, Perbandingan Before-After Revenue',
  'Reporting & Governance': 'Monthly Report by Email',
};

function sourceDataFor(kpi, answer) {
  const exact = KPI_SOURCE_DATA[kpi.nama];
  if (exact) return exact;
  const matched = Object.entries(KPI_SOURCE_DATA).find(([name]) => kpi.nama.includes(name));
  if (matched) return matched[1];
  return answer?.link ? 'Link bukti penilaian' : '-';
}

function formatDocumentDate(timestamp, fallback) {
  const source = timestamp || fallback;
  if (!source) return '-';

  const match = String(source).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(source);

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function DocumentHeader({ page, effectiveDate }) {
  return <table className="formal-document-header">
    <tbody><tr>
      <td className="formal-logo-cell">
        <img src="assets/logo-epi-hitam.png" alt="Indonesian Bullion Ecosystem" />
      </td>
      <td className="formal-title-cell"><strong>PT. EMAS PERAK INDONESIA</strong><strong>Key Performance Indicator</strong></td>
      <td className="formal-meta-cell">
        <table className="formal-meta-table">
          <tbody>
            <tr><th>No. Dokumen</th><td>FO.EPI.29</td></tr>
            <tr><th>Revisi</th><td>00</td></tr>
            <tr><th>Tgl. Berlaku</th><td>{effectiveDate}</td></tr>
            <tr><th>Halaman</th><td>{page} dari 2</td></tr>
          </tbody>
        </table>
      </td>
    </tr></tbody>
  </table>;
}

function ScoringBlock({ kpi, answer, index }) {
  const actual = answer?.actualValue ?? 0;
  const unit = kpi.unit === '%' ? '%' : '';
  const rowSpan = kpi.tiers.length + 1;
  return <table className="formal-score-block">
    <tbody>
      <tr>
        <td className="formal-score-number" rowSpan={rowSpan}>{index + 1}</td>
        <th>{kpi.nama}</th>
        <td className="formal-selected-score" rowSpan={rowSpan}>{answer?.tier ?? 0}</td>
        <td className="formal-quality-heading" />
        <td className="formal-achievement" rowSpan={rowSpan}>{actual}{unit}</td>
      </tr>
      {[...kpi.tiers].sort((a, b) => b.skor - a.skor).map((tier) =>
        <tr key={tier.skor}>
          <td>{tier.label}</td>
          <td className={Number(tier.skor) === Number(answer?.tier) ? 'formal-quality-selected' : ''}>{tier.skor}</td>
        </tr>)}
    </tbody>
  </table>;
}

function KpiPrintReport({ submission, onClose }) {
  const [label, achievementClass] = achievementLabel(submission.scoreCalc.finalAchievement);
  const effectiveDate = formatDocumentDate(submission.created_at, submission.tanggal);
  const kpis = submission.definition?.kpis || [];
  const totalWeight = kpis.reduce((total, kpi) => total + Number(kpi.bobot || 0), 0);
  const firstPageKpis = kpis.slice(0, 6);
  const secondPageKpis = kpis.slice(6);

  useEffect(() => {
    document.body.classList.add('kpi-printing');
    const previousTitle = document.title;
    document.title = `KPI ${submission.nama} - ${submission.periode}`;
    return () => {
      document.body.classList.remove('kpi-printing');
      document.title = previousTitle;
    };
  }, [submission]);

  return createPortal(<div className="print-report-root">
    <div className="print-toolbar">
      <button className="btn secondary" type="button" onClick={onClose}>Tutup</button>
      <button className="btn" type="button" onClick={() => window.print()}>Simpan sebagai PDF</button>
    </div>
    <article className="kpi-print-sheet formal-kpi-report">
      <section className="kpi-print-page">
        <DocumentHeader page="1" effectiveDate={effectiveDate} />
        <div className="formal-department">SALES &amp; MARKETING</div>
        <div className="formal-employee"><span>Nama Karyawan</span><b>: {submission.nama}</b></div>

        <table className="formal-definition-table">
          <thead><tr><th colSpan="2">{submission.posisi}</th><th>Bobot</th><th>Sumber Data</th><th>Target</th></tr></thead>
          <tbody>
            {kpis.map((kpi, index) => {
              const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
              return <tr key={kpi.id}>
                <td>{index + 1}</td><td>{kpi.nama}</td><td>{kpi.bobot}%</td>
                <td>{sourceDataFor(kpi, answer)}</td><td>{kpi.target}</td>
              </tr>;
            })}
            <tr className="formal-weight-total"><td colSpan="2" /><td>{totalWeight}%</td><td colSpan="2" /></tr>
          </tbody>
        </table>

        <table className="formal-score-header">
          <tbody><tr><td>A</td><th>Key Performance Indicator</th><th>Score</th><th>Mutu</th><th>Pencapaian*</th></tr></tbody>
        </table>
        {firstPageKpis.map((kpi, index) => <ScoringBlock
          key={kpi.id}
          kpi={kpi}
          index={index}
          answer={submission.kpiAnswers.find((item) => item.id === kpi.id)}
        />)}
      </section>

      <section className="kpi-print-page formal-second-page">
        {secondPageKpis.map((kpi, offset) => <ScoringBlock
          key={kpi.id}
          kpi={kpi}
          index={offset + 6}
          answer={submission.kpiAnswers.find((item) => item.id === kpi.id)}
        />)}

        <table className="formal-score-kpi"><tbody><tr><th>Score KPI</th><td>{submission.scoreCalc.scoreKPI}</td><td /></tr></tbody></table>
        <table className="formal-attendance">
          <tbody>
            <tr><td className="formal-section-letter" rowSpan="5">B</td><th>Kehadiran</th><th>Bobot</th><th>Hari Kerja :</th><td>{window.APP_CONFIG?.workDays || 26}</td></tr>
            <tr><td>Sakit</td><td>10%</td><td>{submission.kehadiran.sakit}</td><td className="formal-attendance-result" rowSpan="4">{submission.scoreCalc.kehadiranPct}%</td></tr>
            <tr><td>Izin</td><td>20%</td><td>{submission.kehadiran.izin}</td></tr>
            <tr><td>Alpa</td><td>70%</td><td>{submission.kehadiran.alpa}</td></tr>
            <tr><td>Cuti</td><td>0%</td><td>{submission.kehadiran.cuti}</td></tr>
          </tbody>
        </table>

        <table className="formal-result">
          <tbody>
            <tr><th>Achievement</th><th>Catatan</th></tr>
            <tr>
              <td className={`formal-achievement-result ${achievementClass}`}>
                {submission.scoreCalc.finalAchievement}%
              </td>
              <td>{submission.catatan || label}</td>
            </tr>
          </tbody>
        </table>

        <section className="formal-footer">
          <div className="formal-note">
            <span>Note:</span><span>0 - 69.9%</span><b>Perlu Evaluasi</b>
            <span /><span>70 - 79.9%</span><b>Cukup</b>
            <span /><span>80 - 89.9%</span><b>Baik</b>
            <span /><span>90 - 100%</span><b>Sangat Baik</b>
          </div>
          <div className="formal-signature"><b>Dibuat Oleh,</b><span>Atasan Langsung</span><strong>{submission.evaluatorName || '(...................................)'}</strong></div>
          <div className="formal-signature"><b>Diketahui Oleh,</b><span>HR</span><strong>(...................................)</strong></div>
        </section>
      </section>
    </article>
  </div>, document.body);
}

function SubmissionModal({ submission, onClose, onExport }) {
  const [label, cls] = achievementLabel(submission.scoreCalc.finalAchievement);
  return <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal"><button className="close-button" onClick={onClose} aria-label="Tutup">x</button>
      <h3>{submission.nama} - {submission.posisi}</h3>
      <p className="card-subtitle">{submission.periode} | {submission.tanggal} | {submission.status}</p>
      <p className="card-subtitle">Dinilai oleh: {submission.evaluatorName || 'Data lama'}</p>
      {submission.catatan && <div className="note-box">{submission.catatan}</div>}
      {(submission.definition?.kpis || []).map((kpi) => {
        const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
        const tier = kpi.tiers.find((item) => item.skor === answer?.tier);
        return <div className="kpi-block" key={kpi.id}>
          <div className="kpi-head"><strong>{kpi.nama}</strong><span className="kpi-bobot">{kpi.bobot}%</span></div>
          <div>Nilai aktual: <strong>{answer?.actualValue ?? '-'}</strong> {kpi.unit}</div>
          <div>Skor: <strong>{answer?.tier ?? 0}</strong> {tier && `- ${tier.label}`}</div>
          {answer?.link && <a href={answer.link} target="_blank" rel="noreferrer">Buka bukti</a>}
        </div>;
      })}
      <div className="summary-row"><div className="summary-box"><div className="val">{submission.scoreCalc.scoreKPI}</div><div className="lab">Score KPI</div></div><div className="summary-box"><div className={`val ${cls}`}>{submission.scoreCalc.finalAchievement}%</div><div className="lab">{label}</div></div></div>
      <div className="actions"><button className="btn" type="button" onClick={onExport}>Export PDF</button></div>
    </div>
  </div>;
}

export default function Approval({ submissions }) {
  const [filter, setFilter] = useState('Semua');
  const [selected, setSelected] = useState(null);
  const [printSubmission, setPrintSubmission] = useState(null);
  const periods = ['Semua', ...new Set(submissions.map((item) => item.periode))];
  const filtered = filter === 'Semua' ? submissions : submissions.filter((item) => item.periode === filter);

  return <>
    <div className="card filter-row"><label>Filter Periode</label><select value={filter} onChange={(event) => setFilter(event.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="summary-row">
      <div className="summary-box"><div className="val">{filtered.length}</div><div className="lab">Total Submission</div></div>
      <div className="summary-box"><div className="val">{filtered.filter((item) => item.status === 'Pending').length}</div><div className="lab">Menunggu Approval</div></div>
      <div className="summary-box"><div className="val">{filtered.filter((item) => item.status === 'Approved').length}</div><div className="lab">Approved</div></div>
    </div>
    <div className="card table-wrap"><table><thead><tr><th>Nama</th><th>Posisi</th><th>Periode</th><th>Status</th><th>Score</th><th>Achievement</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)}>
        <td>{item.nama}</td><td>{item.posisi}</td><td>{item.periode}</td><td><span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span></td><td>{item.scoreCalc.scoreKPI}</td><td>{item.scoreCalc.finalAchievement}%</td>
      </tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">Belum ada submission.</div>}</div>
    {selected && <SubmissionModal submission={selected} onClose={() => setSelected(null)} onExport={() => setPrintSubmission(selected)} />}
    {printSubmission && <KpiPrintReport submission={printSubmission} onClose={() => setPrintSubmission(null)} />}
  </>;
}
