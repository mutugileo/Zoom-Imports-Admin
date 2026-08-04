import React, { useState, useEffect, useCallback } from 'react';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { LISTING_TYPES } from '@shared/lib/format';
import { groupVehicles, STAGES } from '@shared/lib/inventory';
import { MAZDA_MODEL_GROUPS, modelOf } from '@shared/data/mazdaModels';
import { totalCost, profit, profitMargin, formatMargin, hasLedger, rollUp } from '@shared/lib/costing';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Search, Plus, Edit2, Trash2, Star, X, Eye, Car } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { VehicleDetailModal } from '../components/VehicleDetailModal';
import { RecordSaleModal } from '../components/RecordSaleModal';
import { ImagePicker } from '../components/ImagePicker';

export const AdminVehicles = () => {
  const {
    vehicles,
    vehiclesLoading,
    can,
    vehicleGroups,
    vehicleCosts,
    saveVehicle,
    deleteVehicle,
    toggleFeaturedVehicle,
    saleFor,
    setVehicleApproval,
    formatKES
  } = useApp();

  // Sales Staff may read the catalogue but not change it, so the write and
  // delete affordances come off entirely rather than erroring on click.
  const mayWrite = can('catalogue:write');
  const mayCosts = can('costs:view');
  const mayDelete = can('catalogue:delete');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [saleVehicle, setSaleVehicle] = useState(null);
  const [saveError, setSaveError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    make: 'Mazda',
    year: 2017,
    price: 1200000,
    mileage: 50000,
    fuel: 'Petrol',
    trans: 'Automatic',
    engine: '1.5L',
    body: 'Sedan',
    color: 'White',
    condition: 'Foreign Used',
    status: 'Available',
    listing: 'owned',
    stage: 'In Yard',
    groupId: '',
    regNumber: '',
    location: 'Thindigua Yard',
    chassis: '',
    grade: '4.5 B',
    inspection: 'JEVIC verified',
    port: 'Mombasa',
    slug: '',
    odometerVerified: true,
    dutyPaid: true,
    featured: false,
    img: null,
    images: [],
    description: ''
  });

  const filteredVehicles = vehicles.filter(v => {
    if (filterStatus === 'Awaiting approval') {
      if (v.approvalStatus === 'Approved') return false;
    } else if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (search.trim() && !`${v.name} ${v.make} ${v.year}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* Paged before grouping, not after: a page is 10 *vehicles*, and the shipment
     headers regroup around whatever that page holds. Paging the buckets instead
     would let one large shipment fill a page with 40 rows while the next showed
     six. */
  const page = usePagedList(
    filteredVehicles,
    PAGE_SIZE,
    `${filterStatus}|${search.trim().toLowerCase()}`
  );
  const buckets = groupVehicles(page.visible, vehicleGroups);

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      id: null,
      name: '',
      make: 'Mazda',
      year: 2018,
      price: 1500000,
      mileage: 45000,
      fuel: 'Petrol',
      trans: 'Automatic',
      engine: '',
      body: '',
      color: '',
      condition: 'Foreign Used',
      status: 'Available',
      listing: 'owned',
      stage: 'In Yard',
      groupId: '',
      regNumber: '',
      location: 'Thindigua Yard',
      chassis: '',
      grade: '4.5 B',
      inspection: 'JEVIC verified',
      port: 'Mombasa',
      slug: '',
      odometerVerified: true,
      dutyPaid: true,
      featured: false,
      img: null,
    images: [],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setDetailVehicle(null);
    setEditingVehicle(vehicle);
    setFormData({ ...vehicle });
    setIsModalOpen(true);
  };

  /**
   * The add/edit dialog had no Escape key and no dialog role — it looked like a
   * modal but behaved like a div. A form this long is exactly where someone
   * reaches for Escape.
   */
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const trapRef = useFocusTrap(isModalOpen);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModalOpen, closeModal]);

  const handleDeleteFromDetail = async (vehicle) => {
    await deleteVehicle(vehicle.id);
    setDetailVehicle(null);
  };

  /**
   * Slug is the vehicle's future URL, so it cannot be left empty and it cannot
   * silently collide. Derived from name and year when blank, and de-duplicated
   * against the other vehicles rather than the whole list — editing a car must
   * not push it to "mazda-cx-5-2018-2" against itself.
   */
  const slugify = (value) =>
    String(value).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const uniqueSlug = (base, id) => {
    const taken = new Set(vehicles.filter((v) => v.id !== id).map((v) => v.slug));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaveError('');
    const base = slugify(formData.slug || `${formData.name} ${formData.year}`);
    const result = await saveVehicle({ ...formData, slug: uniqueSlug(base, formData.id) });
    if (!result.ok) { setSaveError(result.reason || 'Could not save this vehicle.'); return; }
    setIsModalOpen(false);
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        
        {/* Header */}
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: '#16232e' }}>
            Vehicle Inventory Management
          </h1>

          {mayWrite && (
            <button onClick={handleOpenAddModal} className="btn-accent">
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="admin-filter-bar" style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Awaiting approval', 'Available', 'Reserved', 'Sold'].map(st => {
              const count = st === 'All'
                ? vehicles.length
                : st === 'Awaiting approval'
                  ? vehicles.filter(v => v.approvalStatus !== 'Approved').length
                  : vehicles.filter(v => v.status === st).length;
              const isActive = filterStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isActive ? 'none' : '1px solid var(--border-medium)',
                    background: isActive ? 'var(--primary)' : '#fff',
                    color: isActive ? '#000' : 'var(--text-body)'
                  }}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '240px' }}>
            <Search size={15} color="#5c6a78" />
            <input 
              type="text" 
              placeholder="Search vehicles..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%' }} 
            />
          </div>
        </div>

        {/* Phones get a card list with the same controls as the table. Keeping
            this as a separate presentation means the desktop inventory can
            stay dense without forcing a 720px table through a 390px screen. */}
        <div className="vehicle-mobile-list" aria-label="Vehicle inventory">
          {vehiclesLoading ? (
            <div className="vehicle-mobile-empty">Loading vehicles…</div>
          ) : buckets.length === 0 && (
            <div className="vehicle-mobile-empty">
              {vehicles.length === 0
                      ? 'No vehicles yet. Use “Add Vehicle” to list your first car — it reaches the website once its status is Available.'
                      : 'No vehicles match this search.'}
            </div>
          )}

          {buckets.map(({ group, vehicles: rows }) => {
            if (rows.length === 0) return null;
            const roll = mayCosts ? rollUp(rows, vehicleCosts) : null;

            return (
              <section className="vehicle-mobile-group" key={group.id || 'ungrouped'}>
                <div className="vehicle-mobile-group-head">
                  <div className="vehicle-mobile-group-copy">
                    <strong>{group.name}</strong>
                    <span>
                      {group.id || 'Ungrouped'}
                      {group.type ? ` · ${group.type}` : ''}
                    </span>
                  </div>
                  <span className="vehicle-mobile-group-count">
                    {rows.length} unit{rows.length === 1 ? '' : 's'}
                  </span>
                  {roll && roll.costedUnits > 0 && (
                    <div className="vehicle-mobile-rollup">
                      <span>Cost {formatKES(roll.totalCost)}</span>
                      <span className={roll.projectedProfit < 0 ? 'is-negative' : ''}>
                        Profit {formatKES(roll.projectedProfit)} · {formatMargin(roll.margin)}
                      </span>
                      {roll.costedUnits < rows.length && (
                        <span className="is-warning">{rows.length - roll.costedUnits} not costed</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="vehicle-mobile-cards">
                  {rows.map((v) => {
                    const ledger = hasLedger(vehicleCosts[v.id]);
                    const sale = v.status === 'Sold' ? saleFor(v.id) : null;

                    return (
                      <article className="vehicle-mobile-card" key={v.id}>
                        <button
                          type="button"
                          className="vehicle-mobile-open"
                          onClick={() => setDetailVehicle(v)}
                          aria-label={`View ${v.name} details`}
                        >
                          {v.img ? (
                            <img className="vehicle-mobile-photo" src={v.img} alt="" loading="lazy" />
                          ) : (
                            <span className="vehicle-mobile-photo vehicle-photo-none" aria-hidden="true">
                              <Car size={17} strokeWidth={1.8} />
                            </span>
                          )}
                          <span className="vehicle-mobile-title">
                            <span className="vehicle-mobile-stock">{v.stockId || 'Stock ID unassigned'}</span>
                            <strong>{v.name} <span>{v.year}</span></strong>
                            <small>
                              {v.mileage.toLocaleString()} km · {v.trans}
                              {v.regNumber ? ` · ${v.regNumber}` : ''}
                            </small>
                          </span>
                          <Eye size={18} aria-hidden="true" />
                        </button>

                        <div className="vehicle-mobile-meta">
                          <span>
                            <small>Stage</small>
                            <strong>{v.stage || '—'}</strong>
                          </span>
                          <span>
                            <small>Price</small>
                            <strong>{formatKES(v.price)}</strong>
                          </span>
                          <span>
                            <small>Status</small>
                            <span className={`badge badge-${v.status.toLowerCase()}`}>{v.status}</span>
                          </span>
                        </div>

                        {mayCosts && (
                          <div className="vehicle-mobile-finance">
                            <span>
                              <small>Total cost</small>
                              <strong>{ledger ? formatKES(totalCost(vehicleCosts[v.id])) : 'Not costed'}</strong>
                            </span>
                            <span>
                              <small>Profit</small>
                              {ledger ? (
                                <strong className={profit(vehicleCosts[v.id], v.price) < 0 ? 'is-negative' : ''}>
                                  {formatKES(profit(vehicleCosts[v.id], v.price))} {formatMargin(profitMargin(vehicleCosts[v.id], v.price))}
                                </strong>
                              ) : <strong>—</strong>}
                            </span>
                          </div>
                        )}

                        <div className="vehicle-mobile-actions">
                          {v.status === 'Sold' ? (
                            sale ? (
                              <span className="vehicle-mobile-sale">
                                Sold {formatKES(sale.price)}{!sale.costed ? ' · no cost' : ''}
                              </span>
                            ) : mayWrite ? (
                              <button type="button" className="vehicle-mobile-action sale" onClick={() => setSaleVehicle(v)}>
                                Add sale details
                              </button>
                            ) : null
                          ) : mayWrite ? (
                            <button type="button" className="vehicle-mobile-action sale" onClick={() => setSaleVehicle(v)}>
                              Mark sold
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className={`vehicle-mobile-action icon${v.featured ? ' is-featured' : ''}`}
                            onClick={() => toggleFeaturedVehicle(v.id)}
                            disabled={!mayWrite}
                            aria-label={`${v.featured ? 'Unfeature' : 'Feature'} ${v.name}`}
                          >
                            <Star size={16} fill={v.featured ? 'currentColor' : 'none'} aria-hidden="true" />
                          </button>
                          <button type="button" className="vehicle-mobile-action" onClick={() => setDetailVehicle(v)}>
                            <Eye size={15} aria-hidden="true" /> View
                          </button>
                          {mayWrite && (
                            <button type="button" className="vehicle-mobile-action edit" onClick={() => handleOpenEditModal(v)}>
                              <Edit2 size={15} aria-hidden="true" /> Edit
                            </button>
                          )}
                          {mayDelete && (
                            <button type="button" className="vehicle-mobile-action delete" onClick={() => deleteVehicle(v.id)}>
                              <Trash2 size={15} aria-hidden="true" /> Delete
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <Pagination {...page} onChange={page.setPage} noun="vehicles" />
        </div>

        {/* Desktop table */}
        <div className="admin-table-card vehicle-desktop-list" style={{ background: '#fff', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Stock ID</th>
                <th>Vehicle</th>
                <th>Stage</th>
                <th>Price</th>
                {mayCosts && <th>Total cost</th>}
                {mayCosts && <th>Profit</th>}
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehiclesLoading ? (
                <tr><td colSpan={mayCosts ? 10 : 8} style={{ padding: '24px', textAlign: 'center', color: '#5f6b7a' }}>Loading vehicles…</td></tr>
              ) : buckets.length === 0 ? (
                <tr>
                  <td colSpan={mayCosts ? 10 : 8} style={{ padding: '24px', textAlign: 'center', color: '#5f6b7a' }}>
                    {vehicles.length === 0
                      ? 'No vehicles yet. Use “Add Vehicle” to list your first car — it reaches the website once its status is Available.'
                      : 'No vehicles match this search.'}
                  </td>
                </tr>
              ) : buckets.map(({ group, vehicles: rows }) => {
                if (rows.length === 0) return null;
                const roll = mayCosts ? rollUp(rows, vehicleCosts) : null;
                return (
                <React.Fragment key={group.id || 'ungrouped'}>
                  {/* One header row per group. Consolidated figures sit here
                      because "what did this shipment make" is the question a
                      group exists to answer. */}
                  <tr>
                    <td colSpan={mayCosts ? 10 : 8} style={{ background: '#eef2f6', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                          <strong style={{ fontSize: 'var(--text-sm)', color: '#16232e' }}>{group.name}</strong>
                          {group.id && (
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'var(--text-xs)', color: '#5f6b7a' }}>
                              {group.id}
                            </span>
                          )}
                          {group.type && (
                            <span className="badge" style={{ background: '#e6eff2', color: 'var(--primary-ink)' }}>{group.type}</span>
                          )}
                        </span>
                        <span style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {rows.length} unit{rows.length === 1 ? '' : 's'}
                          {roll && roll.costedUnits > 0 && (
                            <>
                              {' · cost '}{formatKES(roll.totalCost)}
                              {' · profit '}
                              <span style={{ color: roll.projectedProfit < 0 ? '#a13f3f' : 'var(--primary-ink)', fontWeight: 600 }}>
                                {formatKES(roll.projectedProfit)}
                              </span>
                              {' · '}{formatMargin(roll.margin)}
                              {roll.costedUnits < rows.length && (
                                <span style={{ color: 'var(--accent-text)' }}>{` · ${rows.length - roll.costedUnits} not costed`}</span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {rows.map(v => (
                <tr
                  key={v.id}
                  onClick={() => setDetailVehicle(v)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    {v.img ? (
                      <img src={v.img} alt={v.name} style={{ width: '52px', height: '38px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '38px', borderRadius: '6px', background: '#edf1f6', color: '#8a97a5' }}
                      >
                        <Car size={16} strokeWidth={1.8} />
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'var(--text-xs)', color: '#16232e', whiteSpace: 'nowrap' }}>
                    {v.stockId || <span style={{ color: 'var(--accent-text)' }}>unassigned</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#16232e' }}>{v.name} <span style={{ fontWeight: 400, color: '#5f6b7a' }}>{v.year}</span></div>
                    <div style={{ fontSize: 'var(--text-xs)', color: '#5f6b7a' }}>
                      {v.mileage.toLocaleString()} km · {v.trans}
                      {v.regNumber ? ` · ${v.regNumber}` : ''}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a' }}>{v.stage || '—'}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary-ink)' }}>{formatKES(v.price)}</td>
                  {mayCosts && (
                    <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'var(--text-sm)', color: '#333d49' }}>
                      {hasLedger(vehicleCosts[v.id]) ? formatKES(totalCost(vehicleCosts[v.id])) : '—'}
                    </td>
                  )}
                  {mayCosts && (
                    <td style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'var(--text-sm)' }}>
                      {hasLedger(vehicleCosts[v.id]) ? (
                        <span style={{ color: profit(vehicleCosts[v.id], v.price) < 0 ? '#a13f3f' : 'var(--primary-ink)', fontWeight: 600 }}>
                          {formatKES(profit(vehicleCosts[v.id], v.price))}
                          <span style={{ color: '#5f6b7a', fontWeight: 400 }}>
                            {' '}{formatMargin(profitMargin(vehicleCosts[v.id], v.price))}
                          </span>
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  <td>
                    <span className={`badge badge-${v.status.toLowerCase()}`}>
                      {v.status}
                    </span>
                    {/* Approval gates the listing, not the car. A vehicle can be
                        Available and still not be on the website. */}
                    {v.approvalStatus !== 'Approved' && (
                      <div style={{ marginTop: '5px' }}>
                        <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-ink)' }}>
                          {v.approvalStatus === 'Rejected' ? 'Rejected' : 'Not on site'}
                        </span>
                        {mayWrite && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setVehicleApproval(v.id, 'Approved'); }}
                            style={{ display: 'block', marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Approve for website
                          </button>
                        )}
                      </div>
                    )}
                    {v.approvalStatus === 'Approved' && mayWrite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setVehicleApproval(v.id, 'Pending'); }}
                        style={{ display: 'block', marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', color: '#5f6b7a', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Take off site
                      </button>
                    )}
                    {/* Sold is the one status that carries money, so it is the
                        one status that cannot be set by a dropdown. Either the
                        achieved price is on record or the sale reads as a flag
                        with no figures behind it. */}
                    {v.status === 'Sold' ? (
                      (() => {
                        const sale = saleFor(v.id);
                        return sale ? (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                            {formatKES(sale.price)}
                            {!sale.costed && <span style={{ color: 'var(--accent-text)' }}> · no cost</span>}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSaleVehicle(v); }}
                            disabled={!mayWrite}
                            style={{ display: 'block', marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-text)', cursor: mayWrite ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                          >
                            Add sale details
                          </button>
                        );
                      })()
                    ) : mayWrite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSaleVehicle(v); }}
                        style={{ display: 'block', marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Mark sold
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFeaturedVehicle(v.id); }}
                      disabled={!mayWrite}
                      aria-label={`${v.featured ? 'Unfeature' : 'Feature'} ${v.name}`}
                      style={{ border: 'none', background: 'transparent', cursor: mayWrite ? 'pointer' : 'default' }}
                    >
                      <Star size={16} fill={v.featured ? 'var(--primary-ink)' : 'none'} color={v.featured ? 'var(--primary-ink)' : '#5c6a78'} />
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={(e) => { e.stopPropagation(); setDetailVehicle(v); }} style={{ border: 'none', background: 'transparent', color: '#333d49', cursor: 'pointer', fontWeight: 600 }}>
                        <Eye size={15} /> View
                      </button>
                      {mayWrite && (
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(v); }} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', cursor: 'pointer', fontWeight: 600 }}>
                          <Edit2 size={15} /> Edit
                        </button>
                      )}
                      {mayDelete && (
                        <button onClick={(e) => { e.stopPropagation(); deleteVehicle(v.id); }} style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', fontWeight: 600 }}>
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                  ))}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="vehicles" />
        </div>

      </div>

      {saleVehicle && (

        <RecordSaleModal vehicle={saleVehicle} onClose={() => setSaleVehicle(null)} />

      )}


      {detailVehicle && (
        <VehicleDetailModal
          vehicle={vehicles.find((v) => v.id === detailVehicle.id) || detailVehicle}
          onClose={() => setDetailVehicle(null)}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteFromDetail}
          onToggleFeatured={toggleFeaturedVehicle}
        />
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          ref={trapRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={editingVehicle ? 'Edit vehicle listing' : 'Add new vehicle listing'}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: '#16232e' }}>
                {editingVehicle ? 'Edit Vehicle Listing' : 'Add New Vehicle Listing'}
              </h3>
              <button onClick={closeModal} aria-label="Close" style={{ border: 'none', background: '#edf1f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Model is picked, not typed.
                  Free text let "CX5", "Cx-5" and "CX-5 " all reach the
                  catalogue as different models, and every one of them dropped
                  out of the storefront's model filter. The picker writes the
                  canonical name; the field below stays editable for a trim or
                  variant the list cannot know ("Axela Hybrid", "Prado TX"). */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Mazda model *</label>
                  <select
                    value={modelOf(formData.name) || ''}
                    onChange={(e) => {
                      const picked = e.target.value;
                      if (!picked) return;
                      setFormData({ ...formData, name: `Mazda ${picked}`, make: 'Mazda' });
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}
                  >
                    <option value="">Select a model…</option>
                    {MAZDA_MODEL_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Make *</label>
                  <input type="text" required value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>
                  Listing name * <span style={{ fontWeight: 400 }}>— add a trim or variant if there is one</span>
                </label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                {formData.name && !modelOf(formData.name) && (
                  /* Says it plainly rather than saving something the storefront
                     will quietly refuse to file under any model. */
                  <div style={{ fontSize: 'var(--text-xs)', color: '#a13f3f', marginTop: '4px' }}>
                    No Mazda model recognised in this name — it will not appear under any model filter on the site.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Year</label>
                  <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Price (KES)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Mileage (km)</label>
                  <input type="number" value={formData.mileage} onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
              </div>

              {/* The rest of the Specification block the storefront prints.
                  These four had no field here, so every car added at the yard
                  went onto the site as a 1.5L Pearl White Sedan whatever it
                  actually was — the defaults could not be corrected. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Engine</label>
                  <input type="text" value={formData.engine || ''} placeholder="2.2L" onChange={(e) => setFormData({ ...formData, engine: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Body</label>
                  <select value={formData.body || ''} onChange={(e) => setFormData({ ...formData, body: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="">Select…</option>
                    {['Hatchback', 'Sedan', 'Wagon', 'SUV', 'Crossover', 'MPV', 'Van', 'Pickup', 'Coupe', 'Convertible'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Colour</label>
                  <input type="text" value={formData.color || ''} placeholder="Pearl White" onChange={(e) => setFormData({ ...formData, color: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Condition</label>
                  <select value={formData.condition || ''} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="">Select…</option>
                    {['Brand New', 'Foreign Used', 'Locally Used'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>
                  Condition notes <span style={{ fontWeight: 400 }}>— printed on the listing as &ldquo;What our inspector found&rdquo;</span>
                </label>
                <textarea rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Fuel Type</label>
                  <select value={formData.fuel} onChange={(e) => setFormData({ ...formData, fuel: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Transmission</label>
                  <select value={formData.trans} onChange={(e) => setFormData({ ...formData, trans: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="Available">Available</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
                {/* Provenance is data, not decoration: the storefront's "Owned by
                    Us" badge and its inspection guarantee both read from here, so
                    it has to be set by whoever lists the car. */}
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Seller</label>
                  <select value={formData.listing || 'owned'} onChange={(e) => setFormData({ ...formData, listing: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    {Object.entries(LISTING_TYPES).map(([id, t]) => (
                      <option key={id} value={id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Where this car sits in the yard's own bookkeeping. Stock ID is
                  issued on save and never shown as editable — it goes on the
                  windscreen card and the logbook file, so it must not drift. */}
              <div style={{ border: '1px solid var(--band-line)', borderRadius: '8px', padding: '14px', background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#16232e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Organisation
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'var(--text-xs)', color: '#5f6b7a' }}>
                    {formData.stockId || 'Stock ID issued on save'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Group</label>
                    <select value={formData.groupId || ''} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                      <option value="">Ungrouped</option>
                      {vehicleGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Stage</label>
                    <select value={formData.stage || 'In Yard'} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                      {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Registration number</label>
                    <input type="text" value={formData.regNumber || ''} placeholder="KDN 412A — blank until registered" onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Current location</label>
                    <input type="text" value={formData.location || ''} placeholder="Thindigua Yard" onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: '#5f6b7a', marginTop: '9px', lineHeight: 1.5 }}>
                  Stage is internal — where the car physically is. It is separate from
                  Status above, which is what customers see on the site.
                </p>
              </div>

              {/* The dossier. These are not optional extras: the storefront
                  prints chassis, grade, inspection and port on the detail page,
                  and the whole "documented before it's driven" promise is these
                  five fields. Until now they could only be set by editing the
                  seed data by hand. */}
              <div style={{ border: '1px solid #e4e8ec', borderRadius: '8px', padding: '14px', background: '#fafbfc' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#16232e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Dossier
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Chassis number</label>
                    <input type="text" value={formData.chassis || ''} placeholder="BM5FS-1204471" onChange={(e) => setFormData({ ...formData, chassis: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Auction grade</label>
                    <input type="text" value={formData.grade || ''} placeholder="4.5 B" onChange={(e) => setFormData({ ...formData, grade: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Inspection</label>
                    <input type="text" value={formData.inspection || ''} placeholder="JEVIC verified" onChange={(e) => setFormData({ ...formData, inspection: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Port of entry</label>
                    <input type="text" value={formData.port || ''} placeholder="Mombasa" onChange={(e) => setFormData({ ...formData, port: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>URL slug</label>
                    <input type="text" value={formData.slug || ''} placeholder="auto-generated from name and year if left blank" onChange={(e) => setFormData({ ...formData, slug: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: 'var(--text-sm)', color: '#333d49', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!formData.odometerVerified} onChange={(e) => setFormData({ ...formData, odometerVerified: e.target.checked })} />
                    Odometer verified
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: 'var(--text-sm)', color: '#333d49', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!formData.dutyPaid} onChange={(e) => setFormData({ ...formData, dutyPaid: e.target.checked })} />
                    Duty paid
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '6px' }}>
                  Photos <span style={{ fontWeight: 400 }}>— the first one is the cover shown on the website</span>
                </label>
                <ImagePicker
                  bucket="vehicle-photos"
                  value={formData.images || []}
                  onChange={(images) => setFormData({ ...formData, images })}
                  max={10}
                />
              </div>

              {saveError && (
                <div style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{saveError}</div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '10px' }}>
                Save Vehicle Listing
              </button>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};
