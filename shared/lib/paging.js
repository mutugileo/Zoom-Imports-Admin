/**
 * Paging arithmetic, shared by the shop and the portal.
 *
 * Both apps page lists and both had to agree on where the ellipsis falls; two
 * copies of this would drift the moment one of them handled an edge case the
 * other did not.
 */

/**
 * Page numbers with the middle elided.
 *
 * First and last are always present so the ends of the catalogue stay one click
 * away, and the current page keeps a neighbour on each side. Anything else
 * becomes an ellipsis — a run of eighteen numbered buttons is not navigation,
 * it is a wall.
 */
export const pagesToShow = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const out = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);

  if (from > 2) out.push('gap-start');
  for (let p = from; p <= to; p += 1) out.push(p);
  if (to < pageCount - 1) out.push('gap-end');

  out.push(pageCount);
  return out;
};

/** Page count for a list, never below 1 — an empty list is still "page 1 of 1". */
export const pageCountOf = (total, perPage) => Math.max(1, Math.ceil(total / perPage));

/** 1-based, inclusive human range for "showing 11–20 of 43". */
export const pageRange = (page, perPage, total) => {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * perPage + 1;
  return { from, to: Math.min(total, page * perPage) };
};
