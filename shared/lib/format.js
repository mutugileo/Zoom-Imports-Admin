/**
 * Formatting helpers shared by the customer site and the admin portal.
 * Keeping these in one place stops the two surfaces from drifting apart
 * (e.g. admin showing "KES 4500" while the shop shows "KES 4,500").
 */

export const formatKES = (num) => {
  if (typeof num !== 'number' || Number.isNaN(num)) return 'KES 0';
  return 'KES ' + num.toLocaleString('en-KE');
};

export const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Stock vocabulary. Import these rather than re-deriving the wording locally —
 * every surface previously had its own copy, so the shop card could read
 * "Only 4 left" while the same part's detail page read "Low Stock".
 *
 * The low-stock label carries the count because that is the number that makes
 * someone act.
 */
export const LOW_STOCK_THRESHOLD = 10;

export const stockLabel = (stock) =>
  stock === 0
    ? 'Out of stock'
    : stock < LOW_STOCK_THRESHOLD
      ? `Only ${stock} left`
      : 'In stock';

export const stockClass = (stock) =>
  stock === 0 ? 'out-stock' : stock < LOW_STOCK_THRESHOLD ? 'low-stock' : 'available';

export const ORDER_STATUSES = ['New', 'Confirmed', 'Packed', 'Delivered', 'Cancelled'];
export const ENQUIRY_STATUSES = ['New', 'Contacted', 'Scheduled', 'Closed'];

/**
 * Listing provenance — who is actually selling the car.
 *
 * One field, not two. "Owned by us" and "private seller" are mutually exclusive
 * states of the same thing, so storing ownership and seller-type separately
 * would allow a dealer-owned car flagged as a private sale. Four values, and the
 * impossible combinations cannot be written down.
 *
 * `dealerOwned` is the line that matters legally and editorially: only stock the
 * dealership owns can carry its inspection and duty guarantees. Everything else
 * is the seller's claim, and the UI has to say so.
 */
export const LISTING_TYPES = {
  owned: {
    label: 'Owned by Us',
    tone: 'owned',
    dealerOwned: true,
    blurb: 'Held on our Mombasa Road lot. Inspection, duty and paperwork verified by us.',
  },
  'verified-dealer': {
    label: 'Verified Dealer',
    tone: 'verified',
    dealerOwned: false,
    blurb: 'Listed by a dealer whose trading documents we have checked. The vehicle itself is described by the seller.',
  },
  private: {
    label: 'Private Seller',
    tone: 'private',
    dealerOwned: false,
    blurb: 'Listed by a private owner. Details are as supplied by the seller and are not verified by us.',
  },
  seller: {
    label: 'Listed by Seller',
    tone: 'seller',
    dealerOwned: false,
    blurb: 'Listed by a third party. Details are as supplied by the seller.',
  },
};

/** Unknown or missing values fall back to dealer stock's opposite, never to a
 *  trust claim — an unlabelled car must not read as verified. */
export const listingOf = (vehicle) =>
  LISTING_TYPES[vehicle?.listing] ?? LISTING_TYPES.seller;

export const isDealerOwned = (vehicle) => listingOf(vehicle).dealerOwned;

/**
 * Filter options. "Listed by Seller" is the parent of the two seller kinds, not
 * a sibling — it matches all of them.
 */
export const LISTING_FILTERS = [
  { id: 'all', label: 'All vehicles', match: () => true },
  { id: 'owned', label: 'Owned by Us', match: (v) => v.listing === 'owned' },
  { id: 'seller', label: 'Listed by Seller', match: (v) => v.listing !== 'owned' },
  { id: 'verified-dealer', label: 'Verified Dealer', match: (v) => v.listing === 'verified-dealer' },
  { id: 'private', label: 'Private Seller', match: (v) => v.listing === 'private' },
];
