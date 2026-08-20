import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { VehicleDetailModal } from '../components/VehicleDetailModal';
import { RecordSaleModal } from '../components/RecordSaleModal';
import { Invoice, quotationFor } from '../components/Invoice';
import { totalCost, profit, profitMargin, formatMargin, hasLedger } from '@shared/lib/costing';
import {
  Search,
  RotateCcw,
  Trash2,
  Tag,
  ReceiptText,
  Eye,
  History,
  CheckCircle2,
  Archive,
  Car,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

/**
 * History & Recycle Bin — tracks all completed sales and archived/deleted vehicles.
 *
 * Provides full visibility into historical performance, sales records, invoices,
 * and a safety net (Recycle Bin) to restore accidentally deleted listings.
 */
export const AdminHistory = () => {
  const {
    vehicles,
    vehiclesLoading,
    can,
    vehicleCosts,
    deleteVehicle,
    restoreVehicle,
    toggleFeaturedVehicle,
    saleFor,
    buyerForVehicle,
    formatKES,
  } = useApp();

  const mayWrite = can('catalogue:write');
  const mayDelete = can('catalogue:delete');
  const mayCosts = can('costs:view');

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'sold' | 'archived'
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [saleVehicle, setSaleVehicle] = useState(null);
  const [invoiceVehicle, setInvoiceVehicle] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  // Historical vehicles: either marked as 'Sold' or 'Archived' (Recycle Bin)
  const historyVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === 'Sold' || v.status === 'Archived');
  }, [vehicles]);

  const soldVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === 'Sold');
  }, [vehicles]);

  const archivedVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === 'Archived');
  }, [vehicles]);

  // Aggregate financial metrics for completed sales
  const salesMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let costedCount = 0;

    soldVehicles.forEach((v) => {
      const sale = saleFor(v.id);
      const achievedPrice = Number(sale?.price) || Number(v.price) || 0;
      totalRevenue += achievedPrice;

      const costs = vehicleCosts[v.id];
      if (hasLedger(costs)) {
        totalProfit += profit(costs, achievedPrice);
        costedCount += 1;
      }
    });

    const averageMargin = totalRevenue > 0 && costedCount > 0 ? (totalProfit / totalRevenue) * 100 : null;

    return {
      totalSold: soldVehicles.length,
      totalArchived: archivedVehicles.length,
      totalRevenue,
      totalProfit,
      averageMargin,
    };
  }, [soldVehicles, archivedVehicles, saleFor, vehicleCosts]);

  // Filtered dataset according to active tab, search query, and model
  const filteredList = useMemo(() => {
    let list = historyVehicles;
    if (activeTab === 'sold') list = soldVehicles;
    if (activeTab === 'archived') list = archivedVehicles;

    if (modelFilter !== 'all') {
      list = list.filter((v) => (v.name || '').toLowerCase().includes(modelFilter.toLowerCase()));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v) => {
        const buyer = buyerForVehicle(v.id);
        const sale = saleFor(v.id);
        const buyerName = buyer?.name || sale?.buyer || '';
        const matchString = `${v.name} ${v.make} ${v.year} ${v.stockId} ${buyerName}`.toLowerCase();
        return matchString.includes(q);
      });
    }

    return list;
  }, [historyVehicles, soldVehicles, archivedVehicles, activeTab, modelFilter, search, buyerForVehicle, saleFor]);

  const page = usePagedList(
    filteredList,
    PAGE_SIZE,
    `${activeTab}|${modelFilter}|${search.trim().toLowerCase()}`
  );

  const handleRestore = async (v) => {
    setActionNotice('');
    const result = await restoreVehicle(v.id, 'Available');
    if (result.ok) {
      setActionNotice(`Restored "${v.name} (${v.year})" to active inventory.`);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  const handlePermanentDelete = async (v) => {
    setActionNotice('');
    const confirmed = window.confirm(
      `PERMANENT PURGE WARNING:\n\nAre you sure you want to permanently delete "${v.name} (${v.year})"?\n\nThis will completely purge this vehicle and its cost/sale records from the database. This action CANNOT be undone.`
    );
    if (!confirmed) return;

    const result = await deleteVehicle(v.id);
    if (result.ok) {
      setActionNotice(`Permanently deleted "${v.name}".`);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  const handleReopenToLot = async (v) => {
    setActionNotice('');
    const confirmed = window.confirm(
      `Re-open "${v.name} (${v.year})" back to active lot?\n\nThis will mark the vehicle as "Available" so it shows on the active inventory and website again.`
    );
    if (!confirmed) return;

    const result = await restoreVehicle(v.id, 'Available');
    if (result.ok) {
      setActionNotice(`Re-opened "${v.name}" to Available inventory.`);
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        {/* Header */}
        <div
          className="admin-page-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 0 20px',
            borderBottom: '1px solid var(--band-line)',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--primary-ink)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              <History size={14} /> Historical Ledger &amp; Recycle Bin
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)', margin: 0 }}>
              Vehicle History &amp; Archive
            </h1>
          </div>

          {actionNotice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                color: 'var(--primary-ink)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                border: '1px solid rgba(27, 85, 102, 0.25)',
              }}
            >
              <CheckCircle2 size={16} /> {actionNotice}
            </div>
          )}
        </div>

        {/* Metrics Summary Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            padding: '22px 0',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--band-line)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' }}>Sold Vehicles</span>
              <CheckCircle2 size={16} color="var(--primary-ink)" />
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-dark)' }}>
              {salesMetrics.totalSold} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>units</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--band-line)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' }}>Realized Revenue</span>
              <DollarSign size={16} color="var(--primary-ink)" />
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-dark)' }}>
              {formatKES(salesMetrics.totalRevenue)}
            </div>
          </div>

          {mayCosts && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--band-line)',
                borderRadius: '10px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' }}>Realized Profit</span>
                <TrendingUp size={16} color="var(--primary-ink)" />
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: salesMetrics.totalProfit >= 0 ? 'var(--primary-ink)' : '#a13f3f' }}>
                {formatKES(salesMetrics.totalProfit)}
                {salesMetrics.averageMargin !== null && (
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginLeft: '8px', color: 'var(--text-muted)' }}>
                    ({formatMargin(salesMetrics.averageMargin)})
                  </span>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--band-line)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase' }}>Recycle Bin</span>
              <Archive size={16} color="#c27803" />
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-dark)' }}>
              {salesMetrics.totalArchived} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>archived</span>
            </div>
          </div>
        </div>

        {/* Filter and Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '14px 0 20px',
            flexWrap: 'wrap',
          }}
        >
          {/* Pill Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All History', count: historyVehicles.length },
              { id: 'sold', label: 'Sold Units', count: soldVehicles.length },
              { id: 'archived', label: 'Recycle Bin', count: archivedVehicles.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isActive ? 'none' : '1px solid var(--border-medium)',
                    background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                    color: isActive ? 'var(--on-primary, #fff)' : 'var(--text-body)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 150ms ease',
                  }}
                >
                  {tab.id === 'archived' && <Archive size={13} />}
                  {tab.label}
                  <span
                    style={{
                      fontSize: '11px',
                      opacity: isActive ? 0.9 : 0.65,
                      fontWeight: 700,
                    }}
                  >
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search model, year, stock ID, buyer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid var(--field-border)',
                background: 'var(--bg-card)',
                color: 'var(--text-dark)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>
        </div>

        {/* History Table */}
        <div className="table-responsive" style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden' }}>
          <table className="admin-table vehicle-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-cream)', borderBottom: '1px solid var(--band-line)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', width: '56px' }}>Photo</th>
                <th style={{ padding: '12px 14px' }}>Stock ID</th>
                <th style={{ padding: '12px 16px' }}>Vehicle</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Asking Price</th>
                <th style={{ padding: '12px 14px' }}>Achieved / Sold</th>
                {mayCosts && <th style={{ padding: '12px 14px' }}>Landed Cost</th>}
                {mayCosts && <th style={{ padding: '12px 14px' }}>Profit</th>}
                <th style={{ padding: '12px 14px' }}>Buyer &amp; Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {page.visible.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <History size={32} opacity={0.4} />
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {activeTab === 'archived'
                          ? 'Recycle Bin is empty. No deleted or archived vehicles.'
                          : activeTab === 'sold'
                          ? 'No sold vehicles found matching your criteria.'
                          : 'No historical records found.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                page.visible.map((v) => {
                  const sale = saleFor(v.id);
                  const buyer = buyerForVehicle(v.id);
                  const costs = vehicleCosts[v.id];
                  const costTotal = hasLedger(costs) ? totalCost(costs) : null;
                  const achievedPrice = sale?.price ?? (v.status === 'Sold' ? v.price : null);
                  const isArchived = v.status === 'Archived';
                  const isSold = v.status === 'Sold';
                  const itemProfit = isSold && costTotal !== null && achievedPrice ? achievedPrice - costTotal : null;

                  return (
                    <tr
                      key={v.id}
                      className="vehicle-row"
                      style={{ borderBottom: '1px solid var(--band-line)', opacity: isArchived ? 0.78 : 1 }}
                      onClick={() => setDetailVehicle(v)}
                    >
                      {/* Photo Thumbnail */}
                      <td style={{ padding: '10px 14px' }}>
                        {v.img ? (
                          <img
                            src={v.img}
                            alt={v.name}
                            loading="lazy"
                            style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <span
                            style={{
                              width: '48px',
                              height: '36px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <Car size={16} />
                          </span>
                        )}
                      </td>

                      {/* Stock ID */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        {v.stockId || '—'}
                      </td>

                      {/* Vehicle Name & Specs */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: 'var(--text-sm)' }}>
                          {v.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({v.year})</span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          {Number(v.mileage || 0).toLocaleString()} km &middot; {v.fuel || 'Petrol'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px' }}>
                        {isArchived ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(194, 120, 3, 0.12)',
                              color: '#c27803',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            <Archive size={11} /> Archived
                          </span>
                        ) : (
                          <span className="badge badge-sold">
                            Sold
                          </span>
                        )}
                      </td>

                      {/* Asking Listing Price */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        {formatKES(v.price)}
                      </td>

                      {/* Achieved Sold Price */}
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {isSold && achievedPrice ? (
                          <span>
                            {formatKES(achievedPrice)}
                            {achievedPrice < v.price && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                                (-{formatKES(v.price - achievedPrice)})
                              </div>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Landed Cost */}
                      {mayCosts && (
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                          {costTotal !== null ? formatKES(costTotal) : '—'}
                        </td>
                      )}

                      {/* Profit */}
                      {mayCosts && (
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                          {itemProfit !== null ? (
                            <span style={{ color: itemProfit >= 0 ? 'var(--primary-ink)' : '#a13f3f' }}>
                              {formatKES(itemProfit)}
                              {achievedPrice && (
                                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  ({((itemProfit / achievedPrice) * 100).toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}

                      {/* Buyer & Date */}
                      <td style={{ padding: '10px 14px', fontSize: 'var(--text-xs)' }}>
                        {isSold ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                              {buyer?.name || sale?.buyer || 'Direct walk-in'}
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                              {sale?.date || buyer?.saleDate || '—'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <div
                          className="row-actions"
                          style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Invoice button for sold vehicles */}
                          {isSold && (
                            <button
                              type="button"
                              className="row-action is-primary"
                              onClick={() => setInvoiceVehicle(v)}
                              title="View official customer invoice"
                            >
                              <ReceiptText size={14} /> Invoice
                            </button>
                          )}

                          {/* Edit sale button for sold vehicles */}
                          {isSold && (
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => setSaleVehicle(v)}
                              title="Edit sale details"
                            >
                              <Tag size={14} /> Sale
                            </button>
                          )}

                          {/* Re-open / Undo sale */}
                          {isSold && mayWrite && (
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => handleReopenToLot(v)}
                              title="Deal fell through? Re-open vehicle back to active available lot"
                            >
                              <RotateCcw size={14} /> Re-open
                            </button>
                          )}

                          {/* Restore button for archived / deleted vehicles */}
                          {isArchived && mayWrite && (
                            <button
                              type="button"
                              className="row-action is-primary"
                              onClick={() => handleRestore(v)}
                              style={{ fontWeight: 700, color: 'var(--primary-ink)' }}
                              title="Restore vehicle back to active inventory"
                            >
                              <RotateCcw size={14} /> Restore
                            </button>
                          )}

                          {/* View details */}
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setDetailVehicle(v)}
                            title="View vehicle details"
                          >
                            <Eye size={14} /> View
                          </button>

                          {/* Permanent delete for archived items */}
                          {isArchived && mayDelete && (
                            <button
                              type="button"
                              className="row-action is-danger"
                              onClick={() => handlePermanentDelete(v)}
                              title="Permanently delete from database"
                            >
                              <Trash2 size={14} /> Purge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--band-line)' }}>
            <Pagination {...page} onChange={page.setPage} noun="historical vehicles" />
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailVehicle && (
        <VehicleDetailModal
          vehicle={vehicles.find((v) => v.id === detailVehicle.id) || detailVehicle}
          onClose={() => setDetailVehicle(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleFeatured={toggleFeaturedVehicle}
          onRecordSale={(v) => {
            setDetailVehicle(null);
            setSaleVehicle(v);
          }}
        />
      )}

      {/* Sale Modal */}
      {saleVehicle && (
        <RecordSaleModal vehicle={saleVehicle} onClose={() => setSaleVehicle(null)} />
      )}

      {/* Invoice Modal */}
      {invoiceVehicle && (
        <Invoice
          buyer={buyerForVehicle(invoiceVehicle.id) ?? quotationFor(invoiceVehicle)}
          onClose={() => setInvoiceVehicle(null)}
        />
      )}
    </AdminLayout>
  );
};
