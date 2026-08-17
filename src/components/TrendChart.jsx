import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * The dashboard trend line: this window against the one before it.
 *
 * Drawn by hand rather than by a charting library. The portal already hand-rolls
 * Sparkline, the admin bundle is over 600KB and warns about it at every build,
 * and a dependency would have to be re-themed to the CSS variables anyway —
 * every colour here is a token, which is the whole reason the chart survives
 * the dark theme.
 */

const PAD = { top: 18, right: 14, bottom: 28, left: 52 };
const MIN_LABEL_GAP = 46;

/**
 * Axis ticks on round numbers, with the top tick at or above the peak.
 *
 * The peak itself would put a gridline hard against the top of the plot and
 * label the axis "17" — the ceiling is rounded to 1, 2 or 5 × 10ⁿ so the scale
 * reads like a scale.
 *
 * `integer` is not cosmetic. A quiet week peaking at one order otherwise draws
 * an axis of 0, 0.5, 1, and half an order does not exist — the scale has to be
 * whole numbers whenever the line is counting things.
 */
const niceTicks = (max, count = 4, integer = false) => {
  if (!(max > 0)) return [0, 1];
  const rough = max / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  let step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;
  if (integer) step = Math.max(1, Math.ceil(step));
  const ticks = [];
  for (let v = 0; v < max - step / 1e6; v += step) ticks.push(Number(v.toFixed(6)));
  ticks.push(Number((Math.ceil(max / step) * step).toFixed(6)));
  return ticks;
};

/**
 * Monotone cubic interpolation (Fritsch–Carlson), not a plain Catmull-Rom.
 *
 * The difference matters at the values this chart actually gets: a smooth curve
 * drawn through 0, 2, 0 overshoots on both sides and dips below the axis, so
 * the picture shows negative orders on days that simply had none. A monotone
 * spline cannot leave the interval between two neighbouring points.
 */
const monotonePath = (points) => {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;

  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }

  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    // A turning point gets a flat tangent — this is what pins the curve to the
    // data at every peak and trough.
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const magnitude = a * a + b * b;
    if (magnitude > 9) {
      const t = 3 / Math.sqrt(magnitude);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }

  const f = (v) => v.toFixed(2);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${f(points[i][0] + h)},${f(points[i][1] + m[i] * h)}`
      + ` ${f(points[i + 1][0] - h)},${f(points[i + 1][1] - m[i + 1] * h)}`
      + ` ${f(points[i + 1][0])},${f(points[i + 1][1])}`;
  }
  return d;
};

/** "45,679" · "1.2M" — an axis label has to fit under 44px of gutter. */
const compact = (v) => {
  const n = Math.abs(v);
  if (n >= 1e9) return `${(v / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(v / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${Math.round(v / 1e3)}k`;
  return v.toLocaleString('en-KE');
};

export const TrendChart = ({
  current = [],
  previous = [],
  formatValue = (v) => String(v),
  currentLabel = 'This period',
  previousLabel = 'Previous period',
  integerAxis = false,
  summary,
  height = 250,
}) => {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const gradientId = useId();

  /* Measured rather than drawn into a scaling viewBox: a stretched viewBox
     would scale the tick text along with it, so the axis type would land at
     11px on one screen and 15px on another while every other label on the
     dashboard stayed put. */
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    if (typeof ResizeObserver === 'undefined') {
      setWidth(node.clientWidth);
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const plot = useMemo(() => {
    const n = current.length;
    const innerLeft = PAD.left;
    const innerRight = Math.max(PAD.left + 1, width - PAD.right);
    const innerTop = PAD.top;
    const innerBottom = height - PAD.bottom;

    const peak = Math.max(
      0,
      ...current.map((b) => b.value),
      ...previous.map((b) => b.value)
    );
    const ticks = niceTicks(peak, 4, integerAxis);
    const axisMax = ticks[ticks.length - 1];

    const xFor = (i) => (n < 2 ? (innerLeft + innerRight) / 2 : innerLeft + ((innerRight - innerLeft) * i) / (n - 1));
    const yFor = (v) => innerBottom - (axisMax > 0 ? (v / axisMax) * (innerBottom - innerTop) : 0);

    const pointsFor = (buckets) => buckets.map((b, i) => [xFor(i), yFor(b.value)]);

    // Only as many x labels as will fit without colliding — 12 months in a
    // narrow column becomes every second month, not overlapping ink.
    const room = Math.max(1, Math.floor((innerRight - innerLeft) / MIN_LABEL_GAP));
    const labelEvery = Math.max(1, Math.ceil(n / room));

    return { n, innerLeft, innerRight, innerTop, innerBottom, ticks, axisMax, xFor, yFor, pointsFor, labelEvery };
  }, [current, previous, width, height, integerAxis]);

  const move = useCallback((event) => {
    if (plot.n < 1 || plot.innerRight <= plot.innerLeft) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const ratio = (x - plot.innerLeft) / (plot.innerRight - plot.innerLeft);
    const index = Math.round(ratio * (plot.n - 1));
    setHover(Math.min(plot.n - 1, Math.max(0, index)));
  }, [plot]);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setHover((h) => {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next = (h === null ? (step > 0 ? -1 : plot.n) : h) + step;
        return Math.min(plot.n - 1, Math.max(0, next));
      });
    } else if (event.key === 'Escape') {
      setHover(null);
    }
  }, [plot.n]);

  // Nothing is drawn before the first measurement — the wrapper still reserves
  // the height, so the card does not jump once the width arrives.
  if (width === 0) {
    return <div ref={wrapRef} className="trend-plot" style={{ height }} />;
  }

  const currentPoints = plot.pointsFor(current);
  const previousPoints = plot.pointsFor(previous);
  const areaPath = previousPoints.length > 1
    ? `${monotonePath(previousPoints)} L${previousPoints[previousPoints.length - 1][0].toFixed(2)},${plot.innerBottom} L${previousPoints[0][0].toFixed(2)},${plot.innerBottom} Z`
    : '';

  const active = hover === null ? null : {
    index: hover,
    x: plot.xFor(hover),
    bucket: current[hover],
    was: previous[hover],
  };

  return (
    <div ref={wrapRef} className="trend-plot" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onMouseMove={move}
        onMouseLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
        style={{ display: 'block', touchAction: 'pan-y' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {plot.ticks.map((t) => {
          const y = plot.yFor(t);
          return (
            <g key={t}>
              <line
                x1={plot.innerLeft}
                x2={plot.innerRight}
                y1={y}
                y2={y}
                stroke="var(--border-light)"
                strokeWidth="1"
              />
              <text
                x={plot.innerLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-dim)"
              >
                {compact(t)}
              </text>
            </g>
          );
        })}

        {current.map((b, i) => (
          i % plot.labelEvery === 0 || i === plot.n - 1 ? (
            <text
              key={b.full}
              x={plot.xFor(i)}
              y={plot.innerBottom + 19}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-dim)"
            >
              {b.label}
            </text>
          ) : null
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {previousPoints.length > 1 && (
          <path
            d={monotonePath(previousPoints)}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {currentPoints.length > 1 ? (
          <path
            d={monotonePath(currentPoints)}
            fill="none"
            stroke="var(--primary-ink)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          /* One bucket is a reading, not a trend. It gets a dot — a line needs
             two points and drawing one across the full width would invent a
             direction the data never had. */
          currentPoints.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="var(--primary-ink)" />
          ))
        )}

        {active && (
          <g>
            <line
              x1={active.x}
              x2={active.x}
              y1={plot.innerTop}
              y2={plot.innerBottom}
              stroke="var(--border-medium)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={active.x} cy={plot.yFor(active.was?.value ?? 0)} r="3.5" fill="var(--primary)" fillOpacity="0.7" />
            <circle
              cx={active.x}
              cy={plot.yFor(active.bucket?.value ?? 0)}
              r="4.5"
              fill="var(--bg-card)"
              stroke="var(--primary-ink)"
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="trend-tip"
          style={{
            left: `${Math.min(Math.max(active.x, 74), width - 74)}px`,
            top: `${Math.max(plot.yFor(active.bucket?.value ?? 0) - 14, 4)}px`,
          }}
        >
          {/* Each row names the period it is actually reporting.
              Labelling them "last 7 days" and "previous 7 days" put a week's
              wording against a single day's figure — the number under the
              cursor belongs to Saturday, not to the week, and the row has to
              say which Saturday. The dots tie each figure to its own line. */}
          <span className="trend-tip-row">
            <span><i className="trend-tip-dot is-current" aria-hidden="true" />{active.bucket?.full}</span>
            <b>{formatValue(active.bucket?.value ?? 0)}</b>
          </span>
          <span className="trend-tip-row trend-tip-muted">
            <span><i className="trend-tip-dot is-previous" aria-hidden="true" />{active.was?.full}</span>
            <span>{formatValue(active.was?.value ?? 0)}</span>
          </span>
        </div>
      )}

      {/* The numbers, for anyone not reading the picture. A chart that only
          answers to a mouse leaves the figures unreachable to a screen reader
          and to keyboard users both — the arrow keys scrub the line above, and
          this is the same data as text. */}
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{currentLabel}</th>
            <th scope="col">{previousLabel}</th>
          </tr>
        </thead>
        <tbody>
          {current.map((b, i) => (
            <tr key={b.full}>
              <th scope="row">{b.full}</th>
              <td>{formatValue(b.value)}</td>
              <td>{formatValue(previous[i]?.value ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
