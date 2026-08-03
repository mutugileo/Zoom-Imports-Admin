import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_VEHICLES,
  INITIAL_PARTS,
  COMPATIBILITY_RULES,
  INITIAL_ORDERS,
  INITIAL_ENQUIRIES,
} from '@shared/data/mockData';
import {
  DEFAULT_CONTACT,
  DEFAULT_BANNERS,
  DEFAULT_FAQS,
  DEFAULT_ADMIN_USERS,
  findByPin,
  migrateAdminUsers,
  hasPermission,
  canSeeView,
  ROLE_VIEWS,
} from '@shared/data/siteContent';
import { formatKES } from '@shared/lib/format';
import { KEYS, read, write } from '@shared/lib/store';
import { emptyCosts } from '@shared/lib/costing';
import { makeVehicleSale, makeOrderCost, isRealisedOrder } from '@shared/lib/sales';
import { DEFAULT_GROUPS, ensureStockId, nextGroupId } from '@shared/lib/inventory';

/**
 * Admin-only state: full CRUD over the catalogue plus order/enquiry triage,
 * site content, staff directory and an activity log.
 *
 * NOTE: this portal has no authentication. It is safe only because it is a
 * local prototype writing to this browser's localStorage. Before it is hosted
 * anywhere reachable, it needs a real login and a server that authorises every
 * write — see README.
 */

const AdminContext = createContext(null);

const ACTIVITY_LIMIT = 40;

export const AdminProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('admin-dashboard');

  const [vehicles, setVehicles] = useState(() => read(KEYS.vehicles, INITIAL_VEHICLES));
  const [parts, setParts] = useState(() => read(KEYS.parts, INITIAL_PARTS));
  const [compatibility, setCompatibility] = useState(() => read(KEYS.compatibility, COMPATIBILITY_RULES));
  const [orders, setOrders] = useState(() => read(KEYS.orders, INITIAL_ORDERS));
  const [enquiries, setEnquiries] = useState(() => read(KEYS.enquiries, INITIAL_ENQUIRIES));

  const [siteContent, setSiteContent] = useState(() =>
    read(KEYS.siteContent, {
      banners: DEFAULT_BANNERS,
      contact: DEFAULT_CONTACT,
      faqs: DEFAULT_FAQS,
    })
  );
  /**
   * Migrated on read, not on write. A roster saved before PIN sign-in has no
   * `pin` field, and `read` returns that stored copy rather than the seed — so
   * without this pass nobody can sign in and there is no route back in from the
   * UI. The write-back below persists the repaired shape.
   */
  const [adminUsers, setAdminUsers] = useState(
    () => migrateAdminUsers(read(KEYS.adminUsers, DEFAULT_ADMIN_USERS))
  );

  /**
   * Session.
   *
   * Stores the signed-in user's id, not the user object — roles change, and a
   * cached copy would keep someone on their old permissions until they signed
   * out. Resolving through `adminUsers` means a demotion takes effect at once,
   * and a deleted account is signed out on the next render.
   *
   * NOT a security boundary. See the notice in shared/data/siteContent.js.
   */
  const [sessionUserId, setSessionUserId] = useState(() => read(KEYS.session, null));
  const [activity, setActivity] = useState(() => read(KEYS.activity, []));

  /**
   * Cost ledgers, keyed by vehicle id, under their own storage key.
   *
   * Not fields on the vehicle: the customer app reads the vehicle record, and
   * folding CNF, duty and margin into it would put the dealership's buying
   * position one fetch away from every visitor. Separate key now means a
   * separately-authorised endpoint later.
   */
  const [vehicleCosts, setVehicleCosts] = useState(() => read(KEYS.vehicleCosts, {}));
  const [vehicleGroups, setVehicleGroups] = useState(() => read(KEYS.vehicleGroups, DEFAULT_GROUPS));
  /* Sales records live apart from the catalogue for the same reason the cost
     ledger does: achieved prices and buy prices are negotiating position, and
     `parts` and `orders` are records the storefront reads. See KEYS. */
  const [vehicleSales, setVehicleSales] = useState(() => read(KEYS.vehicleSales, {}));
  const [partCosts, setPartCosts] = useState(() => read(KEYS.partCosts, {}));
  const [orderCosts, setOrderCosts] = useState(() => read(KEYS.orderCosts, {}));

  useEffect(() => { write(KEYS.vehicles, vehicles); }, [vehicles]);
  useEffect(() => { write(KEYS.parts, parts); }, [parts]);
  useEffect(() => { write(KEYS.compatibility, compatibility); }, [compatibility]);
  useEffect(() => { write(KEYS.orders, orders); }, [orders]);
  useEffect(() => { write(KEYS.enquiries, enquiries); }, [enquiries]);
  useEffect(() => { write(KEYS.siteContent, siteContent); }, [siteContent]);
  useEffect(() => { write(KEYS.adminUsers, adminUsers); }, [adminUsers]);
  useEffect(() => { write(KEYS.session, sessionUserId); }, [sessionUserId]);
  useEffect(() => { write(KEYS.activity, activity); }, [activity]);
  useEffect(() => { write(KEYS.vehicleCosts, vehicleCosts); }, [vehicleCosts]);
  useEffect(() => { write(KEYS.vehicleGroups, vehicleGroups); }, [vehicleGroups]);
  useEffect(() => { write(KEYS.vehicleSales, vehicleSales); }, [vehicleSales]);
  useEffect(() => { write(KEYS.partCosts, partCosts); }, [partCosts]);
  useEffect(() => { write(KEYS.orderCosts, orderCosts); }, [orderCosts]);

  const navigateTo = useCallback((view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0 });
  }, []);

  /**
   * Activity log. Real entries written as changes happen, so the audit trail
   * on Settings reflects what was actually done rather than sample rows.
   * Without a backend it records this browser only, and nothing stops it being
   * edited — it is a working record, not a tamper-proof one.
   */
  const logActivity = useCallback((message) => {
    setActivity((prev) => [{ id: Date.now() + Math.random(), message, at: Date.now() }, ...prev].slice(0, ACTIVITY_LIMIT));
  }, []);

  const nextId = (rows) => Math.max(0, ...rows.map((r) => Number(r.id) || 0)) + 1;

  // Vehicles
  /**
   * Stock ID is issued here and nowhere else, so every route into the inventory
   * gets one. `ensureStockId` is a no-op when the car already has an id — it is
   * printed on the windscreen card and the logbook file, so it must survive
   * every subsequent edit.
   */
  const saveVehicle = useCallback((data) => {
    setVehicles((prev) =>
      data.id
        ? prev.map((v) => (v.id === data.id ? ensureStockId({ ...v, ...data }, prev) : v))
        : [ensureStockId({ ...data, id: nextId(prev) }, prev), ...prev]
    );
    logActivity(data.id ? `${data.name} listing updated` : `${data.name} added to inventory`);
  }, [logActivity]);

  /**
   * Ledgers are saved apart from the vehicle so a Sales Staff edit to a listing
   * can never touch the cost record, even by accident.
   */
  const saveCosts = useCallback((vehicleId, costs) => {
    setVehicleCosts((prev) => ({ ...prev, [vehicleId]: { ...emptyCosts(), ...costs } }));
    const v = vehicles.find((x) => x.id === vehicleId);
    logActivity(`Cost ledger updated for ${v ? v.name : 'a vehicle'}`);
  }, [vehicles, logActivity]);

  const costsFor = useCallback(
    (vehicleId) => vehicleCosts[vehicleId] ?? emptyCosts(),
    [vehicleCosts]
  );

  /**
   * Records a car as sold at the price actually achieved.
   *
   * The achieved price is asked for rather than assumed from the listing: cars
   * are negotiated, and taking `price` as the sale price would report a profit
   * the yard never made. The cost is frozen into the record here — see the
   * snapshot rule at the top of shared/lib/sales.js.
   */
  const recordVehicleSale = useCallback((vehicleId, { price, date, buyer }) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    const sale = makeVehicleSale({ price, date, buyer, costs: vehicleCosts[vehicleId] });
    setVehicleSales((prev) => ({ ...prev, [vehicleId]: sale }));
    setVehicles((prev) => prev.map((x) => (x.id === vehicleId ? { ...x, status: 'Sold' } : x)));
    logActivity(
      `${v ? v.name : 'A vehicle'} sold for ${formatKES(sale.price)}` +
      (sale.costed ? '' : ' — no cost ledger, excluded from profit')
    );
  }, [vehicles, vehicleCosts, logActivity]);

  /** Undo, for the mis-click. The sale record goes with the status. */
  const clearVehicleSale = useCallback((vehicleId, status = 'Available') => {
    const v = vehicles.find((x) => x.id === vehicleId);
    setVehicleSales((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
    setVehicles((prev) => prev.map((x) => (x.id === vehicleId ? { ...x, status } : x)));
    logActivity(`Sale record removed for ${v ? v.name : 'a vehicle'}`);
  }, [vehicles, logActivity]);

  const saleFor = useCallback((vehicleId) => vehicleSales[vehicleId] ?? null, [vehicleSales]);

  /** Buy price for a part, kept out of the part record the storefront reads. */
  const savePartCost = useCallback((partId, costPrice) => {
    const p = parts.find((x) => x.id === partId);
    const value = Number(costPrice);
    setPartCosts((prev) => {
      const next = { ...prev };
      if (Number.isFinite(value) && value > 0) next[partId] = { costPrice: value };
      else delete next[partId];   // blank clears it rather than storing a zero
      return next;
    });
    logActivity(`Buy price ${value > 0 ? 'set' : 'cleared'} for ${p ? p.name : 'a part'}`);
  }, [parts, logActivity]);

  const partCostFor = useCallback(
    (partId) => partCosts[partId]?.costPrice ?? null,
    [partCosts]
  );

  const saveGroup = useCallback((group) => {
    setVehicleGroups((prev) => {
      const exists = prev.some((g) => g.id === group.id);
      return exists
        ? prev.map((g) => (g.id === group.id ? { ...g, ...group } : g))
        : [{ ...group, id: group.id || nextGroupId(prev) }, ...prev];
    });
    logActivity(`Group ${group.name} saved`);
  }, [logActivity]);

  /**
   * Removing a group must not orphan its cars into a group id that no longer
   * resolves — they fall back to Ungrouped, which is a real state the table
   * already renders.
   */
  const removeGroup = useCallback((groupId) => {
    const gone = vehicleGroups.find((g) => g.id === groupId);
    setVehicleGroups((prev) => prev.filter((g) => g.id !== groupId));
    setVehicles((prev) => prev.map((v) => (v.groupId === groupId ? { ...v, groupId: '' } : v)));
    if (gone) logActivity(`Group ${gone.name} removed`);
  }, [vehicleGroups, logActivity]);

  const deleteVehicle = useCallback((id) => {
    const gone = vehicles.find((v) => v.id === id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    // Ledgers are keyed by vehicle id and ids get reused, so a stale ledger
    // would silently attach itself to the next car added.
    setVehicleCosts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (gone) logActivity(`${gone.name} removed from inventory`);
  }, [vehicles, logActivity]);

  const toggleFeaturedVehicle = useCallback((id) => {
    const target = vehicles.find((v) => v.id === id);
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, featured: !v.featured } : v)));
    if (target) {
      logActivity(`${target.name} ${target.featured ? 'removed from' : 'added to'} homepage features`);
    }
  }, [vehicles, logActivity]);

  // Parts
  const savePart = useCallback((data) => {
    setParts((prev) =>
      data.id
        ? prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
        : [{ ...data, id: nextId(prev) }, ...prev]
    );
    logActivity(data.id ? `${data.name} updated` : `${data.name} added to parts catalogue`);
  }, [logActivity]);

  const deletePart = useCallback((id) => {
    const gone = parts.find((p) => p.id === id);
    setParts((prev) => prev.filter((p) => p.id !== id));
    if (gone) logActivity(`${gone.name} removed from parts catalogue`);
  }, [parts, logActivity]);

  // Compatibility rules
  const addCompatibilityRule = useCallback((rule) => {
    setCompatibility((prev) => [{ ...rule, id: nextId(prev) }, ...prev]);
    logActivity(`Fitment rule added: ${rule.part} → ${rule.make} ${rule.model}`);
  }, [logActivity]);

  const removeCompatibilityRule = useCallback((id) => {
    const gone = compatibility.find((c) => c.id === id);
    setCompatibility((prev) => prev.filter((c) => c.id !== id));
    if (gone) logActivity(`Fitment rule removed: ${gone.part} → ${gone.make}`);
  }, [compatibility, logActivity]);

  // Triage
  /**
   * Order status, and the cost snapshot that rides along with it.
   *
   * The moment an order becomes Completed is the moment its profit is fixed.
   * Costs are frozen here rather than looked up when a report runs, so that
   * editing a part's buy price next quarter cannot rewrite this quarter's
   * figures. Re-completing an order does not re-snapshot: the first completion
   * is the one that happened.
   */
  const updateOrderStatus = useCallback((ref, status) => {
    const order = orders.find((o) => o.ref === ref);
    setOrders((prev) => prev.map((o) => (o.ref === ref ? { ...o, status } : o)));

    if (order && isRealisedOrder({ status }) && !orderCosts[ref]) {
      const entry = makeOrderCost(order, partCosts);
      setOrderCosts((prev) => ({ ...prev, [ref]: entry }));
      if (!entry.complete) {
        logActivity(
          `Order ${ref} completed — ${entry.lines.length === 0
            ? 'no itemised lines, excluded from profit'
            : 'some parts have no buy price, excluded from profit'}`
        );
      }
    }

    logActivity(`Order ${ref} marked as ${status}`);
  }, [orders, orderCosts, partCosts, logActivity]);

  const updateEnquiryStatus = useCallback((id, status) => {
    const target = enquiries.find((e) => e.id === id);
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    if (target) logActivity(`Enquiry from ${target.customer} marked as ${status}`);
  }, [enquiries, logActivity]);

  // Site content
  const saveContact = useCallback((contact) => {
    setSiteContent((prev) => ({ ...prev, contact }));
    logActivity('Contact details updated');
  }, [logActivity]);

  const addBanner = useCallback((banner) => {
    setSiteContent((prev) => ({
      ...prev,
      banners: [...prev.banners, { ...banner, id: nextId(prev.banners) }],
    }));
    logActivity(`Homepage banner "${banner.title || 'untitled'}" added`);
  }, [logActivity]);

  const removeBanner = useCallback((id) => {
    setSiteContent((prev) => ({ ...prev, banners: prev.banners.filter((b) => b.id !== id) }));
    logActivity('Homepage banner removed');
  }, [logActivity]);

  const saveFaq = useCallback((faq) => {
    setSiteContent((prev) => ({
      ...prev,
      faqs: faq.id
        ? prev.faqs.map((f) => (f.id === faq.id ? { ...f, ...faq } : f))
        : [...prev.faqs, { ...faq, id: nextId(prev.faqs) }],
    }));
    logActivity(faq.id ? `"${faq.question}" updated` : `"${faq.question}" published`);
  }, [logActivity]);

  const removeFaq = useCallback((id) => {
    setSiteContent((prev) => ({ ...prev, faqs: prev.faqs.filter((f) => f.id !== id) }));
    logActivity('FAQ entry removed');
  }, [logActivity]);

  const currentUser = useMemo(
    () => adminUsers.find((u) => u.id === sessionUserId) ?? null,
    [adminUsers, sessionUserId]
  );

  /** Returns the matched user, or null. The caller renders the error. */
  const signIn = useCallback((pin) => {
    const match = findByPin(adminUsers, pin);
    if (!match) return null;
    const stamp = new Date().toISOString();
    setAdminUsers((prev) => prev.map((u) => (u.id === match.id ? { ...u, lastLogin: stamp } : u)));
    setSessionUserId(match.id);
    return match;
  }, [adminUsers]);

  const signOut = useCallback(() => setSessionUserId(null), []);

  /**
   * Last way in. If every PIN on the roster has been changed and forgotten,
   * there is no route back through the UI — this restores the seed accounts.
   * Surfaced only after repeated failures, so it is a fire escape rather than a
   * door. With a real backend this becomes an emailed reset, not a button.
   */
  const resetAdminUsers = useCallback(() => {
    setAdminUsers(DEFAULT_ADMIN_USERS);
    setSessionUserId(null);
    logActivity('Staff accounts reset to defaults');
  }, [logActivity]);

  /** One question, asked everywhere. Signed out means no. */
  const can = useCallback(
    (permission) => (currentUser ? hasPermission(currentUser.role, permission) : false),
    [currentUser]
  );
  const canView = useCallback(
    (view) => (currentUser ? canSeeView(currentUser.role, view) : false),
    [currentUser]
  );

  // Staff directory
  const saveUser = useCallback((user) => {
    setAdminUsers((prev) =>
      user.id
        ? prev.map((u) => (u.id === user.id ? { ...u, ...user } : u))
        : [...prev, { ...user, id: nextId(prev), lastLogin: '' }]
    );
    logActivity(user.id ? `${user.name}'s access updated` : `${user.name} invited as ${user.role}`);
  }, [logActivity]);

  /**
   * Removing the last Superadmin would lock everyone out of user management
   * with no way back in, so it is refused. Same reason you cannot delete
   * yourself: the signed-in session would point at a user that no longer exists.
   */
  const removeUser = useCallback((id) => {
    const gone = adminUsers.find((u) => u.id === id);
    if (!gone) return { ok: false, reason: 'Not found' };
    if (gone.id === sessionUserId) return { ok: false, reason: 'You cannot remove your own account' };
    const superadmins = adminUsers.filter((u) => u.role === 'Superadmin');
    if (gone.role === 'Superadmin' && superadmins.length <= 1) {
      return { ok: false, reason: 'There must be at least one Superadmin' };
    }
    setAdminUsers((prev) => prev.filter((u) => u.id !== id));
    logActivity(`${gone.name} removed from the team`);
    return { ok: true };
  }, [adminUsers, sessionUserId, logActivity]);

  const value = useMemo(
    () => ({
      currentView, navigateTo,
      vehicles, parts, compatibility, orders, enquiries,
      saveVehicle, deleteVehicle, toggleFeaturedVehicle,
      savePart, deletePart,
      vehicleSales, recordVehicleSale, clearVehicleSale, saleFor,
      partCosts, savePartCost, partCostFor,
      orderCosts,
      addCompatibilityRule, removeCompatibilityRule,
      updateOrderStatus, updateEnquiryStatus,

      siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
      adminUsers, saveUser, removeUser,
      currentUser, signIn, signOut, resetAdminUsers, can, canView, ROLE_VIEWS,
      vehicleCosts, costsFor, saveCosts,
      vehicleGroups, saveGroup, removeGroup,
      activity,

      formatKES,
    }),
    [
      currentView, navigateTo, vehicles, parts, compatibility, orders, enquiries,
      saveVehicle, deleteVehicle, toggleFeaturedVehicle, savePart, deletePart,
      addCompatibilityRule, removeCompatibilityRule, updateOrderStatus, updateEnquiryStatus,
      siteContent, saveContact, addBanner, removeBanner, saveFaq, removeFaq,
      adminUsers, saveUser, removeUser, activity,
      currentUser, signIn, signOut, resetAdminUsers, can, canView,
      vehicleCosts, costsFor, saveCosts, vehicleGroups, saveGroup, removeGroup,
      vehicleSales, recordVehicleSale, clearVehicleSale, saleFor,
      partCosts, savePartCost, partCostFor, orderCosts,
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
