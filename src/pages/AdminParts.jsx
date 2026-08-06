import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { stockLabel, stockClass } from '@shared/lib/format';
import { PART_CATEGORY_GROUPS } from '@shared/data/partCategories';
import { MAZDA_MODEL_GROUPS } from '@shared/data/mazdaModels';
import { AdminLayout } from './AdminLayout';
import { Search, Plus, Edit2, Trash2, X, Wrench } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { ImagePicker } from '../components/ImagePicker';

export const AdminParts = () => {
  const { parts, partsLoading, savePart, deletePart, savePartCost, partCostFor, setPartApproval, formatKES, can, compatibility } = useApp();

  const mayWrite = can('catalogue:write');
  const mayDelete = can('catalogue:delete');

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  /* Held apart from formData on purpose: the buy price must not ride along in
     the object handed to savePart, which writes the record the storefront
     reads. It goes to its own store. */
  const [buyPrice, setBuyPrice] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [saveError, setSaveError] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    brand: 'Mazda Genuine',
    category: 'Engine Parts',
    price: 5000,
    promo: null,
    compat: '',
    models: [],
    stock: 15,
    sku: '',
    partNumber: '',
    img: null,
    description: '',
  });

  const filteredParts = parts.filter(p => {
    if (search.trim() && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleOpenAddModal = () => {
    setEditingPart(null);
    setFormData({
      id: null,
      name: '',
      brand: 'Mazda Genuine',
      category: 'Engine Parts',
      price: 4500,
      promo: null,
      compat: '',
      stock: 20,
      sku: '',
      partNumber: '',
      img: null,
      description: ''
    });
    setBuyPrice('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (part) => {
    setEditingPart(part);
    /* Fitment is edited here now, so the form has to arrive holding whatever
       is already on record for this part. */
    /* The union of both sources, not one or the other. A part can carry a
       model in its own `compat` field AND a rule naming different ones — this
       catalogue has exactly that case. Seeding from the rule alone would drop
       the compat model the moment someone opened and saved the part, silently
       narrowing what the shop thinks it fits. Showing both lets whoever is
       looking untick whichever is wrong. */
    const rule = compatibility.find((c) => c.partId === part.id);
    const models = [...new Set([...(rule?.modelIds ?? []), ...(part.compat ? [part.compat] : [])])];
    setFormData({ ...part, models });
    setBuyPrice(partCostFor(part.id) ?? '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    const result = await savePart(formData);
    if (!result.ok) { setSaveError(result.reason || 'Could not save this part.'); return; }
    /* Editing an existing part has an id to key the cost by. A brand-new part
       does not yet — its id is issued inside savePart — so the buy price is
       captured on the next edit rather than guessed at here. */
    if (formData.id) await savePartCost(formData.id, buyPrice);
    setIsModalOpen(false);
  };

  const page = usePagedList(filteredParts, PAGE_SIZE, search.trim().toLowerCase());

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        
        {/* Header */}
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>
            Spare Parts Management
          </h1>

          {mayWrite && (
          <button onClick={handleOpenAddModal} className="btn-accent">
            <Plus size={16} /> Add Spare Part
          </button>
          )}
        </div>

        {/* Search */}
        <div className="admin-filter-bar" style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Total Catalog Items: <strong>{parts.length}</strong>
          </div>

          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '7px 12px', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search parts by name..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              style={{ border: 'none', outline: 'none', fontSize: 'var(--text-sm)', width: '100%' }} 
            />
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Part Title & Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partsLoading ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading parts…</td></tr>
              ) : page.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {parts.length === 0
                      ? 'No parts yet. Use “Add Spare Part” to add your first item to the catalogue.'
                      : 'No parts match this search.'}
                  </td>
                </tr>
              ) : page.visible.map(p => {
                return (
                  <tr key={p.id}>
                    <td>
                      {p.img ? (
                        <img src={p.img} alt={p.name} style={{ width: '46px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <span
                          aria-hidden="true"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '36px', borderRadius: '6px', background: 'var(--bg-app)', color: '#8a97a5' }}
                        >
                          <Wrench size={15} strokeWidth={1.8} />
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{p.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{p.brand} · Fits {p.compat}</div>
                    </td>
                    <td>{p.category}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-ink)' }}>
                      {formatKES(p.promo || p.price)}
                      {p.promo && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '4px' }}>{formatKES(p.price)}</span>}
                    </td>
                    <td>{p.stock} units</td>
                    <td>
                      <span className={`badge badge-${stockClass(p.stock)}`}>
                        {stockLabel(p.stock)}
                      </span>
                      {/* Seller submissions wait; staff entries are live on save. */}
                      {p.approvalStatus !== 'Approved' && (
                        <div style={{ marginTop: '5px' }}>
                          <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-ink)' }}>
                            {p.approvalStatus === 'Rejected' ? 'Rejected' : 'Not on site'}
                          </span>
                          {mayWrite && (
                            <button
                              onClick={() => setPartApproval(p.id, 'Approved')}
                              style={{ display: 'block', marginTop: '4px', border: 'none', background: 'transparent', padding: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Approve for website
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {mayWrite && (
                          <button onClick={() => handleOpenEditModal(p)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', cursor: 'pointer', fontWeight: 600 }}>
                            <Edit2 size={15} /> Edit
                          </button>
                        )}
                        {mayDelete && (
                          <button onClick={() => deletePart(p.id)} style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', fontWeight: 600 }}>
                            <Trash2 size={15} /> Delete
                          </button>
                        )}
                        {!mayWrite && (
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="parts" />
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>
                {editingPart ? 'Edit Spare Part' : 'Add New Spare Part'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Part Title *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Brand / OEM</label>
                  <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Category</label>
                  {/* Same taxonomy the shop filters by. Kept as two hardcoded
                      lists, the admin could file a part under a category the
                      storefront had no way to show. */}
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }}>
                    {PART_CATEGORY_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Regular Price (KES)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Promo Price (KES)</label>
                  <input type="number" value={formData.promo || ''} onChange={(e) => setFormData({ ...formData, promo: e.target.value ? Number(e.target.value) : null })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-text)', display: 'block', marginBottom: '2px' }}>
                    Buy price (KES) &mdash; internal
                  </label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder={formData.id ? 'Not set' : 'Save first, then edit to set'}
                    disabled={!formData.id}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Stock Quantity</label>
                  <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
              </div>

              {/* Everything below is printed on the shop's part card and detail
                  page. None of it had a field here: the stock code and OEM
                  number did not exist on a new part at all, and fitment, photo
                  and description were frozen at whatever the defaults said. A
                  part added at the counter reached the website with a stranger's
                  photograph and a blank spec plate. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Our stock code (SKU)</label>
                  <input type="text" value={formData.sku || ''} placeholder="ZM-P12" onChange={(e) => setFormData({ ...formData, sku: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    OEM part number <span style={{ fontWeight: 400 }}>— blank shows &ldquo;on request&rdquo;</span>
                  </label>
                  <input type="text" value={formData.partNumber || ''} onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Fits which Mazda models</label>
                {/* Chosen here rather than on the Compatibility screen. A part
                    almost always fits more than one model, and making that a
                    second trip meant it usually never happened — the rules
                    table sat empty while every part carried a single model in
                    its own text field, and the shop's three surfaces each
                    answered the fitment question differently as a result.

                    Saving writes one rule for this part with every model
                    ticked, and keeps `compat` as the first so the older
                    text-based matching still resolves. */}
                <div style={{ border: '1px solid var(--field-border)', borderRadius: '6px', maxHeight: '190px', overflowY: 'auto', padding: '8px 10px', background: 'var(--bg-card)' }}>
                  {MAZDA_MODEL_GROUPS.map((g) => (
                    <div key={g.group} style={{ marginBottom: '8px' }}>
                      <div className="mono" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                        {g.group}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                        {g.models.map((m) => {
                          const on = (formData.models ?? []).includes(m.id);
                          return (
                            <label key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', color: 'var(--text-body)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...(formData.models ?? []), m.id]
                                    : (formData.models ?? []).filter((x) => x !== m.id);
                                  setFormData({ ...formData, models: next, compat: next[0] ?? '' });
                                }}
                              />
                              {m.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {(formData.models ?? []).length === 0
                    ? 'No models ticked — the part will show "Check fitment" on the site.'
                    : `Fits ${(formData.models ?? []).length} model${(formData.models ?? []).length === 1 ? '' : 's'}.`}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Photo</label>
                {/* A part carries one photo, so the picker is capped at one and
                    bridged to the single `img` column as a one-item list. */}
                <ImagePicker
                  bucket="part-photos"
                  value={formData.img ? [formData.img] : []}
                  onChange={(imgs) => setFormData({ ...formData, img: imgs[0] ?? null })}
                  max={1}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Description</label>
                <textarea rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {saveError && (
                <div style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{saveError}</div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '10px' }}>
                Save Spare Part
              </button>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};
