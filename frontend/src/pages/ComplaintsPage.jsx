import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../App';
import api from '../services/api';

const statusClass = {
  Open: 'border border-sky-300/20 bg-sky-500/20 text-sky-100',
  Pending: 'border border-amber-300/20 bg-amber-500/20 text-amber-100',
  'In Progress': 'border border-violet-300/20 bg-violet-500/20 text-violet-100',
  Resolved: 'border border-emerald-300/20 bg-emerald-500/20 text-emerald-100',
  Escalated: 'border border-rose-300/20 bg-rose-500/20 text-rose-100'
};

const statusOptions = ['Open', 'In Progress', 'Pending', 'Resolved', 'Escalated'];

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

function fallbackExpectedDate(complaint) {
  if (!complaint?.createdAt) return null;
  const d = new Date(complaint.createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const dayOffsetByPriority = { Low: 10, Medium: 7, High: 4, Critical: 2 };
  const offset = dayOffsetByPriority[complaint.priority] || dayOffsetByPriority.Medium;
  d.setDate(d.getDate() + offset);
  return d;
}

export default function ComplaintsPage() {
  const { user } = useContext(AuthContext);
  const [filter, setFilter] = useState({ q: '', status: 'All', category: 'All', priority: 'All', fromDate: '', toDate: '' });
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [nextStatus, setNextStatus] = useState('Open');
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = ['admin', 'officer'].includes(user?.role);

  const loadComplaints = async () => {
    try {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(filter).filter(([, value]) => String(value || '').trim() !== ''))
      ).toString();
      const { data } = await api.get(`/complaints?${query}`);
      setComplaints(data.complaints || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load complaints');
    }
  };

  const loadSupportData = async () => {
    try {
      const requests = [api.get('/categories')];
      if (['admin', 'officer'].includes(user?.role)) {
        requests.push(api.get('/officers'));
      }
      const responses = await Promise.all(requests);
      const categoriesRes = responses[0];
      const officersRes = responses[1];
      setCategories(categoriesRes.data.categories || []);
      setOfficers(officersRes?.data?.officers || []);
    } catch {
      setOfficers([]);
      setCategories([]);
    }
  };

  const removeComplaint = async (id) => {
    if (!canManage) {
      toast.error('You are not allowed to delete complaints');
      return;
    }

    try {
      await api.delete(`/complaints/${id}`);
      toast.success('Complaint deleted');
      if (editingId === id) {
        setEditingId('');
      }
      loadComplaints();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Delete failed');
    }
  };

  const startManage = (item) => {
    setEditingId(item._id);
    setNextStatus(item.status || 'Open');
    setAssignedOfficer(item.assignedTo?._id || '');
    setNote('');
  };

  const cancelManage = () => {
    setEditingId('');
    setAssignedOfficer('');
    setNote('');
  };

  const updateComplaint = async (id, forcePending = false) => {
    if (!canManage) {
      toast.error('You are not allowed to update complaints');
      return;
    }

    const finalStatus = forcePending ? 'Pending' : nextStatus;
    const finalNote = note.trim() || (forcePending ? 'Officer requested more details from complainant.' : `Status updated to ${finalStatus}.`);

    setSaving(true);
    try {
      const payload = { status: finalStatus, note: finalNote };
      if (user?.role === 'admin') {
        payload.assignedTo = assignedOfficer || null;
      }
      await api.patch(`/complaints/${id}`, payload);
      toast.success(forcePending ? 'Details request sent' : 'Complaint progress updated');
      setEditingId('');
      setAssignedOfficer('');
      setNote('');
      loadComplaints();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSupportData();
    loadComplaints();
  }, []);

  return (
    <section className="soft-card soft-card-primary p-4">
      <h2 className="font-display text-lg font-semibold text-white">Complaints</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <input className="input" placeholder="Search" value={filter.q} onChange={(e) => setFilter((s) => ({ ...s, q: e.target.value }))} />
        <select className="input" value={filter.status} onChange={(e) => setFilter((s) => ({ ...s, status: e.target.value }))}><option>All</option><option>Open</option><option>In Progress</option><option>Pending</option><option>Resolved</option><option>Escalated</option></select>
        <select className="input" value={filter.category} onChange={(e) => setFilter((s) => ({ ...s, category: e.target.value }))}>
          <option>All</option>
          {categories.map((cat) => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
        </select>
        <button onClick={loadComplaints} className="btn-primary">Apply</button>
        <input className="input" type="date" value={filter.fromDate} onChange={(e) => setFilter((s) => ({ ...s, fromDate: e.target.value }))} />
        <input className="input" type="date" value={filter.toDate} onChange={(e) => setFilter((s) => ({ ...s, toDate: e.target.value }))} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-white/65">
              <th className="p-2">ID</th>
              <th className="p-2">Title</th>
              <th className="p-2">Images</th>
              <th className="p-2">Category</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Status</th>
              <th className="p-2">Complaint Date</th>
              <th className="p-2">Resolved Date</th>
              <th className="p-2">Ward</th>
              <th className="p-2">Assigned Officer</th>
              {canManage && <th className="p-2">Filed By</th>}
              {canManage && <th className="p-2">Contact</th>}
              {canManage && <th className="p-2">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <React.Fragment key={c._id}>
                <tr className="border-b border-black/5">
                  <td className="p-2 font-mono text-xs">{c.trackingId}</td>
                  <td className="p-2">
                    <p className="font-medium text-white">{c.title}</p>
                    <p className="text-xs text-white/65">{c.location}</p>
                  </td>
                  <td className="p-2">
                    {(c.images || []).length > 0 ? (
                      <div className="flex items-center gap-2">
                        <img src={c.images[0]} alt="complaint" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
                        <span className="text-xs text-white/65">{(c.images || []).length} image(s)</span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/65">No image</span>
                    )}
                  </td>
                  <td className="p-2">{c.category}</td>
                  <td className="p-2">{c.priority}</td>
                  <td className="p-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass[c.status] || 'border border-white/20 bg-white/15 text-white/80'}`}>{c.status}</span></td>
                  <td className="p-2 text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-2 text-xs">
                    {c.status === 'Resolved'
                      ? formatDate(c.resolvedAt)
                      : `Expected: ${formatDate(c.expectedResolutionDate || fallbackExpectedDate(c))}`}
                  </td>
                  <td className="p-2">{c.ward}</td>
                  <td className="p-2 text-xs">{c.assignedTo?.name ? `${c.assignedTo.name} (${c.assignedTo.role || 'officer'})` : 'Unassigned'}</td>
                  {canManage && (
                    <td className="p-2">
                      <p className="font-medium">{c.submittedBy?.name || '-'}</p>
                      <p className="text-xs text-white/65">{c.submittedBy?.email || '-'}</p>
                    </td>
                  )}
                  {canManage && (
                    <td className="p-2">
                      <p className="text-xs">Phone: {c.contactPhone || '-'}</p>
                      <p className="text-xs">Email: {c.contactEmail || '-'}</p>
                    </td>
                  )}
                  {canManage && (
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => startManage(c)} className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/90">Update</button>
                        <button onClick={() => removeComplaint(c._id)} className="rounded-xl border border-rose-300/20 bg-rose-500/20 px-3 py-1 text-xs text-rose-100">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
                {canManage && editingId === c._id && (
                  <tr className="soft-card-tertiary border-b border-white/10">
                    <td className="p-3" colSpan={13}>
                      <div className={`grid gap-2 ${user?.role === 'admin' ? 'md:grid-cols-[220px_180px_1fr_auto_auto]' : 'md:grid-cols-[180px_1fr_auto_auto]'}`}>
                        {user?.role === 'admin' && (
                          <select className="input" value={assignedOfficer} onChange={(e) => setAssignedOfficer(e.target.value)}>
                            <option value="">Unassigned</option>
                            {officers.map((officer) => (
                              <option key={officer._id} value={officer._id}>
                                {officer.name} ({officer.department || 'Officer'})
                              </option>
                            ))}
                          </select>
                        )}
                        <select className="input" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add progress note or ask for more details..." />
                        <button disabled={saving} onClick={() => updateComplaint(c._id, false)} className="btn-primary">Save</button>
                        <button disabled={saving} onClick={() => updateComplaint(c._id, true)} className="btn-secondary">Request Details</button>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={cancelManage} className="text-xs text-white/65 underline">Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
