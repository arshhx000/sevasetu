import { useEffect, useMemo, useState } from 'react';

const tokenKey = 'civic_alert_token';
const userKey = 'civic_alert_user';

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'submit', label: 'Submit' },
  { id: 'track', label: 'Track' }
];

const statusClass = {
  Open: 'bg-sky-100 text-sky-700',
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-violet-100 text-violet-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Escalated: 'bg-rose-100 text-rose-700'
};

function App() {
  const [token, setToken] = useState(localStorage.getItem(tokenKey) || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(userKey) || 'null');
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, criticalEscalated: 0, resolved: 0 });
  const [recent, setRecent] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [trackData, setTrackData] = useState(null);

  const [authForm, setAuthForm] = useState({
    mode: 'login',
    role: 'citizen',
    email: 'citizen@civic.gov',
    password: 'password123'
  });

  const [filter, setFilter] = useState({ q: '', status: 'All', category: 'All', priority: 'All' });
  const [submitForm, setSubmitForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium',
    ward: '',
    location: '',
    contactPhone: '',
    contactEmail: ''
  });
  const [trackId, setTrackId] = useState('');

  const firstName = useMemo(() => (user?.name || 'Citizen').split(' ')[0], [user]);

  function notify(text) {
    setMessage(text);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(''), 2600);
  }

  async function api(path, options = {}) {
    const { method = 'GET', body, auth = true } = options;
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function loadDashboard() {
    if (!token) return;
    const data = await api('/dashboard/stats');
    setStats(data.stats || stats);
    setRecent(data.recent || []);
  }

  async function loadComplaints() {
    if (!token) return;
    const q = new URLSearchParams(filter).toString();
    const data = await api(`/complaints?${q}`);
    setComplaints(data.complaints || []);
  }

  async function hydrateSession() {
    if (!token) return;
    try {
      const me = await api('/auth/me');
      setUser(me.user);
      await Promise.all([loadDashboard(), loadComplaints()]);
    } catch {
      logout();
    }
  }

  useEffect(() => {
    hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAuth() {
    setLoading(true);
    try {
      if (!authForm.email || !authForm.password) throw new Error('Please enter email and password.');

      let payload;
      if (authForm.mode === 'register') {
        const name = authForm.email
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        payload = await api('/auth/register', {
          method: 'POST',
          auth: false,
          body: { name, email: authForm.email, password: authForm.password, role: authForm.role }
        });
      } else {
        payload = await api('/auth/login', {
          method: 'POST',
          auth: false,
          body: { email: authForm.email, password: authForm.password, role: authForm.role }
        });
      }

      setToken(payload.token);
      setUser(payload.user);
      localStorage.setItem(tokenKey, payload.token);
      localStorage.setItem(userKey, JSON.stringify(payload.user));
      await Promise.all([loadDashboard(), loadComplaints()]);
      notify(authForm.mode === 'login' ? 'Signed in.' : 'Account created.');
    } catch (err) {
      notify(err.message.includes('Failed to fetch') ? 'Backend is not reachable. Run server first.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken('');
    setUser(null);
    setComplaints([]);
    setRecent([]);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }

  async function createComplaint() {
    setLoading(true);
    try {
      if (!submitForm.title || !submitForm.description || !submitForm.category || !submitForm.ward || !submitForm.location) {
        throw new Error('Fill all required fields.');
      }

      const data = await api('/complaints', { method: 'POST', body: submitForm });
      notify(`Created ${data.complaint.trackingId}`);
      setTrackId(data.complaint.trackingId);
      setActivePage('track');
      setSubmitForm({
        title: '', description: '', category: '', priority: 'Medium', ward: '', location: '', contactPhone: '', contactEmail: ''
      });
      await Promise.all([loadDashboard(), loadComplaints()]);
      await trackComplaint(data.complaint.trackingId);
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function trackComplaint(id = trackId) {
    setLoading(true);
    try {
      const cleanId = (id || '').trim();
      if (!cleanId) throw new Error('Enter a tracking ID.');
      const data = await api(`/complaints/track/${encodeURIComponent(cleanId)}`, { auth: false });
      setTrackData(data.complaint);
      notify('Tracking loaded.');
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token || !user) {
    return (
      <div
        className="min-h-screen p-5 md:p-8"
        style={{
          backgroundImage: "url('/bgimagelogin.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="mx-auto max-w-4xl rounded-xl2 border border-black/10 bg-gradient-to-br from-white to-[#f0eeea] p-6 shadow-mac md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3"><img src="/sevasetu-logo.png" alt="Sevasetu logo" className="h-20 w-auto rounded-2xl" /><h1 className="font-display text-3xl font-bold tracking-tight">Sevasetu</h1></div>
              <p className="mt-1 text-sm text-te-soft">municipal operating console.</p>
            </div>
</div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="soft-card p-5">
              <p className="font-mono text-xs uppercase text-te-soft">Role</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {['citizen', 'officer', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAuthForm((s) => ({ ...s, role: r }))}
                    className={`rounded-2xl border px-3 py-2 text-sm capitalize transition ${authForm.role === r ? 'border-black bg-te-ink text-white' : 'border-black/15 bg-white'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <input className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} />
                <input type="password" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} />
              </div>

              <button onClick={submitAuth} disabled={loading} className="mt-4 w-full rounded-2xl bg-te-accent px-4 py-3 font-semibold text-white transition hover:brightness-95 disabled:opacity-70">
                {loading ? 'Please wait...' : authForm.mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <button onClick={() => setAuthForm((s) => ({ ...s, mode: s.mode === 'login' ? 'register' : 'login' }))} className="mt-3 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm">
                Switch to {authForm.mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </div>

            <div className="soft-card p-5">
              <p className="font-display text-lg font-semibold">Demo credentials</p>
              <div className="mt-4 space-y-2 font-mono text-xs text-te-soft">
                <p>citizen@civic.gov / password123</p>
                <p>officer@civic.gov / password123</p>
                <p>admin@civic.gov / password123</p>
              </div>
              <p className="mt-6 text-sm text-te-soft">Use this screen over <span className="font-mono">http://localhost:5173</span> (React dev server with API proxy).</p>
            </div>
          </div>
        </div>

        {message && <Toast text={message} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-te-bg p-4 md:p-6">
      <div className="mx-auto max-w-7xl rounded-xl2 border border-black/10 bg-gradient-to-br from-white to-[#f4f3ef] shadow-mac">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
          <div className="flex items-center gap-4">
<div>
              <div className="flex items-center gap-3"><img src="/sevasetu-logo.png" alt="Sevasetu logo" className="h-8 w-auto rounded-lg" /><h1 className="font-display text-xl font-bold">Sevasetu</h1></div>
              <p className="text-xs text-te-soft">Hi {firstName}, {user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm">Logout</button>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr] md:p-6">
          <aside className="soft-card p-3">
            {pages.map((p) => (
              <button key={p.id} onClick={() => setActivePage(p.id)} className={`mb-2 w-full rounded-2xl px-3 py-2 text-left text-sm ${activePage === p.id ? 'bg-te-ink text-white' : 'bg-white border border-black/10'}`}>
                {p.label}
              </button>
            ))}
          </aside>

          <main className="space-y-4">
            {activePage === 'dashboard' && (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label="Total" value={stats.total} />
                  <MetricCard label="Pending" value={stats.pending} />
                  <MetricCard label="Critical" value={stats.criticalEscalated} />
                  <MetricCard label="Resolved" value={stats.resolved} />
                </div>
                <section className="soft-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">Recent complaints</h2>
                    <button onClick={() => { setActivePage('complaints'); loadComplaints(); }} className="rounded-xl border border-black/10 px-3 py-1 text-xs">View all</button>
                  </div>
                  <div className="space-y-2">
                    {recent.length === 0 && <p className="text-sm text-te-soft">No data yet.</p>}
                    {recent.map((c) => (
                      <div key={c._id} className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{c.title}</p>
                          <span className={`rounded-full px-2 py-1 text-xs ${statusClass[c.status] || 'bg-zinc-100'}`}>{c.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-te-soft">{c.trackingId} | {c.ward} | {new Date(c.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activePage === 'complaints' && (
              <section className="soft-card p-4">
                <h2 className="font-display text-lg font-semibold">Complaints</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Search" value={filter.q} onChange={(e) => setFilter((s) => ({ ...s, q: e.target.value }))} />
                  <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={filter.status} onChange={(e) => setFilter((s) => ({ ...s, status: e.target.value }))}><option>All</option><option>Open</option><option>In Progress</option><option>Pending</option><option>Resolved</option><option>Escalated</option></select>
                  <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={filter.category} onChange={(e) => setFilter((s) => ({ ...s, category: e.target.value }))}><option>All</option><option>Road</option><option>Water</option><option>Electrical</option><option>Waste</option><option>Drainage</option></select>
                  <button onClick={loadComplaints} className="rounded-xl bg-te-accent px-3 py-2 text-sm font-semibold text-white">Apply</button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead><tr className="border-b border-black/10 text-xs uppercase text-te-soft"><th className="p-2">ID</th><th className="p-2">Title</th><th className="p-2">Category</th><th className="p-2">Priority</th><th className="p-2">Status</th><th className="p-2">Ward</th></tr></thead>
                    <tbody>
                      {complaints.map((c) => (
                        <tr key={c._id} className="border-b border-black/5">
                          <td className="p-2 font-mono text-xs">{c.trackingId}</td>
                          <td className="p-2">{c.title}</td>
                          <td className="p-2">{c.category}</td>
                          <td className="p-2">{c.priority}</td>
                          <td className="p-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass[c.status] || 'bg-zinc-100'}`}>{c.status}</span></td>
                          <td className="p-2">{c.ward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activePage === 'submit' && (
              <section className="soft-card p-4">
                <h2 className="font-display text-lg font-semibold">Submit complaint</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Title *" value={submitForm.title} onChange={(e) => setSubmitForm((s) => ({ ...s, title: e.target.value }))} />
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Category *" value={submitForm.category} onChange={(e) => setSubmitForm((s) => ({ ...s, category: e.target.value }))} />
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Ward *" value={submitForm.ward} onChange={(e) => setSubmitForm((s) => ({ ...s, ward: e.target.value }))} />
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Location *" value={submitForm.location} onChange={(e) => setSubmitForm((s) => ({ ...s, location: e.target.value }))} />
                  <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={submitForm.priority} onChange={(e) => setSubmitForm((s) => ({ ...s, priority: e.target.value }))}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
                  <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Contact Phone" value={submitForm.contactPhone} onChange={(e) => setSubmitForm((s) => ({ ...s, contactPhone: e.target.value }))} />
                  <input className="md:col-span-2 rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Contact Email" value={submitForm.contactEmail} onChange={(e) => setSubmitForm((s) => ({ ...s, contactEmail: e.target.value }))} />
                  <textarea className="md:col-span-2 rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="Description *" rows={4} value={submitForm.description} onChange={(e) => setSubmitForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                <button onClick={createComplaint} className="mt-3 rounded-xl bg-te-accent px-4 py-2 text-sm font-semibold text-white">Submit</button>
              </section>
            )}

            {activePage === 'track' && (
              <section className="soft-card p-4">
                <h2 className="font-display text-lg font-semibold">Track complaint</h2>
                <div className="mt-3 flex flex-col gap-2 md:flex-row">
                  <input className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm" placeholder="CMP-2026-1234" value={trackId} onChange={(e) => setTrackId(e.target.value)} />
                  <button onClick={() => trackComplaint()} className="rounded-xl bg-te-accent px-4 py-2 text-sm font-semibold text-white">Track</button>
                </div>

                {trackData && (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-sm">
                    <p><span className="font-medium">ID:</span> {trackData.trackingId}</p>
                    <p><span className="font-medium">Title:</span> {trackData.title}</p>
                    <p><span className="font-medium">Status:</span> <span className={`rounded-full px-2 py-1 text-xs ${statusClass[trackData.status] || 'bg-zinc-100'}`}>{trackData.status}</span></p>
                    <p><span className="font-medium">Category:</span> {trackData.category}</p>
                    <p><span className="font-medium">Priority:</span> {trackData.priority}</p>
                    <p><span className="font-medium">Location:</span> {trackData.location}</p>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      {message && <Toast text={message} />}
      {loading && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 font-mono text-xs text-white">working...</div>}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="soft-card p-4">
      <p className="font-mono text-xs uppercase text-te-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function Toast({ text }) {
  return (
    <div className="fixed right-5 top-5 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-mac">
      {text}
    </div>
  );
}

export default App;




