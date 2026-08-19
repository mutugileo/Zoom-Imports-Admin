import React from 'react';
import { ArrowRight } from 'lucide-react';
import { itemIsDue } from '../lib/mobileApp';
import { usePagedList } from '../lib/usePagedList';
import { Pagination } from './Pagination';

/* Five to a panel. Enough that a page is worth turning, few enough that four
   panels still fit on a screen without scrolling. */
const PANEL_PAGE = 5;

/**
 * The app's landing screen.
 *
 * Two things had to hold at once. It opens with a single figure and a single
 * action, because the first question anyone asks a dashboard is "what do I do
 * next" — but it then has to carry a whole page, which a hero and two thin
 * rows did not. So the panels below are the work itself rather than more
 * counters: the bookings to answer, the cars falling due, and what has
 * happened in the app lately.
 *
 * Minimal here means few words and no boxes, not few facts. Everything is a
 * hairline and a column.
 */

const fmtNum = (n) => Number(n ?? 0).toLocaleString('en-KE');

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** "4 days ago" — the app's records are recent enough that this reads better
 *  than a date, and vague enough that it never implies a precision it lacks. */
const ago = (value, now) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((now - d) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

const Chip = ({ count, label, onGo }) => (
  <button type="button" className="ma-chip" data-idle={count === 0 ? 'true' : undefined} onClick={onGo}>
    <b>{fmtNum(count)}</b> {label}
  </button>
);

const Panel = ({ label, action, onAction, children, empty, pager, noun }) => (
  <section className="ma-panel">
    <div className="ma-section">
      <span className="ma-section-label">{label}</span>
      <span className="ma-section-rule" />
      {action && (
        <button type="button" className="ma-panel-link" onClick={onAction}>{action}</button>
      )}
    </div>
    {React.Children.count(children) === 0
      ? <p className="ma-panel-empty">{empty}</p>
      : <div className="ma-rows">{children}</div>}
    {pager && (
      <Pagination {...pager} onChange={pager.setPage} noun={noun} className="ma-foot" />
    )}
  </section>
);

const Row = ({ lead, title, sub, meta }) => (
  <div className="ma-row">
    {lead && <span className="ma-row-lead">{lead}</span>}
    <span className="ma-row-copy">
      <span className="ma-row-title">{title}</span>
      {sub && <span className="ma-row-sub">{sub}</span>}
    </span>
    {meta && <span className="ma-row-meta">{meta}</span>}
  </div>
);

export const MobileAppOverview = ({ app, onGo, now = new Date() }) => {
  const m = app.metrics;

  /* The queues in priority order, and the one action drawn from them. The CTA
     is whichever queue is longest rather than a fixed button — "Answer 3
     bookings" is a decision already made for the reader. */
  const queues = [
    { id: 'bookings', count: m.openBookings, one: 'booking', many: 'bookings', verb: 'Answer' },
    { id: 'applications', count: m.applicationsPending, one: 'application', many: 'applications', verb: 'Review' },
    { id: 'chat', count: m.threadsOpen, one: 'conversation', many: 'conversations', verb: 'Reply to' },
    { id: 'customers', count: m.dueItems, one: 'service due', many: 'services due', verb: 'Check' },
  ];
  const waiting = queues.reduce((sum, q) => sum + q.count, 0);
  const lead = [...queues].sort((a, b) => b.count - a.count)[0];
  const noun = (q) => (q.count === 1 ? q.one : q.many);

  const vehicleById = new Map(app.vehicles.map((v) => [v.id, v]));
  const garageByCode = new Map(app.garages.map((g) => [g.code, g]));

  /* Soonest first — a booking queue is read forwards, unlike everything else
     on this screen. */
  const upcoming = app.bookings
    .filter((b) => b.status === 'Requested' || b.status === 'Confirmed')
    .sort((a, b) => String(a.bookingDate).localeCompare(String(b.bookingDate)));

  const due = app.serviceItems
    .map((i) => ({ item: i, car: vehicleById.get(i.garageVehicleId) }))
    .filter(({ item, car }) => itemIsDue(item, car, now));

  /* One feed from three tables, newest first. Cars added, bookings made and
     conversations started are the only things a customer does that the yard
     can see, so they are the only things in it. */
  const recent = [
    ...app.bookings.map((b) => ({
      key: `b-${b.id}`, at: b.createdAt,
      title: b.serviceTitle,
      sub: `Booking · ${garageByCode.get(b.partnerGarageCode)?.name ?? 'no garage'}`,
    })),
    ...app.threads.map((t) => ({
      key: `t-${t.id}`, at: t.lastMessageAt,
      title: t.subject, sub: 'Conversation',
    })),
    ...app.vehicles.map((v) => ({
      key: `v-${v.id}`, at: v.createdAt,
      title: v.name, sub: `Car added · ${v.plate}`,
    })),
  ]
    .filter((r) => r.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const upcomingPage = usePagedList(upcoming, PANEL_PAGE, String(upcoming.length));
  const duePage = usePagedList(due, PANEL_PAGE, String(due.length));
  const recentPage = usePagedList(recent, PANEL_PAGE, String(recent.length));
  const garagePage = usePagedList(app.garages, PANEL_PAGE, String(app.garages.length));

  return (
    <div className="ma-overview">
      <div className="ma-hero ma-rise" style={{ '--i': 0 }} data-clear={waiting === 0 ? 'true' : undefined}>
        <span className="ma-hero-figure">{fmtNum(waiting)}</span>
        <span className="ma-hero-copy">
          <span className="ma-hero-title">
            {waiting === 0
              ? 'Nothing waiting on the yard.'
              : `item${waiting === 1 ? '' : 's'} waiting on the yard`}
          </span>

          {lead.count > 0 ? (
            <button type="button" className="ma-cta" onClick={() => onGo(lead.id)}>
              {lead.verb} {fmtNum(lead.count)} {noun(lead)}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : m.garagesTotal === 0 ? (
            <button type="button" className="ma-cta" onClick={() => onGo('garages')}>
              Add the first partner garage
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>

      <div className="ma-chips ma-rise" style={{ '--i': 1 }}>
        {queues
          .filter((q) => q.id !== lead.id || lead.count === 0)
          .map((q) => (
            <Chip key={q.id} count={q.count} label={noun(q)} onGo={() => onGo(q.id)} />
          ))}
      </div>

      <div className="ma-panels ma-rise" style={{ '--i': 2 }}>
        <Panel
          label="Next in"
          action={upcoming.length > 0 ? 'All bookings' : null}
          onAction={() => onGo('bookings')}
          empty="No bookings to answer."
          pager={upcomingPage}
          noun="bookings"
        >
          {upcomingPage.visible.map((b) => {
            const car = b.garageVehicleId ? vehicleById.get(b.garageVehicleId) : null;
            return (
              <Row
                key={b.id}
                lead={fmtDay(b.bookingDate)}
                title={b.serviceTitle}
                sub={car ? `${car.name} · ${car.plate}` : 'No car named'}
                meta={b.status}
              />
            );
          })}
        </Panel>

        <Panel
          label="Falling due"
          action={due.length > 0 ? 'Customer vehicles' : null}
          onAction={() => onGo('customers')}
          empty="Nothing due on any customer’s schedule."
          pager={duePage}
          noun="items"
        >
          {duePage.visible.map(({ item, car }) => (
            <Row
              key={item.id}
              title={item.name}
              sub={car ? `${car.name} · ${car.plate}` : 'Car not on file'}
              meta={car && item.nextDueKm > 0 && car.currentKm >= item.nextDueKm
                ? `${fmtNum(car.currentKm - item.nextDueKm)} km over`
                : `due ${fmtDay(item.dueDate)}`}
            />
          ))}
        </Panel>

        <Panel
          label="Recently in the app"
          empty="Nothing has happened in the app yet."
          pager={recentPage}
          noun="events"
        >
          {recentPage.visible.map((r) => (
            <Row key={r.key} title={r.title} sub={r.sub} meta={ago(r.at, now)} />
          ))}
        </Panel>

        <Panel
          label="Partner network"
          action={m.applicationsPending > 0 ? 'Applications' : null}
          onAction={() => onGo('applications')}
          empty="No garages in the directory."
          pager={garagePage}
          noun="garages"
        >
          {garagePage.visible.map((g) => (
            <Row
              key={g.code}
              title={g.name}
              sub={g.area || 'No area set'}
              meta={g.active ? 'Live' : 'Hidden'}
            />
          ))}
        </Panel>
      </div>

      <div className="ma-strip ma-rise" style={{ '--i': 3 }}>
        <span><b>{fmtNum(m.users)}</b> customers</span>
        <span><b>{fmtNum(m.vehicles)}</b> cars</span>
        <span><b>{fmtNum(m.servicesLogged)}</b> services</span>
        <span><b>{fmtNum(m.fuelEntries)}</b> fill-ups</span>
        <span><b>{fmtNum(m.garagesActive)}/{fmtNum(m.garagesTotal)}</b> garages live</span>
      </div>
    </div>
  );
};
