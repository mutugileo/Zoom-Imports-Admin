# Zoom Imports — open work

Tracked here rather than in scattered comments. Each item says what is wrong,
why it matters, and what "done" looks like. Verified against the build on
2026-08-02 unless noted.

Priority key: **P0** blocks a real launch · **P1** costs money or trust ·
**P2** worth doing before handover · **P3** nice to have.

---

## SEO & sharing surface

**P1 — `og:image` is missing.** `og:title`, `og:description` and `og:type` are
present in `website/index.html`; the image tag is not. That is the one tag that
produces a thumbnail, so a listing shared on WhatsApp — the sharing channel in
this market — arrives as a bare line of text. For a business that runs on
referrals and sells things people look at, the picture is the point.

*Done when:* `og:image` (1200×630, absolute URL), `og:url`, and
`twitter:card=summary_large_image` are set, and a share preview has been checked
in WhatsApp and on Facebook's debugger.

**P1 — every URL shares one set of tags.** This is a client-side SPA with a
static `index.html`, so sharing a specific CX-5 shows the generic site card
rather than that car, its price or its photo. Meta tags alone cannot fix this;
it needs prerendering or SSR for `/vehicles/:slug` and `/parts/:slug`.

*Done when:* sharing a listing URL previews that listing's name, price and photo.

**P2 — no `sitemap.xml`, no `robots.txt`.** `website/public/` holds only
`_redirects` and `media/`. Nothing tells a crawler the listing URLs exist.

*Done when:* both files ship in `website/public/`, with the sitemap generated
from the catalogue rather than hand-maintained.

**P2 — no canonical URL.** Vehicles are reachable by more than one path; without
`<link rel="canonical">` those compete with each other in search results.

**P3 — `theme-color` is stale.** `#12201b` is the retired green-black from two
palettes ago. Should be the current navy, or the brand blue.

**P3 — no favicon.** No `<link rel="icon">` in `website/index.html`, which is
also the source of the long-standing `/favicon.ico` 404 in the test suites.

---

## Content & trust

**P0 — catalogue photos do not match their labels.** The homepage hero shows a
**BMW** captioned "Mazda Axela". "Mazda CX-5" is a Porsche Panamera, "Mazda
Demio" is a Chevrolet Camaro, a shock absorber is a bag of Snickers and an
alternator is a Range Rover. On a site whose entire pitch is *"every import,
documented"*, this is self-refuting — a buyer sees the wrong badge and concludes
the dossier is invented too.

*Done when:* all 12 catalogue images show the vehicle or part they name.
Correctly-licensed Mazda photos are available on Wikimedia under the same CC0 /
CC-BY-SA sourcing already used for the login backdrop.

**P1 — placeholder contact details are shipping.** `+254 700 000 000` and
`+254 722 000 111` are null patterns, not phone numbers; `jane@example.com` is
in the seeded orders. Real numbers are lopsided.

**P1 — trust claims with nothing behind them.** "500+ vehicles handed over",
"100% genuine", "24 hrs Nairobi delivery" are asserted, unsourced and
suspiciously round. Either back them or drop them — an invented 500+ is worse
than no number.

**P3 — copy register reads as machine-written.** 132 em-dashes across
user-facing text, aphoristic headline constructions, and contractions avoided
where a Nairobi dealer would use them.

---

## Not yet a product

**P0 — no backend.** Everything is `localStorage`. Two customers on two phones
see two different shops, and the admin cannot see an order placed on the
website: the apps sit on different origins. The seam is ready — `read`/`write`
in `lib/store.js` is the only place that touches storage — but nothing is
behind it. Since 2026-08-03 `shared/` is duplicated into `website/shared/` and
`admin/shared/` (each app builds standalone for hosts that can't reach a
sibling folder), so wiring a real API means editing `store.js` in both copies,
not one.

**P0 — no real authentication.** The admin PIN is compared in the browser. It
keeps the wrong screens out of the way and secures nothing; anyone can open
devtools and be a superadmin. The on-screen notice saying so was removed at the
owner's request, so this caveat now lives only here and in the README.

**P0 — no payments.** No M-Pesa, no Daraja, nothing. In this market M-Pesa *is*
commerce.

**P1 — photo upload.** Vehicle and part images are URL fields. Staff need to
upload a png/jpeg from a phone. Needs a decision on where bytes live —
`localStorage` cannot hold photos.

**P2 — no transactional notifications.** No SMS, email or WhatsApp message when
an order is placed or its status changes.

---

## Money & reporting

The sale/profit work landed on 2026-08-02: achieved sale price, part buy prices,
itemised orders, and cost snapshotted at the moment of sale. What remains:

**P2 — legacy orders can never be costed.** The seven seeded orders predate
itemised lines, so they carry `itemsFmt` prose and no `items[]`. Their revenue
counts and they are reported as excluded from profit. Permanent for those rows;
no action needed unless someone wants them back-filled by hand.

**P2 — a new part cannot take a buy price on first save.** Its id is issued
inside `savePart`, so the field is disabled until the next edit. Tidy by
returning the id from `savePart` and writing the cost straight after.

**P2 — vehicle stage ageing.** Vehicles carry no timestamps at all, so "2 cars
have been in Clearing 19 days" — the sentence that makes someone pick up a
phone — cannot be computed. Needs a `stageSince` written whenever the stage
changes, plus a decision for the 18 existing cars (backdate, or show "unknown"
until they next move).

**P3 — dashboard is still shaped like a generic SaaS template.** Nine equal stat
tiles report nouns. The import pipeline (7 stages, real distribution) and the
costing module are the domain-specific things worth leading with. Proposal
discussed: a "needs you today" worklist, a stage funnel, then money.

---

## Performance & polish

**P2 — fonts are the largest payload.** 218–228 kB, more than all images on the
homepage, across three families and ten weights. Trimming to the weights
actually used should roughly halve it. Typography decision, so not done
unilaterally.

**P3 — admin no longer matches the customer site.** The LaundryGo palette was
adopted for the portal on request. A card, a button and a badge now look
different in the two places, so staff can no longer use the portal to preview
how a listing will appear. Resolve by bringing the shop onto the same palette,
or by accepting the split deliberately.

**P3 — spare parts card is ~26% narrower, not the 30% asked for.** Four columns
is the nearest whole-column step; exactly 30% needs a 37px gutter that looks
wrong beside the 20px used elsewhere.

---

## Done — kept for the record

- Compatibility runs both directions; vehicle pages show parts that fit.
- Sale price, buy price, itemised orders, cost snapshot at point of sale.
- `scripts/check-leaks.mjs` guards the buying position, and runs on every build.
  costing.js had claimed "a test asserts that" since it was written; none did.
- Pagination at 10 rows across every admin module, 5 on the activity feed.
- Two-across card grids on phones; all tap targets clear WCAG 2.2.
