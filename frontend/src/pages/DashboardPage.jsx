import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlNote, SlPlus } from 'react-icons/sl';
import { toast } from 'react-toastify';
import { AuthContext } from '../App';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

const statusClass = {
  Open: 'border border-sky-300/20 bg-sky-500/20 text-sky-100',
  Pending: 'border border-amber-300/20 bg-amber-500/20 bg-black/100 text-amber-100',
  'In Progress': 'border border-violet-300/20 bg-violet-500/20 text-violet-100',
  Resolved: 'border border-emerald-300/20 bg-emerald-500/20 text-emerald-100',
  Escalated: 'border border-rose-300/20 bg-rose-500/20 text-rose-100'
};

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0, criticalEscalated: 0 });
  const [recent, setRecent] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data.stats || {});
        setRecent(data.recent || []);
        setMonthlyTrend(data.monthlyTrend || []);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load dashboard');
      }
    };

    load();
  }, []);

  const chart = useMemo(() => {
    if (!monthlyTrend.length) return null;

    const width = 700;
    const height = 240;
    const padding = 32;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const maxValue = Math.max(...monthlyTrend.map((item) => item.total || 0), 1);

    const points = monthlyTrend.map((item, index) => {
      const x = padding + (index * innerWidth) / Math.max(monthlyTrend.length - 1, 1);
      const y = padding + innerHeight - ((item.total || 0) / maxValue) * innerHeight;
      return { ...item, x, y };
    });

    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const guideLines = Array.from({ length: 4 }, (_, index) => {
      const y = padding + (innerHeight * index) / 3;
      return { y };
    });

    return { width, height, padding, innerHeight, maxValue, points, path, guideLines };
  }, [monthlyTrend]);

  return (
    <>
      {user?.role === 'citizen' && (
        <>
          <section className="soft-card soft-card-primary p-5">
            <p className="text-xs uppercase tracking-wide text-white/65">Need help from municipality?</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-white">Submit a New Complaint</h2>
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                <SlNote className="text-xs" />
                Submit Complaint
              </Link>
            </div>
          </section>

          <Link
            to="/submit"
            className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-300 md:hidden"
          >
            <SlPlus className="text-xs" />
            Submit
          </Link>
        </>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Total" value={stats.total || 0} />
        <MetricCard label="Pending" value={stats.pending || 0} />
        <MetricCard label="In Progress" value={stats.inProgress || 0} />
        <MetricCard label="Resolved" value={stats.resolved || 0} />
      </div>

      {user?.role === 'officer' && (
        <section className="soft-card soft-card-primary p-4">
          <h2 className="font-display text-lg font-semibold text-white">Monthly Trend (Last 6 Months)</h2>
          {!chart ? (
            <p className="mt-3 text-sm text-white/65">No trend data yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-64 min-w-[700px] w-full">
                {chart.guideLines.map((line) => (
                  <line
                    key={line.y}
                    x1={chart.padding}
                    y1={line.y}
                    x2={chart.width - chart.padding}
                    y2={line.y}
                    stroke="rgba(0, 76, 255, 1)"
                    strokeDasharray="4 5"
                  />
                ))}
                <path d={chart.path} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
                {chart.points.map((point) => (
                  <g key={`${point.month}-${point.total}`}>
                    <circle cx={point.x} cy={point.y} r="4.5" fill="#0ea5e9" />
                    <text x={point.x} y={chart.height - 8} textAnchor="middle" fontSize="12" fill="#cbd5e1">{point.month}</text>
                    <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="11" fill="#f8fafc">{point.total}</text>
                  </g>
                ))}
                <text x={chart.padding - 8} y={chart.padding + 4} textAnchor="end" fontSize="11" fill="#cbd5e1">{chart.maxValue}</text>
                <text x={chart.padding - 8} y={chart.padding + chart.innerHeight + 4} textAnchor="end" fontSize="11" fill="#cbd5e1">0</text>
              </svg>
            </div>
          )}
        </section>
      )}

      <section className="soft-card soft-card-secondary p-4">
        <h2 className="font-display text-lg font-semibold text-white">Recent complaints</h2>
        <div className="mt-3 space-y-2">
          {recent.length === 0 && <p className="text-sm text-white/65">No data yet.</p>}
          {recent.map((c) => (
            <div key={c._id} className="soft-card-tertiary rounded-2xl border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">{c.title}</p>
                <span className={`rounded-full px-2 py-1 text-xs ${statusClass[c.status] || 'border border-white/20 bg-white/15 text-white/80'}`}>{c.status}</span>
              </div>
              <p className="mt-1 text-xs text-white/65">{c.trackingId} | {c.ward}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
