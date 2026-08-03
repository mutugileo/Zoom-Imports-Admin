import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useReveal, revealStyle } from '../lib/useReveal';
import { Plus, Trash2, Image as ImageIcon, X, AlertTriangle } from 'lucide-react';

const card = {
  background: '#fff',
  border: '1px solid #e1e6eb',
  borderRadius: '26px',
  boxShadow: '0 1px 0 rgba(22, 35, 46, 0.02)',
  overflow: 'hidden',
};

const cardHead = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '20px 24px',
  borderBottom: '1px solid rgba(27,36,48,.08)',
};

const title = { fontSize: 'var(--text-md)', fontWeight: 600, color: '#16232e' };

const label = {
  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#5f6b7a', display: 'block', marginBottom: '4px',
};

const input = {
  width: '100%', padding: '9px 11px', borderRadius: '6px',
  border: '1px solid #d8dde2', fontSize: 'var(--text-sm)', outline: 'none', background: '#fff',
};

export const AdminSiteContent = () => {
  const {
    siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
    vehicles, toggleFeaturedVehicle,
  } = useAdmin();

  const [contact, setContact] = useState(siteContent.contact);
  const [contactSaved, setContactSaved] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [faqDraft, setFaqDraft] = useState(null);

  const [bannersRef, bannersShown] = useReveal();
  const [contactRef, contactShown] = useReveal();
  const [featuredRef, featuredShown] = useReveal();
  const [faqRef, faqShown] = useReveal();

  // Keep the form in step if the stored contact changes underneath it.
  useEffect(() => { setContact(siteContent.contact); }, [siteContent.contact]);

  const contactDirty = JSON.stringify(contact) !== JSON.stringify(siteContent.contact);
  const featuredCount = vehicles.filter((v) => v.featured).length;

  const handleSaveContact = (e) => {
    e.preventDefault();
    saveContact(contact);
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2600);
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: '#16232e' }}>Site Content</h1>
        </div>

        {/* Honest about what actually reaches the public site today */}
        <div
          style={{
            display: 'flex', gap: '11px', alignItems: 'flex-start',
            background: '#fbf1df', border: '1px solid rgba(148,97,24,.25)',
            borderRadius: '8px', padding: '13px 15px', margin: '18px 0 22px',
          }}
        >
          <AlertTriangle size={16} color="#946118" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: '#5c4413' }}>
            <strong>Featured Vehicles is live.</strong> Banners, contact details and FAQs are
            saved here but the public site still reads its own copies — the two apps run on
            separate origins with no shared backend. Wiring them up is a server task.
          </div>
        </div>

        <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', alignItems: 'start' }}>

          {/* Homepage banners */}
          <section ref={bannersRef} style={{ ...card, ...revealStyle(bannersShown) }}>
            <div style={cardHead}>
              <h2 style={title}>Homepage Banners</h2>
              <button
                onClick={() => setBannerOpen(true)}
                style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Plus size={14} /> Add Banner
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {siteContent.banners.length === 0 ? (
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      style={{
                        width: '158px', height: '104px', border: '1.5px dashed #d8dde2',
                        borderRadius: '8px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#5c6a78',
                      }}
                    >
                      <ImageIcon size={22} />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Banner {n}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  {siteContent.banners.map((b) => (
                    <div key={b.id} style={{ width: '158px' }}>
                      <div style={{ position: 'relative', height: '104px', borderRadius: '8px', overflow: 'hidden', background: '#edf1f6', border: '1px solid var(--band-line)' }}>
                        <img src={b.img} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removeBanner(b.id)}
                          aria-label={`Remove ${b.title}`}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(11,21,18,.75)', border: 'none', borderRadius: '999px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={12} color="#fff" />
                        </button>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#16232e', marginTop: '7px' }}>{b.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Contact information */}
          <section ref={contactRef} style={{ ...card, ...revealStyle(contactShown, 1) }}>
            <div style={cardHead}><h2 style={title}>Contact Information</h2></div>
            <form className="admin-form" onSubmit={handleSaveContact} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  ['phone', 'Phone'],
                  ['whatsapp', 'WhatsApp Number'],
                  ['email', 'Email'],
                  ['location', 'Location'],
                ].map(([key, text]) => (
                  <div key={key}>
                    <label style={label} htmlFor={`c-${key}`}>{text}</label>
                    <input
                      id={`c-${key}`}
                      type={key === 'email' ? 'email' : 'text'}
                      value={contact[key] ?? ''}
                      onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
                      style={input}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="submit" className="btn-primary" disabled={!contactDirty} style={{ opacity: contactDirty ? 1 : 0.5, cursor: contactDirty ? 'pointer' : 'not-allowed' }}>
                  Save Changes
                </button>
                {contactSaved && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-ink)', fontWeight: 600 }}>Saved</span>
                )}
              </div>
            </form>
          </section>

          {/* Featured vehicles — this one genuinely drives the site */}
          <section ref={featuredRef} style={{ ...card, ...revealStyle(featuredShown, 2) }}>
            <div style={cardHead}>
              <h2 style={title}>Featured Vehicles</h2>
              <span style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a' }}>{featuredCount} featured</span>
            </div>

            <div style={{ padding: '6px 20px 14px', maxHeight: '440px', overflowY: 'auto' }}>
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '11px 0', borderBottom: '1px solid rgba(27,36,48,.07)',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: '#16232e', fontWeight: v.featured ? 600 : 400 }}>
                    {v.name}
                  </span>

                  <button
                    role="switch"
                    aria-checked={!!v.featured}
                    aria-label={`Feature ${v.name} on the homepage`}
                    onClick={() => toggleFeaturedVehicle(v.id)}
                    style={{
                      width: '42px', height: '23px', borderRadius: '999px', border: 'none',
                      cursor: 'pointer', padding: '2px', flexShrink: 0,
                      background: v.featured ? 'var(--primary-ink)' : '#d8dde2',
                      display: 'flex', justifyContent: v.featured ? 'flex-end' : 'flex-start',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span style={{ width: '19px', height: '19px', borderRadius: '999px', background: '#fff', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs and legal */}
          <section ref={faqRef} style={{ ...card, ...revealStyle(faqShown, 3) }}>
            <div style={cardHead}>
              <h2 style={title}>FAQs &amp; Legal Pages</h2>
              <button
                onClick={() => setFaqDraft({ question: '', answer: '', type: 'FAQ' })}
                style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Plus size={14} /> Add FAQ
              </button>
            </div>

            <div style={{ padding: '6px 20px 14px' }}>
              {siteContent.faqs.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: '#5f6b7a', padding: '18px 0' }}>
                  Nothing published yet. Add the questions customers ask most.
                </p>
              ) : (
                siteContent.faqs.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(27,36,48,.07)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: '#16232e' }}>{f.question}</div>
                      {f.type === 'Legal' && (
                        <span className="badge badge-new" style={{ marginTop: '5px' }}>Legal</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                      <button onClick={() => setFaqDraft(f)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => removeFaq(f.id)} aria-label={`Delete ${f.question}`} style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {bannerOpen && (
        <BannerModal
          onClose={() => setBannerOpen(false)}
          onSave={(banner) => { addBanner(banner); setBannerOpen(false); }}
        />
      )}

      {faqDraft && (
        <FaqModal
          faq={faqDraft}
          onClose={() => setFaqDraft(null)}
          onSave={(faq) => { saveFaq(faq); setFaqDraft(null); }}
        />
      )}

      <style>{`
        @media (max-width: 1180px) {
          .content-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminLayout>
  );
};

const ModalShell = ({ heading, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={heading}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '520px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: '#16232e' }}>{heading}</h3>
        <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: '#edf1f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const BannerModal = ({ onClose, onSave }) => {
  const [title2, setTitle] = useState('');
  const [img, setImg] = useState('');
  const [link, setLink] = useState('');

  return (
    <ModalShell heading="Add Homepage Banner" onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave({ title: title2.trim(), img: img.trim(), link: link.trim() }); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div>
          <label style={label} htmlFor="b-title">Banner title *</label>
          <input id="b-title" required value={title2} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="e.g. December import clearance" />
        </div>
        <div>
          <label style={label} htmlFor="b-img">Image URL *</label>
          <input id="b-img" required value={img} onChange={(e) => setImg(e.target.value)} style={input} placeholder="https://…" />
        </div>
        <div>
          <label style={label} htmlFor="b-link">Links to (optional)</label>
          <input id="b-link" value={link} onChange={(e) => setLink(e.target.value)} style={input} placeholder="/vehicles" />
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: '4px', padding: '10px' }}>
          Add banner
        </button>
      </form>
    </ModalShell>
  );
};

const FaqModal = ({ faq, onClose, onSave }) => {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [type, setType] = useState(faq.type || 'FAQ');

  return (
    <ModalShell heading={faq.id ? 'Edit entry' : 'Add entry'} onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave({ ...faq, question: question.trim(), answer: answer.trim(), type }); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div>
          <label style={label} htmlFor="f-q">Question / page title *</label>
          <input id="f-q" required value={question} onChange={(e) => setQuestion(e.target.value)} style={input} />
        </div>
        <div>
          <label style={label} htmlFor="f-type">Type</label>
          <select id="f-type" value={type} onChange={(e) => setType(e.target.value)} style={input}>
            <option value="FAQ">FAQ</option>
            <option value="Legal">Legal page</option>
          </select>
        </div>
        <div>
          <label style={label} htmlFor="f-a">Answer *</label>
          <textarea id="f-a" required rows="5" value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ ...input, resize: 'vertical' }} />
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: '4px', padding: '10px' }}>
          {faq.id ? 'Save changes' : 'Publish entry'}
        </button>
      </form>
    </ModalShell>
  );
};
