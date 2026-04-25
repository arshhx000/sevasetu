export default function MetricCard({ label, value }) {

  const styles = {
    Total: "bg-cyan-500/35 border border-cyan-400/20 text-white-300",
    Pending: "bg-yellow-500/35 border border-yellow-400/20 text-white-300",
    "In Progress": "bg-blue-500/35 border border-blue-400/20 text-white-300",
    Resolved: "bg-emerald-500/35 border border-emerald-400/20 text-white-300"
  };

  return (
    <div className={`rounded-xl p-4 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.20)] ${styles[label] || "bg-white/[0.08] border border-white/20 text-white"}`}>
      <p className="text-sm">{label}</p>
      <h2 className="text-2xl font-bold text-white">{value}</h2>
    </div>
  );
}
