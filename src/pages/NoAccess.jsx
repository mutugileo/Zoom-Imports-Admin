import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Lock } from 'lucide-react';

/**
 * Reached when a signed-in user lands on a view their role does not cover —
 * either by deep-linking, or by being demoted while still signed in.
 *
 * It names the role rather than saying "denied", because the person reading it
 * usually needs to go and ask someone for the right access, and "Sales Staff
 * cannot open Settings" tells them what to ask for.
 */
export const NoAccess = () => {
  const { currentUser, navigateTo } = useAdmin();

  return (
    <AdminLayout>
      <div
        style={{
          margin: '48px 32px',
          padding: '56px 32px',
          background: 'var(--bg-card)',
          border: '1px solid var(--band-line)',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <Lock size={26} color="var(--text-muted)" aria-hidden="true" />
        <h1
          style={{
            fontFamily: 'Source Serif 4, serif',
            fontSize: 'var(--text-3xl)',
            color: 'var(--text-dark)',
            margin: '12px 0 8px',
          }}
        >
          You do not have access to this page
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '46ch', margin: '0 auto 20px', lineHeight: 1.6 }}>
          Your role is <strong>{currentUser?.role}</strong>. Ask a Superadmin if you
          need this added.
        </p>
        <button onClick={() => navigateTo('admin-dashboard')} className="btn-primary">
          Back to dashboard
        </button>
      </div>
    </AdminLayout>
  );
};
