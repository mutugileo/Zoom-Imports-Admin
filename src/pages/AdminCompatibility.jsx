import React, { useState } from 'react';
import { useApp } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { MAZDA_MODEL_GROUPS, labelForModel } from '@shared/data/mazdaModels';
import { rulePartId } from '@shared/lib/compatibility';
import { Plus, Trash2, X, GitMerge, AlertTriangle } from 'lucide-react';
import { usePagedList, PAGE_SIZE } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';

export const AdminCompatibility = () => {
  const { compatibility, parts, addCompatibilityRule, removeCompatibilityRule } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  /* Blank, not a plausible default. The old one shipped "Brake Pad Set" — a
     name no part in the catalogue has — against "Axio / Corolla", which are
     Toyota models in a Mazda-only yard. Saving the form untouched produced a
     rule that pointed at nothing and matched nothing. */
  const [formData, setFormData] = useState({
    partId: '', model: '', years: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const part = parts.find((p) => String(p.id) === String(formData.partId));
    if (!part) return;
    addCompatibilityRule({
      /* partId is the real link. `part` and `brand` are carried alongside so the
         table stays readable and older rules keep the shape they had. */
      partId: part.id,
      part: part.name,
      brand: part.brand,
      make: 'Mazda',
      modelIds: [formData.model],
      model: formData.model === 'All' ? 'All Models' : labelForModel(formData.model),
      years: formData.years.trim(),
    });
    setIsModalOpen(false);
    setFormData({ partId: '', model: '', years: '' });
  };

  const page = usePagedList(compatibility, PAGE_SIZE, String(compatibility.length));

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        
        {/* Header */}
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: '#16232e' }}>
              Vehicle Compatibility Mapping
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a', marginTop: '2px' }}>
              Map spare parts to vehicle makes, models, and manufacturing year ranges to power search recommendations.
            </p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn-accent">
            <Plus size={16} /> Add Compatibility Mapping
          </button>
        </div>

        {/* Table */}
        <div className="admin-table-card" style={{ background: '#fff', border: '1px solid var(--band-line)', borderRadius: '10px', overflow: 'hidden', marginTop: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Spare Part</th>
                <th>Brand</th>
                <th>Vehicle Make</th>
                <th>Compatible Model(s)</th>
                <th>Year Range</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {page.visible.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: '#16232e' }}>
                    {c.part}
                    {rulePartId(c, parts) == null && (
                      /* The rule points at no part we hold — almost always a
                         part renamed after the rule was written. It matches
                         nothing on the website, so say so here. */
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-xs)', fontWeight: 500, color: '#a13f3f', marginTop: '3px' }}>
                        <AlertTriangle size={12} /> No matching part — this rule does nothing
                      </div>
                    )}
                  </td>
                  <td style={{ color: '#5f6b7a' }}>{c.brand}</td>
                  <td>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-ink)', background: '#e6eff2', padding: '4px 10px', borderRadius: '20px' }}>
                      {c.make}
                    </span>
                  </td>
                  <td>{c.model}</td>
                  <td>{c.years}</td>
                  <td>
                    <button 
                      onClick={() => removeCompatibilityRule(c.id)}
                      style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...page} onChange={page.setPage} noun="rules" />
        </div>

      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: '#16232e' }}>
                Add New Vehicle Compatibility Mapping
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: '#edf1f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Spare part *</label>
                {/* Chosen from the shelf, never typed. A typed name that drifts
                    from the catalogue is a rule that quietly does nothing. */}
                <select required value={formData.partId} onChange={(e) => setFormData({ ...formData, partId: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                  <option value="">Select a part…</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.brand}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Fits model *</label>
                  <select required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }}>
                    <option value="">Select a model…</option>
                    <option value="All">All Mazda models</option>
                    {MAZDA_MODEL_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#5f6b7a', display: 'block', marginBottom: '2px' }}>Year Range (e.g. 2012-2018)</label>
                  <input type="text" value={formData.years} onChange={(e) => setFormData({ ...formData, years: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8dde2', fontSize: 'var(--text-sm)' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '10px' }}>
                Add Mapping Rule
              </button>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};
