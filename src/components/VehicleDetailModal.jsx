import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { VehicleCosts } from './VehicleCosts';
import { VehiclePayments } from './VehiclePayments';
import { VehicleDocuments } from './VehicleDocuments';
import React, { useEffect, useCallback, useState } from 'react';
import { useApp } from '../context/AdminContext';
import { formatKES } from '@shared/lib/format';
import { X, Edit2, Trash2, Star, ExternalLink } from 'lucide-react';

/**
 * Read-only view of everything held against a vehicle.
 *
 * Grouped for scanning, but with a catch-all at the end that prints any field
 * not named in a group — so a column added to the data later shows up here
 * without anyone remembering to update this file.
 */

const GROUPS = [
  {
    title: 'Listing',
    keys: ['name', 'make', 'year', 'price', 'status', 'featured', 'condition'],
  },
  {
    title: 'Specification',
    keys: ['mileage', 'fuel', 'trans', 'engine', 'body', 'color'],
  },
  {
    title: 'Import dossier',
    keys: ['chassis', 'grade', 'inspection', 'odometerVerified', 'dutyPaid', 'port'],
  },
];

const LABELS = {
  name: 'Model', make: 'Make', year: 'Year', price: 'Price', status: 'Status',
  featured: 'Featured on site', condition: 'Condition',
  mileage: 'Odometer', fuel: 'Fuel', trans: 'Transmission', engine: 'Engine',
  body: 'Body', color: 'Colour',
  chassis: 'Chassis number', grade: 'Auction grade', inspection: 'Inspection',
  odometerVerified: 'Odometer verified', dutyPaid: 'Import duty paid', port: 'Port of entry',
  slug: '360° frame folder', img: 'Photo URL', description: 'Description', id: 'Record ID',
};

const HIDDEN = new Set(['img', 'description']);

/**
 * Documents and Activity are declared but disabled. Documents needs file
 * storage that does not exist yet, and Activity needs per-record history rather
 * than the global log. Showing them greyed says the record has more to come;
 * omitting them would imply this is the whole shape.
 */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'costs', label: 'Costs', permission: 'costs:view' },
  { id: 'payments', label: 'Payments', permission: 'costs:view' },
  { id: 'documents', label: 'Documents', permission: 'catalogue:write' },
  { id: 'activity', label: 'Activity', stub: true,
    note: 'Will show what changed on this car and who changed it. The activity log today is portal-wide, not per vehicle.' },
];

const humanise = (key) =>
  LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const present = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'price') return formatKES(value);
  if (key === 'mileage') return `${Number(value).toLocaleString()} km`;
  return String(value);
};

export const VehicleDetailModal = ({ vehicle, onClose, onEdit, onDelete, onToggleFeatured }) => {
  const { can } = useApp();
  const [tab, setTab] = useState('overview');
  const close = useCallback(() => onClose(), [onClose]);

  const trapRef = useFocusTrap(!!vehicle);

  // Reset to Overview per vehicle, and fall back if the open tab is no longer
  // permitted — otherwise a demoted user sits on a blank panel.
  useEffect(() => { setTab('overview'); }, [vehicle?.id]);
  const visibleTabs = TABS.filter((t) => !t.permission || can(t.permission));
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : 'overview';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  if (!vehicle) return null;

  const grouped = new Set(GROUPS.flatMap((g) => g.keys));
  const extras = Object.keys(vehicle).filter((k) => !grouped.has(k) && !HIDDEN.has(k));

  return (
    <div
      className="modal-overlay"
      onClick={close}
      ref={trapRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${vehicle.name} details`}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 0, maxWidth: '720px' }}
      >
        {/* Header with the photo as context */}
        <div style={{ position: 'relative', height: '190px', background: '#1e3449', overflow: 'hidden', borderRadius: '14px 14px 0 0' }}>
          <img
            src={vehicle.img}
            alt={vehicle.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,21,18,0.25) 0%, rgba(11,21,18,0.9) 100%)' }} />

          <button
            onClick={close}
            aria-label="Close"
            style={{
              position: 'absolute', top: '14px', right: '14px',
              background: 'rgba(11,21,18,0.7)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '999px', width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#fff" />
          </button>

          <div style={{ position: 'absolute', left: '22px', bottom: '18px', right: '22px' }}>
            <div style={{ display: 'flex', gap: '7px', marginBottom: '9px', flexWrap: 'wrap' }}>
              <span className={`badge badge-${vehicle.status.toLowerCase()}`}>{vehicle.status}</span>
              {vehicle.featured && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.16)', color: 'var(--bg-card)' }}>
                  <Star size={11} fill="#f2a565" color="#f2a565" /> Featured
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-3xl)', fontWeight: 600, color: 'var(--bg-card)', lineHeight: 1.15 }}>
              {vehicle.name}
            </h2>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--text-xs)', color: 'rgba(244,242,236,0.75)', marginTop: '4px' }}>
              {vehicle.year} · {formatKES(vehicle.price)}
            </div>
          </div>
        </div>

        {/* Tabs. The record is long enough that one scroll swallowed the costs
            entirely; separating them also means a role without costs:view never
            renders the panel at all rather than hiding it mid-page. */}
        <div
          role="tablist"
          aria-label="Vehicle record"
          style={{
            display: 'flex', gap: '2px', padding: '0 24px',
            borderBottom: '1px solid var(--band-line)', background: 'var(--bg-card)',
          }}
        >
          {visibleTabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                disabled={t.stub}
                title={t.stub ? t.note : undefined}
                style={{
                  border: 'none', background: 'transparent', cursor: t.stub ? 'default' : 'pointer',
                  padding: '13px 14px', fontSize: 'var(--text-sm)',
                  fontWeight: active ? 700 : 500,
                  color: t.stub ? 'var(--text-dim)' : active ? 'var(--primary-ink)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${active ? 'var(--primary-ink)' : 'transparent'}`,
                  marginBottom: '-1px',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '22px 24px 24px' }}>
          {activeTab === 'costs' && <VehicleCosts vehicle={vehicle} />}
          {activeTab === 'payments' && <VehiclePayments vehicle={vehicle} />}
          {activeTab === 'documents' && <VehicleDocuments vehicle={vehicle} />}

          {activeTab === 'overview' && <>
          {GROUPS.map((group) => {
            const rows = group.keys.filter((k) => k in vehicle);
            if (rows.length === 0) return null;
            return (
              <section key={group.title} style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.09em',
                    textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px',
                  }}
                >
                  {group.title}
                </div>
                <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1px', background: 'var(--band-line)', border: '1px solid var(--band-line)', borderRadius: '8px', overflow: 'hidden' }}>
                  {rows.map((key) => (
                    <div key={key} style={{ background: 'var(--bg-card)', padding: '10px 13px' }}>
                      <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '3px' }}>{humanise(key)}</dt>
                      <dd style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', wordBreak: 'break-word' }}>
                        {present(key, vehicle[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}

          {extras.length > 0 && (
            <section style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Other fields
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1px', background: 'var(--band-line)', border: '1px solid var(--band-line)', borderRadius: '8px', overflow: 'hidden' }}>
                {extras.map((key) => (
                  <div key={key} style={{ background: 'var(--bg-card)', padding: '10px 13px' }}>
                    <dt style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '3px' }}>{humanise(key)}</dt>
                    <dd style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', wordBreak: 'break-word' }}>
                      {present(key, vehicle[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {vehicle.description && (
            <section style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Description
              </div>
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-body)', background: 'var(--bg-cream)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '14px 16px' }}>
                {vehicle.description}
              </p>
            </section>
          )}

          {vehicle.img && (
            <section style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Photo URL
              </div>
              <a
                href={vehicle.img}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: 'var(--text-sm)', color: 'var(--primary-ink)', fontWeight: 600,
                  wordBreak: 'break-all',
                }}
              >
                {vehicle.img.length > 68 ? vehicle.img.slice(0, 68) + '…' : vehicle.img}
                <ExternalLink size={13} style={{ flexShrink: 0 }} />
              </a>
            </section>
          )}
          </>}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--band-line)', paddingTop: '18px' }}>
            <button onClick={() => onEdit(vehicle)} className="btn-primary">
              <Edit2 size={15} /> Edit listing
            </button>
            <button onClick={() => onToggleFeatured(vehicle.id)} className="btn-secondary">
              <Star size={15} fill={vehicle.featured ? 'var(--primary-ink)' : 'none'} />
              {vehicle.featured ? 'Remove from featured' : 'Feature on site'}
            </button>
            <button
              onClick={() => onDelete(vehicle)}
              className="btn-secondary"
              style={{ marginLeft: 'auto', color: '#a13f3f' }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
