import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Search } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';

export const AdminOrders = () => {
  const { orders, ordersLoading, updateOrderStatus, formatKES } = useApp();
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  const statuses = ['All', 'New', 'Confirmed', 'Processing', 'Ready for Collection', 'Out for Delivery', 'Completed', 'Cancelled'];

  const orderStatusStyle = {
    New: { bg: '#eaf1f6', fg: 'var(--primary-ink)' },
    Confirmed: { bg: '#e6eff2', fg: 'var(--primary-ink)' },
    Processing: { bg: '#fbf1df', fg: 'var(--accent-text)' },
    'Ready for Collection': { bg: '#f3edf8', fg: '#7d5ba6' },
    'Out for Delivery': { bg: '#fdecdf', fg: 'var(--accent-text)' },
    Completed: { bg: '#e7f5ee', fg: '#1c7a4f' },
    Cancelled: { bg: '#eef0f2', fg: '#6b7480' }
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: '#16232e' }}>
            Customer Orders & Fulfillment
          </h1>

          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '260px' }}>
            <Search size={15} color="#5c6a78" />
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
                  background: isActive ? 'var(--primary)' : '#fff',
                  color: isActive ? '#000' : 'var(--text-body)'
                }}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="admin-table-card" style={{ background: '#fff', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#5f6b7a' }}>Loading orders…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#5f6b7a' }}>
                    {orders.length === 0
                      ? 'No orders yet. Parts orders placed on the website arrive here for fulfilment — they are not added by hand.'
                      : 'No orders match this filter.'}
                  </td>
                </tr>
              ) : page.visible.map(o => {
                const style = orderStatusStyle[o.status] || { bg: '#f0f0f0', fg: '#333' };
                return (
                  <tr key={o.ref}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-ink)', fontFamily: 'monospace' }}>{o.ref}</td>
                    <td style={{ fontWeight: 600, color: '#16232e' }}>{o.customer}</td>
                    <td style={{ color: '#5f6b7a' }}>{o.phone}</td>
                    <td style={{ fontSize: 'var(--text-sm)', color: '#333d49', maxWidth: '240px' }}>{o.itemsFmt}</td>
                    <td style={{ fontWeight: 600, color: '#16232e' }}>{formatKES(o.total)}</td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: style.bg, color: style.fg }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: '#5c6a78' }}>{o.date}</td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.ref, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)', outline: 'none' }}
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
    </AdminLayout>
  );
};
