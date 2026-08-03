# Zoom Imports

Two separate front ends that deploy independently. Each is fully self-contained —
no folder has to reach outside itself to build.

```
website/            Customer-facing storefront   → port 3000
website/shared/      Catalogue data + formatting + storage seam
website/scripts/     Asset optimisation and 360° frame extraction
admin/               Dealership admin portal      → port 3001
admin/shared/         Catalogue data + formatting + storage seam
```

`website/shared/` and `admin/shared/` are duplicates of each other, not one
package imported twice. That's deliberate — some hosts build each app in
isolation and can't reach a sibling folder outside the one they're deploying.
The cost: a fix to `store.js`, `costing.js`, or the catalogue data has to be
made in **both** copies by hand, or the two apps quietly drift out of sync —
which is exactly what keeping one shared copy used to prevent. If you're
deploying somewhere that clones the whole repo and lets you set a per-app root
directory (Vercel, Netlify, most CI-based hosts), you don't need this
duplication at all — a single `shared/` at the repo root works fine and is
less to maintain.

## Running

```bash
npm run install:all     # installs both apps
npm run dev             # both, on 3000 and 3001
npm run dev:website     # just the storefront
npm run dev:admin       # just the admin portal
npm run build           # builds both
```

## Read this before hosting the admin portal

**`admin/` has no authentication.** Anyone who can reach it can edit the
catalogue and read every customer order — names, phone numbers, emails and
delivery addresses. It is safe today only because it runs locally against this
browser's `localStorage`.

Before it goes anywhere reachable it needs a real login and a server that
authorises every write. The customer site no longer links to it, which is why
the split was worth doing, but that is obscurity, not protection.

## The two apps do not share data

Different origins get different `localStorage`, so an edit in the admin portal
does **not** reach the storefront. That is inherent to running them as two
sites with no backend.

Every read and write already goes through `lib/store.js` in each app's
`shared/` copy. When a real API arrives, replace the bodies of `read` and
`write` in **both** copies and every call site picks it up unchanged — but
because there are now two copies, that's two edits, not one.

## Images

The catalogue ships with remote Unsplash URLs. Run the optimiser to pull them
local, encode responsive WebP and generate blur-up placeholders:

```bash
npm run assets            # writes website/public/media/catalogue/
npm run assets -- --force # re-encode everything
```

This writes `website/src/data/imageManifest.json`, which the `<Img>` component
reads automatically. Without it the site still works, it just serves the remote
originals with no responsive sizes.

One source photo (`photo-1486006920555`, the KYB shock absorber) now 404s at
Unsplash. `<Img>` falls back to a designed "photo pending" placeholder rather
than a broken-image icon, but that part needs a real photograph.

## 360° turntable frames

The vehicle detail page's main gallery is a drag-to-rotate viewer backed by 12
numbered frames per car. Until frames exist for a vehicle it detects the gap and
shows the single still, labelled honestly.

```bash
# from one clean revolution of video
npm run frames -- --video lot/axio.mp4 --slug toyota-axio-2016

# or from a folder of stills
npm run frames -- --images lot/axio/ --slug toyota-axio-2016

# smoother, if you have the coverage
npm run frames -- --video lot/axio.mp4 --slug toyota-axio-2016 --count 24
```

Frames land in `website/public/media/360/<slug>/frame-01.webp …`. The `slug`
must match the vehicle's `slug` field in `website/shared/data/mockData.js`
(and `admin/shared/data/mockData.js`, if the vehicle needs to look right there too).

**Shooting guide.** Put the car on a turntable with a fixed camera, or walk a
constant radius around it taking evenly spaced photos. Lock the exposure —
auto-exposure drift between frames makes the spin strobe, and that reads worse
than no 360 at all.

## Motion

The storefront runs Lenis smooth scroll plus six ambient effects (film grain,
particles, vignette, glass panels, per-view colour grade, scroll-triggered
reveals). Everything is tuned from one file:

```
website/src/lib/motion.js
```

Motion-driven layers switch off under `prefers-reduced-motion` and respond live
if the visitor changes the setting mid-session. The admin portal has none of
this by design — it is a tool, not a showroom.

## Legacy files

The pre-split single app is still present at `src/`, along with the old
`index.html`, `vite.config.js`, `dist/` and root `node_modules/`. Nothing
references them any more. Remove them once you have confirmed the split:

```bash
rm -rf src dist node_modules index.html vite.config.js package-lock.json
```
