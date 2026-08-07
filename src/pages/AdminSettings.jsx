import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useReveal, revealStyle } from '../lib/useReveal';
import { ADMIN_ROLES, ROLES, PIN_LENGTH } from '@shared/data/siteContent';
import { supabase } from '@shared/lib/supabaseClient';
import { pinToPassword } from '@shared/lib/pinAuth';
import { friendlyError } from '@shared/lib/friendlyError';
import { UserPlus, X, Trash2, UserCheck, History, KeyRound } from 'lucide-react';

/**
 * Self-service PIN change. No elevated access needed — a signed-in user can
 * always update their own Supabase Auth password, which is what the PIN
 * actually is (see pinAuth.js). Changing *someone else's* PIN is a separate,
 * harder problem — it needs the service-role Auth Admin API, which this app
 * doesn't hold a key for, so that stays out of reach until a proper
 * Edge Function exists for it.
 */
const ChangePinCard = ({ name, email }) => {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null); // { ok: boolean, message: string } | null
  const [busy, setBusy] = useState(false);

  const digitsOnly = (v) => v.replace(/\D/g, '').slice(0, PIN_LENGTH);

  const save = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (next.length !== PIN_LENGTH || confirm.length !== PIN_LENGTH) {
      setStatus({ ok: false, message: `PIN must be ${PIN_LENGTH} digits` });
      return;
    }
    if (next !== confirm) {
      setStatus({ ok: false, message: 'PINs did not match' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pinToPassword(next) });
    setBusy(false);
    if (error) {
      setStatus({ ok: false, message: friendlyError(error, 'Could not change your PIN. Try again.') });
      return;
    }
    setStatus({ ok: true, message: 'PIN updated' });
    setNext('');
    setConfirm('');
  };

  return (
    <section style={{ ...card, margin: '22px 0 20px' }}>
      <div style={cardHead}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={16} color="var(--primary-ink)" /> My PIN
        </h2>
      </div>
      <form onSubmit={save} style={{ padding: '20px', display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginRight: '4px' }}>
          {name} <span style={{ color: '#8a97a3' }}>· {email}</span>
        </div>
        <div>
          <label style={label} htmlFor="pin-next">New PIN</label>
          <input
            id="pin-next"
            style={{ ...input, width: '110px', letterSpacing: '0.3em', textAlign: 'center' }}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(digitsOnly(e.target.value))}
          />
        </div>
        <div>
          <label style={label} htmlFor="pin-confirm">Confirm</label>
          <input
            id="pin-confirm"
            style={{ ...input, width: '110px', letterSpacing: '0.3em', textAlign: 'center' }}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(digitsOnly(e.target.value))}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Change PIN'}
        </button>
        {status && (
          <span style={{ fontSize: 'var(--text-sm)', color: status.ok ? 'var(--verify)' : '#a13f3f', width: '100%' }} role="status">
            {status.message}
          </span>
        )}
      </form>
    </section>
  );
};

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--field-border)',
  borderRadius: '26px',
  boxShadow: '0 1px 0 rgba(22, 35, 46, 0.02)',
};

const cardHead = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(27,36,48,.08)',
};

const label = {
  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px',
};

const input = {
  width: '100%', padding: '9px 11px', borderRadius: '6px',
  border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', outline: 'none', background: 'var(--bg-card)',
};

const ROLE_TONE = {
  Superadmin: { background: 'var(--primary-ink)', color: 'var(--bg-card)' },
  Administrator: { background: 'var(--primary-light)', color: 'var(--primary-ink)' },
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
  const { adminProfiles, adminProfilesLoading, onlineUserIds, createStaffAccount, updateProfile, removeProfile, activity, currentUser, can } = useAdmin();
  const manageUsers = can('users:manage');
  /* Who gets the whole page rather than just the PIN card.
   *
   * Gated on content:write, which Superadmin and Administrator hold and the
   * two operational roles do not — NOT on users:manage, which only Superadmin
   * has and would have stripped the audit trail from Administrators who
   * already had it. */
  const fullSettings = can('content:write');
  const [userError, setUserError] = useState('');
  const [showAddInfo, setShowAddInfo] = useState(false);

  /**
   * removeProfile refuses two cases and says why — the last Superadmin, and
   * your own account. Both would leave the portal with no way back into user
   * management, so the refusal is surfaced rather than swallowed.
   */
  const handleRemove = async (u) => {
    const result = await removeProfile(u.id);
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Settings</h1>
          {manageUsers && (
            <button onClick={() => setShowAddInfo(true)} className="btn-primary">
              <UserPlus size={16} /> Add staff
            </button>
          )}
        </div>

        {currentUser && <ChangePinCard name={currentUser.name} email={currentUser.email} />}

        {/* Staff directory — Superadmin only. Hidden rather than disabled: the
            names, roles and sign-in times of colleagues are not a Sales Staff
            concern, so there is nothing to show them a locked version of. */}
        {manageUsers && (
        <section ref={usersRef} className="admin-table-card" style={{ ...card, margin: '22px 0 20px', overflow: 'hidden', ...revealStyle(usersShown) }}>
          <div style={cardHead}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-dark)' }}>Admin Users</h2>
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
              {adminProfilesLoading && adminProfiles.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--text-muted)', padding: '18px' }}>Loading…</td></tr>
              )}
              {adminProfiles.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                      {onlineUserIds.has(u.id) && (
                        <span className="presence-dot" aria-label="Online now" title="Online now" />
                      )}
                      {u.name}
                    </span>
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: '7px', fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span
                      className="badge"
                      style={ROLE_TONE[u.role] || { background: 'var(--bg-cream)', color: '#6b7480' }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.last_login ? relative(new Date(u.last_login).getTime()) : 'Never signed in'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => { setUserError(''); setDraft(u); }} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', cursor: 'pointer', fontWeight: 600 }}>
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

        {/* Everything below is staff administration, not self-service. A
            Sales Staff or Inventory Manager reaches this page for one reason —
            to change their own PIN — and the directory, the audit trail and
            another person's account details are not theirs to read. */}
        {fullSettings && (
        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', alignItems: 'start' }}>

          {/* Your account — the actual signed-in person, not a general explainer */}
          <section ref={securityRef} style={{ ...card, ...revealStyle(securityShown, 1) }}>
            <div style={cardHead}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="var(--verify)" /> Your Account
              </h2>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-dark)' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {currentUser?.email}
              </div>
              <span
                className="badge"
                style={{ ...(ROLE_TONE[currentUser?.role] || { background: 'var(--bg-cream)', color: '#6b7480' }), alignSelf: 'flex-start' }}
              >
                {currentUser?.role}
              </span>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '6px' }}>
                Last signed in {currentUser?.last_login ? relative(new Date(currentUser.last_login).getTime()) : 'just now'}
              </p>
            </div>
          </section>

          {/* Audit trail — fed by real actions */}
          <section ref={auditRef} style={{ ...card, ...revealStyle(auditShown, 2) }}>
            <div style={cardHead}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} color="var(--text-muted)" /> Audit Trail
              </h2>
            </div>

            <div style={{ padding: '6px 20px 14px', maxHeight: '360px', overflowY: 'auto' }}>
              {activity.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '18px 0', lineHeight: 1.6 }}>
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
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', minWidth: 0 }}>{entry.message}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {relative(entry.at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        )}
      </div>

      {draft && (
        <UserModal
          user={draft}
          onClose={() => setDraft(null)}
          onSave={async (u) => {
            const result = await updateProfile(u);
            if (result.ok) setDraft(null);
            else setUserError(result.reason);
          }}
        />
      )}

      {showAddInfo && (
        <AddStaffModal
          onClose={() => setShowAddInfo(false)}
          onCreate={async (draftUser) => {
            const result = await createStaffAccount(draftUser);
            if (result.ok) setShowAddInfo(false);
            return result;
          }}
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

/**
 * Editing an existing real account only — name and role. Email is the
 * Supabase Auth identity (changing it needs its own confirmation flow) and
 * the PIN is a password only its owner can change (see ChangePinCard), so
 * neither is editable here.
 */
const UserModal = ({ user, onClose, onSave }) => {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSave({ id: user.id, name: name.trim(), role });
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit user">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>
            Edit user
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label style={label} htmlFor="u-name">Full name *</label>
            <input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Wanjiru Kamau" />
          </div>
          <div>
            <label style={label} htmlFor="u-email">Email</label>
            <input id="u-email" value={user.email} disabled style={{ ...input, background: '#f4f6f8', color: 'var(--text-muted)' }} />
          </div>
          <div>
            <label style={label} htmlFor="u-role">Role</label>
            <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)} style={input}>
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>
              {ROLES[role]?.blurb}
            </p>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The role takes effect immediately — it&rsquo;s enforced by row-level security in
            Postgres, not just by which buttons this app shows.
          </p>

          <button type="submit" className="btn-primary" style={{ padding: '10px' }} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * Real account creation — `supabase.auth.signUp`, no service-role key, see
 * the comment on `createStaffAccount` in AdminContext.jsx for how that's
 * possible without hijacking the Superadmin's own session. The initial PIN
 * is chosen here and handed over in person, same as the original design;
 * the new person can change it themselves from "My PIN" once they're in.
 */
const AddStaffModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Staff');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { needsConfirmation } | null
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length !== PIN_LENGTH) {
      setError(`The initial PIN must be ${PIN_LENGTH} digits`);
      return;
    }
    setBusy(true);
    const outcome = await onCreate({ name: name.trim(), email: email.trim(), role, pin: cleanPin });
    setBusy(false);
    if (!outcome.ok) { setError(outcome.reason); return; }
    setResult(outcome);
  };

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Staff added">
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '440px' }}>
          <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)', marginBottom: '12px' }}>
            {name} added
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-body)' }}>
            {result.needsConfirmation
              ? <>Supabase just emailed <strong>{email}</strong> a confirmation link. They can sign in
                  with their email and the PIN you set once they click it — not before.</>
              : <>They can sign in right away with their email and the PIN you set.</>}
          </p>
          <button onClick={onClose} className="btn-primary" style={{ padding: '10px', marginTop: '16px', width: '100%' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Add staff">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>
            Add staff
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label} htmlFor="new-name">Full name *</label>
            <input id="new-name" required value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Wanjiru Kamau" />
          </div>
          <div>
            <label style={label} htmlFor="new-email">Work email *</label>
            <input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="name@zoomimports.co.ke" />
          </div>
          <div>
            <label style={label} htmlFor="new-role">Role</label>
            <select id="new-role" value={role} onChange={(e) => setRole(e.target.value)} style={input}>
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>
              {ROLES[role]?.blurb}
            </p>
          </div>
          <div>
            <label style={label} htmlFor="new-pin">Initial PIN *</label>
            <input
              id="new-pin"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              style={{ ...input, letterSpacing: '0.4em', fontFamily: 'IBM Plex Mono, monospace' }}
              placeholder={'0'.repeat(PIN_LENGTH)}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>
              Hand this to them in person — they can change it themselves from
              &ldquo;My PIN&rdquo; the first time they sign in.
            </p>
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', margin: 0 }}>{error}</p>
          )}

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Supabase will email {email || 'them'} a confirmation link before this account can sign
            in — that&rsquo;s a real anti-abuse step, not optional. On this project&rsquo;s current email
            quota that can occasionally be delayed; it isn&rsquo;t something this form controls.
          </p>

          <button type="submit" className="btn-primary" style={{ padding: '10px' }} disabled={busy}>
            {busy ? 'Creating…' : 'Add to directory'}
          </button>
        </form>
      </div>
    </div>
  );
};
