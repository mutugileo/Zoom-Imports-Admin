import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  hasPermission,
  canSeeView,
  ROLE_VIEWS,
} from '@shared/data/siteContent';
import { formatKES } from '@shared/lib/format';
import { emptyCosts } from '@shared/lib/costing';
import { makeVehicleSale, makeOrderCost, isRealisedOrder } from '@shared/lib/sales';
import { ensureStockId, nextGroupId } from '@shared/lib/inventory';
import { supabase } from '@shared/lib/supabaseClient';
import { pinToPassword } from '@shared/lib/pinAuth';
import { friendlyError } from '@shared/lib/friendlyError';
import {
  vehicleFromRow, vehicleToRow,
  partFromRow, partToRow,
  compatFromRow, compatToRow,
  orderFromRow,
  enquiryFromRow,
  groupFromRow, groupToRow,
  activityFromRow,
  reviewFromRow,
  costsFromRow, costsToRow,
  saleFromRow, saleToRow,
  partCostFromRow,
  orderCostFromRow, orderCostToRow,
  buyerFromRow, buyerToRow,
  billingFromRow, billingToRow,
  bankAccountFromRow, bankAccountToRow,
} from '@shared/lib/dbMap';

/** Not a secret — see the comment on `signIn` below for what this is for. */
const REMEMBERED_EMAIL_KEY = 'zm_remembered_admin_email';

/**
 * Admin-only state: full CRUD over the catalogue plus order/enquiry triage,
 * site content, staff directory and an activity log — all real Supabase
 * tables. Every domain below is fetched from Postgres and RLS-gated; nothing
 * falls back to bundled sample data. A table with zero rows renders as a
 * genuine empty state, not a seeded placeholder.
 */

const AdminContext = createContext(null);

const ACTIVITY_LIMIT = 40;

export const AdminProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('admin-dashboard');

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = localStorage.getItem('zm_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* private mode fallback */ }
    return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('zm_theme', theme);
    } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  /**
   * Real session: a Supabase Auth session, plus the admin_profiles row that
   * carries the role. `authUser` and `profile` are kept as two pieces of
   * state rather than one, because they arrive on different timelines — the
   * session resolves synchronously from localStorage on load, the profile
   * needs a network round trip.
   *
   * The PIN is not a separate local layer on top of this — it *is* the real
   * credential, checked server-side on every sign-in (see `signIn` below).
   * There is no additional "locked" gate to satisfy once a session exists.
   */
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Catalogue — public-readable, so fetched once on mount regardless of
  // sign-in state (matches the RLS: `vehicles_select`/`parts_select`/
  // `compat_select` all grant `anon` read).
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [compatibility, setCompatibility] = useState([]);
  const [compatibilityLoading, setCompatibilityLoading] = useState(true);

  // Everything below requires an authenticated session under RLS, so these
  // are fetched only once `authUser` exists and cleared back to empty on
  // sign-out.
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);
  const [vehicleGroups, setVehicleGroups] = useState([]);
  const [vehicleGroupsLoading, setVehicleGroupsLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [settings, setSettings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  /* Who bought what. Staff-only under RLS — it is the one table holding a
     customer's ID number and home address, and none of it is the storefront's
     business. */
  const [buyers, setBuyers] = useState([]);
  const [buyersLoading, setBuyersLoading] = useState(true);
  /* Company name, P.O. box and bank details for the invoice. Staff-only, and
     kept off `site_contact` because that table is readable by `anon`. */
  const [billing, setBilling] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);

  /**
   * Cost ledgers, keyed by vehicle id, from `vehicle_costs`.
   *
   * Not fields on the vehicle: the customer app reads the vehicle record, and
   * folding CNF, duty and margin into it would put the dealership's buying
   * position one fetch away from every visitor. Separate table plus RLS with
   * zero `anon` grants means the guarantee is enforced by Postgres, not app
   * code — see the leak-guard note in shared/lib/costing.js.
   */
  const [vehicleCosts, setVehicleCosts] = useState({});
  /* Sales records live apart from the catalogue for the same reason the cost
     ledger does: achieved prices and buy prices are negotiating position. */
  const [vehicleSales, setVehicleSales] = useState({});
  const [partCosts, setPartCosts] = useState({});
  const [orderCosts, setOrderCosts] = useState({});

  /**
   * Site content — real rows from `site_contact`/`site_banners`/`site_faqs`,
   * public to read (the storefront needs this), Superadmin/Administrator to
   * write (RLS `content:write`). `siteContent` stays the shape every caller
   * already expects (`{ contact, banners, faqs }`), assembled from the three
   * tables rather than one localStorage blob.
   */
  const [contact, setContact] = useState(null);
  const [banners, setBanners] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const siteContent = useMemo(() => ({ contact, banners, faqs }), [contact, banners, faqs]);

  const refreshSiteContent = useCallback(async () => {
    const [contactRes, bannersRes, faqsRes] = await Promise.all([
      supabase.from('site_contact').select('*').eq('id', 1).maybeSingle(),
      supabase.from('site_banners').select('*').order('created_at'),
      supabase.from('site_faqs').select('*').order('created_at'),
    ]);
    if (!contactRes.error) setContact(contactRes.data);
    if (!bannersRes.error) setBanners(bannersRes.data ?? []);
    if (!faqsRes.error) setFaqs(faqsRes.data ?? []);
  }, []);

  useEffect(() => { refreshSiteContent(); }, [refreshSiteContent]);

  /**
   * The staff directory itself — real rows from `admin_profiles`, not a
   * hardcoded seed array. Only a Superadmin's RLS grant can actually see
   * every row (`profile_self_select`); anyone else fetching this only ever
   * gets their own, which is fine since the directory UI is hidden from
   * them anyway (see `manageUsers` in AdminSettings.jsx).
   */
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [adminProfilesLoading, setAdminProfilesLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  // Shown a minute before the idle sign-out, so nobody loses a form silently.
  const [idleWarning, setIdleWarning] = useState(false);

  /**
   * Supabase keeps its own session persisted (localStorage under its own
   * key), so this doesn't go through app storage.
   *
   * `onAuthStateChange` alone is the whole story here — it fires once
   * immediately on subscribe with whatever session already exists (event
   * `INITIAL_SESSION`), then again on every sign-in/out/refresh after that.
   * A separate `getSession()` call alongside it is a known footgun: both are
   * async, and if `onAuthStateChange`'s first callback resolves *after*
   * `getSession()`'s, its value — including a stale/empty one — silently
   * overwrites the correct session that was just set. Losing the race looked
   * exactly like this: a real, persisted session in localStorage, and the
   * app still rendering the sign-in form.
   */
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  /**
   * The profile carries the role `can`/`canView` actually check. Re-fetched
   * whenever the authenticated user changes, not cached across sign-outs —
   * a demotion or removal takes effect the moment the row no longer matches,
   * same guarantee the old localStorage lookup had.
   */
  useEffect(() => {
    if (!authUser) { setProfile(null); return; }
    let cancelled = false;

    supabase
      .from('admin_profiles')
      .select('id, name, email, role, last_login')
      .eq('id', authUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setProfile(null); return; }
        setProfile(data);
        // Best-effort — a failed stamp shouldn't block sign-in.
        supabase
          .from('admin_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authUser.id)
          .then(() => {});
      });

    return () => { cancelled = true; };
  }, [authUser]);

  /**
   * The directory itself. Fetched whenever the signed-in profile changes —
   * a Superadmin sees every row (RLS), anyone else only their own, which the
   * Settings page never renders as a table for them anyway.
   */
  const refreshAdminProfiles = useCallback(async () => {
    if (!authUser) { setAdminProfiles([]); return; }
    setAdminProfilesLoading(true);
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('id, name, email, role, last_login')
      .order('name');
    setAdminProfilesLoading(false);
    if (!error) setAdminProfiles(data ?? []);
  }, [authUser]);

  useEffect(() => { refreshAdminProfiles(); }, [refreshAdminProfiles]);

  /**
   * Presence — Supabase Realtime, not a poll and not inferred from
   * `last_login` (a timestamp only says when someone signed *in*, not
   * whether they're still at the screen). Every open tab tracks itself on a
   * shared channel; `sync` fires with the full current set whenever anyone
   * joins or leaves, so this is the live truth, not a cached guess.
   */
  useEffect(() => {
    if (!authUser || !profile) return undefined;

    const channel = supabase.channel('admin-presence', {
      config: { presence: { key: authUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ name: profile.name, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [authUser, profile]);

  const navigateTo = useCallback((view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0 });
  }, []);

  /**
   * Activity log — real rows from `activity_log`. Seeded from the table on
   * sign-in, then appended to locally (for a snappy UI) at the same time a
   * row is written in the background. Without network access the write
   * simply fails silently; the audit trail is a working record, not a
   * tamper-proof one.
   */
  const refreshActivity = useCallback(async () => {
    if (!authUser) { setActivity([]); return; }
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, message, at')
      .order('at', { ascending: false })
      .limit(ACTIVITY_LIMIT);
    if (!error) setActivity((data ?? []).map(activityFromRow));
  }, [authUser]);

  useEffect(() => { refreshActivity(); }, [refreshActivity]);

  const logActivity = useCallback((message) => {
    setActivity((prev) => [{ id: `local-${Date.now()}-${Math.random()}`, message, at: Date.now() }, ...prev].slice(0, ACTIVITY_LIMIT));
    if (authUser) {
      supabase.from('activity_log').insert({
        message,
        actor_id: authUser.id,
        actor_name: profile?.name || null,
      }).then(() => {});
    }
  }, [authUser, profile]);

  /**
   * Customer reviews, awaiting a decision.
   *
   * The storefront only ever renders Published, so an unmoderated review is
   * invisible to the public but must be visible here — otherwise submissions
   * pile up in a table nobody looks at, which is what was happening.
   */
  const refreshReviews = useCallback(async () => {
    if (!authUser) { setReviews([]); return; }
    setReviewsLoading(true);
    const { data, error } = await supabase
      .from('site_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    setReviewsLoading(false);
    if (!error) setReviews((data ?? []).map(reviewFromRow));
  }, [authUser]);

  useEffect(() => { refreshReviews(); }, [refreshReviews]);

  const setReviewStatus = useCallback(async (id, status) => {
    const target = reviews.find((r) => r.id === id);
    const { error } = await supabase.from('site_reviews').update({ status }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update this review. Try again.') };
    await refreshReviews();
    logActivity(`Review from ${target?.name ?? 'a customer'} ${status.toLowerCase()}`);
    return { ok: true };
  }, [reviews, refreshReviews, logActivity]);

  const removeReview = useCallback(async (id) => {
    const target = reviews.find((r) => r.id === id);
    const { error } = await supabase.from('site_reviews').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not delete this review. Try again.') };
    await refreshReviews();
    logActivity(`Review from ${target?.name ?? 'a customer'} deleted`);
    return { ok: true };
  }, [reviews, refreshReviews, logActivity]);

  /**
   * Approval — the step that puts a listing in front of customers.
   *
   * Separate from `status` (Available / Reserved / Sold), which describes the
   * car. This describes the listing: a half-entered vehicle with no photos and
   * a placeholder name used to be public from its first save.
   */
  const setVehicleApproval = useCallback(async (id, approvalStatus) => {
    const target = vehicles.find((v) => v.id === id);
    const { error } = await supabase.from('vehicles').update({ approval_status: approvalStatus }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update this listing. Try again.') };
    await refreshVehicles();
    logActivity(`${target?.name ?? 'A vehicle'} ${approvalStatus === 'Approved' ? 'approved for the website' : approvalStatus.toLowerCase()}`);
    return { ok: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, logActivity]);

  const setPartApproval = useCallback(async (id, approvalStatus) => {
    const target = parts.find((p) => p.id === id);
    const { error } = await supabase.from('parts').update({ approval_status: approvalStatus }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update this part. Try again.') };
    await refreshParts();
    logActivity(`${target?.name ?? 'A part'} ${approvalStatus === 'Approved' ? 'approved for the website' : approvalStatus.toLowerCase()}`);
    return { ok: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, logActivity]);

  /** Switches the yard can throw without waiting on a deploy. */
  const refreshSettings = useCallback(async () => {
    const { data, error } = await supabase.from('site_settings').select('*').order('key');
    if (!error) setSettings(data ?? []);
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  const setSetting = useCallback(async (key, enabled) => {
    const target = settings.find((s) => s.key === key);
    const { error } = await supabase.from('site_settings')
      .update({ enabled, updated_at: new Date().toISOString() }).eq('key', key);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not change that setting. Try again.') };
    await refreshSettings();
    logActivity(`${target?.label ?? key} turned ${enabled ? 'on' : 'off'}`);
    return { ok: true };
  }, [settings, refreshSettings, logActivity]);

  // ───────────────────────── Catalogue: vehicles ─────────────────────────

  const refreshVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').order('id');
    setVehiclesLoading(false);
    if (!error) setVehicles((data ?? []).map(vehicleFromRow));
    return { error };
  }, []);

  useEffect(() => { refreshVehicles(); }, [refreshVehicles]);

  /**
   * Stock ID is issued here and nowhere else, so every route into the inventory
   * gets one. `ensureStockId` is a no-op when the car already has an id — it is
   * printed on the windscreen card and the logbook file, so it must survive
   * every subsequent edit.
   */
  const saveVehicle = useCallback(async (data) => {
    if (data.id) {
      const merged = { ...vehicles.find((v) => v.id === data.id), ...data };
      const { error } = await supabase.from('vehicles').update(vehicleToRow(merged)).eq('id', data.id);
      if (error) return { ok: false, reason: friendlyError(error, 'Could not save this vehicle. Try again.') };
      await refreshVehicles();
      logActivity(`${data.name} listing updated`);
      return { ok: true };
    }
    const withStockId = ensureStockId({ ...data }, vehicles);
    const { error } = await supabase.from('vehicles').insert(vehicleToRow(withStockId));
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this vehicle. Try again.') };
    await refreshVehicles();
    logActivity(`${data.name} added to inventory`);
    return { ok: true };
  }, [vehicles, refreshVehicles, logActivity]);

  const deleteVehicle = useCallback(async (id) => {
    const gone = vehicles.find((v) => v.id === id);
    // Ledgers are keyed by vehicle id and ids get reused, so a stale ledger
    // would silently attach itself to the next car added — clear them first.
    await supabase.from('vehicle_costs').delete().eq('vehicle_id', id);
    await supabase.from('vehicle_sales').delete().eq('vehicle_id', id);
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not delete this vehicle. Try again.') };
    await Promise.all([refreshVehicles(), refreshVehicleCosts(), refreshVehicleSales()]);
    if (gone) logActivity(`${gone.name} removed from inventory`);
    return { ok: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, refreshVehicles, logActivity]);

  const toggleFeaturedVehicle = useCallback(async (id) => {
    const target = vehicles.find((v) => v.id === id);
    if (!target) return { ok: false, reason: 'Not found' };
    const { error } = await supabase.from('vehicles').update({ featured: !target.featured }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not change the featured setting. Try again.') };
    await refreshVehicles();
    logActivity(`${target.name} ${target.featured ? 'removed from' : 'added to'} homepage features`);
    return { ok: true };
  }, [vehicles, refreshVehicles, logActivity]);

  // ───────────────────────── Catalogue: parts ─────────────────────────

  const refreshParts = useCallback(async () => {
    setPartsLoading(true);
    const { data, error } = await supabase.from('parts').select('*').order('id');
    setPartsLoading(false);
    if (!error) setParts((data ?? []).map(partFromRow));
  }, []);

  useEffect(() => { refreshParts(); }, [refreshParts]);

  /* Declared above the parts block on purpose. savePart depends on it, and a
     `const` referenced before its own line is still in the temporal dead
     zone — putting this after savePart threw "Cannot access
     'refreshCompatibility' before initialization" and took the whole portal
     down with a blank screen. */
  const refreshCompatibility = useCallback(async () => {
    setCompatibilityLoading(true);
    const { data, error } = await supabase.from('compatibility_rules').select('*').order('id');
    setCompatibilityLoading(false);
    if (!error) setCompatibility((data ?? []).map(compatFromRow));
  }, []);

  useEffect(() => { refreshCompatibility(); }, [refreshCompatibility]);

  /**
   * Fitment saved with the part, not on a separate screen.
   *
   * `data.models` is the list of Mazda models chosen on the part form. It is
   * written to compatibility_rules as one row per part, which is what
   * buildFitmentIndex reads, while `compat` keeps the first model so the
   * text-based resolution every surface already does still works.
   *
   * Rewritten rather than appended: the form shows the complete set, so
   * saving it is the whole truth about what this part fits. Leaving old rows
   * behind would mean unticking a model never actually removed it.
   */
  const saveFitmentForPart = useCallback(async (partId, models) => {
    if (!partId) return;
    await supabase.from('compatibility_rules').delete().eq('part_id', partId);
    if (!models || models.length === 0) return;
    const part = parts.find((x) => x.id === partId);
    await supabase.from('compatibility_rules').insert({
      part_id: partId,
      part_name_legacy: part?.name ?? null,
      make: 'Mazda',
      model_ids: models,
      model_legacy: models.join(', '),
    });
  }, [parts]);

  const savePart = useCallback(async (data) => {
    if (data.id) {
      const { error } = await supabase.from('parts').update(partToRow(data)).eq('id', data.id);
      if (error) return { ok: false, reason: friendlyError(error, 'Could not save this part. Try again.') };
      await saveFitmentForPart(data.id, data.models);
      await Promise.all([refreshParts(), refreshCompatibility()]);
      logActivity(`${data.name} updated`);
      return { ok: true };
    }
    /* The id is needed to attach the fitment, so the insert asks for the row
       back rather than firing and forgetting. */
    const { data: created, error } = await supabase
      .from('parts').insert(partToRow(data)).select('id').single();
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this part. Try again.') };
    await saveFitmentForPart(created?.id, data.models);
    await Promise.all([refreshParts(), refreshCompatibility()]);
    logActivity(`${data.name} added to parts catalogue`);
    return { ok: true };
  }, [refreshParts, refreshCompatibility, saveFitmentForPart, logActivity]);

  const deletePart = useCallback(async (id) => {
    const gone = parts.find((p) => p.id === id);
    await supabase.from('part_costs').delete().eq('part_id', id);
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not delete this part. Try again.') };
    await Promise.all([refreshParts(), refreshPartCosts()]);
    if (gone) logActivity(`${gone.name} removed from parts catalogue`);
    return { ok: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, refreshParts, logActivity]);

  // ─────────────────────── Compatibility rules ───────────────────────

  const addCompatibilityRule = useCallback(async (rule) => {
    const { error } = await supabase.from('compatibility_rules').insert(compatToRow(rule));
    if (error) return { ok: false, reason: friendlyError(error, 'Could not add this fitment rule. Try again.') };
    await refreshCompatibility();
    logActivity(`Fitment rule added: ${rule.part} → ${rule.make} ${rule.model}`);
    return { ok: true };
  }, [refreshCompatibility, logActivity]);

  const removeCompatibilityRule = useCallback(async (id) => {
    const gone = compatibility.find((c) => c.id === id);
    const { error } = await supabase.from('compatibility_rules').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this fitment rule. Try again.') };
    await refreshCompatibility();
    if (gone) logActivity(`Fitment rule removed: ${gone.part} → ${gone.make}`);
    return { ok: true };
  }, [compatibility, refreshCompatibility, logActivity]);

  // ───────────────────────────── Orders ─────────────────────────────

  const refreshOrders = useCallback(async () => {
    if (!authUser) { setOrders([]); return; }
    setOrdersLoading(true);
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrdersLoading(false);
    if (!error) setOrders((data ?? []).map(orderFromRow));
  }, [authUser]);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  const refreshOrderCosts = useCallback(async () => {
    if (!authUser) { setOrderCosts({}); return; }
    const { data, error } = await supabase.from('order_costs').select('*');
    if (!error) {
      setOrderCosts(Object.fromEntries((data ?? []).map((r) => [r.order_ref, orderCostFromRow(r)])));
    }
  }, [authUser]);

  useEffect(() => { refreshOrderCosts(); }, [refreshOrderCosts]);

  /**
   * Order status, and the cost snapshot that rides along with it.
   *
   * The moment an order becomes Completed is the moment its profit is fixed.
   * Costs are frozen here rather than looked up when a report runs, so that
   * editing a part's buy price next quarter cannot rewrite this quarter's
   * figures. Re-completing an order does not re-snapshot: the first completion
   * is the one that happened.
   */
  const updateOrderStatus = useCallback(async (ref, status) => {
    const order = orders.find((o) => o.ref === ref);
    const { error } = await supabase.from('orders').update({ status }).eq('ref', ref);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update this order. Try again.') };

    if (order && isRealisedOrder({ status }) && !orderCosts[ref]) {
      const partCostsShim = Object.fromEntries(
        Object.entries(partCosts).map(([id, c]) => [id, { costPrice: c.costPrice }])
      );
      const entry = makeOrderCost(order, partCostsShim);
      const { error: costError } = await supabase.from('order_costs').insert(orderCostToRow(ref, entry));
      if (!costError) {
        await refreshOrderCosts();
        if (!entry.complete) {
          logActivity(
            `Order ${ref} completed — ${entry.lines.length === 0
              ? 'no itemised lines, excluded from profit'
              : 'some parts have no buy price, excluded from profit'}`
          );
        }
      }
    }

    await refreshOrders();
    logActivity(`Order ${ref} marked as ${status}`);
    return { ok: true };
  }, [orders, orderCosts, partCosts, refreshOrders, refreshOrderCosts, logActivity]);

  // ──────────────────────────── Enquiries ────────────────────────────

  const refreshEnquiries = useCallback(async () => {
    if (!authUser) { setEnquiries([]); return; }
    setEnquiriesLoading(true);
    const { data, error } = await supabase.from('enquiries').select('*').order('id', { ascending: false });
    setEnquiriesLoading(false);
    if (!error) setEnquiries((data ?? []).map(enquiryFromRow));
  }, [authUser]);

  useEffect(() => { refreshEnquiries(); }, [refreshEnquiries]);

  const updateEnquiryStatus = useCallback(async (id, status) => {
    const target = enquiries.find((e) => e.id === id);
    const { error } = await supabase.from('enquiries').update({ status }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update this enquiry. Try again.') };
    await refreshEnquiries();
    if (target) logActivity(`Enquiry from ${target.customer} marked as ${status}`);
    return { ok: true };
  }, [enquiries, refreshEnquiries, logActivity]);

  // ────────────────────────── Vehicle groups ──────────────────────────

  const refreshVehicleGroups = useCallback(async () => {
    if (!authUser) { setVehicleGroups([]); return; }
    setVehicleGroupsLoading(true);
    const { data, error } = await supabase.from('vehicle_groups').select('*').order('id', { ascending: false });
    setVehicleGroupsLoading(false);
    if (!error) setVehicleGroups((data ?? []).map(groupFromRow));
  }, [authUser]);

  useEffect(() => { refreshVehicleGroups(); }, [refreshVehicleGroups]);

  const saveGroup = useCallback(async (group) => {
    const id = group.id || nextGroupId(vehicleGroups);
    const { error } = await supabase.from('vehicle_groups').upsert(groupToRow({ ...group, id }));
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this group. Try again.') };
    await refreshVehicleGroups();
    logActivity(`Group ${group.name} saved`);
    return { ok: true };
  }, [vehicleGroups, refreshVehicleGroups, logActivity]);

  /**
   * Removing a group must not orphan its cars into a group id that no longer
   * resolves — they fall back to Ungrouped, which is a real state the table
   * already renders.
   */
  const removeGroup = useCallback(async (groupId) => {
    const gone = vehicleGroups.find((g) => g.id === groupId);
    const { error } = await supabase.from('vehicle_groups').delete().eq('id', groupId);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this group. Try again.') };
    await supabase.from('vehicles').update({ group_id: null }).eq('group_id', groupId);
    await Promise.all([refreshVehicleGroups(), refreshVehicles()]);
    if (gone) logActivity(`Group ${gone.name} removed`);
    return { ok: true };
  }, [vehicleGroups, refreshVehicleGroups, refreshVehicles, logActivity]);

  // ───────────────────────── Cost / sales ledgers ─────────────────────────

  const refreshVehicleCosts = useCallback(async () => {
    if (!authUser) { setVehicleCosts({}); return; }
    const { data, error } = await supabase.from('vehicle_costs').select('*');
    if (!error) {
      setVehicleCosts(Object.fromEntries((data ?? []).map((r) => [r.vehicle_id, costsFromRow(r)])));
    }
  }, [authUser]);

  useEffect(() => { refreshVehicleCosts(); }, [refreshVehicleCosts]);

  /**
   * Ledgers are saved apart from the vehicle so a Sales Staff edit to a listing
   * can never touch the cost record, even by accident.
   */
  const saveCosts = useCallback(async (vehicleId, costs) => {
    const merged = { ...emptyCosts(), ...costs };
    const { error } = await supabase.from('vehicle_costs').upsert(costsToRow(vehicleId, merged));
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this cost ledger. Try again.') };
    await refreshVehicleCosts();
    const v = vehicles.find((x) => x.id === vehicleId);
    logActivity(`Cost ledger updated for ${v ? v.name : 'a vehicle'}`);
    return { ok: true };
  }, [vehicles, refreshVehicleCosts, logActivity]);

  const costsFor = useCallback(
    (vehicleId) => vehicleCosts[vehicleId] ?? emptyCosts(),
    [vehicleCosts]
  );

  const refreshVehicleSales = useCallback(async () => {
    if (!authUser) { setVehicleSales({}); return; }
    const { data, error } = await supabase.from('vehicle_sales').select('*');
    if (!error) {
      setVehicleSales(Object.fromEntries((data ?? []).map((r) => [r.vehicle_id, saleFromRow(r)])));
    }
  }, [authUser]);

  useEffect(() => { refreshVehicleSales(); }, [refreshVehicleSales]);

  /**
   * Records a car as sold at the price actually achieved.
   *
   * The achieved price is asked for rather than assumed from the listing: cars
   * are negotiated, and taking `price` as the sale price would report a profit
   * the yard never made. The cost is frozen into the record here — see the
   * snapshot rule at the top of shared/lib/sales.js.
   */
  const recordVehicleSale = useCallback(async (vehicleId, { price, date, buyer }) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    const sale = makeVehicleSale({ price, date, buyer, costs: vehicleCosts[vehicleId] });
    const { error } = await supabase.from('vehicle_sales').upsert(saleToRow(vehicleId, sale));
    if (error) return { ok: false, reason: friendlyError(error, 'Could not record this sale. Try again.') };
    await supabase.from('vehicles').update({ status: 'Sold' }).eq('id', vehicleId);
    await Promise.all([refreshVehicleSales(), refreshVehicles()]);
    logActivity(
      `${v ? v.name : 'A vehicle'} sold for ${formatKES(sale.price)}` +
      (sale.costed ? '' : ' — no cost ledger, excluded from profit')
    );
    return { ok: true };
  }, [vehicles, vehicleCosts, refreshVehicleSales, refreshVehicles, logActivity]);

  /** Undo, for the mis-click. The sale record goes with the status. */
  const clearVehicleSale = useCallback(async (vehicleId, status = 'Available') => {
    const v = vehicles.find((x) => x.id === vehicleId);
    const { error } = await supabase.from('vehicle_sales').delete().eq('vehicle_id', vehicleId);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this sale record. Try again.') };
    await supabase.from('vehicles').update({ status }).eq('id', vehicleId);
    await Promise.all([refreshVehicleSales(), refreshVehicles()]);
    logActivity(`Sale record removed for ${v ? v.name : 'a vehicle'}`);
    return { ok: true };
  }, [vehicles, refreshVehicleSales, refreshVehicles, logActivity]);

  const saleFor = useCallback((vehicleId) => vehicleSales[vehicleId] ?? null, [vehicleSales]);

  /* ───────────────────────── Buyers ───────────────────────── */

  /**
   * Who the cars went to.
   *
   * Kept apart from `vehicle_sales`, which is a money record keyed by vehicle:
   * this is a person, with an ID number and an address, and it is what an
   * invoice is made out to. Staff-only under RLS, so it is fetched with the
   * session and cleared on sign-out like every other internal table.
   */
  const refreshBuyers = useCallback(async () => {
    if (!authUser) { setBuyers([]); setBuyersLoading(false); return; }
    setBuyersLoading(true);
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .order('created_at', { ascending: false });
    setBuyersLoading(false);
    if (!error) setBuyers((data ?? []).map(buyerFromRow));
  }, [authUser]);

  useEffect(() => { refreshBuyers(); }, [refreshBuyers]);

  /**
   * `vehicleId` is a trace back to the car, never a live lookup.
   *
   * Everything an invoice prints — the model, the year, the registration, the
   * chassis, the price and the date — is copied onto the buyer row at the
   * moment it is recorded. See the note on `buyerFromRow`: an invoice that
   * re-read the vehicle would rewrite itself whenever the car was edited.
   */
  const saveBuyer = useCallback(async (data) => {
    const row = buyerToRow(data);
    const { error } = data.id
      ? await supabase.from('buyers').update(row).eq('id', data.id)
      : await supabase.from('buyers').insert(row);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this buyer. Try again.') };
    await refreshBuyers();
    logActivity(
      data.id
        ? `Buyer record updated for ${data.name}`
        : `${data.name} recorded as the buyer of ${data.vehicleName || 'a vehicle'}`
    );
    return { ok: true };
  }, [refreshBuyers, logActivity]);

  const deleteBuyer = useCallback(async (id) => {
    const gone = buyers.find((b) => b.id === id);
    const { error } = await supabase.from('buyers').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not delete this buyer. Try again.') };
    await refreshBuyers();
    logActivity(`Buyer record for ${gone?.name ?? 'a customer'} deleted`);
    return { ok: true };
  }, [buyers, refreshBuyers, logActivity]);

  /** Has this car already been handed to someone? Keyed on the traced id. */
  const buyerForVehicle = useCallback(
    (vehicleId) => buyers.find((b) => b.vehicleId === vehicleId) ?? null,
    [buyers]
  );

  /* One row, id 1 — the invoice header and the account customers pay into. */
  const refreshBilling = useCallback(async () => {
    if (!authUser) { setBilling(null); return; }
    const { data, error } = await supabase
      .from('company_billing')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) setBilling(billingFromRow(data));
  }, [authUser]);

  useEffect(() => { refreshBilling(); }, [refreshBilling]);

  const saveBilling = useCallback(async (next) => {
    const { error } = await supabase.from('company_billing').update(billingToRow(next)).eq('id', 1);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save the invoice details. Try again.') };
    await refreshBilling();
    logActivity('Company and bank details updated');
    return { ok: true };
  }, [refreshBilling, logActivity]);

  /* The accounts a sale can be invoiced against. Ordered the way the yard
     wants them offered, not by id. */
  const refreshBankAccounts = useCallback(async () => {
    if (!authUser) { setBankAccounts([]); return; }
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('sort_order')
      .order('id');
    if (!error) setBankAccounts((data ?? []).map(bankAccountFromRow));
  }, [authUser]);

  useEffect(() => { refreshBankAccounts(); }, [refreshBankAccounts]);

  const saveBankAccount = useCallback(async (account) => {
    const row = bankAccountToRow(account);
    /* Only one row may carry the default (a unique partial index enforces it),
       so the old one is stood down first — otherwise the insert trips the
       index and the user sees a constraint error for a box they ticked. */
    if (row.is_default) {
      await supabase.from('bank_accounts').update({ is_default: false })
        .eq('is_default', true)
        .neq('id', account.id ?? -1);
    }
    const { error } = account.id
      ? await supabase.from('bank_accounts').update(row).eq('id', account.id)
      : await supabase.from('bank_accounts').insert(row);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this bank account. Try again.') };
    await refreshBankAccounts();
    logActivity(`Bank account ${account.bankName} ${account.id ? 'updated' : 'added'}`);
    return { ok: true };
  }, [refreshBankAccounts, logActivity]);

  /* Deleting only removes it from the menu. Buyers keep their own copy of the
     account they were invoiced against, so paperwork already issued is
     unaffected — the FK is ON DELETE SET NULL for exactly that reason. */
  const deleteBankAccount = useCallback(async (id) => {
    const gone = bankAccounts.find((a) => a.id === id);
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this bank account. Try again.') };
    await refreshBankAccounts();
    logActivity(`Bank account ${gone?.bankName ?? ''} removed`);
    return { ok: true };
  }, [bankAccounts, refreshBankAccounts, logActivity]);

  const refreshPartCosts = useCallback(async () => {
    if (!authUser) { setPartCosts({}); return; }
    const { data, error } = await supabase.from('part_costs').select('*');
    if (!error) {
      setPartCosts(Object.fromEntries((data ?? []).map((r) => [r.part_id, partCostFromRow(r)])));
    }
  }, [authUser]);

  useEffect(() => { refreshPartCosts(); }, [refreshPartCosts]);

  /** Buy price for a part, kept out of the part record the storefront reads. */
  const savePartCost = useCallback(async (partId, costPrice) => {
    const p = parts.find((x) => x.id === partId);
    const value = Number(costPrice);
    const { error } = Number.isFinite(value) && value > 0
      ? await supabase.from('part_costs').upsert({ part_id: partId, cost_price: value })
      : await supabase.from('part_costs').delete().eq('part_id', partId);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save the buy price. Try again.') };
    await refreshPartCosts();
    logActivity(`Buy price ${value > 0 ? 'set' : 'cleared'} for ${p ? p.name : 'a part'}`);
    return { ok: true };
  }, [parts, refreshPartCosts, logActivity]);

  const partCostFor = useCallback(
    (partId) => partCosts[partId]?.costPrice ?? null,
    [partCosts]
  );

  // Site content
  const saveContact = useCallback(async (nextContact) => {
    const { error } = await supabase.from('site_contact').update(nextContact).eq('id', 1);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save the contact details. Try again.') };
    await refreshSiteContent();
    logActivity('Contact details updated');
    return { ok: true };
  }, [refreshSiteContent, logActivity]);

  const addBanner = useCallback(async (banner) => {
    const { error } = await supabase.from('site_banners').insert(banner);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not add this banner. Try again.') };
    await refreshSiteContent();
    logActivity(`Homepage banner "${banner.title || 'untitled'}" added`);
    return { ok: true };
  }, [refreshSiteContent, logActivity]);

  const removeBanner = useCallback(async (id) => {
    const gone = banners.find((b) => b.id === id);
    const { error } = await supabase.from('site_banners').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this banner. Try again.') };

    // Drop the image with the row it belonged to. Only for files in our own
    // bucket — an older banner may still hold an external URL we don't own.
    const marker = '/site-banners/';
    if (gone?.img?.includes(marker)) {
      const path = gone.img.split(marker)[1];
      if (path) await supabase.storage.from('site-banners').remove([decodeURIComponent(path)]);
    }

    await refreshSiteContent();
    logActivity('Homepage banner removed');
    return { ok: true };
  }, [banners, refreshSiteContent, logActivity]);

  const saveFaq = useCallback(async (faq) => {
    const { id, ...fields } = faq;
    const { error } = id
      ? await supabase.from('site_faqs').update(fields).eq('id', id)
      : await supabase.from('site_faqs').insert(fields);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not save this entry. Try again.') };
    await refreshSiteContent();
    logActivity(id ? `"${faq.question}" updated` : `"${faq.question}" published`);
    return { ok: true };
  }, [refreshSiteContent, logActivity]);

  const removeFaq = useCallback(async (id) => {
    const { error } = await supabase.from('site_faqs').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this entry. Try again.') };
    await refreshSiteContent();
    logActivity('FAQ entry removed');
    return { ok: true };
  }, [refreshSiteContent, logActivity]);

  const currentUser = profile;

  const signIn = useCallback(async (email, pin) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pinToPassword(pin),
    });
    if (error) return { ok: false, reason: friendlyError(error, 'Could not sign you in. Try again.') };
    // Not a secret — just "who last signed in here" so the same device can
    // skip straight to a PIN-only pad next time instead of asking for the
    // email again. Deliberately NOT cleared on sign-out: the idle timeout
    // below signs out routinely, and losing the remembered email every time
    // that fires would defeat the point of it. Only "Not you?" in the UI
    // clears it, for the actual case of a different person at this device.
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /**
   * Auto sign-out after 3 minutes of inactivity — the counter terminal this
   * PIN pad was built for gets left unattended, and a session with nobody
   * watching it is exactly the scenario the shared-device model is weakest
   * against. This is a full `signOut()`, not just a re-lock: the Supabase
   * session itself ends, so coming back requires the real password again,
   * not just the device PIN. Only runs while actually signed in — no idle
   * timer needed on the login screen itself.
   */
  useEffect(() => {
    if (!authUser) return undefined;

    /* Twenty minutes, not three.
     *
     * Three was written for a counter terminal being walked away from, and it
     * is hostile to the job people actually do here: someone adding a vehicle
     * stops to read a chassis number off a logbook or find a photo on their
     * phone, comes back, and the half-filled form is gone. Long entry sessions
     * are the normal case, so the timeout has to survive a pause in one.
     *
     * The warning is the real safeguard — a minute's notice, dismissible, so
     * an unattended screen still locks itself but nobody loses work without
     * being asked first. */
    const IDLE_LIMIT_MS = 20 * 60 * 1000;
    const WARN_BEFORE_MS = 60 * 1000;
    let signOutTimer;
    let warnTimer;

    const reset = () => {
      window.clearTimeout(signOutTimer);
      window.clearTimeout(warnTimer);
      setIdleWarning(false);
      warnTimer = window.setTimeout(() => setIdleWarning(true), IDLE_LIMIT_MS - WARN_BEFORE_MS);
      signOutTimer = window.setTimeout(() => { setIdleWarning(false); signOut(); }, IDLE_LIMIT_MS);
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    activityEvents.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      window.clearTimeout(signOutTimer);
      window.clearTimeout(warnTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [authUser, signOut]);

  /** Dismissing the warning is itself activity, so the timers restart. */
  const staySignedIn = useCallback(() => {
    setIdleWarning(false);
    window.dispatchEvent(new Event('mousedown'));
  }, []);

  const getRememberedEmail = useCallback(
    () => localStorage.getItem(REMEMBERED_EMAIL_KEY),
    []
  );

  /** "Not you?" — the actual case of a different person at a shared device. */
  const forgetDevice = useCallback(() => {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }, []);

  /** One question, asked everywhere. Signed out means no. */
  const can = useCallback(
    (permission) => (currentUser ? hasPermission(currentUser.role, permission) : false),
    [currentUser]
  );
  const canView = useCallback(
    (view) => (currentUser ? canSeeView(currentUser.role, view) : false),
    [currentUser]
  );

  /**
   * Creating a real account without a service-role key. `supabase.auth.signUp`
   * from a *public* key would normally be self-signup, but since this project
   * requires email confirmation, a successful call here creates the new
   * `auth.users` row without minting a session for it — confirmed by testing
   * this exact call while signed in and checking the caller's own session was
   * untouched afterward. The new person still has to click the confirmation
   * link Supabase emails them before they can sign in; on the free tier
   * that's a low-volume test mailer, not production email delivery, so it
   * can rate-limit under heavy use — that's a Supabase account-level setting
   * (a custom SMTP provider), not something this app's code can fix.
   *
   * Idempotent by design, because a rate-limit error is exactly the kind of
   * failure someone retries: re-signing-up an email that already has an
   * unconfirmed account doesn't error (Supabase avoids leaking who's
   * registered) and returns the *same* user id rather than a new one, and
   * the profile write below is an upsert rather than a plain insert so a
   * retry after a partial success updates that row instead of colliding
   * with it on a duplicate key.
   */
  const createStaffAccount = useCallback(async ({ name, email, role, pin }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pinToPassword(pin),
    });
    if (error) return { ok: false, reason: friendlyError(error, 'Could not create this account. Try again.') };
    if (!data.user) return { ok: false, reason: 'No account was created' };

    const { error: profileError } = await supabase
      .from('admin_profiles')
      .upsert({ id: data.user.id, name, email, role });
    if (profileError) return { ok: false, reason: friendlyError(profileError) };

    await refreshAdminProfiles();
    logActivity(`${name} invited as ${role}`);
    return { ok: true, needsConfirmation: !data.user.email_confirmed_at };
  }, [refreshAdminProfiles, logActivity]);

  /**
   * Staff directory — real writes against `admin_profiles`, RLS-gated to
   * Superadmin (`profile_superadmin_write`). Only name and role are editable
   * here: a PIN is a Supabase Auth password, and a plain client session can
   * only ever change its *own* password, never someone else's — that needs
   * the service-role Admin API, which this app has no key for. Each person
   * changes their own PIN from "My PIN" in this same page.
   */
  const updateProfile = useCallback(async ({ id, name, role }) => {
    const { error } = await supabase.from('admin_profiles').update({ name, role }).eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not update their access. Try again.') };
    await refreshAdminProfiles();
    logActivity(`${name}'s access updated`);
    return { ok: true };
  }, [refreshAdminProfiles, logActivity]);

  /**
   * Soft-remove: deletes the `admin_profiles` row only. The underlying
   * Supabase Auth account is untouched but orphaned — with no profile row,
   * RLS denies it everything, which locks the person out just as completely
   * as a hard delete would, without needing the service-role API a real
   * account deletion requires. Refuses the same two cases as before: your
   * own account (you'd lock yourself out mid-session), and the last
   * Superadmin (nobody left who could ever undo it).
   */
  const removeProfile = useCallback(async (id) => {
    const gone = adminProfiles.find((u) => u.id === id);
    if (!gone) return { ok: false, reason: 'Not found' };
    if (gone.id === currentUser?.id) return { ok: false, reason: 'You cannot remove your own account' };
    const superadmins = adminProfiles.filter((u) => u.role === 'Superadmin');
    if (gone.role === 'Superadmin' && superadmins.length <= 1) {
      return { ok: false, reason: 'There must be at least one Superadmin' };
    }
    const { error } = await supabase.from('admin_profiles').delete().eq('id', id);
    if (error) return { ok: false, reason: friendlyError(error, 'Could not remove this person. Try again.') };
    await refreshAdminProfiles();
    logActivity(`${gone.name} removed from the team`);
    return { ok: true };
  }, [adminProfiles, currentUser, refreshAdminProfiles, logActivity]);

  const value = useMemo(
    () => ({
      currentView, navigateTo,
      vehicles, vehiclesLoading, parts, partsLoading, compatibility, compatibilityLoading,
      orders, ordersLoading, enquiries, enquiriesLoading,
      saveVehicle, deleteVehicle, toggleFeaturedVehicle,
      savePart, deletePart,
      vehicleSales, recordVehicleSale, clearVehicleSale, saleFor,
      partCosts, savePartCost, partCostFor,
      orderCosts,
      addCompatibilityRule, removeCompatibilityRule,
      updateOrderStatus, updateEnquiryStatus,

      siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
      adminProfiles, adminProfilesLoading, onlineUserIds, createStaffAccount, updateProfile, removeProfile,
      authUser, authLoading,
      currentUser, signIn, signOut,
      getRememberedEmail, forgetDevice,
      idleWarning, staySignedIn,
      can, canView, ROLE_VIEWS,
      vehicleCosts, costsFor, saveCosts,
      vehicleGroups, vehicleGroupsLoading, saveGroup, removeGroup,
      reviews, reviewsLoading, setReviewStatus, removeReview,
      setVehicleApproval, setPartApproval,
      buyers, buyersLoading, saveBuyer, deleteBuyer, buyerForVehicle,
      billing, saveBilling,
      bankAccounts, saveBankAccount, deleteBankAccount,
      settings, setSetting,
      activity,
      theme, toggleTheme,

      formatKES,
    }),
    [
      currentView, navigateTo,
      vehicles, vehiclesLoading, parts, partsLoading, compatibility, compatibilityLoading,
      orders, ordersLoading, enquiries, enquiriesLoading,
      saveVehicle, deleteVehicle, toggleFeaturedVehicle, savePart, deletePart,
      addCompatibilityRule, removeCompatibilityRule, updateOrderStatus, updateEnquiryStatus,
      siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
      adminProfiles, adminProfilesLoading, onlineUserIds, createStaffAccount, updateProfile, removeProfile, activity,
      authUser, authLoading,
      currentUser, signIn, signOut,
      getRememberedEmail, forgetDevice,
      idleWarning, staySignedIn,
      can, canView,
      vehicleCosts, costsFor, saveCosts, vehicleGroups, vehicleGroupsLoading, saveGroup, removeGroup,
      reviews, reviewsLoading, setReviewStatus, removeReview, setVehicleApproval, setPartApproval, settings, setSetting,
      vehicleSales, recordVehicleSale, clearVehicleSale, saleFor,
      partCosts, savePartCost, partCostFor, orderCosts,
      buyers, buyersLoading, saveBuyer, deleteBuyer, buyerForVehicle,
      billing, saveBilling,
      bankAccounts, saveBankAccount, deleteBankAccount,
      theme, toggleTheme
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
};

/** Kept so admin pages copied from the single-app build keep working. */
export const useApp = useAdmin;
