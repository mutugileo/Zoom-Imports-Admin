import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pagesToShow } from '@shared/lib/paging';

/**
 * The foot of a paged admin table.
 *
 * The count line stays even on a single page — "10 of 10" answers "is that all
 * of them?", and a row that vanishes once the list fits leaves that open. The
 * numbers themselves only appear when there is more than one page.
 *
 * The range is a live region: changing page swaps the rows above without moving
 * focus, so nothing else would tell a screen-reader user the table had changed.
 */
export const Pagination = ({ page, pageCount, from, to, total, onChange, noun = 'items' }) => {
  if (total === 0) return null;

  const go = (next) => {
    const clamped = Math.min(pageCount, Math.max(1, next));
    if (clamped !== page) onChange(clamped);
  };

  return (
    <div className="table-foot">
      <span className="table-foot-count" role="status" aria-live="polite">
        {pageCount > 1 ? `Showing ${from}–${to} of ${total} ${noun}` : `${total} ${noun}`}
      </span>

      {pageCount > 1 && (
        <nav className="pager" aria-label={`${noun} pagination`}>
          <button
            type="button"
            className="pager-btn"
            onClick={() => go(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>

          {pagesToShow(page, pageCount).map((p) =>
            typeof p === 'number' ? (
              <button
                key={p}
                type="button"
                className="pager-btn"
                onClick={() => go(p)}
                /* aria-current is the whole announcement — an extra "selected"
                   label would have a screen reader say it twice. */
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p} of ${pageCount}`}
              >
                {p}
              </button>
            ) : (
              <span key={p} className="pager-gap" aria-hidden="true">&hellip;</span>
            )
          )}

          <button
            type="button"
            className="pager-btn"
            onClick={() => go(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
};
