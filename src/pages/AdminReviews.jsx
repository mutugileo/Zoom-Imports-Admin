import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Star, Check, X, Trash2 } from 'lucide-react';

const STATUSES = ['Pending', 'Published', 'Rejected'];

const TONE = {
  Pending: { bg: 'var(--primary-light)', fg: 'var(--primary-ink)' },
  Published: { bg: '#e2f2ea', fg: '#1f7a52' },
  Rejected: { bg: 'var(--bg-cream)', fg: '#6b7480' },
};

const relative = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} days ago`;
};

/**
 * What customers wrote, waiting on a decision.
 *
 * Reviews arrive as Pending and the storefront only ever renders Published, so
 * without this screen a submission was written to a table nobody opened and
 * never appeared anywhere — the customer was thanked for a review that could
 * not be approved.
 */
export const AdminReviews = () => {
  const { reviews, reviewsLoading, setReviewStatus, removeReview, can } = useApp();
  const mayModerate = can('content:write');

  const [filter, setFilter] = useState('Pending');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);

  const shown = filter === 'All' ? reviews : reviews.filter((r) => r.status === filter);
  const countOf = (s) => (s === 'All' ? reviews.length : reviews.filter((r) => r.status === s).length);

  const act = async (id, fn) => {
    setError('');
    setBusyId(id);
    const result = await fn();
    setBusyId(null);
    if (!result.ok) setError(result.reason);
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Customer Reviews</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Nothing reaches the website until it is published here.
          </p>
        </div>

        <div className="admin-filter-bar" style={{ padding: '16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Pending', 'Published', 'Rejected', 'All'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                border: filter === s ? 'none' : '1px solid var(--border-medium)',
                background: filter === s ? 'var(--primary)' : 'var(--bg-card)',
                color: filter === s ? '#000' : 'var(--text-body)',
              }}
            >
              {s} ({countOf(s)})
            </button>
          ))}
        </div>

        {error && <div role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', paddingBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviewsLoading ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px' }}>
              Loading reviews…
            </div>
          ) : shown.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px' }}>
              {reviews.length === 0
                ? 'No reviews yet. When a customer writes one on the website it arrives here for approval.'
                : `Nothing ${filter.toLowerCase()}.`}
            </div>
          ) : shown.map((r) => {
            const tone = TONE[r.status] ?? TONE.Pending;
            return (
              <article key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{r.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {r.role || 'Verified customer'} · {relative(r.at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span aria-label={`${r.rating} out of 5`} style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={13} aria-hidden="true"
                          color={n <= r.rating ? '#c9922f' : 'var(--border-medium)'}
                          fill={n <= r.rating ? '#e8b355' : 'transparent'} />
                      ))}
                    </span>
                    <span className="badge" style={{ background: tone.bg, color: tone.fg }}>{r.status}</span>
                  </div>
                </div>

                <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.65, color: 'var(--text-body)', maxWidth: '78ch' }}>
                  {r.quote}
                </p>

                {mayModerate && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                    {r.status !== 'Published' && (
                      <button
                        onClick={() => act(r.id, () => setReviewStatus(r.id, 'Published'))}
                        disabled={busyId === r.id}
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: 'var(--text-sm)' }}
                      >
                        <Check size={14} /> Publish
                      </button>
                    )}
                    {r.status !== 'Rejected' && (
                      <button
                        onClick={() => act(r.id, () => setReviewStatus(r.id, 'Rejected'))}
                        disabled={busyId === r.id}
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: 'var(--text-sm)' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    )}
                    {r.status === 'Published' && (
                      <button
                        onClick={() => act(r.id, () => setReviewStatus(r.id, 'Pending'))}
                        disabled={busyId === r.id}
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: 'var(--text-sm)' }}
                      >
                        Take down
                      </button>
                    )}
                    <button
                      onClick={() => setConfirming(r)}
                      disabled={busyId === r.id}
                      style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)} role="dialog" aria-modal="true" aria-label="Delete review">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '440px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)', marginBottom: '10px' }}>
              Delete this review?
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
              What {confirming.name} wrote is removed for good. Rejecting keeps it on file instead.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={async () => { const r = confirming; setConfirming(null); await act(r.id, () => removeReview(r.id)); }}
                className="btn-primary"
                style={{ background: '#a13f3f', color: 'var(--bg-card)' }}
              >
                Delete
              </button>
              <button onClick={() => setConfirming(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
