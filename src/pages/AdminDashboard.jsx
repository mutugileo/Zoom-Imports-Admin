import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AdminContext';
import { useFocusTrap } from '@shared/lib/useFocusTrap';
import { AdminLayout } from './AdminLayout';
import { Sparkline } from '../components/Sparkline';
import { Thumb } from '../components/Thumb';
import { usePagedList } from '../lib/usePagedList';
import { Pagination } from '../components/Pagination';
import { AdminIcon } from '../components/AdminIcon';
import { vehicleSalesSummary, partSalesSummary, combinedSummary } from '@shared/lib/sales';
import {
  RANGES,
  rangeById,
  rangeStart,
  withinRange,
  dailySeries,
  buildActivity,
  firstNameOf,
} from '../lib/dashboardData';
import {
  CarFront,
  CheckCircle2,
  Bookmark,
  BadgeCheck,
  Boxes,
  AlertTriangle,
  PackageX,
  ClipboardList,
  MessageSquareText,
  Activity,
  CalendarDays,
  CircleDollarSign,
  ChevronRight,
  X,
} from 'lucide-react';

/* Tones for summary and activity details. Each `fg` is the type value and
 * clears 4.5:1 on its pale `bg`. */
const TONE = {
  primary: { bg: '#e4f3fd', fg: '#0a72ac' },
  green: { bg: '#e2f2ea', fg: '#1f7a52' },
  amber: { bg: '#fdf3dc', fg: '#8a6100' },
  slate: { bg: '#eceff2', fg: '#4f5a67' },
  violet: { bg: '#ecebf7', fg: '#4f478c' },
  orange: { bg: '#fdece0', fg: '#9c4a15' },
  red: { bg: '#fbe7e6', fg: '#b3261e' },
  blue: { bg: '#e4f3fd', fg: '#0a72ac' },
};

/** "12.4% margin", or an honest dash when nothing in the stream was costed. */
const marginLabel = (summary) =>
  summary.margin === null ? 'margin unknown — nothing costed' : `${summary.margin.toFixed(1)}% margin`;

const Money = ({ label, value, sub, big = false, tone }) => (
  <div className="money-cell">
    <div className="money-label">{label}</div>
    <div className="money-value" style={{ fontSize: big ? '24px' : '18px', color: tone || 'var(--text-dark)' }}>
      {value}
    </div>
    <div className="money-sub">{sub}</div>
  </div>
);

const SummaryCard = ({ icon: Icon, tone, value, label, sub, onClick }) => {
  const t = TONE[tone] ?? TONE.primary;
  return (
    <button
      type="button"
      className="card summary-card"
      style={{ '--stat-tone': t.fg, '--stat-soft': t.bg }}
      onClick={onClick}
      aria-haspopup="dialog"
    >
      <AdminIcon icon={Icon} variant="summary" size={29} />
      <span className="summary-copy">
        <span className="summary-kicker">{value} total</span>
        <span className="summary-label">{label}</span>
        <span className="summary-sub">{sub}</span>
      </span>
      <ChevronRight className="summary-chevron" size={20} aria-hidden="true" />
    </button>
  );
};

const SummaryModal = ({ id, title, total, totalLabel, icon: Icon, tone, details, onClose }) => {
  const t = TONE[tone] ?? TONE.primary;
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content summary-modal"
        style={{ '--stat-tone': t.fg, '--stat-soft': t.bg }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-summary-title`}
        ref={trapRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="summary-modal-head">
          <AdminIcon icon={Icon} variant="modal" size={27} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="summary-modal-kicker">{total} {totalLabel}</span>
            <h2 id={`${id}-summary-title`} className="summary-modal-title">{title}</h2>
          </span>
          <button type="button" className="summary-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="summary-detail-list">
          {details.map(({ icon: DetailIcon, label, value, sub, series }) => (
            <div key={label} className="summary-detail-row">
              <AdminIcon icon={DetailIcon} variant="detail" size={19} />
              <span className="summary-detail-copy">
                <span className="summary-detail-label">{label}</span>
                <span className="summary-detail-sub">{sub}</span>
              </span>
              <span className="summary-detail-metric">
                <strong>{value}</strong>
                {series && series.length > 1 && (
                  <Sparkline series={series} tone={t.fg} width={74} height={18} label={`${label} — daily trend`} />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const {
    vehicles, parts, orders, enquiries, formatKES, navigateTo, currentUser, canView,
    vehicleSales, orderCosts, can,
  } = useApp();

  const [range, setRange] = useState('30d');
  const [activeSummary, setActiveSummary] = useState(null);
  const closeSummary = useCallback(() => setActiveSummary(null), []);

  /* Stock levels: what is in the yard and on the shelf right now. These are not
     date-stamped anywhere, so the range control deliberately does not touch
     them — filtering a stock count by a date window would be meaningless. */
  const totalVehicles = vehicles.length;
  const availableCount = vehicles.filter((v) => v.status === 'Available').length;
  const reservedCount = vehicles.filter((v) => v.status === 'Reserved').length;
  const soldCount = vehicles.filter((v) => v.status === 'Sold').length;
  const totalParts = parts.length;
  const lowStockCount = parts.filter((p) => p.stock > 0 && p.stock < 10).length;
  const outOfStockCount = parts.filter((p) => p.stock === 0).length;

  /* Flow metrics: things that arrived during the window, so the range applies. */
  const { newOrders, newEnquiries, orderSeries, enquirySeries, activity, rangeLabel } = useMemo(() => {
    const inRange = (r) => withinRange(r, range);
    const ordersIn = orders.filter(inRange);
    const enquiriesIn = enquiries.filter(inRange);
    return {
      newOrders: ordersIn.filter((o) => o.status === 'New').length,
      newEnquiries: enquiriesIn.filter((e) => e.status === 'New').length,
      orderSeries: dailySeries(ordersIn, range),
      enquirySeries: dailySeries(enquiriesIn, range),
      activity: buildActivity(orders, enquiries, range),
      rangeLabel: rangeById(range).label.toLowerCase(),
    };
  }, [orders, enquiries, range]);

  /* Three to a page — a glance, not a backlog. The two catalogue panels below
     stay fixed at three and are not paged: they are a prompt to open the full
     screen, which "View all" already does. */
  const activityPage = usePagedList(activity, 3, range);

  /* Realised money over the same window as everything else on this screen.
     Revenue counts every sale; profit counts only the ones with a cost on
     record, and `excluded` says how many were left out — see the "unknown is
     reported, never assumed to be zero" rule in shared/lib/sales.js. */
  const money = useMemo(() => {
    const from = rangeStart(range);
    const cars = vehicleSalesSummary(vehicles, vehicleSales, { from });
    const spares = partSalesSummary(orders, orderCosts, { from });
    return { cars, spares, ...combinedSummary(cars, spares) };
  }, [vehicles, vehicleSales, orders, orderCosts, range]);

  const featured = vehicles.filter((v) => v.featured).slice(0, 3);
  const topParts = [...parts].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0)).slice(0, 3);

  const greetingName = firstNameOf(currentUser?.name);

  const summaryData = activeSummary === 'vehicles'
    ? {
        id: 'vehicles', title: 'Vehicle details', total: totalVehicles, totalLabel: 'vehicles',
        icon: CarFront, tone: 'primary',
        details: [
          { icon: CheckCircle2, label: 'Available vehicles', value: availableCount, sub: 'Ready for purchase' },
          { icon: Bookmark, label: 'Reserved vehicles', value: reservedCount, sub: 'Deposit paid' },
          { icon: BadgeCheck, label: 'Sold vehicles', value: soldCount, sub: 'Handed over' },
          { icon: MessageSquareText, label: 'New enquiries', value: newEnquiries, sub: `Test drive or callback · ${rangeLabel}`, series: enquirySeries },
        ],
      }
    : activeSummary === 'parts'
      ? {
          id: 'parts', title: 'Spare parts details', total: totalParts, totalLabel: 'catalogue items',
          icon: Boxes, tone: 'amber',
          details: [
            { icon: AlertTriangle, label: 'Low stock SKUs', value: lowStockCount, sub: 'Under 10 units left' },
            { icon: PackageX, label: 'Out of stock', value: outOfStockCount, sub: 'Needs re-order' },
            { icon: ClipboardList, label: 'New orders', value: newOrders, sub: `Awaiting confirmation · ${rangeLabel}`, series: orderSeries },
          ],
        }
      : null;

  return (
    <AdminLayout>
      <div className="dashboard-page">

        {/* ---------- Page head ---------- */}
        <div className="dashboard-head">
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 600, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
              Dashboard Overview
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '6px' }}>
              {greetingName ? `Welcome back, ${greetingName}. ` : ''}
              Here&rsquo;s what&rsquo;s happening today.
            </p>
          </div>

          <div className="dashboard-tools">
            <div className="card status-pill">
              <span className="status-dot" aria-hidden="true" />
              Showroom status: <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>Live &amp; active</strong>
            </div>

            {/* Rolling windows, not calendar ones — see lib/dashboardData.js. */}
            <div className="card range-picker">
              <CalendarDays size={16} color="var(--text-dim)" aria-hidden="true" />
              <label htmlFor="dash-range" className="sr-only">Date range for orders, enquiries and activity</label>
              <select id="dash-range" value={range} onChange={(e) => setRange(e.target.value)}>
                {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ---------- Realised money ----------
            Behind the same permission as the cost ledger: revenue is one thing,
            but profit exposes the buying position, and Sales Staff do not see
            that anywhere else in the portal. */}
        {can('costs:view') && (
          <div className="card money-band">
            <div className="money-head">
              <span className="panel-title">
                <AdminIcon icon={CircleDollarSign} variant="section" size={17} /> Realised · {rangeLabel}
              </span>
              {money.hasGaps && (
                <span className="money-warn">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {money.excluded} {money.excluded === 1 ? 'sale' : 'sales'} left out of profit — no cost recorded
                </span>
              )}
            </div>

            <div className="money-grid">
              <Money label="Revenue" value={formatKES(money.revenue)} sub={`${money.cars.units} cars · ${money.spares.orders} parts orders`} big />
              <Money
                label="Profit"
                value={money.cars.costedUnits + money.spares.costedOrders === 0 ? '—' : formatKES(money.profit)}
                sub={money.cars.costedUnits + money.spares.costedOrders === 0
                  ? 'nothing costed yet'
                  : `from ${money.cars.costedUnits + money.spares.costedOrders} costed ${money.cars.costedUnits + money.spares.costedOrders === 1 ? 'sale' : 'sales'}`}
                big
                tone={money.profit < 0 ? '#b3261e' : '#1f7a52'}
              />
              <Money label="Vehicles" value={formatKES(money.cars.revenue)} sub={marginLabel(money.cars)} />
              <Money label="Spare parts" value={formatKES(money.spares.revenue)} sub={marginLabel(money.spares)} />
            </div>
          </div>
        )}

        {/* ---------- Inventory summaries ---------- */}
        <div className="summary-grid">
          <SummaryCard
            icon={CarFront}
            tone="primary"
            value={totalVehicles}
            label="Vehicles"
            sub="Availability, reservations, sales and enquiries"
            onClick={() => setActiveSummary('vehicles')}
          />
          <SummaryCard
            icon={Boxes}
            tone="amber"
            value={totalParts}
            label="Spare parts"
            sub="Catalogue health, stock alerts and new orders"
            onClick={() => setActiveSummary('parts')}
          />
        </div>

        {/* ---------- Activity + highlights ---------- */}
        <div className="dash-split">
          <div className="card panel">
            <div className="panel-head">
              <span className="panel-title">
                <AdminIcon icon={Activity} variant="section" size={17} /> Recent activity
              </span>
              {canView('admin-orders') && (
                <button type="button" className="panel-link" onClick={() => navigateTo('admin-orders')}>
                  View orders
                </button>
              )}
            </div>

            {/* Built from the orders and enquiries actually on file, so it moves
                when the yard does. */}
            {activity.length === 0 ? (
              <p className="panel-empty">Nothing recorded in the {rangeLabel}.</p>
            ) : (
              activityPage.visible.map((a) => (
                <div key={a.key} className="panel-row">
                  <span
                    className="stat-tile"
                    style={{
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      background: a.kind === 'order' ? TONE.blue.bg : TONE.violet.bg,
                      color: a.kind === 'order' ? TONE.blue.fg : TONE.violet.fg,
                    }}
                  >
                    {a.kind === 'order'
                      ? <ClipboardList size={15} strokeWidth={1.8} aria-hidden="true" />
                      : <MessageSquareText size={15} strokeWidth={1.8} aria-hidden="true" />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{a.text}</span>
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '1px' }}>
                      {a.meta}
                    </span>
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{a.when}</span>
                </div>
              ))
            )}

            <Pagination {...activityPage} onChange={activityPage.setPage} noun="entries" />
          </div>

          <div className="dash-highlights">
            <div className="card panel">
              <div className="panel-head">
                <span className="panel-title">
                  <AdminIcon icon={CarFront} variant="section" size={17} /> Featured vehicles
                </span>
                {canView('admin-vehicles') && (
                  <button type="button" className="panel-link" onClick={() => navigateTo('admin-vehicles')}>
                    View all
                  </button>
                )}
              </div>

              {featured.length === 0 ? (
                <p className="panel-empty">No vehicles are flagged as featured yet.</p>
              ) : (
                featured.map((v) => (
                  <div key={v.id} className="panel-row">
                    <Thumb src={v.img} kind="vehicle" />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                      {v.name} <span style={{ color: 'var(--text-dim)' }}>({v.year})</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                      {formatKES(v.price)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="card panel">
              <div className="panel-head">
                <span className="panel-title">
                  <AdminIcon icon={Boxes} variant="section" size={17} /> Best-stocked parts
                </span>
                {canView('admin-parts') && (
                  <button type="button" className="panel-link" onClick={() => navigateTo('admin-parts')}>
                    View all
                  </button>
                )}
              </div>

              {topParts.length === 0 ? (
                <p className="panel-empty">No parts on the shelf yet.</p>
              ) : (
                topParts.map((p) => (
                  <div key={p.id} className="panel-row">
                    <Thumb src={p.img} kind="part" className="panel-thumb-part" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{p.name}</span>
                      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '1px' }}>
                        {p.stock} in stock
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                      {formatKES(p.promo || p.price)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {summaryData && <SummaryModal {...summaryData} onClose={closeSummary} />}

      </div>
    </AdminLayout>
  );
};
