import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { Search } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';

export const AdminEnquiries = () => {
  const { enquiries, enquiriesLoading, updateEnquiryStatus } = useApp();

  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');

  const enquiryStatusStyle = {
    New: { bg: '#eaf1f6', fg: 'var(--primary-ink)' },
    Contacted: { bg: '#fbf1df', fg: 'var(--accent-text)' },
    Resolved: { bg: '#e7f5ee', fg: '#1c7a4f' }
  };

  const filteredEnquiries = enquiries.filter(e => {
    if (filterStatus !== 'All' && e.status !== filterStatus) return false;
    if (search.trim() && !`${e.customer} ${e.vehicle} ${e.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const page = usePagedList(filteredEnquiries, PAGE_SIZE, `${filterStatus}|${search.trim().toLowerCase()}`);

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        
        {/* Header */}
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
            Customer Enquiries & Test Drive Requests
          </h1>

          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search customer, vehicle..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%' }} 
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="admin-filter-bar" style={{ padding: '16px 0', display: 'flex', gap: '8px' }}>
          {['All', 'New', 'Contacted', 'Resolved'].map(st => {
            const count = st === 'All' ? enquiries.length : enquiries.filter(e => e.status === st).length;
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
                <th>Customer</th>
                <th>Phone Number</th>
                <th>Target Vehicle / Topic</th>
                <th>Enquiry Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {enquiriesLoading ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading enquiries…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {enquiries.length === 0
                      ? 'No enquiries yet. Test drive, callback and quotation requests from the website land here.'
                      : 'No enquiries match this filter.'}
                  </td>
                </tr>
              ) : page.visible.map(e => {
                const style = enquiryStatusStyle[e.status] || { bg: '#f0f0f0', fg: '#333' };
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{e.customer}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.phone}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-ink)' }}>{e.vehicle}</td>
                    <td>{e.type}</td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: style.bg, color: style.fg }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{e.date}</td>
                    <td>
                      <select
                        value={e.status}
                        onChange={(ev) => updateEnquiryStatus(e.id, ev.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', outline: 'none' }}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="enquiries" />
        </div>

      </div>
    </AdminLayout>
  );
};
