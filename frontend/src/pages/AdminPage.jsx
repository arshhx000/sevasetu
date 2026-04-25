import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function AdminPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [officers, setOfficers] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [officerForm, setOfficerForm] = useState({
    name: '',
    officialEmail: '',
    employeeId: '',
    department: '',
    designation: '',
    zoneWardAssigned: '',
    phone: '',
    password: 'password123'
  });
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '' });

  const totals = useMemo(
    () => [
      { label: 'Total', value: stats.total || 0 },
      { label: 'Pending', value: stats.pending || 0 },
      { label: 'In Progress', value: stats.inProgress || 0 },
      { label: 'Resolved', value: stats.resolved || 0 }
    ],
    [stats]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, officersRes, citizensRes, perfRes, categoriesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/officers?includeInactive=true'),
        api.get('/admin/citizens'),
        api.get('/admin/officer-performance'),
        api.get('/categories/all')
      ]);

      setStats(statsRes.data.stats || {});
      setOfficers(officersRes.data.officers || []);
      setCitizens(citizensRes.data.citizens || []);
      setPerformance(perfRes.data.performance || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load admin panel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createOfficer = async () => {
    try {
      await api.post('/officers', officerForm);
      toast.success('Officer account created');
      setOfficerForm({
        name: '',
        officialEmail: '',
        employeeId: '',
        department: '',
        designation: '',
        zoneWardAssigned: '',
        phone: '',
        password: 'password123'
      });
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not create officer');
    }
  };

  const toggleOfficer = async (officer) => {
    try {
      await api.patch(`/officers/${officer._id}/status`, { isActive: !officer.isActive });
      toast.success(`Officer ${officer.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update officer status');
    }
  };

  const saveCategory = async () => {
    try {
      if (categoryForm.id) {
        await api.patch(`/categories/${categoryForm.id}`, {
          name: categoryForm.name,
          description: categoryForm.description
        });
        toast.success('Category updated');
      } else {
        await api.post('/categories', {
          name: categoryForm.name,
          description: categoryForm.description
        });
        toast.success('Category added');
      }
      setCategoryForm({ id: '', name: '', description: '' });
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save category');
    }
  };

  const deleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      if (categoryForm.id === id) {
        setCategoryForm({ id: '', name: '', description: '' });
      }
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not delete category');
    }
  };

  return (
    <div className="space-y-4">
      <section className="soft-card soft-card-primary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Admin Analytics</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {totals.map((item) => (
            <div key={item.label} className="soft-card-tertiary rounded-2xl border p-3">
              <p className="text-xs uppercase text-white/65">{item.label}</p>
              <p className="mt-1 font-display text-3xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="soft-card soft-card-primary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Officer Accounts</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="input" placeholder="Full name" value={officerForm.name} onChange={(e) => setOfficerForm((s) => ({ ...s, name: e.target.value }))} />
          <input className="input" placeholder="Official email (.gov.in)" value={officerForm.officialEmail} onChange={(e) => setOfficerForm((s) => ({ ...s, officialEmail: e.target.value }))} />
          <input className="input" placeholder="Employee ID" value={officerForm.employeeId} onChange={(e) => setOfficerForm((s) => ({ ...s, employeeId: e.target.value }))} />
          <input className="input" placeholder="Department" value={officerForm.department} onChange={(e) => setOfficerForm((s) => ({ ...s, department: e.target.value }))} />
          <input className="input" placeholder="Designation" value={officerForm.designation} onChange={(e) => setOfficerForm((s) => ({ ...s, designation: e.target.value }))} />
          <input className="input" placeholder="Zone / Ward" value={officerForm.zoneWardAssigned} onChange={(e) => setOfficerForm((s) => ({ ...s, zoneWardAssigned: e.target.value }))} />
          <input className="input" placeholder="Phone" value={officerForm.phone} onChange={(e) => setOfficerForm((s) => ({ ...s, phone: e.target.value }))} />
          <button className="btn-primary" onClick={createOfficer}>Add Officer</button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-white/65">
                <th className="p-2">Name</th>
                <th className="p-2">Employee ID</th>
                <th className="p-2">Email</th>
                <th className="p-2">Department</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o._id} className="border-b border-white/10">
                  <td className="p-2">{o.name}</td>
                  <td className="p-2">{o.employeeId || '-'}</td>
                  <td className="p-2">{o.email}</td>
                  <td className="p-2">{o.department || '-'}</td>
                  <td className="p-2">{o.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="p-2">
                    <button className="btn-secondary px-3 py-1 text-xs" onClick={() => toggleOfficer(o)}>
                      {o.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="soft-card soft-card-secondary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Complaint Categories</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input className="input" placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))} />
          <input className="input" placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm((s) => ({ ...s, description: e.target.value }))} />
          <button className="btn-primary" onClick={saveCategory}>{categoryForm.id ? 'Update' : 'Add'}</button>
        </div>
        <div className="mt-3 space-y-2">
          {categories.map((cat) => (
            <div key={cat._id} className="soft-card-tertiary flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div>
                <p className="font-medium text-white">{cat.name}</p>
                <p className="text-xs text-white/65">{cat.description || '-'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-1 text-xs" onClick={() => setCategoryForm({ id: cat._id, name: cat.name, description: cat.description || '' })}>
                  Edit
                </button>
                <button className="rounded-xl border border-rose-300/20 bg-rose-500/20 px-3 py-1 text-xs text-rose-100" onClick={() => deleteCategory(cat._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="soft-card soft-card-secondary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Officer Performance</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-white/65">
                <th className="p-2">Officer</th>
                <th className="p-2">Department</th>
                <th className="p-2">Total Assigned</th>
                <th className="p-2">Resolved</th>
                <th className="p-2">In Progress</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((item) => (
                <tr key={item.officer._id} className="border-b border-white/10">
                  <td className="p-2">{item.officer.name}</td>
                  <td className="p-2">{item.officer.department || '-'}</td>
                  <td className="p-2">{item.totalAssigned}</td>
                  <td className="p-2">{item.resolvedCount}</td>
                  <td className="p-2">{item.inProgressCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="soft-card soft-card-secondary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Registered Citizens</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-white/65">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Ward</th>
                <th className="p-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((c) => (
                <tr key={c._id} className="border-b border-white/10">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.phone || '-'}</td>
                  <td className="p-2">{c.ward || '-'}</td>
                  <td className="p-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading && <p className="text-xs text-white/70">Refreshing admin data...</p>}
    </div>
  );
}
