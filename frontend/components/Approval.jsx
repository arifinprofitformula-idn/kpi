import { useState } from 'react';
import { achievementLabel } from '../lib/kpi.js';

function SubmissionModal({ submission, onClose }) {
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
    </div>
  </div>;
}

export default function Approval({ submissions }) {
  const [filter, setFilter] = useState('Semua');
  const [selected, setSelected] = useState(null);
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
    {selected && <SubmissionModal submission={selected} onClose={() => setSelected(null)} />}
  </>;
}
