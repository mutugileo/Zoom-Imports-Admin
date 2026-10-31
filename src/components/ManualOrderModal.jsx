import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AdminContext';
import { Search, Plus, Trash2, X, FileText, CheckCircle2 } from 'lucide-react';

export const ManualOrderModal = ({ onClose, onCreated }) => {
  const { parts, partsLoading, createOrder, formatKES } = useApp();

  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [delivery, setDelivery] = useState('Pick Up (Yard)');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [paymentRef, setPaymentRef] = useState('');

  const [partSearch, setPartSearch] = useState('');
  const [selectedLines, setSelectedLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Search filter for parts
  const searchResults = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return [];
    return parts
      .filter((p) => {
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesPartNo = (p.partNumber || '').toLowerCase().includes(q);
        const matchesCompat = (p.compat || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        return matchesName || matchesPartNo || matchesCompat || matchesSku;
      })
      .slice(0, 8);
  }, [parts, partSearch]);

  const addLine = (part) => {
    const existingIndex = selectedLines.findIndex((l) => l.partId === part.id);
    if (existingIndex >= 0) {
      const updated = [...selectedLines];
      updated[existingIndex].qty += 1;
      setSelectedLines(updated);
    } else {
      setSelectedLines([
        ...selectedLines,
        {
          partId: part.id,
          name: part.name,
          partNumber: part.partNumber || '',
          qty: 1,
          unitPrice: Number(part.promo || part.price) || 0,
          stock: part.stock != null ? part.stock : null,
        },
      ]);
    }
    setPartSearch('');
  };

  const updateLineQty = (index, qty) => {
    const updated = [...selectedLines];
    updated[index].qty = Math.max(1, Number(qty) || 1);
    setSelectedLines(updated);
  };

  const updateLinePrice = (index, price) => {
    const updated = [...selectedLines];
    updated[index].unitPrice = Math.max(0, Number(price) || 0);
    setSelectedLines(updated);
  };

  const removeLine = (index) => {
    setSelectedLines(selectedLines.filter((_, i) => i !== index));
  };

  const total = selectedLines.reduce(
    (sum, l) => sum + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.trim()) {
      setError('Please enter a customer or company name.');
      return;
    }
    if (selectedLines.length === 0) {
      setError('Please add at least one spare part line item.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      customer: customer.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      location: location.trim() || null,
      delivery,
      items: selectedLines.map((l) => ({
        partId: l.partId,
        name: l.name,
        partNumber: l.partNumber,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
      total,
      status: paymentStatus === 'Paid' ? 'Completed' : 'Confirmed',
      paymentStatus,
      paymentMethod: paymentStatus === 'Unpaid' ? '' : paymentMethod,
      paymentRef: paymentRef.trim() || '',
      date: new Date().toISOString().slice(0, 10),
    };

    const res = await createOrder(payload);
    setSubmitting(false);

    if (res.ok) {
      if (onCreated) onCreated(res.order);
      onClose();
    } else {
      setError(res.reason || 'Could not save the manual order.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="Create Spare Part Invoice"
        style={{ maxWidth: '780px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--band-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--primary)" />
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-dark)' }}>
              New Spare Part Invoice / Counter Order
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          {error && (
            <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--text-sm)', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Customer Details */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
              1. Customer Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label className="field-label">Customer / Garage Name *</label>
                <input
                  type="text"
                  className="field"
                  required
                  placeholder="e.g. John Kamau / AutoCraft"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Phone Number</label>
                <input
                  type="text"
                  className="field"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Email (Optional)</label>
                <input
                  type="email"
                  className="field"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Search & Add Spare Parts */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
              2. Add Spare Parts From Catalogue
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '8px 12px' }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by part name, part number (e.g. SH01-14-302), or Mazda model..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%', background: 'transparent' }}
                />
                {partSearch && (
                  <button type="button" onClick={() => setPartSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                  borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 10,
                  maxHeight: '260px', overflowY: 'auto'
                }}>
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addLine(p)}
                      style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-cream)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-dark)' }}>{p.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {p.partNumber ? `Part #${p.partNumber} · ` : ''}{p.compat || 'Universal Mazda'}
                          {p.stock != null ? ` · Stock: ${p.stock}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--primary-ink)' }}>
                          {formatKES(Number(p.promo || p.price) || 0)}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', background: 'var(--primary-light)', color: 'var(--primary-ink)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                          + Add
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Line Items Table */}
            <div style={{ marginTop: '14px', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="admin-table" style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Unit Price (KES)</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Total (KES)</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLines.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        No items added yet. Search above to add parts.
                      </td>
                    </tr>
                  ) : (
                    selectedLines.map((l, idx) => (
                      <tr key={`${l.partId || 'line'}-${idx}`}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{l.name}</div>
                          {l.partNumber && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              #{l.partNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            value={l.qty}
                            onChange={(e) => updateLineQty(idx, e.target.value)}
                            style={{ width: '60px', padding: '4px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--field-border)', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={l.unitPrice}
                            onChange={(e) => updateLinePrice(idx, e.target.value)}
                            style={{ width: '110px', padding: '4px 6px', textAlign: 'right', borderRadius: '4px', border: '1px solid var(--field-border)', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {formatKES(l.qty * l.unitPrice)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', padding: '4px' }}
                            title="Remove line"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedLines.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '16px', marginTop: '12px', paddingRight: '12px' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Order Total:</span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-dark)' }}>
                  {formatKES(total)}
                </span>
              </div>
            )}
          </div>

          {/* Fulfillment & Payment */}
          <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
              3. Fulfillment & Payment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label className="field-label">Delivery / Collection</label>
                <select className="field" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                  <option value="Pick Up (Yard)">Pick Up (Yard Counter)</option>
                  <option value="Same Day Nairobi">Same Day Nairobi Delivery</option>
                  <option value="Countrywide Parcel">Countrywide Parcel / Courier</option>
                </select>
              </div>
              <div>
                <label className="field-label">Destination / Workshop</label>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. Kiambu Road / Thika"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Payment Status</label>
                <select className="field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="Paid">Paid in Full</option>
                  <option value="Part paid">Part Paid / Deposit</option>
                  <option value="Unpaid">Unpaid / On Account</option>
                </select>
              </div>
              <div>
                <label className="field-label">Payment Method</label>
                <select className="field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={paymentStatus === 'Unpaid'}>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank transfer">Bank Transfer (EFT/RTGS)</option>
                  <option value="Cash">Cash at Yard</option>
                  <option value="Card">Card Terminal</option>
                </select>
              </div>
              <div>
                <label className="field-label">Reference / Code</label>
                <input
                  type="text"
                  className="field"
                  placeholder="M-Pesa code or receipt #"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  disabled={paymentStatus === 'Unpaid'}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Generating Invoice…' : 'Save & Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
