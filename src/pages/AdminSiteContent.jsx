import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLayout } from './AdminLayout';
import { useReveal, revealStyle } from '../lib/useReveal';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import { supabase } from '@shared/lib/supabaseClient';
import { friendlyError } from '@shared/lib/friendlyError';

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--field-border)',
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

const title = { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-dark)' };

const label = {
  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px',
};

const input = {
  width: '100%', padding: '9px 11px', borderRadius: '6px',
  border: '1px solid var(--field-border)', fontSize: 'var(--text-sm)', outline: 'none', background: 'var(--bg-card)',
};

export const AdminSiteContent = () => {
  const {
    siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
    billing, saveBilling,
    bankAccounts, saveBankAccount, deleteBankAccount,
    settings, setSetting,
    vehicles, toggleFeaturedVehicle,
  } = useAdmin();

  const EMPTY_CONTACT = { phone: '', whatsapp: '', email: '', location: '' };
  // siteContent.contact is null until the fetch from site_contact resolves —
  // an empty shape here means the form can render immediately instead of
  // crashing on contact.phone before that first load completes.
  const [contact, setContact] = useState(siteContent.contact ?? EMPTY_CONTACT);
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [faqDraft, setFaqDraft] = useState(null);
  const [bankDraft, setBankDraft] = useState(null);

  /* `billing` is null until the fetch resolves, and stays null for a role that
     cannot read the table — the empty shape keeps the form renderable either
     way rather than crashing on billing.bankName. */
  const EMPTY_BILLING = {
    companyName: '', poBox: '', bankName: '', bankBranch: '',
    bankAccountNo: '', bankAccountName: '',
  };
  const [billingForm, setBillingForm] = useState(billing ?? EMPTY_BILLING);
  const [billingSaved, setBillingSaved] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);

  const [bannersRef, bannersShown] = useReveal();
  const [contactRef, contactShown] = useReveal();
  const [billingRef, billingShown] = useReveal();
  const [featuredRef, featuredShown] = useReveal();
  const [faqRef, faqShown] = useReveal();

  // Keep the form in step if the stored contact changes underneath it.
  useEffect(() => { if (siteContent.contact) setContact(siteContent.contact); }, [siteContent.contact]);
  useEffect(() => { if (billing) setBillingForm(billing); }, [billing]);

  const contactDirty = JSON.stringify(contact) !== JSON.stringify(siteContent.contact ?? EMPTY_CONTACT);
  const billingDirty = JSON.stringify(billingForm) !== JSON.stringify(billing ?? EMPTY_BILLING);
  const featuredCount = vehicles.filter((v) => v.featured).length;

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactBusy(true);
    const result = await saveContact(contact);
    setContactBusy(false);
    if (!result.ok) { setContactError(result.reason); return; }
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2600);
  };

  const handleSaveBilling = async (e) => {
    e.preventDefault();
    setBillingError('');
    setBillingBusy(true);
    const result = await saveBilling(billingForm);
    setBillingBusy(false);
    if (!result.ok) { setBillingError(result.reason); return; }
    setBillingSaved(true);
    setTimeout(() => setBillingSaved(false), 2600);
  };

  return (
    <AdminLayout>
      <div className="admin-page" style={{ padding: '0 32px 32px' }}>
        <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', borderBottom: '1px solid var(--band-line)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-dark)' }}>Site Content</h1>
        </div>

        {settings.length > 0 && (
          <section style={{ ...card, marginBottom: '20px' }}>
            <div style={cardHead}><h2 style={title}>Website switches</h2></div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {settings.map((sw) => (
                <div key={sw.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)' }}>{sw.label}</div>
                    {sw.description && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.55, maxWidth: '62ch' }}>
                        {sw.description}
                      </div>
                    )}
                  </div>
                  <button
                    role="switch"
                    aria-checked={sw.enabled}
                    aria-label={sw.label}
                    onClick={() => setSetting(sw.key, !sw.enabled)}
                    style={{
                      width: '42px', height: '23px', borderRadius: '999px', border: 'none',
                      cursor: 'pointer', padding: '2px', flexShrink: 0,
                      background: sw.enabled ? 'var(--primary-ink)' : 'var(--field-border)',
                      display: 'flex', justifyContent: sw.enabled ? 'flex-end' : 'flex-start',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span style={{ width: '19px', height: '19px', borderRadius: '999px', background: 'var(--bg-card)', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/*
          Two columns that pack independently, rather than five cards dropped
          into a two-column grid.

          A grid aligns its rows: whichever card in a row is tallest sets the
          height of both, so the shorter one leaves a hole underneath it before
          the next row starts. With an empty Banners card beside the Contact
          form that hole was most of a screen. Each column is its own flex
          stack here, so a card starts where the one above it ended.

          The cards sit in the same columns they always did — only the gaps are
          gone. Below 1180px the grid collapses to one column and the two
          stacks fall in on each other.
        */}
        <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', alignItems: 'start', marginTop: '22px' }}>

          <div className="content-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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

            {/* What this feature is for. The strip is conditional, so an empty
                list is a working state rather than an unfinished one. */}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, padding: '14px 20px 0', margin: 0 }}>
              Upload a banner when you have a real promotion — a sale, a
              shipment arriving, a service offer. The strip appears on the
              homepage while a banner exists and disappears when you remove it.
              The hero above it always shows live vehicles, so leaving this
              empty is perfectly normal.
            </p>

            <div style={{ padding: '20px' }}>
              {siteContent.banners.length === 0 ? (
                /* One empty state, not a row of numbered placeholder tiles.
                   Drawing "Banner 1" and "Banner 2" boxes against an empty
                   table read as two banners that already existed — the count
                   was invented by this component, not by the data. */
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '18px 0' }}>
                  No banners yet. Add one to feature it on the homepage.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  {siteContent.banners.map((b) => (
                    <div key={b.id} style={{ width: '158px' }}>
                      <div style={{ position: 'relative', height: '104px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-app)', border: '1px solid var(--band-line)' }}>
                        <img src={b.img} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => removeBanner(b.id)}
                          aria-label={`Remove ${b.title}`}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(11,21,18,.75)', border: 'none', borderRadius: '999px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={12} color="#fff" />
                        </button>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', marginTop: '7px' }}>{b.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Company and bank details — printed on invoices, not on the site.
              Kept on its own record rather than beside the contact fields
              above: those are granted to `anon` so the storefront can paint its
              header, and a bank account number does not belong in anything the
              publishable key can read. */}
          <section ref={billingRef} style={{ ...card, ...revealStyle(billingShown, 1) }}>
            <div style={cardHead}>
              <h2 style={title}>Invoice &amp; Bank Details</h2>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Staff only</span>
            </div>
            <form className="admin-form" onSubmit={handleSaveBilling} style={{ padding: '20px' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                These appear on the invoices generated from the Buyers screen.
                They are never shown on the customer website.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  ['companyName', 'Company Name'],
                  ['poBox', 'Postal Address'],
                ].map(([key, text]) => (
                  <div key={key}>
                    <label style={label} htmlFor={`b-${key}`}>{text}</label>
                    <input
                      id={`b-${key}`}
                      type="text"
                      value={billingForm[key] ?? ''}
                      onChange={(e) => setBillingForm({ ...billingForm, [key]: e.target.value })}
                      style={input}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="submit" className="btn-primary" disabled={!billingDirty || billingBusy} style={{ opacity: billingDirty ? 1 : 0.5, cursor: billingDirty ? 'pointer' : 'not-allowed' }}>
                  {billingBusy ? 'Saving…' : 'Save Changes'}
                </button>
                {billingSaved && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-ink)', fontWeight: 600 }}>Saved</span>
                )}
                {billingError && (
                  <span role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{billingError}</span>
                )}
              </div>
            </form>

            {/* The accounts a sale can be invoiced against.
                A list rather than one fixed account, because the yard picks
                which bank to be paid into when it records the buyer. Deleting
                one only takes it off that menu — invoices already issued keep
                their own copy of the account they named. */}
            <div style={{ borderTop: '1px solid rgba(27,36,48,.08)', padding: '18px 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-dark)' }}>Bank Accounts</h3>
                <button
                  type="button"
                  onClick={() => setBankDraft({ bankName: '', branch: '', accountNo: '', accountName: billingForm.companyName || '', isDefault: bankAccounts.length === 0 })}
                  style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={14} /> Add Account
                </button>
              </div>

              {bankAccounts.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '10px 0' }}>
                  No accounts yet. Add one and it becomes selectable when recording a buyer.
                </p>
              ) : bankAccounts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '11px 0', borderBottom: '1px solid rgba(27,36,48,.07)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {a.bankName}{a.branch ? ` · ${a.branch}` : ''}
                      {a.isDefault && (
                        <span className="badge badge-new" style={{ marginLeft: '8px' }}>Default</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {a.accountNo} · {a.accountName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                    <button type="button" onClick={() => setBankDraft(a)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-ink)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${a.bankName} ${a.accountNo}? Invoices already issued against it keep their own copy and are unchanged.`)) deleteBankAccount(a.id);
                      }}
                      aria-label={`Delete ${a.bankName} ${a.accountNo}`}
                      style={{ border: 'none', background: 'transparent', color: '#a13f3f', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '18px 0' }}>
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
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dark)' }}>{f.question}</div>
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

          <div className="content-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
                <button type="submit" className="btn-primary" disabled={!contactDirty || contactBusy} style={{ opacity: contactDirty ? 1 : 0.5, cursor: contactDirty ? 'pointer' : 'not-allowed' }}>
                  {contactBusy ? 'Saving…' : 'Save Changes'}
                </button>
                {contactSaved && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-ink)', fontWeight: 600 }}>Saved</span>
                )}
                {contactError && (
                  <span role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{contactError}</span>
                )}
              </div>
            </form>
          </section>

          {/* Featured vehicles — this one genuinely drives the site */}
          <section ref={featuredRef} style={{ ...card, ...revealStyle(featuredShown, 2) }}>
            <div style={cardHead}>
              <h2 style={title}>Featured Vehicles</h2>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{featuredCount} featured</span>
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
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dark)', fontWeight: v.featured ? 600 : 400 }}>
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
                      background: v.featured ? 'var(--primary-ink)' : 'var(--field-border)',
                      display: 'flex', justifyContent: v.featured ? 'flex-end' : 'flex-start',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span style={{ width: '19px', height: '19px', borderRadius: '999px', background: 'var(--bg-card)', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          </div>
        </div>
      </div>

      {bannerOpen && (
        <BannerModal
          onClose={() => setBannerOpen(false)}
          onSave={async (banner) => {
            const result = await addBanner(banner);
            if (result.ok) setBannerOpen(false);
            return result;
          }}
        />
      )}

      {bankDraft && (
        <BankAccountModal
          account={bankDraft}
          onClose={() => setBankDraft(null)}
          onSave={async (account) => {
            const result = await saveBankAccount(account);
            if (result.ok) setBankDraft(null);
            return result;
          }}
        />
      )}

      {faqDraft && (
        <FaqModal
          faq={faqDraft}
          onClose={() => setFaqDraft(null)}
          onSave={async (faq) => {
            const result = await saveFaq(faq);
            if (result.ok) setFaqDraft(null);
            return result;
          }}
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
        <h3 style={{ fontFamily: 'Source Serif 4, serif', fontSize: 'var(--text-2xl)', color: 'var(--text-dark)' }}>{heading}</h3>
        <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const MAX_BANNER_BYTES = 5 * 1024 * 1024;

/**
 * Banner images are uploaded, not pasted as a URL.
 *
 * A URL field made the banner depend on someone else's server staying up —
 * the homepage would silently lose its artwork the day that link rotted.
 * The file goes into our own Storage bucket and the public URL we get back
 * is what gets stored.
 */
const BannerModal = ({ onClose, onSave }) => {
  const [title2, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Object URLs are held by the browser until explicitly released.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError('');
    if (!picked.type.startsWith('image/')) {
      setError('That file is not an image.');
      return;
    }
    if (picked.size > MAX_BANNER_BYTES) {
      setError(`That image is ${(picked.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Choose an image for this banner.'); return; }
    setError('');
    setBusy(true);

    // Timestamped path so re-using a filename never overwrites a live banner.
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-banners')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setBusy(false);
      setError(friendlyError(uploadError, 'Could not upload that image. Try again.'));
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('site-banners').getPublicUrl(path);
    const result = await onSave({ title: title2.trim(), img: publicUrl, link: link.trim() });
    setBusy(false);
    // The row failed to save, so the file we just uploaded has nothing
    // pointing at it — take it back out rather than leave it orphaned.
    if (result && !result.ok) {
      await supabase.storage.from('site-banners').remove([path]);
      setError(result.reason || 'Could not save this banner.');
    }
  };

  return (
    <ModalShell heading="Add Homepage Banner" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={label} htmlFor="b-title">Banner title *</label>
          <input id="b-title" required value={title2} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="December import clearance" />
        </div>

        <div>
          <label style={label} htmlFor="b-img">Banner image *</label>
          {preview ? (
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--field-border)', marginBottom: '8px' }}>
              <img src={preview} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={() => { URL.revokeObjectURL(preview); setPreview(''); setFile(null); }}
                aria-label="Remove selected image"
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(11,21,18,.75)', border: 'none', borderRadius: '999px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={13} color="#fff" />
              </button>
            </div>
          ) : (
            /* Deliberately a button, not a <label htmlFor>: a global rule in
               index.css forces every label inside .modal-content to
               display:block + uppercase, which collapses a flex dropzone onto
               one line. This also keeps the zone keyboard-reachable. */
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '7px', height: '110px', width: '100%', background: 'var(--bg-card)',
                border: '1.5px dashed var(--field-border)', borderRadius: '8px',
                cursor: 'pointer', color: 'var(--text-muted)', marginBottom: '8px',
              }}
            >
              <Upload size={20} aria-hidden="true" />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Choose an image</span>
              <span style={{ fontSize: 'var(--text-xs)' }}>PNG or JPG, up to 5MB</span>
            </button>
          )}
          <input ref={fileRef} id="b-img" type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
          {file && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {file.name} · {(file.size / 1024).toFixed(0)}KB
            </div>
          )}
        </div>

        <div>
          <label style={label} htmlFor="b-link">Links to (optional)</label>
          <input id="b-link" value={link} onChange={(e) => setLink(e.target.value)} style={input} placeholder="/vehicles" />
        </div>

        {error && (
          <div role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f' }}>{error}</div>
        )}

        <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: '4px', padding: '10px', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Uploading…' : 'Add banner'}
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

/**
 * Add or edit one of the accounts a sale can be invoiced against.
 *
 * `isDefault` is a radio in behaviour even though it renders as a checkbox:
 * only one account may carry it, and the context stands the previous one down
 * before saving. Ticking it here is therefore a move, not a toggle — the copy
 * says so rather than leaving someone to discover it.
 */
const BankAccountModal = ({ account, onClose, onSave }) => {
  const [form, setForm] = useState({
    bankName: account.bankName || '',
    branch: account.branch || '',
    accountNo: account.accountNo || '',
    accountName: account.accountName || '',
    isDefault: !!account.isDefault,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bankName.trim()) { setError('Enter the bank’s name.'); return; }
    if (!form.accountNo.trim()) { setError('Enter the account number — it is what the customer types into their banking app.'); return; }
    if (!form.accountName.trim()) { setError('Enter the name the account is held in.'); return; }
    setBusy(true);
    const result = await onSave({
      ...account,
      bankName: form.bankName.trim(),
      branch: form.branch.trim(),
      accountNo: form.accountNo.trim(),
      accountName: form.accountName.trim(),
      isDefault: form.isDefault,
    });
    setBusy(false);
    if (!result.ok) setError(result.reason || 'Could not save this account.');
  };

  return (
    <ModalShell heading={account.id ? 'Edit bank account' : 'Add bank account'} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={label} htmlFor="ba-bank">Bank name *</label>
          <input id="ba-bank" value={form.bankName} onChange={set('bankName')} style={input} autoFocus />
        </div>
        <div>
          <label style={label} htmlFor="ba-branch">Branch</label>
          <input id="ba-branch" value={form.branch} onChange={set('branch')} style={input} />
        </div>
        <div>
          <label style={label} htmlFor="ba-no">Account number *</label>
          <input id="ba-no" value={form.accountNo} onChange={set('accountNo')} style={input} inputMode="numeric" />
        </div>
        <div>
          <label style={label} htmlFor="ba-name">Account name *</label>
          <input id="ba-name" value={form.accountName} onChange={set('accountName')} style={input} />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: 'var(--text-sm)', color: '#33414f', lineHeight: 1.55 }}>
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => { setForm((f) => ({ ...f, isDefault: e.target.checked })); setError(''); }}
            style={{ marginTop: '3px', flexShrink: 0 }}
          />
          <span>
            Offer this account first when recording a buyer.
            <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              Only one account can be the default, so this takes it off whichever holds it now.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" style={{ fontSize: 'var(--text-sm)', color: '#a13f3f', margin: 0 }}>{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: '4px', padding: '10px' }}>
          {busy ? 'Saving…' : account.id ? 'Save changes' : 'Add account'}
        </button>
      </form>
    </ModalShell>
  );
};
