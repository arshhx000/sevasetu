import { useContext, useState } from 'react';
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

export default function TrackPage() {
  const { user } = useContext(AuthContext);
  const [trackingId, setTrackingId] = useState('');
  const [item, setItem] = useState(null);
  const [detailsReply, setDetailsReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [replyError, setReplyError] = useState('');

  const isCitizenOwner = Boolean(
    user &&
    user.role === 'citizen' &&
    item?.submittedBy?._id &&
    String(item.submittedBy._id) === String(user.id)
  );

  const track = async () => {
    try {
      const id = trackingId.trim();
      if (!id) {
        setTrackError('Enter a tracking ID.');
        return;
      }

      setTrackError('');
      const { data } = await api.get(`/complaints/track/${encodeURIComponent(id)}`);
      setItem(data.complaint);
      setDetailsReply('');
      setReplyError('');
    } catch (error) {
      setTrackError(error?.response?.data?.message || 'Track failed');
    }
  };

  const sendDetails = async () => {
    if (!item?._id || !isCitizenOwner) return;

    const message = detailsReply.trim();
    if (!message) {
      setReplyError('Please enter the additional details requested by the officer.');
      return;
    }

    setReplyError('');
    setSendingReply(true);
    try {
      const { data } = await api.post(`/complaints/${item._id}/respond`, { message });
      setItem(data.complaint);
      setDetailsReply('');
      toast.success('Additional details sent to officer');
    } catch (error) {
      setReplyError(error?.response?.data?.message || 'Could not send details');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <section className="soft-card soft-card-primary p-4">
      <h2 className="font-display text-lg font-semibold text-white">Track complaint</h2>
      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <div className="flex-1">
          <input
            className={`input w-full ${trackError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
            placeholder="CMP-2026-1234"
            value={trackingId}
            onChange={(e) => {
              setTrackingId(e.target.value);
              if (trackError) setTrackError('');
            }}
          />
          {trackError && <p className="mt-1 text-xs text-rose-600">{trackError}</p>}
        </div>
        <button onClick={track} className="btn-primary">Track</button>
      </div>

      {item && (
        <div className="soft-card-secondary mt-4 space-y-4 rounded-2xl border p-4 text-sm text-white/90">
          <div className="grid gap-2 md:grid-cols-2">
            <p><span className="font-medium">ID:</span> {item.trackingId}</p>
            <p><span className="font-medium">Title:</span> {item.title}</p>
            <p><span className="font-medium">Status:</span> <span className={`rounded-full px-2 py-1 text-xs ${statusClass[item.status] || 'border border-white/20 bg-white/15 text-white/80'}`}>{item.status}</span></p>
            <p><span className="font-medium">Category:</span> {item.category}</p>
            <p><span className="font-medium">Priority:</span> {item.priority}</p>
            <p><span className="font-medium">Location:</span> {item.location}</p>
            <p><span className="font-medium">Filed By:</span> {item.submittedBy?.name || '-'}</p>
            <p><span className="font-medium">Assigned Officer:</span> {item.assignedTo?.name ? `${item.assignedTo.name} (${item.assignedTo.role || 'officer'})` : 'Unassigned'}</p>
          </div>

          {(item.images || []).length > 0 && (
            <div>
              <p className="mb-2 font-medium">Uploaded Images</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {(item.images || []).map((url, idx) => (
                  <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="soft-card-tertiary overflow-hidden rounded-xl border">
                    <img src={url} alt={`Complaint ${idx + 1}`} className="h-24 w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 font-medium">Progress / Communication</p>
            <div className="space-y-2">
              {(item.timeline || []).length === 0 && <p className="text-xs text-white/65">No timeline messages yet.</p>}
              {(item.timeline || []).slice().reverse().map((t, idx) => (
                <div key={`${t.at || idx}-${idx}`} className="soft-card-tertiary rounded-xl border px-3 py-2">
                  <p className="text-xs font-medium">{t.status || item.status}</p>
                  <p className="text-xs text-white/70">{t.note || 'No note'}</p>
                </div>
              ))}
            </div>
          </div>

          {isCitizenOwner && (
            <div className="soft-card-tertiary rounded-xl border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/65">Send requested details to officer</p>
              <textarea
                className={`input min-h-[100px] ${replyError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : ''}`}
                placeholder="Write the additional details asked by officer..."
                value={detailsReply}
                onChange={(e) => {
                  setDetailsReply(e.target.value);
                  if (replyError) setReplyError('');
                }}
              />
              {replyError && <p className="mt-1 text-xs text-rose-600">{replyError}</p>}
              <div className="mt-2 flex justify-end">
                <button disabled={sendingReply} onClick={sendDetails} className="btn-primary">
                  {sendingReply ? 'Sending...' : 'Send Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
