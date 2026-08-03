import { useState, useRef } from 'react';
import { pageCountOf, pageRange } from '@shared/lib/paging';

/** Rows per page in the portal's tables. */
export const PAGE_SIZE = 10;

/**
 * Paged list for the admin tables.
 *
 * `resetKey` is whatever the list is filtered by. Without it, narrowing 200
 * vehicles to 3 while sitting on page 7 leaves the table blank with no
 * explanation — the rows exist, you are just standing past the end of them.
 *
 * The page is clamped during render rather than corrected in an effect. An
 * effect fixes it one frame too late, and that frame paints an empty table.
 */
export const usePagedList = (items = [], perPage = PAGE_SIZE, resetKey = '') => {
  const [page, setPage] = useState(1);
  const lastKey = useRef(resetKey);

  if (lastKey.current !== resetKey) {
    lastKey.current = resetKey;
    if (page !== 1) setPage(1);
  }

  const total = items.length;
  const pageCount = pageCountOf(total, perPage);
  const current = Math.min(page, pageCount);
  const start = (current - 1) * perPage;

  return {
    page: current,
    pageCount,
    perPage,
    total,
    visible: items.slice(start, start + perPage),
    ...pageRange(current, perPage, total),
    setPage,
  };
};
