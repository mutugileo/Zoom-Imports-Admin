import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useReveal, revealStyle } from '../lib/useReveal';
import { ADMIN_ROLES, ROLES, PIN_LENGTH, isPinTaken } from '@shared/data/siteContent';
import { UserPlus, X, Trash2, ShieldAlert, History } from 'lucide-react';

const card = {
  background: '#fff',
  border: '1px solid #e1e6eb',
  borderRadius: '26px',
  boxShadow: '0 1px 0 rgba(22, 35, 46, 0.02)',
};

const cardHead = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(27,36,48,.08)',
};

const label = {
  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#5f6b7a', display: 'block', marginBottom: '4px',
};

const input = {
  width: '100%', padding: '9px 11px', borderRadius: '6px',
  border: '1px solid #d8dde2', fontSize: 'var(--text-sm)', outline: 'none', background: '#fff',
};

const ROLE_TONE = {
  Superadmin: { background: 'var(--primary-ink)', color: '#ffffff' },
  Administrator: { background: '#e6eff2', color: 'var(--primary-ink)' },
  'Sales Staff': { background: '#eaf1f6', color: 'var(--primary-ink)' },
  'Inventory Manager': { background: '#fbf1df', color: 'var(--accent-text)' },
};

/** "2 hours ago" from a timestamp. */
const relative = (ts) => {
  if (!ts) return '—';
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const AdminSettings = () => {
  const { adminUsers, saveUser, removeUser, activity, currentUser, can } = useAdmin();
  const manageUsers = can('users:manage');
  const [userError, setUserError] = useState('');

  /**
   * removeUser refuses two cases and says why — the last Superadmin, and your
   * own account. Both would leave the portal with no way back into user
   * management, so the refusal is surfaced rather than swallowed.
   */
  const handleRemove = (u) => {
    const result = removeUser(u.id);
    setUserError(result?.ok ? '' : (result?.reason ?? 'Could not remove that user'));
  };
  const [draft, setDraft] = useState(null);

  const [usersRef, usersShown] = useReveal();
  const [securityRef, securityShown] = useReveal();
  const [auditRef, auditShown] = useReveal();

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: '#16232e' }}>Settings</h1>
          {manageUsers && (
            <button onClick={() => { setUserError(''); setDraft({ name: '', email: '', role: 'Sales Staff', pin: '' }); }} className="btn-primary">
              <UserPlus size={16} /> Add staff
            </button>
          )}
        </div>

        {/* Staff directory — Superadmin only. Hidden rather than disabled: the
            names, roles and sign-in times of colleagues are not a Sales Staff
            concern, so there is nothing to show them a locked version of. */}
        {manageUsers && (
        <section ref={usersRef} className="admin-table-card" style={{ ...card, margin: '22px 0 20px', overflow: 'hidden', ...revealStyle(usersShown) }}>
          <div style={cardHead}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: '#16232e' }}>Admin Users</h2>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#16232e' }}>
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: '7px', fontSize: 'var(--text-xs)', fontWeight: 500, color: '#5f6b7a' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ color: '#5f6b7a' }}>{u.email}</td>
                  <td>
                    <span
                      className="badge"
                      style={ROLE_TONE[u.role] || { background: '#eef0f2', color: '#6b7480' }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: '#5c6a78' }}>{u.lastLogin ? relative(u.lastLogin) : 'Never signed in'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setDraft(u)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', cursor: 'pointer', fontWeight: 600 }}>
                        Edit
                      </button>
                      <button onClick={() => handleRemove(u)} aria-label={`Remove ${u.name}`} style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {userError && (
            <p role="alert" style={{ margin: 0, padding: '12px 18px', fontSize: 'var(--text-sm)', color: '#a13f3f', background: '#fdf1f1', borderTop: '1px solid #f2dcdc' }}>
              {userError}
            </p>
          )}
        </section>
        )}

        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', alignItems: 'start' }}>

          {/* Security — stating what is actually true, not what we wish were true */}
          <section ref={securityRef} style={{ ...card, ...revealStyle(securityShown, 1) }}>
            <div style={cardHead}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: '#16232e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="#a13f3f" /> Security
              </h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  background: '#f6e6e6', border: '1px solid rgba(161,63,63,.25)',
                  borderRadius: '8px', padding: '13px 15px', marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#8d3535', marginBottom: '4px' }}>
                  This portal has no sign-in
                </div>
                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: '#6d3232' }}>
                  Anyone who can reach this address has full access to the catalogue and to every
                  customer order. The roles below are a staff directory — they do not restrict
                  anything yet.
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: '#333d49' }}>
                Before this goes live it needs authentication and a server that checks permissions
                on every write. Until then, keep it on a local machine and do not host it publicly.
              </p>
            </div>
          </section>

          {/* Audit trail — fed by real actions */}
          <section ref={auditRef} style={{ ...card, ...revealStyle(auditShown, 2) }}>
            <div style={cardHead}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: '#16232e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} color="#5f6b7a" /> Audit Trail
              </h2>
            </div>

            <div style={{ padding: '6px 20px 14px', maxHeight: '360px', overflowY: 'auto' }}>
              {activity.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a', padding: '18px 0', lineHeight: 1.6 }}>
                  Nothing recorded yet. Changes you make — editing a listing, moving an order on,
                  featuring a vehicle — will show up here.
                </p>
              ) : (
                activity.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                      gap: '14px', padding: '11px 0', borderBottom: '1px solid rgba(27,36,48,.07)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', color: '#333d49', minWidth: 0 }}>{entry.message}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: '#5c6a78', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {relative(entry.at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {draft && (
        <UserModal
          user={draft}
          onClose={() => setDraft(null)}
          onSave={(u) => { saveUser(u); setDraft(null); }}
        />
      )}

      <style>{`
        @media (max-width: 1180px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminLayout>
  );
};

const UserModal = ({ user, users, onClose, onSave }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [pin, setPin] = useState(user.pin ?? '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const clean = pin.replace(/\D/g, '');
    if (clean.length !== PIN_LENGTH) {
      setError(`The PIN must be ${PIN_LENGTH} digits`);
      return;
    }
    // A shared PIN would attribute one person's actions to another in the
    // activity log, which is the main thing the log is for.
    if (isPinTaken(users, clean, user.id ?? null)) {
      setError('Another staff member already uses that PIN');
      return;
    }
    onSave({ ...user, name: name.trim(), email: email.trim(), role, pin: clean });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={user.id ? 'Edit user' : 'Invite user'}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: '#16232e' }}>
            {user.id ? 'Edit user' : 'Invite user'}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: '#edf1f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={label} htmlFor="u-name">Full name *</label>
            <input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="e.g. Wanjiru Kamau" />
          </div>
          <div>
            <label style={label} htmlFor="u-email">Work email *</label>
            <input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="name@zoomimports.co.ke" />
          </div>
          <div>
            <label style={label} htmlFor="u-role">Role</label>
            <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)} style={input}>
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p style={{ fontSize: 'var(--text-xs)', color: '#5f6b7a', marginTop: '5px', lineHeight: 1.5 }}>
              {ROLES[role]?.blurb}
            </p>
          </div>

          <div>
            <label style={label} htmlFor="u-pin">Sign-in PIN *</label>
            <input
              id="u-pin"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              style={{ ...input, letterSpacing: '0.4em', fontFamily: 'IBM Plex Mono, monospace' }}
              placeholder={'0'.repeat(PIN_LENGTH)}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: '#5f6b7a', marginTop: '5px', lineHeight: 1.5 }}>
              {PIN_LENGTH} digits, unique to this person. They sign in with this and
              nothing else, so hand it over in person.
            </p>
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', margin: 0 }}>{error}</p>
          )}

          <p style={{ fontSize: 'var(--text-xs)', color: '#5c6a78', lineHeight: 1.6 }}>
            The role takes effect immediately — it decides which pages this person sees
            and what they can change. No invitation email is sent. Access is enforced in
            the browser only, so it organises the team rather than securing the data.
          </p>

          <button type="submit" className="btn-primary" style={{ padding: '10px' }}>
            {user.id ? 'Save changes' : 'Add to directory'}
          </button>
        </form>
      </div>
    </div>
  );
};
