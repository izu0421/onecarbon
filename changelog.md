# Changelog

Record specific code changes after each commit. Most recent first.

---

## 3b09c47 — gitignore cleanup
- Added `.DS_Store`, `**/.DS_Store`, and `old formatOur Story.html` to `.gitignore`
- Removed already-tracked `js/.DS_Store` and `old formatOur Story.html` from repo

## 6b972e1 — alignment changes, orange nucleus, recog bar moved, eyebrow text removed
- `css/style.css`: nav padding uses `max()` to align logo with content at all viewport widths
- `our_story.html`: nucleus colour changed to bright orange (`#ff6600`) in `TWEAK_DEFAULTS`
- All pages: recognised-by strip moved to just before `<footer>` (previously under nav); white background on `index.html` only
- `index.html`: hero `min-height` made viewport-responsive (`max(560px, calc(100vh - 175px))`) so recog bar sits at bottom of screen on load
- All pages: removed all `<div class="eyebrow">` elements; blog back-links preserved as plain `<a>` tags

## 933a613 — our_story rebuild with inline neuron module, fix importmap, site styling
- `our_story.html`: fully rebuilt from old format file; inline `<script type="module">` for Three.js neuron (avoids duplicate importmap issues); `TWEAK_DEFAULTS` global config object; scroll-driven vignette + neuron fade; `.neuron-stage` starts at `opacity:0` to prevent flash on refresh
- `css/style.css`: global `h1`/`h2` em colour (`#1a73e8`), fluid type sizes via `clamp()`
- `NOTES.md`: created (gitignored) with neuron config duplication note and pre-launch content warning
- `.gitignore`: added `NOTES.md` entry

## f3dd381 — OneCarbon rebrand, blog, our story, purchase page changes
- Sitewide rename to OneCarbon (removed "Technologies")
- Added `blog.html` and four blog post pages (`blog-*.html`)
- `our_story.html`: added company timeline and team grid (migrated from `team.html`)
- `purchase.html`: updated product copy and layout
- Removed Home from all nav bars

## 88b8c24 — add mito1.png mechanism diagram
- Added `media/mito1.png` for use on purchase/mechanism section

## 2451887 — recognition banner
- Added "Recognised By" section to `index.html` between the stats strip and PROFILE CTA
- Section contains logos: Forbes, Falling Walls, Launchpad, Trin Brad (stored in `media/`)
- Supporting CSS added to `css/style.css` under `/* ── Recognised By section ── */`

## 1abcb5e — live payment links, bot honeypot, minor labelling tweaks
- `purchase.html`: replaced placeholder Stripe links with live `buy.stripe.com` URLs for all four tiers (K00–K03)
- `index.html`: added `_honeypot` hidden field to PROFILE sign-up form for bot protection
- Minor label/copy tweaks across pages

## 8654aff — privacy policy, ToS, price changes, research tweaks, footer expansion
- Added `privacy.html` and `tos.html`
- Updated product prices in `purchase.html`
- Footer HTML expanded across pages (links to legal pages)
- `research.html`: partial content updates (WIP at time of commit)

## 96d0716 / c0384fe / f3d899a / d211faa — CNAME churn
- GitHub Pages CNAME file created and deleted multiple times during domain setup
- Final state: CNAME = `onecarbon.com`

## 2239d43 — eyebrow text colour → white
- `css/style.css`: changed eyebrow/label text colour to white on dark hero sections

## c82b13a / 805f760 — font migration to DM Sans 500
- Replaced Syne with DM Sans Medium 500 for all headings
- Fonts self-hosted on Cloudflare R2 (woff2) — eliminates Google Fonts flash
- `@font-face` declarations added to top of `css/style.css`
- Previous fonts: Fraunces (headings) / Figtree (body) — noted in style.css header comment
