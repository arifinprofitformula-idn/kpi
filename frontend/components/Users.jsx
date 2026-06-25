import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const EMPTY_USER = {
  id: null,
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'staff',
  posisi: '',
  isActive: true,
  subjectIds: [],
};

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  staff: 'Staff',
};

function allowedSubjectRoles(role) {
  if (role === 'admin') return ['manager'];
  if (role === 'manager') return ['supervisor', 'staff'];
  if (role === 'supervisor') return ['staff'];
  return [];
}

function AccountFields({ form, users, positions, editing, onChange }) {
  const candidates = users.filter((user) => (
    user.id !== form.id
    && user.isActive
    && allowedSubjectRoles(form.role).includes(user.role)
  ));

  function changeRole(role) {
    onChange({
      ...form,
      role,
      posisi: role === 'admin' ? 'Administrator' : (form.posisi === 'Administrator' ? '' : form.posisi),
      subjectIds: [],
    });
  }

  function toggleSubject(id) {
    const selected = form.subjectIds.includes(id);
    onChange({
      ...form,
      subjectIds: selected
        ? form.subjectIds.filter((subjectId) => subjectId !== id)
        : [...form.subjectIds, id],
    });
  }

  return <div className="account-form-grid">
    <div className="form-group">
      <label className="form-label">Nama Karyawan</label>
      <input className="form-control" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
    </div>
    <div className="form-group">
      <label className="form-label">Username</label>
      <input className="form-control" value={form.username} autoComplete="off" onChange={(event) => onChange({ ...form, username: event.target.value.toLowerCase() })} />
    </div>
    <div className="form-group">
      <label className="form-label">Email</label>
      <input className="form-control" type="email" value={form.email} autoComplete="off" onChange={(event) => onChange({ ...form, email: event.target.value.toLowerCase() })} />
    </div>
    <div className="form-group">
      <label className="form-label">{editing ? 'Password Baru' : 'Password'}</label>
      <input
        className="form-control"
        type="password"
        minLength={editing && !form.password ? undefined : 10}
        maxLength="128"
        value={form.password}
        autoComplete="new-password"
        placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Minimal 10 karakter'}
        onChange={(event) => onChange({ ...form, password: event.target.value })}
      />
    </div>
    <div className="form-group">
      <label className="form-label">Role</label>
      <select className="form-select" value={form.role} onChange={(event) => changeRole(event.target.value)}>
        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="form-group">
      <label className="form-label">Posisi / Jabatan KPI</label>
      {form.role === 'admin'
        ? <input className="form-control" value="Administrator" disabled />
        : <select className="form-select" value={form.posisi} onChange={(event) => onChange({ ...form, posisi: event.target.value })}>
          <option value="">Pilih posisi</option>
          {positions.map((position) => <option key={position}>{position}</option>)}
        </select>}
    </div>
    <div className="form-group account-active-field">
      <label className="checkbox-row">
        <input type="checkbox" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} />
        <span>Akun aktif dan dapat login</span>
      </label>
    </div>
    <div className="form-group account-subject-field">
      <label className="form-label">Akun yang Boleh Dinilai</label>
      {candidates.length === 0
        ? <div className="assignment-empty">{form.role === 'staff' ? 'Staff tidak memiliki akses penilaian.' : 'Belum ada akun dengan role yang sesuai.'}</div>
        : <div className="assignment-list">{candidates.map((user) => <label className="checkbox-row" key={user.id}>
          <input type="checkbox" checked={form.subjectIds.includes(user.id)} onChange={() => toggleSubject(user.id)} />
          <span><strong>{user.nama}</strong><small>{ROLE_LABELS[user.role]} - {user.posisi}</small></span>
        </label>)}</div>}
    </div>
  </div>;
}

function AccountModal({ form, users, positions, submitting, onChange, onCancel, onSave }) {
  return <div className="modal-overlay user-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="user-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="edit-account-title">
      <div className="user-modal-heading">
        <div><h3 id="edit-account-title">Edit Akun</h3><p>Atur kredensial, role, dan jalur penilaian akun.</p></div>
        <button className="modal-close-button" type="button" onClick={onCancel} aria-label="Tutup modal">x</button>
      </div>
      <AccountFields form={form} users={users} positions={positions} editing onChange={onChange} />
      <div className="user-modal-actions">
        <button className="btn secondary" type="button" onClick={onCancel} disabled={submitting}>Batal</button>
        <button className="btn" type="button" onClick={onSave} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </div>
    </section>
  </div>;
}

export default function Users({ users, definitions, onRefresh }) {
  const [form, setForm] = useState(EMPTY_USER);
  const [editForm, setEditForm] = useState(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const positions = Object.keys(definitions);
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id');
    if (!keyword) return users;
    return users.filter((user) => [user.nama, user.username, user.email, user.posisi, user.role]
      .some((value) => String(value || '').toLocaleLowerCase('id').includes(keyword)));
  }, [search, users]);

  async function save(payload, editing = false) {
    const cleanPayload = {
      ...payload,
      name: payload.name.trim(),
      username: payload.username.trim().toLowerCase(),
      email: payload.email.trim().toLowerCase(),
      posisi: payload.role === 'admin' ? 'Administrator' : payload.posisi,
      subjectIds: Array.isArray(payload.subjectIds) ? payload.subjectIds : [],
    };
    if (!cleanPayload.name || !cleanPayload.username || !cleanPayload.email || !cleanPayload.posisi) {
      alert('Nama, username, email, dan posisi wajib diisi.');
      return;
    }
    if (!editing && !cleanPayload.password) {
      alert('Password akun baru wajib diisi.');
      return;
    }
    if (cleanPayload.password && cleanPayload.password.length < 10) {
      alert('Password minimal 10 karakter.');
      return;
    }

    setSubmitting(true);
    const result = await api('saveUser', cleanPayload);
    setSubmitting(false);
    if (!result.success) return alert(result.error || 'Akun gagal disimpan.');
    if (editing) setEditForm(null);
    else setForm(EMPTY_USER);
    await onRefresh();
  }

  async function remove(user) {
    if (!confirm(`Hapus akun ${user.nama}?`)) return;
    setDeletingId(user.id);
    const result = await api('deleteUser', { id: user.id });
    setDeletingId(null);
    if (!result.success) return alert(result.error || 'Akun gagal dihapus.');
    await onRefresh();
  }

  function edit(user) {
    setEditForm({
      id: user.id,
      name: user.nama,
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role,
      posisi: user.posisi,
      isActive: user.isActive,
      subjectIds: user.subjectIds || [],
    });
  }

  return <div className="user-management">
    <section className="card user-form-card">
      <div className="user-section-heading">
        <div><h3 className="card-title">Tambah Akun</h3><p className="card-subtitle">Buat akun individual dan tentukan jalur penilaiannya.</p></div>
        <div className="user-summary"><span><small>Total Akun</small><strong>{users.length}</strong></span><span><small>Akun Aktif</small><strong>{users.filter((user) => user.isActive).length}</strong></span></div>
      </div>
      <AccountFields form={form} users={users} positions={positions} editing={false} onChange={setForm} />
      <div className="form-actions"><button className="btn user-add-button" type="button" onClick={() => save(form)} disabled={submitting}>{submitting ? 'Menambahkan...' : '+ Tambah Akun'}</button></div>
    </section>

    <section className="card user-list-card">
      <div className="user-list-heading">
        <div><h3 className="card-title">Daftar Akun</h3><p className="card-subtitle">Role dan hubungan penilaian dikelola oleh admin.</p></div>
        <div className="user-search"><input className="form-control" type="search" value={search} placeholder="Cari akun..." onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      <div className="table-wrap user-table-wrap"><table className="responsive-table user-table">
        <thead><tr><th>Akun</th><th>Role</th><th>Posisi</th><th>Menilai</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>{filteredUsers.map((user) => <tr key={user.id}>
          <td data-label="Akun"><strong className="user-name">{user.nama}</strong><small className="account-identity">@{user.username} | {user.email}</small></td>
          <td data-label="Role">{ROLE_LABELS[user.role]}</td>
          <td data-label="Posisi"><span className="user-position">{user.posisi}</span></td>
          <td data-label="Menilai">{user.subjectIds?.length || 0} akun</td>
          <td data-label="Status"><span className={`status-badge ${user.isActive ? 'status-approved' : 'status-revisi'}`}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
          <td data-label="Aksi"><div className="row-actions user-row-actions">
            <button className="user-action-button edit" type="button" onClick={() => edit(user)} disabled={submitting || deletingId === user.id}>Edit</button>
            <button className="user-action-button delete" type="button" onClick={() => remove(user)} disabled={submitting || deletingId === user.id}>{deletingId === user.id ? 'Menghapus...' : 'Hapus'}</button>
          </div></td>
        </tr>)}</tbody>
      </table>{filteredUsers.length === 0 && <div className="empty-state">Akun tidak ditemukan.</div>}</div>
    </section>

    {editForm && <AccountModal form={editForm} users={users} positions={positions} submitting={submitting} onChange={setEditForm} onCancel={() => setEditForm(null)} onSave={() => save(editForm, true)} />}
  </div>;
}
