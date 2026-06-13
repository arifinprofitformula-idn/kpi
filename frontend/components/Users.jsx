import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const EMPTY_USER = { id: null, name: '', posisi: '', pin: '' };

function UserFields({ form, positions, onChange, editing = false, showPin, onTogglePin }) {
  return <>
    <div className="form-group">
      <label className="form-label">Nama Karyawan</label>
      <input
        className="form-control user-form-control"
        value={form.name}
        placeholder="Masukkan nama lengkap"
        onChange={(event) => onChange({ ...form, name: event.target.value })}
      />
    </div>
    <div className="form-group">
      <label className="form-label">Posisi / Jabatan</label>
      <select
        className="form-select user-form-control"
        value={form.posisi}
        onChange={(event) => onChange({ ...form, posisi: event.target.value })}
      >
        <option value="">Pilih posisi</option>
        {positions.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
    <div className="form-group">
      <label className="form-label">{editing ? 'PIN Baru' : 'PIN Akses'}</label>
      <div className="pin-input-wrap">
        <input
          className="form-control user-form-control"
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          autoComplete="new-password"
          minLength={editing && form.pin === '' ? undefined : 8}
          maxLength="64"
          value={form.pin}
          placeholder={editing ? 'Kosongkan jika tidak diubah' : 'Masukkan PIN akses'}
          onChange={(event) => onChange({ ...form, pin: event.target.value })}
        />
        <button className="pin-toggle" type="button" onClick={onTogglePin} aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}>
          {showPin ? 'Sembunyikan' : 'Lihat'}
        </button>
      </div>
      <span className="form-helper">{editing ? 'Kosongkan agar PIN lama tetap berlaku. PIN baru minimal 8 karakter.' : 'Gunakan PIN unik minimal 8 karakter untuk setiap user.'}</span>
    </div>
  </>;
}

function EditUserModal({ form, positions, submitting, onChange, onCancel, onSave }) {
  const [showPin, setShowPin] = useState(false);

  return <div className="modal-overlay user-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
      <div className="user-modal-heading">
        <div>
          <h3 id="edit-user-title">Edit User</h3>
          <p>Perbarui identitas, jabatan, atau PIN akses karyawan.</p>
        </div>
        <button className="modal-close-button" type="button" onClick={onCancel} aria-label="Tutup modal">×</button>
      </div>
      <div className="user-modal-fields">
        <UserFields
          form={form}
          positions={positions}
          editing
          showPin={showPin}
          onTogglePin={() => setShowPin((current) => !current)}
          onChange={onChange}
        />
      </div>
      <div className="user-modal-actions">
        <button className="btn secondary" type="button" onClick={onCancel} disabled={submitting}>Batal</button>
        <button className="btn" type="button" onClick={onSave} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </div>
    </section>
  </div>;
}

function DeleteUserModal({ user, deleting, onCancel, onConfirm }) {
  return <div className="modal-overlay user-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="confirm-modal user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
      <div className="confirm-icon" aria-hidden="true">!</div>
      <h3 id="delete-user-title">Hapus User?</h3>
      <p><strong>{user.name}</strong> akan dihapus dari daftar akses dashboard. Tindakan ini tidak dapat dibatalkan.</p>
      <div className="confirm-actions">
        <button className="btn secondary" type="button" onClick={onCancel} disabled={deleting}>Batal</button>
        <button className="btn danger" type="button" onClick={onConfirm} disabled={deleting}>{deleting ? 'Menghapus...' : 'Ya, Hapus User'}</button>
      </div>
    </section>
  </div>;
}

export default function Users({ users, definitions, onRefresh }) {
  const [form, setForm] = useState(EMPTY_USER);
  const [editForm, setEditForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const positions = Object.keys(definitions);
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id');
    if (!keyword) return users;
    return users.filter((user) => (
      user.name.toLocaleLowerCase('id').includes(keyword)
      || user.posisi.toLocaleLowerCase('id').includes(keyword)
    ));
  }, [search, users]);

  async function save(payload, isEdit = false) {
    setSubmitting(true);
    const result = await api('saveUser', payload);
    setSubmitting(false);
    if (!result.success) return alert(result.error);
    if (isEdit) setEditForm(null);
    else {
      setForm(EMPTY_USER);
      setShowPin(false);
    }
    onRefresh();
  }

  async function remove() {
    setDeleting(true);
    const result = await api('deleteUser', { id: deleteTarget.id });
    setDeleting(false);
    if (!result.success) return alert(result.error);
    setDeleteTarget(null);
    onRefresh();
  }

  return <div className="user-management">
    <section className="card user-form-card">
      <div className="user-section-heading">
        <div>
          <h3 className="card-title">Tambah User</h3>
          <p className="card-subtitle">Kelola identitas, jabatan, dan PIN akses karyawan.</p>
        </div>
        <div className="user-summary" aria-label="Ringkasan user">
          <span><small>Total User</small><strong>{users.length}</strong></span>
          <span><small>Posisi Aktif</small><strong>{positions.length}</strong></span>
        </div>
      </div>
      <div className="user-form-grid">
        <UserFields
          form={form}
          positions={positions}
          showPin={showPin}
          onTogglePin={() => setShowPin((current) => !current)}
          onChange={setForm}
        />
        <div className="form-actions user-form-actions">
          <button className="btn user-add-button" type="button" onClick={() => save(form)} disabled={submitting}>
            {submitting ? 'Menambahkan...' : '+ Tambah User'}
          </button>
        </div>
      </div>
    </section>

    <section className="card user-list-card">
      <div className="user-list-heading">
        <div>
          <h3 className="card-title">Daftar User</h3>
          <p className="card-subtitle">{users.length} user terdaftar</p>
        </div>
        <div className="user-search">
          <label className="form-label" htmlFor="user-search">Cari User</label>
          <input
            id="user-search"
            className="form-control user-form-control"
            type="search"
            value={search}
            placeholder="Cari nama atau posisi..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      {users.length === 0
        ? <div className="empty-state user-empty-state">Belum ada user terdaftar.</div>
        : filteredUsers.length === 0
          ? <div className="empty-state user-empty-state">User yang dicari tidak ditemukan.</div>
          : <div className="table-wrap user-table-wrap">
            <table className="responsive-table user-table">
              <thead><tr><th>Nama</th><th>Posisi</th><th>Aksi</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => <tr key={user.id}>
                  <td data-label="Nama"><strong className="user-name">{user.name}</strong></td>
                  <td data-label="Posisi"><span className="user-position">{user.posisi}</span></td>
                  <td data-label="Aksi"><div className="row-actions user-row-actions">
                    <button className="user-action-button edit" type="button" onClick={() => setEditForm({ id: user.id, name: user.name, posisi: user.posisi, pin: '' })}>Edit</button>
                    <button className="user-action-button delete" type="button" onClick={() => setDeleteTarget(user)}>Hapus</button>
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>}
    </section>

    {editForm && <EditUserModal
      form={editForm}
      positions={positions}
      submitting={submitting}
      onChange={setEditForm}
      onCancel={() => setEditForm(null)}
      onSave={() => save(editForm, true)}
    />}
    {deleteTarget && <DeleteUserModal
      user={deleteTarget}
      deleting={deleting}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={remove}
    />}
  </div>;
}
