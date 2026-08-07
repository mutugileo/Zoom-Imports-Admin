import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Search, X } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';

export const AdminOrders = () => {
  const { orders, ordersLoading, updateOrderStatus, formatKES } = useApp();
  
  /* The table shows `itemsFmt`, a truncated one-line summary. What the yard
     actually needs when picking an order is the lines themselves — which part,
     how many, at what price — so the row opens the record rather than making
     someone read a clipped string. */
  const [detailOrder, setDetailOrder] = useState(null);

  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  const statuses = ['All', 'New', 'Confirmed', 'Processing', 'Ready for Collection', 'Out for Delivery', 'Completed', 'Cancelled'];

  const orderStatusStyle = {
    New: { bg: '#eaf1f6', fg: 'var(--primary-ink)' },
    Confirmed: { bg: 'var(--primary-light)', fg: 'var(--primary-ink)' },
    Processing: { bg: '#fbf1df', fg: 'var(--accent-text)' },
    'Ready for Collection': { bg: '#f3edf8', fg: '#7d5ba6' },
    'Out for Delivery': { bg: '#fdecdf', fg: 'var(--accent-text)' },
    Completed: { bg: '#e7f5ee', fg: '#1c7a4f' },
    Cancelled: { bg: 'var(--bg-cream)', fg: '#6b7480' }
  };

  const filteredOrders = orders.filter(o => {
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    if (search.trim() && !`${o.ref} ${o.customer} ${o.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const page = usePagedList(filteredOrders, PAGE_SIZE, `${filterStatus}|${search.trim().toLowerCase()}`);

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        
        {/* Header */}
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
            Customer Orders & Fulfillment
          </h1>

          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search ref, customer, phone..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%' }} 
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="admin-filter-bar" style={{ padding: '16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statuses.map(st => {
            const count = st === 'All' ? orders.length : orders.filter(o => o.status === st).length;
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? 'none' : '1px solid var(--border-medium)',
                  background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                  color: isActive ? '#000' : 'var(--text-body)'
                }}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="admin-table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Phone Number</th>
                <th>Items Summary</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {orders.length === 0
                      ? 'No orders yet. Parts orders placed on the website arrive here for fulfilment — they are not added by hand.'
                      : 'No orders match this filter.'}
                  </td>
                </tr>
              ) : page.visible.map(o => {
                const style = orderStatusStyle[o.status] || { bg: '#f0f0f0', fg: '#333' };
                return (
                  <tr
                    key={o.ref}
                    onClick={() => setDetailOrder(o)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--primary-ink)', fontFamily: 'monospace' }}>{o.ref}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{o.customer}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{o.phone}</td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', maxWidth: '240px' }}>{o.itemsFmt}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{formatKES(o.total)}</td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: style.bg, color: style.fg }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{o.date}</td>
                    <td>
                      <select
                        value={o.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); updateOrderStatus(o.ref, e.target.value); }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', outline: 'none' }}
                      >
                        <option value="New">New</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Ready for Collection">Ready for Collection</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="orders" />
        </div>

      </div>
      {detailOrder && (
        <OrderDetailModal order={detailOrder} formatKES={formatKES} onClose={() => setDetailOrder(null)} />
      )}
    </AdminLayout>
  );
};

/**
 * The lines behind one order.
 *
 * `items` is the structured record the storefront wrote at checkout — part id,
 * name, quantity and the price actually charged. `itemsFmt` beside it is only
 * a display string, so this reads the array and falls back to the string for
 * any order placed before the structured lines existed.
 *
 * No cost or margin here: this is the same screen Sales Staff use, and what
 * the yard paid for a part is not theirs to see.
 */
const OrderDetailModal = ({ order, formatKES, onClose }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lines = Array.isArray(order.items) ? order.items : [];
  const linesTotal = lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.ref}`}
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '22px 24px 0' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>
              {order.ref}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
              {order.customer} · {order.phone}{order.date ? ` · ${order.date}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '18px 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            <Fact label="Delivery" value={order.delivery} />
            <Fact label="Where to" value={order.location} />
            <Fact label="Email" value={order.email} />
            <Fact label="Status" value={order.status} />
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Items
          </div>

          {lines.length === 0 ? (
            /* Placed before the structured lines existed — say so rather than
               render an empty table that reads as an order with nothing in it. */
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.6, background: 'var(--bg-cream)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px 14px' }}>
              {order.itemsFmt || 'No item lines recorded on this order.'}
            </p>
          ) : (
            <table className="admin-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Part</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit</th>
                  <th style={{ textAlign: 'right' }}>Line</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={`${l.partId ?? 'line'}-${i}`}>
                    <td style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{l.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.qty}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(Number(l.unitPrice) || 0)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatKES((Number(l.unitPrice) || 0) * (Number(l.qty) || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Order total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-dark)' }}>
              {formatKES(order.total)}
            </span>
          </div>

          {/* Only shown when they disagree. The order total is what the customer
              was charged; if the lines no longer add up to it, that is a real
              discrepancy someone should look at, not something to hide. */}
          {lines.length > 0 && Math.round(linesTotal) !== Math.round(Number(order.total) || 0) && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-text)', marginTop: '8px', lineHeight: 1.5 }}>
              The lines add up to {formatKES(linesTotal)}, which does not match the recorded total.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Fact = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: 'var(--text-sm)', color: value ? 'var(--text-dark)' : 'var(--text-dim)', fontWeight: value ? 600 : 400, marginTop: '2px' }}>
      {value || 'not recorded'}
    </div>
  </div>
);
