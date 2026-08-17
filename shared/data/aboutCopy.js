/**
 * The About page's editable copy.
 *
 * One list, read by two apps: the admin renders a form field per entry, and the
 * website prints `site_copy.value` where a row exists and the `fallback` here
 * where it does not. That is why the fallbacks are the real, current wording
 * rather than placeholders — with an empty table the page must read exactly as
 * it does today, and the database ships empty.
 *
 * Clearing a field in the admin deletes its row, which puts the wording below
 * back on the page — so there is always a way back to the built-in copy without
 * needing a developer, and the table only ever holds lines the yard has
 * deliberately rewritten.
 */
export const ABOUT_COPY_FIELDS = [
  {
    key: 'about_heading',
    label: 'Heading',
    hint: 'The first thing on the page. Keep it to one line.',
    rows: 2,
    fallback: 'Zoom Imports — made for Mazda lovers',
  },
  {
    key: 'about_lead',
    label: 'Opening line',
    hint: 'Set larger than the paragraphs beneath it.',
    rows: 2,
    fallback: 'We don’t just sell Mazdas — we understand them.',
  },
  {
    key: 'about_body_1',
    label: 'First paragraph',
    rows: 4,
    fallback:
      'At Zoom Imports, Mazda is what we do. From carefully selected and imported Mazda vehicles to reliable Mazda spare parts, we bring together quality, performance and genuine value under one roof.',
  },
  {
    key: 'about_body_2',
    label: 'Second paragraph',
    rows: 4,
    fallback:
      'Whether you’re upgrading to your dream Mazda or keeping the one you love running at its best, Zoom Imports is your trusted Mazda partner.',
  },
  {
    key: 'about_signoff',
    label: 'Sign-off line',
    hint: 'Printed small and in red under the paragraphs.',
    rows: 2,
    fallback: 'Drive Mazda. Drive Quality. Drive Zoom.',
  },
  {
    key: 'about_office',
    label: 'Office address line',
    hint: 'Shown with a pin icon. The Contact page address is edited separately, under Contact Information.',
    rows: 2,
    fallback: 'Office SF07, K-Mall, Thindigua, Kiambu Road',
  },
  {
    key: 'commitment_heading',
    label: 'Commitment heading',
    hint: 'The dark card on the right of the About page.',
    rows: 2,
    fallback: 'Quality you can see. Trust you can drive.',
  },
  {
    key: 'commitment_body_1',
    label: 'Commitment paragraph 1',
    rows: 4,
    fallback:
      'At Zoom Imports, our commitment goes beyond selling Mazda vehicles and spare parts. We are dedicated to delivering quality, transparency and exceptional customer service at every step.',
  },
  {
    key: 'commitment_body_2',
    label: 'Commitment paragraph 2',
    rows: 5,
    fallback:
      'We carefully select our Mazda vehicles and spare parts to give our customers confidence in what they buy. From the moment you walk through our doors to long after you drive away, we strive to provide honest guidance, dependable products and a seamless experience.',
  },
  {
    key: 'commitment_signoff',
    label: 'Commitment sign-off',
    hint: 'Printed beside a tick at the foot of the card.',
    rows: 2,
    fallback: 'Your satisfaction is our standard. Your trust is our drive.',
  },
];

export const ABOUT_COPY_FALLBACKS = Object.fromEntries(
  ABOUT_COPY_FIELDS.map((f) => [f.key, f.fallback])
);

/**
 * Resolves one key against the rows loaded from `site_copy`.
 *
 * A row whose value is blank — or missing entirely — hands back the built-in
 * wording, so the page can never render an empty heading.
 */
export const copyValue = (overrides, key) => {
  const stored = overrides?.[key];
  return typeof stored === 'string' && stored.trim() !== '' ? stored : (ABOUT_COPY_FALLBACKS[key] ?? '');
};
