import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api.js';
import { achievementLabel, actualDataFields, evidenceChecklist } from '../lib/kpi.js';

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
  const checklist = evidenceChecklist(kpi);
  if (checklist.length > 0) return checklist.join(', ');
  const exact = KPI_SOURCE_DATA[kpi.nama];
  if (exact) return exact;
  const matched = Object.entries(KPI_SOURCE_DATA).find(([name]) => kpi.nama.includes(name));
  if (matched) return matched[1];
  return answer?.link ? 'Link bukti penilaian' : '-';
}

function actualDataRows(kpi, answer) {
  if (Array.isArray(answer?.actualData) && answer.actualData.length > 0) {
    return answer.actualData;
  }
  return actualDataFields(kpi).map((field) => ({
    id: null,
    fieldId: field.id,
    fieldLabel: field.label,
    fieldType: field.type,
    fieldUnit: field.unit,
    value: '',
    verificationRequired: Boolean(field.verificationRequired),
    verificationStatus: field.verificationRequired ? 'pending' : 'not_required',
  }));
}

function formatActualDataValue(row) {
  const value = row.value ?? row.valueText ?? row.valueNumber ?? row.valueDate;
  const unit = row.unit ?? row.fieldUnit;
  if (value === undefined || value === null || value === '') return '-';
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function verificationStatusLabel(status) {
  if (status === 'verified') return 'Terverifikasi';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'not_required') return 'Tidak Perlu Verifikasi';
  if (status === 'missing') return 'Belum Ada';
  return 'Menunggu Verifikasi';
}

function printActualDataRows(answer) {
  return Array.isArray(answer?.actualData) ? answer.actualData : [];
}

function printEvidenceRows(kpi, answer) {
  if (Array.isArray(answer?.evidences) && answer.evidences.length > 0) {
    return answer.evidences;
  }

  return evidenceChecklist(kpi).map((label) => ({
    id: null,
    requirementId: label,
    requirementLabel: label,
    expectedFormat: '',
    evidenceUrl: '',
    verificationStatus: 'missing',
    verifierNote: '',
  }));
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

function DocumentHeader({ page, effectiveDate, totalPages = 2 }) {
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
            <tr><th>Halaman</th><td>{page} dari {totalPages}</td></tr>
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
        <td className="formal-selected-score" rowSpan={rowSpan}>{answer?.finalTier ?? answer?.tier ?? 0}</td>
        <td className="formal-quality-heading" />
        <td className="formal-achievement" rowSpan={rowSpan}>{actual}{unit}</td>
      </tr>
      {[...kpi.tiers].sort((a, b) => b.skor - a.skor).map((tier) =>
        <tr key={tier.skor}>
          <td>{tier.label}</td>
          <td className={Number(tier.skor) === Number(answer?.finalTier ?? answer?.tier) ? 'formal-quality-selected' : ''}>{tier.skor}</td>
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
        <DocumentHeader page="1" effectiveDate={effectiveDate} totalPages={3} />
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

      <section className="kpi-print-page formal-second-page formal-verification-page">
        <DocumentHeader page="3" effectiveDate={effectiveDate} totalPages={3} />
        <div className="formal-department">ACTUAL DATA &amp; EVIDENCE VERIFICATION SUMMARY</div>
        <div className="formal-verification-summary-list">
          {kpis.map((kpi) => {
            const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
            const actualRows = printActualDataRows(answer);
            const evidenceRows = printEvidenceRows(kpi, answer);
            return <section className="formal-verification-kpi" key={kpi.id}>
              <div className="formal-verification-kpi-head">
                <strong>{kpi.nama}</strong>
                <span>Actual: {answer?.actualValue ?? '-'} {kpi.unit}</span>
                <span>Calculated: {answer?.calculatedTier ?? answer?.tier ?? '-'}</span>
                <span>Final: {answer?.finalTier ?? answer?.tier ?? '-'}</span>
              </div>

              <div className="formal-verification-title">C. Input Data Aktual</div>
              {actualRows.length > 0 ? <table className="formal-verification-table formal-actual-summary">
                <thead><tr><th>Field</th><th>Value</th><th>Source</th><th>Data Date</th><th>Status</th><th>Verifier Note</th></tr></thead>
                <tbody>{actualRows.map((row) => <tr key={row.id || row.fieldId}>
                  <td>{row.fieldLabel || row.label || '-'}</td>
                  <td>{formatActualDataValue(row)}</td>
                  <td>{row.sourceDocument || '-'}</td>
                  <td>{row.dataDate || row.valueDate || '-'}</td>
                  <td>{verificationStatusLabel(row.verificationStatus)}</td>
                  <td>{row.verifierNote || '-'}</td>
                </tr>)}</tbody>
              </table> : <div className="formal-empty-summary">Tidak ada Input Data Aktual untuk KPI ini.</div>}

              <div className="formal-verification-title">D. Evidence Checklist</div>
              {evidenceRows.length > 0 ? <table className="formal-verification-table formal-evidence-summary">
                <thead><tr><th>Evidence</th><th>Expected Format</th><th>Link/File</th><th>Status</th><th>Verifier Note</th></tr></thead>
                <tbody>{evidenceRows.map((evidence) => <tr key={evidence.id || evidence.requirementId || evidence.requirementLabel}>
                  <td>{evidence.requirementLabel || '-'}</td>
                  <td>{evidence.expectedFormat || '-'}</td>
                  <td>{evidence.evidenceUrl || '-'}</td>
                  <td>{verificationStatusLabel(evidence.verificationStatus)}</td>
                  <td>{evidence.verifierNote || '-'}</td>
                </tr>)}</tbody>
              </table> : <div className="formal-empty-summary">Tidak ada evidence checklist untuk KPI ini.</div>}

              <div className="formal-verification-title">E. Final Decision</div>
              <table className="formal-verification-table formal-decision-summary">
                <tbody>
                  <tr><th>Decision Reason</th><td>{answer?.decisionReason || '-'}</td></tr>
                  <tr><th>Coaching Note</th><td>{answer?.coachingNote || '-'}</td></tr>
                </tbody>
              </table>
            </section>;
          })}
        </div>
      </section>
    </article>
  </div>, document.body);
}

function evidenceBadgeStatus(evidence) {
  if (!evidence?.isSubmitted || evidence?.verificationStatus === 'missing') return ['missing', 'Missing'];
  if (evidence.verificationStatus === 'verified') return ['verified', 'Verified'];
  if (evidence.verificationStatus === 'rejected') return ['rejected', 'Rejected'];
  return ['pending', 'Pending'];
}

function actualDataBadgeStatus(row) {
  if (!row?.verificationRequired || row?.verificationStatus === 'not_required') return ['not-required', 'Tidak Perlu Verifikasi'];
  if (row.verificationStatus === 'verified') return ['verified', 'Terverifikasi'];
  if (row.verificationStatus === 'rejected') return ['rejected', 'Ditolak'];
  return ['pending', 'Menunggu Verifikasi'];
}

function verificationSummary(submission) {
  const actualRows = submission.kpiAnswers.flatMap((answer) => answer.actualData || [])
    .filter((row) => row.verificationRequired);
  const evidenceRows = submission.kpiAnswers.flatMap((answer) => answer.evidences || [])
    .filter((row) => row.isSubmitted || row.verificationStatus !== 'missing');
  const actualVerified = actualRows.filter((row) => row.verificationStatus === 'verified').length;
  const evidenceVerified = evidenceRows.filter((row) => row.verificationStatus === 'verified').length;
  return {
    actual: `${actualVerified}/${actualRows.length} verified`,
    evidence: `${evidenceVerified}/${evidenceRows.length} verified`,
  };
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-');
}

function KpiDecisionBlock({ kpi, answer, locked, busy, onSave }) {
  const calculatedTier = answer?.calculatedTier ?? answer?.tier ?? 0;
  const initialFinalTier = answer?.finalTier ?? answer?.tier ?? 0;
  const [finalTier, setFinalTier] = useState(initialFinalTier);
  const [decisionReason, setDecisionReason] = useState(answer?.decisionReason || '');
  const [coachingNote, setCoachingNote] = useState(answer?.coachingNote || '');
  const selectedTier = kpi.tiers.find((item) => Number(item.skor) === Number(finalTier));
  const reasonRequired = Number(finalTier) !== Number(calculatedTier);

  return <div className="final-decision-panel">
    <div className="final-score-grid">
      <span><small>Calculated score</small><strong>{calculatedTier}</strong></span>
      <span><small>Final score</small><strong>{initialFinalTier}</strong></span>
      <span><small>Selected tier</small><strong>{selectedTier?.label || '-'}</strong></span>
    </div>
    {!locked && <div className="final-decision-form">
      <label>Final Score</label>
      <select value={finalTier} onChange={(event) => setFinalTier(Number(event.target.value))}>
        {[0, 1, 2].map((score) => <option value={score} key={score}>{score}</option>)}
      </select>
      <label>Decision Reason {reasonRequired ? '(wajib)' : ''}</label>
      <textarea rows="3" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} />
      <label>Coaching Note</label>
      <textarea rows="3" value={coachingNote} onChange={(event) => setCoachingNote(event.target.value)} />
      <button
        className="btn secondary small"
        type="button"
        disabled={Boolean(busy)}
        onClick={() => onSave(answer, Number(finalTier), decisionReason, coachingNote)}
      >
        Simpan Final Decision
      </button>
    </div>}
    {answer?.decisionReason && <div className="evidence-note"><strong>Decision reason:</strong> {answer.decisionReason}</div>}
    {answer?.coachingNote && <div className="evidence-note"><strong>Coaching note:</strong> {answer.coachingNote}</div>}
  </div>;
}

function SubmissionModal({ submission, role, onClose, onExport, onRefresh }) {
  const [label, cls] = achievementLabel(submission.scoreCalc.finalAchievement);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const isAdmin = role === 'admin';
  const canVerifyActualData = ['admin', 'manager', 'supervisor'].includes(role);
  const locked = submission.status === 'Approved';
  const summary = verificationSummary(submission);

  async function verifyEvidence(evidence, status) {
    setError('');
    if (!evidence.id) {
      setError('Evidence belum memiliki data review. Minta evaluator submit ulang untuk membuat item evidence.');
      return;
    }
    const note = prompt(status === 'verified' ? 'Catatan verifikasi evidence (opsional):' : 'Catatan koreksi evidence (wajib):', evidence.verifierNote || '');
    if (note === null) return;
    if (status === 'rejected' && !note.trim()) {
      setError('Catatan wajib diisi saat evidence ditolak.');
      return;
    }

    setBusy(`${status}-${evidence.id}`);
    const result = await api('verifyEvidence', { evidenceId: evidence.id, status, note });
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Verifikasi evidence gagal.');
      return;
    }
    await onRefresh();
  }

  async function verifyActualData(row, status) {
    setError('');
    if (!row.id) {
      setError('Actual data belum memiliki data review. Minta evaluator submit ulang untuk membuat item actual data.');
      return;
    }
    const note = prompt(status === 'verified' ? 'Catatan verifikasi actual data (opsional):' : 'Catatan koreksi actual data (wajib):', row.verifierNote || '');
    if (note === null) return;
    if (status === 'rejected' && !note.trim()) {
      setError('Catatan wajib diisi saat actual data ditolak.');
      return;
    }

    setBusy(`actual-${status}-${row.id}`);
    const result = await api('verifyActualData', { actualDataId: row.id, status, note });
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Verifikasi actual data gagal.');
      return;
    }
    await onRefresh();
  }

  async function saveFinalDecision(answer, finalTier, decisionReason, coachingNote) {
    setError('');
    if (!answer?.answerId) {
      setError('Data submission answer tidak valid.');
      return;
    }
    const calculatedTier = answer.calculatedTier ?? answer.tier ?? 0;
    if (Number(finalTier) !== Number(calculatedTier) && !decisionReason.trim()) {
      setError('Decision reason wajib diisi saat final score berbeda dari calculated score.');
      return;
    }
    setBusy(`decision-${answer.answerId}`);
    const result = await api('updateFinalKpiDecision', {
      submissionAnswerId: answer.answerId,
      finalTier,
      decisionReason,
      coachingNote,
    });
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Final decision gagal disimpan.');
      return;
    }
    await onRefresh();
  }

  async function approveWithEvidence() {
    setError('');
    setBusy('approve');
    const result = await api('approveSubmissionWithEvidence', { id: Number(submission.id) });
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Approval gagal.');
      return;
    }
    await onRefresh();
    onClose();
  }

  async function requestEvidenceRevision() {
    setError('');
    const note = prompt('Catatan revisi evidence yang harus diperbaiki:');
    if (note === null) return;
    if (!note.trim()) {
      setError('Catatan revisi wajib diisi.');
      return;
    }
    setBusy('revision');
    const result = await api('requestRevisi', { id: Number(submission.id), note });
    setBusy('');
    if (!result.success) {
      setError(result.error || 'Permintaan revisi gagal.');
      return;
    }
    await onRefresh();
    onClose();
  }

  return <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal"><button className="close-button" onClick={onClose} aria-label="Tutup">x</button>
      <h3>{submission.nama} - {submission.posisi}</h3>
      <p className="card-subtitle">{submission.periode} | {submission.tanggal} | {submission.status}</p>
      <p className="card-subtitle">Dinilai oleh: {submission.evaluatorName || 'Data lama'}</p>
      {error && <div className="note-box note-error">{error}</div>}
      {submission.catatan && <div className="note-box">{submission.catatan}</div>}
      {(submission.definition?.kpis || []).map((kpi) => {
        const answer = submission.kpiAnswers.find((item) => item.id === kpi.id);
        const tier = kpi.tiers.find((item) => item.skor === answer?.tier);
        const requiredEvidence = evidenceChecklist(kpi);
        const rows = actualDataRows(kpi, answer);
        return <div className="kpi-block" key={kpi.id}>
          <div className="kpi-head"><strong>{kpi.nama}</strong><span className="kpi-bobot">{kpi.bobot}%</span></div>
          <div>Nilai aktual: <strong>{answer?.actualValue ?? '-'}</strong> {kpi.unit}</div>
          {rows.length > 0 && <div className="actual-data-review">
            <strong>C. Input Data Aktual</strong>
            <div className="actual-data-review-list">
              {rows.map((row) => {
                const [statusClassName, statusLabel] = actualDataBadgeStatus(row);
                return <div className="actual-data-review-item" key={row.id || row.fieldId}>
                  <div className="actual-data-review-main">
                    <div className="evidence-review-heading">
                      <strong>{row.fieldLabel || row.label}</strong>
                      <span className={`evidence-status evidence-status-${statusClassName}`}>{statusLabel}</span>
                    </div>
                    <div className="actual-data-review-value">{formatActualDataValue(row)}</div>
                    {row.sourceDocument && <div className="evidence-note"><strong>Source:</strong> {String(row.sourceDocument).startsWith('http') ? <a href={row.sourceDocument} target="_blank" rel="noreferrer">{row.sourceDocument}</a> : row.sourceDocument}</div>}
                    {row.dataDate && <div className="evidence-note"><strong>Data date:</strong> {row.dataDate}</div>}
                    {row.submittedNote && <div className="evidence-note"><strong>Catatan submit:</strong> {row.submittedNote}</div>}
                    {row.verifierNote && <div className="evidence-note"><strong>Catatan reviewer:</strong> {row.verifierNote}</div>}
                  </div>
                  <div className="evidence-actions">
                    {!locked && canVerifyActualData && row.verificationRequired && <button className="btn secondary small" type="button" disabled={Boolean(busy) || !row.id} onClick={() => verifyActualData(row, 'verified')}>Verify</button>}
                    {!locked && canVerifyActualData && row.verificationRequired && <button className="btn danger-outline small" type="button" disabled={Boolean(busy) || !row.id} onClick={() => verifyActualData(row, 'rejected')}>Reject</button>}
                  </div>
                </div>;
              })}
            </div>
          </div>}
          <div>Skor: <strong>{answer?.tier ?? 0}</strong> {tier && `- ${tier.label}`}</div>
          {answer?.link && <a href={answer.link} target="_blank" rel="noreferrer">Buka bukti</a>}
          {requiredEvidence.length > 0 && <div className="evidence-review">
            <strong>Checklist bukti:</strong>
            <ul>
              {requiredEvidence.map((item) => <li key={item} className={(answer?.checklist || []).includes(item) ? 'checked' : ''}>{item}</li>)}
            </ul>
          </div>}
          {(answer?.evidences || []).length > 0 && <div className="evidence-review-list">
            {(answer.evidences || []).map((evidence) => {
              const [statusClass, statusLabel] = evidenceBadgeStatus(evidence);
              return <div className="evidence-review-item" key={evidence.id || evidence.requirementId}>
                <div>
                  <div className="evidence-review-heading">
                    <strong>{evidence.requirementLabel}</strong>
                    <span className={`evidence-status evidence-status-${statusClass}`}>{statusLabel}</span>
                  </div>
                  {evidence.evidenceUrl && <a href={evidence.evidenceUrl} target="_blank" rel="noreferrer">Buka evidence</a>}
                  {evidence.submittedNote && <div className="evidence-note"><strong>Catatan submit:</strong> {evidence.submittedNote}</div>}
                  {evidence.verifierNote && <div className="evidence-note"><strong>Catatan reviewer:</strong> {evidence.verifierNote}</div>}
                </div>
                <div className="evidence-actions">
                  {!locked && canVerifyActualData && <button className="btn secondary small" type="button" disabled={Boolean(busy) || !evidence.id} onClick={() => verifyEvidence(evidence, 'verified')}>Verify</button>}
                  {!locked && canVerifyActualData && <button className="btn danger-outline small" type="button" disabled={Boolean(busy) || !evidence.id} onClick={() => verifyEvidence(evidence, 'rejected')}>Reject / Request Correction</button>}
                </div>
              </div>;
            })}
          </div>}
          {answer?.notes && <div className="evidence-note"><strong>Catatan bukti:</strong> {answer.notes}</div>}
          <KpiDecisionBlock
            key={`${answer?.answerId || kpi.id}-${answer?.finalTier ?? answer?.tier ?? 0}-${answer?.decisionReason || ''}-${answer?.coachingNote || ''}`}
            kpi={kpi}
            answer={answer}
            locked={locked}
            busy={busy}
            onSave={saveFinalDecision}
          />
        </div>;
      })}
      <div className="summary-row"><div className="summary-box"><div className="val">{submission.scoreCalc.scoreKPI}</div><div className="lab">Score KPI</div></div><div className="summary-box"><div className={`val ${cls}`}>{submission.scoreCalc.finalAchievement}%</div><div className="lab">{label}</div></div></div>
      <div className="verification-summary">
        <span>Actual Data: <strong>{summary.actual}</strong></span>
        <span>Evidence: <strong>{summary.evidence}</strong></span>
      </div>
      <div className="actions">
        <button className="btn secondary" type="button" onClick={onExport}>Export PDF</button>
        {isAdmin && !locked && <button className="btn secondary" type="button" disabled={Boolean(busy)} onClick={requestEvidenceRevision}>Minta Revisi Evidence</button>}
        {isAdmin && !locked && <button className="btn" type="button" disabled={Boolean(busy)} onClick={approveWithEvidence}>{busy === 'approve' ? 'Memproses...' : 'Approve Setelah Evidence Verified'}</button>}
      </div>
    </div>
  </div>;
}

export default function Approval({ submissions, role, onRefresh }) {
  const [filter, setFilter] = useState('Semua');
  const [selectedId, setSelectedId] = useState(null);
  const [printSubmission, setPrintSubmission] = useState(null);
  const periods = ['Semua', ...new Set(submissions.map((item) => item.periode))];
  const filtered = filter === 'Semua' ? submissions : submissions.filter((item) => item.periode === filter);
  const selected = submissions.find((item) => item.id === selectedId) || null;

  return <>
    <div className="card filter-row"><label>Filter Periode</label><select value={filter} onChange={(event) => setFilter(event.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="summary-row">
      <div className="summary-box"><div className="val">{filtered.length}</div><div className="lab">Total Submission</div></div>
      <div className="summary-box"><div className="val">{filtered.filter((item) => item.status === 'Pending').length}</div><div className="lab">Menunggu Approval</div></div>
      <div className="summary-box"><div className="val">{filtered.filter((item) => item.status === 'Approved').length}</div><div className="lab">Approved</div></div>
      <div className="summary-box"><div className="val">{filtered.filter((item) => ['Submitted', 'Revisi'].includes(item.status)).length}</div><div className="lab">Butuh Review Evidence</div></div>
    </div>
    <div className="card table-wrap"><table><thead><tr><th>Nama</th><th>Posisi</th><th>Periode</th><th>Status</th><th>Score</th><th>Achievement</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)}>
        <td>{item.nama}</td><td>{item.posisi}</td><td>{item.periode}</td><td><span className={`status-badge status-${statusClass(item.status)}`}>{item.status}</span></td><td>{item.scoreCalc.scoreKPI}</td><td>{item.scoreCalc.finalAchievement}%</td>
      </tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">Belum ada submission.</div>}</div>
    {selected && <SubmissionModal submission={selected} role={role} onClose={() => setSelectedId(null)} onRefresh={onRefresh} onExport={() => setPrintSubmission(selected)} />}
    {printSubmission && <KpiPrintReport submission={printSubmission} onClose={() => setPrintSubmission(null)} />}
  </>;
}
