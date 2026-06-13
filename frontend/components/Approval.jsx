import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { achievementLabel } from '../lib/kpi.js';

function KpiPrintReport({ submission, onClose }) {
  const [label] = achievementLabel(submission.scoreCalc.finalAchievement);
  const kpis = submission.definition?.kpis || [];
  const totalWeight = kpis.reduce((total, kpi) => total + Number(kpi.bobot || 0), 0);

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
    <article className="kpi-print-sheet">
      <table className="document-header">
        <tbody><tr>
          <td className="document-company">
            <strong>PT. EMAS PERAK INDONESIA</strong>
            <span>Key Performance Indicator</span>
          </td>
          <td className="document-meta">
            <span>No. Dokumen</span><strong>FO.EPI.29</strong>
            <span>Revisi</span><strong>00</strong>
            <span>Tgl. Berlaku</span><strong>{submission.tanggal}</strong>
            <span>Halaman</span><strong>1</strong>
          </td>
        </tr></tbody>
      </table>

      <h1>SALES &amp; MARKETING</h1>
      <div className="employee-data">
        <span>Nama Karyawan</span><strong>: {submission.nama}</strong>
        <span>Jabatan</span><strong>: {submission.posisi}</strong>
        <span>Periode</span><strong>: {submission.periode}</strong>
      </div>

      <table className="print-table definition-table">
        <thead><tr><th>No.</th><th>Key Performance Indicator</th><th>Bobot</th><th>Sumber Data</th><th>Target</th></tr></thead>
        <tbody>
          {kpis.map((kpi, index) => {
            const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
            return <tr key={kpi.id}>
              <td>{index + 1}</td><td>{kpi.nama}</td><td>{kpi.bobot}%</td>
              <td>{answer?.link ? 'Link bukti terlampir' : '-'}</td><td>{kpi.target}</td>
            </tr>;
          })}
          <tr className="print-total"><td colSpan="2">Total Bobot</td><td>{totalWeight}%</td><td colSpan="2" /></tr>
        </tbody>
      </table>

      <table className="print-table scoring-table">
        <thead><tr><th>No.</th><th>Key Performance Indicator / Kriteria</th><th>Nilai Aktual</th><th>Mutu</th><th>Pencapaian*</th></tr></thead>
        <tbody>{kpis.map((kpi, index) => {
          const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
          const selectedTier = kpi.tiers.find((tier) => Number(tier.skor) === Number(answer?.tier));
          const contribution = (Number(answer?.tier || 0) / 2) * Number(kpi.bobot || 0);
          return <tr key={kpi.id}>
            <td>{index + 1}</td>
            <td><strong>{kpi.nama}</strong>{[...kpi.tiers].sort((a, b) => b.skor - a.skor).map((tier) =>
              <span className={tier === selectedTier ? 'selected-criterion' : ''} key={tier.skor}>{tier.label} (Mutu {tier.skor})</span>)}</td>
            <td>{answer?.actualValue ?? '-'} {kpi.unit}</td>
            <td>{answer?.tier ?? 0}</td>
            <td>{contribution.toFixed(1)}%</td>
          </tr>;
        })}</tbody>
      </table>

      <section className="print-summary">
        <div>
          <h2>Catatan Mutu</h2>
          <span>0 - 69.9%: Perlu Evaluasi</span>
          <span>70 - 79.9%: Cukup</span>
          <span>80 - 89.9%: Baik</span>
          <span>90 - 100%: Sangat Baik</span>
        </div>
        <table>
          <tbody>
            <tr><th>Score KPI</th><td>{submission.scoreCalc.scoreKPI}</td></tr>
            <tr><th>KPI</th><td>{submission.scoreCalc.pctFromKPI}%</td></tr>
            <tr><th>Kehadiran</th><td>{submission.scoreCalc.kehadiranPct}%</td></tr>
            <tr><th>Achievement</th><td><strong>{submission.scoreCalc.finalAchievement}%</strong></td></tr>
            <tr><th>Hasil</th><td><strong>{label}</strong></td></tr>
          </tbody>
        </table>
        <div>
          <h2>Kehadiran</h2>
          <span>Hari Kerja: {window.APP_CONFIG?.workDays || 26}</span>
          <span>Sakit: {submission.kehadiran.sakit}</span>
          <span>Izin: {submission.kehadiran.izin}</span>
          <span>Alpa: {submission.kehadiran.alpa}</span>
          <span>Cuti: {submission.kehadiran.cuti}</span>
        </div>
      </section>

      <div className="print-note"><strong>Catatan:</strong> {submission.catatan || '-'}</div>
      <section className="signature-grid">
        <div><span>Dibuat Oleh,</span><span>Atasan Langsung</span><strong>{submission.evaluatorName || '(...................................)'}</strong></div>
        <div><span>Dinilai,</span><span>Karyawan</span><strong>{submission.nama}</strong></div>
        <div><span>Diketahui Oleh,</span><span>HR / Admin</span><strong>(...................................)</strong></div>
      </section>
      <p className="print-footnote">*Pencapaian dihitung dari mutu terpilih terhadap bobot masing-masing KPI.</p>
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
