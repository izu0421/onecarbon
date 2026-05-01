# Changelog

Record specific code changes after each commit. Most recent first.

---

## [latest] — hide Clinical Trials nav + PROFILE section

- All pages: removed "Clinical Trials" link from nav bar and footer (trials-v3.html still accessible via direct URL)
- `index.html`: hid PROFILE sign-up section with `display:none`

---

## [prev] — spelling change

- `purchase.html`: fixed "micrbiome" typo to "microbiome"

---

## [prev] — shop changes: nav rename, purchase page layout redesign

- All pages: renamed "Shop" nav link to "Probiotics"
- `purchase.html`: restructured top section into a two-row grid — featured card + 3 stacked white info cards on left, image spanning both rows on right
- `purchase.html`: added "Become a product tester today" section title; removed "Become an early-adopter" eyebrow
- `purchase.html`: info cards — price comparison, "Why do we charge?" explanation, signup form with title and subtext

---

## [prev] — compatibility for phone improved, small font changes

- `css/style.css`: sitewide mobile (≤600px) overrides — hamburger nav overlay, reduced nav-to-title padding (common 16px rule for `.page-header`, `.profile-header`, `.profile-cta-section`, `.contact-section`), recog bar single-line, footer-bottom single column
- `css/style.css`: research page mobile — video stacks below h1 using flex `order`; publications table → card layout (authors as small text, summary + date hidden)
- `css/style.css`: trials-v3 mobile — profile-details cards compact icon-left grid layout
- `css/style.css`: purchase page mobile — pills-options 1-column
- `css/style.css`: `.contact-section h1` font-size override removed; now inherits global `clamp(2.8rem, 5vw, 5.5rem)` on all screen sizes
- `our_story.html`: timeline stacked vertically on mobile; neuron hidden; team grid 2-col main + centred advisor section (`team-grid--advisors`)
- `research.html`: `page-header-body` wrapper for flex ordering; `<br class="mobile-br">` after disclaimer bold text
- `trials-v3.html`: `white-space: nowrap` → `normal` on `.profile-header-text h1`
- `purchase.html`: dark dropdown background on mobile so white nav links remain readable
- `index.html`: hero-text top padding 44px → 16px on mobile

## 197b249 — fix Clinical Trials nav link on our_story and purchase pages

- `our_story.html`, `purchase.html`: nav "Clinical Trials" link was still pointing to `profile.html`; updated to `trials-v3.html`

## 1831ee0 — trials-v3 neuron animation + sitewide nav update

- `trials-v3.html`: new clinical trials page with full-header Three.js neuron animation (slow rotation, fills header behind text, no hard edges)
- `js/neuron-portable.js`: reusable neuron module for use across any page via importmap + external script tag
- `trials-v2.html`: inline-module fallback version (kept in folder, not linked)
- All pages: nav/footer "Clinical Trials" links updated from `trials.html` → `trials-v3.html`

## [prev] — minor changes

- `our_story.html`: photo captions added beneath 6 timeline photos; Cambridge logo removed; caption text colour black
- All pages: "Our Trials" renamed to "Clinical Trials" in nav bar; `profile.html` renamed to `trials.html`
- `trials.html`: h1 updated to "Our Clinical Trials" with "Trials" in blue; intro body text added above PROFILE content
- `purchase.html`: microbiome test "Coming soon" replaced with inline email waiting-list form (submits to jake@onecarbon.com)

## [prev] — what we do update, timeline finished, minor aesthetic changes
- `index.html`: nav now inherits from `css/style.css`; "What we do" heading blue; h1 font matches other pages; "Learn more" button solid blue/white; card stack aligned to hero text top and nav right gutter
- `our_story.html`: "What comes next" section hidden; timeline item padding halved (40vh → 20vh)
- All pages: nav link order updated — Our Story, Research, Our Trials, Blog, Contact
- `purchase.html`: price hidden on microbiome testing kit

## c1ab375 — hero changed
- `index.html`: replaced inline nav/root/body overrides with `css/style.css` — nav now sticky 72px matching all other pages
- `index.html`: "What we do" heading made blue; h1 font inherits from style.css; "Learn more" button solid blue with white text
- `index.html`: card stack positioned absolutely (`top: 80px; right: 60px`) to align with hero text top and nav right gutter

## [prev] — minor fixes
- `our_story.html`: hero title updated; "people" and "next." headings coloured blue; "today" section moved up
- `blog.html`: blog grid hidden, replaced with "Coming soon." line

## 418fc5e — site-wide styling and content updates
- `css/style.css`: left-aligned all nav/content to 60px gutter; removed `max-width: 1200px` centering from all major sections; zeroed all card/box border-radius (`--radius-sm/md/lg` → 0); fixed YouTube embed to use `aspect-ratio: 16/9`
- All pages: nav "PROFILE" → "Our Trials"; removed "Recognised by:" label text from all recog bars
- `index.html`: hero swapped from ocean video to `conical.png` image
- `our_story.html`: team split into "Team" and "Advisors" sections; timeline photo slots added (`os1–os5.png`) with alternating left/right alignment; timeline card text updated
- `profile.html`, `research.html`, `contact.html`: selected `<em>` headings overridden to black (`var(--text)`) while keeping blue on specific words (PROFILE, you)
- `privacy.html`, `cookie.html`, `tos.html`: hardcoded box border-radius zeroed

## 3370b6a — changelog: backfill recent commits
- `changelog.md`: added entries for commits 88b8c24 through 3b09c47

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
